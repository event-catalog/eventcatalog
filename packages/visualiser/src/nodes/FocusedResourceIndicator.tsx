import { LocateFixed } from "lucide-react";

export function FocusedResourceIndicator() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1.5 z-[5] rounded-[14px] border-2 border-indigo-500/70 shadow-lg"
      />
      <div className="pointer-events-none absolute -bottom-2.5 right-2 z-30 inline-flex items-center gap-1 rounded-full border border-white/80 bg-indigo-600 px-2 py-0.5 text-[7px] font-bold uppercase tracking-widest text-white shadow-sm">
        <LocateFixed className="h-2.5 w-2.5" strokeWidth={2.5} />
        Viewing
      </div>
    </>
  );
}
