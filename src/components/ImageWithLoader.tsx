"use client";

import { useState, useMemo } from "react";

const EMOJIS = ["👁️", "🅾️", "🐑"];
const X_DURATION = 1.9; // seconds
const Y_DURATION = 1.3; // seconds

interface ImageWithLoaderProps {
  src: string;
  alt: string;
  className?: string;
}

export default function ImageWithLoader({ src, alt, className = "" }: ImageWithLoaderProps) {
  const [loaded, setLoaded] = useState(false);
  
  // Pick a random emoji and random starting position on mount
  const { emoji, delayX, delayY } = useMemo(() => ({
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    // Negative delay starts animation at random point in cycle
    delayX: -Math.random() * X_DURATION * 2,
    delayY: -Math.random() * Y_DURATION * 2,
  }), []);

  return (
    <div className={`relative bg-white overflow-hidden ${className}`}>
      {/* Bouncing emoji loader */}
      {!loaded && (
        <div className="absolute inset-0">
          <span 
            className="text-2xl grayscale animate-pong"
            style={{ animationDelay: `${delayX}s, ${delayY}s` }}
          >
            {emoji}
          </span>
        </div>
      )}
      
      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

