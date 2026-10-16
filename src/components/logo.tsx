export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-lg bg-bronze-metal text-umber-950 shadow-[0_4px_14px_-6px_var(--color-bronze-400)]"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2}>
          <path d="M4 5h16v11H9l-5 4V5z" strokeLinejoin="round" />
          <path d="M8 9.5h8M8 12.5h5" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-lg">Formchat</span>
    </span>
  );
}
