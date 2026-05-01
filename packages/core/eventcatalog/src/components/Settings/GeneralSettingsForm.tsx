import { useEffect, useMemo, useRef, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { Check } from 'lucide-react';
import {
  generalSettingsSchema,
  KNOWN_THEMES,
  isKnownTheme,
  type GeneralSettings,
} from '@utils/eventcatalog-config/config-schema';
import { ReadOnlyBanner } from './ReadOnlyBanner';
import { LogoUpload } from './LogoUpload';
import { Row, cn, inputBase, inputError, monoInput } from './Row';

interface Props {
  canEdit: boolean;
  initial: GeneralSettings & { logo?: { src?: string } };
  apiBase: string;
}

interface FormState {
  organization: string;
  tagline: string;
  homepageLink: string;
  editUrl: string;
  repositoryUrl: string;
  theme: string;
}

type FieldKey = keyof FormState;

const toFormState = (s: GeneralSettings): FormState => ({
  organization: s.organizationName ?? s.title ?? s.logo?.text ?? '',
  tagline: s.tagline ?? '',
  homepageLink: s.homepageLink ?? '',
  editUrl: s.editUrl ?? '',
  repositoryUrl: s.repositoryUrl ?? '',
  theme: s.theme || 'default',
});

const themeOptions = (currentTheme: string): string[] => {
  const known = [...KNOWN_THEMES];
  if (currentTheme && !isKnownTheme(currentTheme)) {
    return [...known, currentTheme];
  }
  return known;
};

const THEME_PREVIEWS: Record<string, { accent: string; bg: string; label: string }> = {
  default: { accent: '#6366f1', bg: '#0b0b0f', label: 'Default' },
  ocean: { accent: '#06b6d4', bg: '#082431', label: 'Ocean' },
  sapphire: { accent: '#3b82f6', bg: '#0b1430', label: 'Sapphire' },
  sunset: { accent: '#f97316', bg: '#2a0f0a', label: 'Sunset' },
  forest: { accent: '#22c55e', bg: '#0c1f12', label: 'Forest' },
};

const ensureUrlScheme = (value: string): string => {
  const v = value.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
};

export const GeneralSettingsForm = ({ canEdit, initial, apiBase }: Props) => {
  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [pristine, setPristine] = useState<FormState>(() => toFormState(initial));
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [savingKey, setSavingKey] = useState<FieldKey | null>(null);
  const originalThemeRef = useRef<string>(initial.theme || 'default');

  const dirtyKeys = useMemo<Set<FieldKey>>(() => {
    const s = new Set<FieldKey>();
    (Object.keys(form) as FieldKey[]).forEach((k) => {
      if (form[k] !== pristine[k]) s.add(k);
    });
    return s;
  }, [form, pristine]);

  const isFormDirty = dirtyKeys.size > 0;

  // Live theme preview; revert on unmount if not saved.
  useEffect(() => {
    if (!canEdit) return;
    document.documentElement.setAttribute('data-catalog-theme', form.theme || 'default');
    return () => {
      document.documentElement.setAttribute('data-catalog-theme', originalThemeRef.current || 'default');
    };
  }, [form.theme, canEdit]);

  // beforeunload guard while any field is dirty.
  useEffect(() => {
    if (!isFormDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isFormDirty]);

  const setField = (key: FieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleChange = (key: FieldKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setField(key, e.target.value);

  const handleUrlBlur = (key: 'homepageLink' | 'editUrl' | 'repositoryUrl') => () => {
    setForm((prev) => ({ ...prev, [key]: ensureUrlScheme(prev[key]) }));
  };

  const validateAll = (): { ok: true } | { ok: false; errors: Partial<Record<FieldKey, string>> } => {
    const candidate = {
      title: form.organization,
      tagline: form.tagline,
      organizationName: form.organization,
      homepageLink: form.homepageLink,
      editUrl: form.editUrl,
      repositoryUrl: form.repositoryUrl,
      logo: { text: form.organization },
      theme: form.theme,
    };
    const parsed = generalSettingsSchema.safeParse(candidate);
    if (parsed.success) return { ok: true };
    const next: Partial<Record<FieldKey, string>> = {};
    for (const issue of parsed.error.issues) {
      const [key] = issue.path as string[];
      if (key === 'title' || key === 'organizationName' || key === 'logo') next.organization = issue.message;
      else if (key === 'tagline') next.tagline = issue.message;
      else if (key === 'homepageLink') next.homepageLink = issue.message;
      else if (key === 'editUrl') next.editUrl = issue.message;
      else if (key === 'repositoryUrl') next.repositoryUrl = issue.message;
      else if (key === 'theme') next.theme = issue.message;
    }
    return { ok: false, errors: next };
  };

  // Per-row save: validate the whole form, but only block on errors that
  // affect the row being saved. The API still receives the full payload.
  const saveRow = async (key: FieldKey) => {
    if (!canEdit) return;
    const result = validateAll();
    if (!result.ok && result.errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: result.errors[key] }));
      toast.error(result.errors[key] || 'Please fix the highlighted field');
      return;
    }

    setSavingKey(key);
    try {
      const payload = {
        title: form.organization,
        organizationName: form.organization,
        logo: { text: form.organization },
        tagline: form.tagline || undefined,
        homepageLink: form.homepageLink || undefined,
        editUrl: form.editUrl || undefined,
        repositoryUrl: form.repositoryUrl || undefined,
        theme: form.theme,
      };
      const res = await fetch(`${apiBase}/general`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || 'Could not save');
        return;
      }
      setPristine(form);
      originalThemeRef.current = form.theme;
      toast.success('Saved to eventcatalog.config.js');
    } catch (err) {
      toast.error(`Could not save: ${(err as Error).message}`);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="divide-y divide-[rgb(var(--ec-page-border))]">
      <Toaster richColors closeButton position="bottom-right" theme="system" />
      {!canEdit && (
        <div className="pb-6">
          <ReadOnlyBanner />
        </div>
      )}

      <Row
        title="Theme"
        description="Pick a built-in colour theme. Selection updates the preview live; click Save to persist."
        canEdit={canEdit}
        dirty={dirtyKeys.has('theme')}
        saving={savingKey === 'theme'}
        onSave={() => saveRow('theme')}
        error={errors.theme}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {themeOptions(form.theme).map((t) => {
            const preview = THEME_PREVIEWS[t] ?? { accent: '#888', bg: '#1a1a1a', label: t };
            const isActive = form.theme === t;
            const isCustom = !isKnownTheme(t);
            return (
              <button
                type="button"
                key={t}
                onClick={() => setField('theme', t)}
                disabled={!canEdit}
                aria-pressed={isActive}
                className={cn(
                  'group relative flex flex-col overflow-hidden rounded-lg border text-left transition-all',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  isActive
                    ? 'border-[rgb(var(--ec-accent))] ring-2 ring-[rgb(var(--ec-accent)/0.25)]'
                    : 'border-[rgb(var(--ec-page-border))] hover:border-[rgb(var(--ec-page-text-muted)/0.6)]'
                )}
              >
                <div className="relative h-14 w-full overflow-hidden" style={{ background: preview.bg }}>
                  <div
                    className="absolute -bottom-2 -right-2 h-12 w-12 rounded-full opacity-90 blur-md"
                    style={{ background: preview.accent }}
                    aria-hidden
                  />
                  <div
                    className="absolute left-3 top-3 h-1.5 w-10 rounded-full opacity-90"
                    style={{ background: preview.accent }}
                    aria-hidden
                  />
                  <div
                    className="absolute left-3 top-6 h-1 w-7 rounded-full opacity-60"
                    style={{ background: 'rgba(255,255,255,0.4)' }}
                    aria-hidden
                  />
                  {isActive && (
                    <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-black shadow-sm">
                      <Check className="h-2.5 w-2.5" aria-hidden />
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="text-[12px] font-medium capitalize text-[rgb(var(--ec-page-text))]">{preview.label}</span>
                  {isCustom && (
                    <span className="rounded-full border border-[rgb(var(--ec-page-border))] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[rgb(var(--ec-page-text-muted))]">
                      custom
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Row>

      <Row
        title="Organization"
        description="Used as the catalog name, the brand line next to the logo, and OpenGraph metadata."
        canEdit={canEdit}
        dirty={dirtyKeys.has('organization')}
        saving={savingKey === 'organization'}
        onSave={() => saveRow('organization')}
        error={errors.organization}
      >
        <input
          type="text"
          value={form.organization}
          onChange={handleChange('organization')}
          disabled={!canEdit}
          maxLength={100}
          placeholder="Acme Inc."
          className={cn(inputBase, errors.organization && inputError)}
          required
        />
      </Row>

      <Row
        title="Tagline"
        description="A short subtitle shown beneath the organization name on the homepage."
        canEdit={canEdit}
        dirty={dirtyKeys.has('tagline')}
        saving={savingKey === 'tagline'}
        onSave={() => saveRow('tagline')}
        error={errors.tagline}
      >
        <textarea
          value={form.tagline}
          onChange={handleChange('tagline')}
          disabled={!canEdit}
          maxLength={500}
          rows={2}
          placeholder="Discover and explore our events, services, and architecture."
          className={cn(inputBase, 'resize-y', errors.tagline && inputError)}
        />
      </Row>

      <Row
        title="Homepage link"
        description="Where the logo links to. Useful for pointing back to your main site."
        canEdit={canEdit}
        dirty={dirtyKeys.has('homepageLink')}
        saving={savingKey === 'homepageLink'}
        onSave={() => saveRow('homepageLink')}
        error={errors.homepageLink}
      >
        <input
          type="url"
          value={form.homepageLink}
          onChange={handleChange('homepageLink')}
          onBlur={handleUrlBlur('homepageLink')}
          disabled={!canEdit}
          placeholder="https://example.com"
          className={cn(inputBase, monoInput, errors.homepageLink && inputError)}
        />
      </Row>

      <Row
        title="Edit URL"
        description="Base URL for the “Edit on GitHub” links shown on resource pages."
        canEdit={canEdit}
        dirty={dirtyKeys.has('editUrl')}
        saving={savingKey === 'editUrl'}
        onSave={() => saveRow('editUrl')}
        error={errors.editUrl}
      >
        <input
          type="url"
          value={form.editUrl}
          onChange={handleChange('editUrl')}
          onBlur={handleUrlBlur('editUrl')}
          disabled={!canEdit}
          placeholder="https://github.com/org/repo/edit/main"
          className={cn(inputBase, monoInput, errors.editUrl && inputError)}
        />
      </Row>

      <Row
        title="Repository URL"
        description="Link to your catalog's source repository. Shown in the header for quick navigation back to the code."
        canEdit={canEdit}
        dirty={dirtyKeys.has('repositoryUrl')}
        saving={savingKey === 'repositoryUrl'}
        onSave={() => saveRow('repositoryUrl')}
        error={errors.repositoryUrl}
      >
        <input
          type="url"
          value={form.repositoryUrl}
          onChange={handleChange('repositoryUrl')}
          onBlur={handleUrlBlur('repositoryUrl')}
          disabled={!canEdit}
          placeholder="https://github.com/org/repo"
          className={cn(inputBase, monoInput, errors.repositoryUrl && inputError)}
        />
      </Row>

      <Row
        title="Logo"
        description="Image shown in the top-left corner. PNG, JPG, SVG, or WebP up to 2MB."
        canEdit={canEdit}
        // Logo upload saves itself directly; no inline Save button needed.
        dirty={false}
      >
        <LogoUpload
          canEdit={canEdit}
          initialSrc={initial.logo?.src ? `${initial.logo.src}?t=${Date.now()}` : undefined}
          apiUrl={`${apiBase}/logo`}
        />
      </Row>
    </form>
  );
};
