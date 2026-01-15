export default function Logo({ className = "", grayscale = true }: { className?: string; grayscale?: boolean }) {
  return (
    <span className={`inline-flex ${grayscale ? "grayscale" : ""} ${className}`} style={{ letterSpacing: "0.2em" }}>
      <span className="animate-logo-1">👁️</span>
      <span className="animate-logo-2">🅾️</span>
      <span className="animate-logo-3">🐑</span>
    </span>
  );
}

