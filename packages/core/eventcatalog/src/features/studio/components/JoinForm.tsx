import { useState } from 'react';

export default function JoinForm({ onJoin }: { onJoin: (name: string) => void }) {
  const [draft, setDraft] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.trim()) onJoin(draft.trim());
      }}
      className="mx-auto mt-20 max-w-sm space-y-4 rounded-lg border p-6 bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]"
    >
      <div>
        <h1 className="text-lg font-semibold">Join this canvas</h1>
        <p className="text-sm text-[rgb(var(--ec-page-text-muted))]">What should others call you?</p>
      </div>
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Your name"
        className="w-full rounded-md px-3 py-2 border bg-[rgb(var(--ec-input-bg))] border-[rgb(var(--ec-input-border))] text-[rgb(var(--ec-input-text))]"
      />
      <button
        type="submit"
        disabled={!draft.trim()}
        className="w-full rounded-md px-3 py-2 text-sm disabled:opacity-50 bg-[rgb(var(--ec-button-bg))] text-[rgb(var(--ec-button-text))]"
      >
        Join
      </button>
    </form>
  );
}
