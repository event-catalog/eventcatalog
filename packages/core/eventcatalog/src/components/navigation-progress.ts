const SHOW_DELAY_MS = 200;
const MINIMUM_VISIBLE_MS = 250;

type NavigationPreparationEvent = Event & {
  sourceElement?: EventTarget | null;
};

export const initializeNavigationProgress = () => {
  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  let visibleAt = 0;
  let pendingSource: HTMLElement | null = null;

  const getProgress = () => document.getElementById('navigation-progress');
  const getStatus = () => document.getElementById('navigation-progress-status');

  const clearPendingSource = () => {
    pendingSource?.removeAttribute('aria-busy');
    pendingSource?.removeAttribute('data-navigation-pending');
    pendingSource = null;
  };

  const showProgress = () => {
    const progress = getProgress();
    if (!progress) return;

    visibleAt = performance.now();
    progress.dataset.visible = 'true';
    progress.setAttribute('aria-hidden', 'false');
    document.getElementById('content')?.setAttribute('aria-busy', 'true');

    const status = getStatus();
    if (status) status.textContent = 'Loading page';
  };

  const hideProgress = () => {
    const progress = getProgress();
    if (progress) {
      progress.dataset.visible = 'false';
      progress.setAttribute('aria-hidden', 'true');
    }

    document.getElementById('content')?.removeAttribute('aria-busy');
    const status = getStatus();
    if (status) status.textContent = '';

    clearPendingSource();
    visibleAt = 0;
    hideTimer = undefined;
  };

  const startProgress = (event: NavigationPreparationEvent) => {
    if (showTimer) clearTimeout(showTimer);
    if (hideTimer) clearTimeout(hideTimer);

    clearPendingSource();

    if (event.sourceElement instanceof HTMLElement) {
      pendingSource = event.sourceElement;
      pendingSource.setAttribute('aria-busy', 'true');
      pendingSource.dataset.navigationPending = 'true';
    }

    showTimer = setTimeout(showProgress, SHOW_DELAY_MS);
  };

  const finishProgress = () => {
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = undefined;
    }

    if (!visibleAt) {
      hideProgress();
      return;
    }

    const remainingVisibleTime = Math.max(0, MINIMUM_VISIBLE_MS - (performance.now() - visibleAt));
    hideTimer = setTimeout(hideProgress, remainingVisibleTime);
  };

  const resetProgress = () => {
    if (!showTimer && !hideTimer && !visibleAt) hideProgress();
  };

  document.addEventListener('astro:before-preparation', startProgress);
  document.addEventListener('astro:after-preparation', finishProgress);
  document.addEventListener('astro:page-load', resetProgress);

  return () => {
    if (showTimer) clearTimeout(showTimer);
    if (hideTimer) clearTimeout(hideTimer);
    hideProgress();
    document.removeEventListener('astro:before-preparation', startProgress);
    document.removeEventListener('astro:after-preparation', finishProgress);
    document.removeEventListener('astro:page-load', resetProgress);
  };
};
