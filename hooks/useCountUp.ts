"use client";

import { useEffect, useRef, useState } from "react";

export function useCountUp(
  target: number,
  { duration = 900 }: { duration?: number } = {}
) {
  const [value, setValue] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    let raf = 0;
    const isReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isReduced) {
      from.current = target;
      return;
    }

    const start = performance.now();
    const initial = from.current;

    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = Math.round(initial + (target - initial) * eased);
      setValue(current);

      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        from.current = target;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
