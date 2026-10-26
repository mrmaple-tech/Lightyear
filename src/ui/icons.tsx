// Minimal inline stroke icons (Lucide-style geometry).
const I = ({ d, label }: { d: string; label?: string }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden={!label} aria-label={label}>
    <path d={d} />
  </svg>
);
export const Play = () => <I d="M7 4l13 8-13 8z" />;
export const Pause = () => <I d="M7 4v16M17 4v16" />;
export const Reverse = () => <I d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />;
export const Close = () => <I d="M18 6 6 18M6 6l12 12" />;
export const Target = () => <I d="M12 2v4M12 18v4M2 12h4M18 12h4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />;
export const Search = () => <I d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3" />;
