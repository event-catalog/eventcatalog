import { lazy, Suspense, useMemo, type ComponentType } from 'react';
import { getProjectLoader } from 'virtual:likec4-projects';

interface LikeC4ViewWrapperProps {
  viewId: string;
  project?: string;
  height?: string;
}

interface LikeC4ViewProps {
  viewId: string;
  controls?: boolean;
  browser?: {
    enableFocusMode?: boolean;
    enableSearch?: boolean;
  };
}

const lazyComponentCache = new Map<string, ComponentType<LikeC4ViewProps>>();

const getLazyComponent = (project: string): ComponentType<LikeC4ViewProps> => {
  const key = project || 'default';

  if (!lazyComponentCache.has(key)) {
    const loader = getProjectLoader(key);
    const LazyComponent = lazy(() => loader().then((mod) => ({ default: mod.LikeC4View })));
    lazyComponentCache.set(key, LazyComponent);
  }

  return lazyComponentCache.get(key)!;
};

export default function LikeC4ViewWrapper({ viewId, project, height = '600px' }: LikeC4ViewWrapperProps) {
  const LikeC4ViewComponent = useMemo(() => getLazyComponent(project || 'default'), [project]);

  return (
    <div style={{ height, maxHeight: height }} className="w-full overflow-hidden rounded-lg border border-gray-200">
      <Suspense
        fallback={<div className="flex h-full items-center justify-center rounded-lg bg-gray-100">Loading diagram...</div>}
      >
        <LikeC4ViewComponent
          viewId={viewId}
          controls={false}
          browser={{
            enableFocusMode: false,
            enableSearch: false,
          }}
        />
      </Suspense>
    </div>
  );
}
