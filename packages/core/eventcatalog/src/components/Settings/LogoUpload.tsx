import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ImageIcon, Trash2, Upload, Loader2 } from 'lucide-react';

interface LogoUploadProps {
  canEdit: boolean;
  initialSrc?: string;
  apiUrl: string;
  onSrcChange?: (src: string | null) => void;
}

export const LogoUpload = ({ canEdit, initialSrc, apiUrl, onSrcChange }: LogoUploadProps) => {
  const [src, setSrc] = useState<string | null>(initialSrc ?? null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setBusy(true);
    const fd = new FormData();
    fd.append('logo', file);
    try {
      const res = await fetch(apiUrl, { method: 'POST', body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || 'Logo upload failed');
        return;
      }
      const next = `${body.src}?t=${Date.now()}`;
      setSrc(next);
      onSrcChange?.(body.src);
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(`Logo upload failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetch(apiUrl, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || 'Could not remove logo');
        return;
      }
      setSrc(null);
      onSrcChange?.(null);
      toast.success('Logo removed');
    } catch (err) {
      toast.error(`Could not remove logo: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canEdit || busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (canEdit && !busy) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`relative flex items-center gap-5 rounded-lg border border-dashed px-4 py-4 transition-colors ${
        dragOver
          ? 'border-[rgb(var(--ec-accent)/0.6)] bg-[rgb(var(--ec-accent-subtle)/0.4)]'
          : 'border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg)/0.4)]'
      }`}
    >
      <div className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[rgb(var(--ec-page-bg))] ring-1 ring-[rgb(var(--ec-page-border))]">
        {src ? (
          <img src={src} alt="Catalog logo preview" className="h-16 w-16 object-contain" />
        ) : (
          <ImageIcon className="h-7 w-7 text-[rgb(var(--ec-page-text-muted)/0.7)]" aria-hidden />
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--ec-page-bg)/0.7)] backdrop-blur-sm">
            <Loader2 className="h-4 w-4 animate-spin text-[rgb(var(--ec-page-text))]" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex-1">
        <p className="text-[13px] font-medium text-[rgb(var(--ec-page-text))]">{src ? 'Replace logo' : 'Upload a logo'}</p>
        <p className="text-[12px] text-[rgb(var(--ec-page-text-muted))]">
          {dragOver ? 'Release to upload' : 'Drag a file here, or click to browse.'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          disabled={!canEdit || busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <button
          type="button"
          disabled={!canEdit || busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] px-3 py-1.5 text-[12px] font-medium text-[rgb(var(--ec-page-text))] transition-colors hover:bg-[rgb(var(--ec-page-bg)/0.78)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-3 w-3" aria-hidden />
          {src ? 'Replace' : 'Upload'}
        </button>
        {src && (
          <button
            type="button"
            disabled={!canEdit || busy}
            onClick={remove}
            aria-label="Remove logo"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-[rgb(var(--ec-page-text-muted))] transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
};
