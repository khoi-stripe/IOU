export default function Loader({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative w-12 h-12 text-3xl grayscale">
        <span className="absolute inset-0 flex items-center justify-center animate-emoji-1">
          👁️
        </span>
        <span className="absolute inset-0 flex items-center justify-center animate-emoji-2">
          🅾️
        </span>
        <span className="absolute inset-0 flex items-center justify-center animate-emoji-3">
          🐑
        </span>
      </div>
    </div>
  );
}

