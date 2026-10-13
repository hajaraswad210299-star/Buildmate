"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ArrowRight3, TickCircle } from "@/lib/icons";

interface SlideToConfirmProps {
  label: string;
  onConfirm: () => Promise<void> | void;
  disabled?: boolean;
  className?: string;
}

export function SlideToConfirm({
  label,
  onConfirm,
  disabled = false,
  className = "",
}: SlideToConfirmProps) {
  const [sliderPosition, setSliderPosition] = useState(0); // 0 to 1
  const [isDragging, setIsDragging] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showKeyboardDialog, setShowKeyboardDialog] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);

  // Maximum travel distance
  const getTrackWidth = () => {
    if (!trackRef.current) return 300;
    return trackRef.current.clientWidth - 56; // 56px is thumb width
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled || isConfirmed || isLoading) return;
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX - sliderPosition * getTrackWidth();
  };

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDragging || disabled || isConfirmed || isLoading) return;
      const maxDistance = getTrackWidth();
      const currentX = clientX - startXRef.current;
      const progress = Math.min(Math.max(currentX / maxDistance, 0), 1);
      setSliderPosition(progress);

      if (progress >= 0.85 && !isConfirmed) {
        triggerSuccess();
      }
    },
    [isDragging, disabled, isConfirmed, isLoading]
  );

  const triggerSuccess = async () => {
    setIsDragging(false);
    setSliderPosition(1);
    setIsConfirmed(true);
    setIsLoading(true);

    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.(30);
      } catch {}
    }

    try {
      await onConfirm();
    } catch {
      // Revert if failed
      setIsConfirmed(false);
      setSliderPosition(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (sliderPosition < 0.85) {
      setSliderPosition(0);
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onTouchEnd = () => handleEnd();

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("touchend", onTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging, handleMove]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setShowKeyboardDialog(true);
    }
  };

  const maxDistance = trackRef.current ? getTrackWidth() : 250;
  const currentPixelOffset = sliderPosition * maxDistance;

  return (
    <>
      <div
        ref={trackRef}
        role="slider"
        aria-label={label}
        aria-valuenow={Math.round(sliderPosition * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        className={`relative h-14 w-full rounded-2xl bg-lavender-50/80 border border-lavender-200 p-1 flex items-center select-none overflow-hidden focus:outline-none focus:ring-4 focus:ring-lavender-300/40 transition-shadow ${
          disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"
        } ${className}`}
      >
        {/* Background Filled Track */}
        <div
          className="absolute inset-y-0 left-0 bg-lavender-200/50 rounded-2xl transition-all duration-75"
          style={{ width: `${sliderPosition * 100}%` }}
        />

        {/* Text Label (fades as slider moves) */}
        <div
          className="w-full text-center text-sm font-semibold text-lavender-900 pointer-events-none transition-opacity duration-150 z-10 pl-10 pr-4 truncate"
          style={{ opacity: 1 - sliderPosition * 1.3 }}
        >
          {label}
        </div>

        {/* Draggable Thumb Button */}
        <div
          onMouseDown={handleTouchStart}
          onTouchStart={handleTouchStart}
          style={{
            transform: `translateX(${currentPixelOffset}px)`,
            transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
          className={`absolute left-1 w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md z-20 transition-colors duration-200 ${
            isConfirmed ? "bg-success-600" : "bg-lavender-600 active:bg-lavender-700"
          }`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isConfirmed ? (
            <TickCircle size={22} className="animate-in zoom-in-75 duration-200" />
          ) : (
            <ArrowRight3 size={20} className="animate-pulse" />
          )}
        </div>
      </div>

      {/* Accessible Keyboard Confirmation Modal */}
      {showKeyboardDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-neutral-200">
            <h3 className="font-serif text-xl text-neutral-900">Konfirmasi Tindakan</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Apakah kamu yakin ingin melanjutkan: <br />
              <strong className="text-neutral-900">{label}</strong>?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowKeyboardDialog(false)}
                className="flex-1 h-11 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowKeyboardDialog(false);
                  triggerSuccess();
                }}
                className="flex-1 h-11 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-xs font-semibold text-white shadow-xs"
              >
                Ya, Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
