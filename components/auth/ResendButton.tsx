"use client";

import React, { useState, useEffect } from "react";
import { Refresh } from "@/lib/icons";

interface ResendButtonProps {
  onResend: () => Promise<void> | void;
  initialSeconds?: number;
}

export function ResendButton({
  onResend,
  initialSeconds = 60,
}: ResendButtonProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const handleClick = async () => {
    if (secondsLeft > 0 || loading) return;
    try {
      setLoading(true);
      await onResend();
      setSecondsLeft(60);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={secondsLeft > 0 || loading}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-lavender-700 hover:text-lavender-800 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors"
    >
      <Refresh
        size={14}
        className={loading ? "animate-spin" : secondsLeft > 0 ? "opacity-50" : ""}
      />
      <span>
        {secondsLeft > 0
          ? `Kirim ulang dalam (${secondsLeft}d)`
          : "Kirim ulang sekarang"}
      </span>
    </button>
  );
}
