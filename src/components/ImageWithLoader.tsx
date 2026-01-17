"use client";

import { useState, useMemo, useEffect } from "react";

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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  // Pick a random emoji and random starting position on mount
  const { emoji, delayX, delayY } = useMemo(() => ({
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    // Negative delay starts animation at random point in cycle
    delayX: -Math.random() * X_DURATION * 2,
    delayY: -Math.random() * Y_DURATION * 2,
  }), []);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  // Close on escape key
  useEffect(() => {
    if (!lightboxOpen) return;
    
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLightboxOpen(false);
      }
    }
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen]);

  return (
    <>
      <div 
        className={`relative bg-white overflow-hidden cursor-pointer rounded-[2px] ${className}`}
        onClick={() => loaded && setLightboxOpen(true)}
      >
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
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white text-2xl font-bold w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
            onClick={() => setLightboxOpen(false)}
          >
            ×
          </button>
          
          {/* Full image - uncropped */}
          <img
            src={src}
            alt={alt}
            loading="eager"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
