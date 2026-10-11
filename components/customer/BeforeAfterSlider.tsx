"use client";

import React, { useState, useRef, useCallback } from "react";

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = "Sebelum (Masalah)",
  afterLabel = "Sesudah (Hasil)",
  className = "",
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clamped = Math.max(0, Math.min(x, rect.width));
    const percent = (clamped / rect.width) * 100;
    setSliderPosition(percent);
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      setSliderPosition((prev) => Math.max(0, prev - 5));
    } else if (e.key === "ArrowRight") {
      setSliderPosition((prev) => Math.min(100, prev + 5));
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="slider"
      aria-label="Bandingkan foto sebelum dan sesudah"
      aria-valuenow={sliderPosition}
      aria-valuemin={0}
      aria-valuemax={100}
      onKeyDown={handleKeyDown}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onMouseMove={handleMouseMove}
      onTouchStart={() => setIsDragging(true)}
      onTouchEnd={() => setIsDragging(false)}
      onTouchMove={handleTouchMove}
      className={`relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-2xl overflow-hidden select-none cursor-ew-resize border border-neutral-200/90 bg-neutral-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-lavender-200 ${className}`}
    >
      {/* 1. After Image (Background, full width) */}
      <img
        src={afterUrl}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* 2. Before Image (Clipped overlay) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeUrl}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-cover max-w-none"
          style={{
            width: containerRef.current?.clientWidth
              ? `${containerRef.current.clientWidth}px`
              : "100%",
          }}
        />
      </div>

      {/* 3. Slider Divider Line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        {/* Handle Knob */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white text-neutral-800 shadow-md flex items-center justify-center border border-neutral-200">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold">◀</span>
            <span className="text-[10px] font-bold">▶</span>
          </div>
        </div>
      </div>

      {/* Badges (fade out while dragging) */}
      <div
        className={`absolute bottom-3 left-3 z-10 transition-opacity duration-200 pointer-events-none ${
          isDragging ? "opacity-0" : "opacity-100"
        }`}
      >
        <span className="px-3 py-1 rounded-full bg-neutral-900/80 backdrop-blur-sm text-white text-[11px] font-semibold border border-white/20 shadow-xs">
          {beforeLabel}
        </span>
      </div>

      <div
        className={`absolute bottom-3 right-3 z-10 transition-opacity duration-200 pointer-events-none ${
          isDragging ? "opacity-0" : "opacity-100"
        }`}
      >
        <span className="px-3 py-1 rounded-full bg-neutral-900/80 backdrop-blur-sm text-white text-[11px] font-semibold border border-white/20 shadow-xs">
          {afterLabel}
        </span>
      </div>
    </div>
  );
}
