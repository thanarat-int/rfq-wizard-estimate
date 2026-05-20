import { useState, useEffect, useRef } from "react";

/**
 * Animated number counter — smoothly counts from 0 to target.
 * Uses requestAnimationFrame with ease-out curve.
 */
export function useCountUp(target: number, duration: number = 800, delay: number = 0): number {
  const [value, setValue] = useState(0);
  const startTime = useRef<number>(0);
  const rafId = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

    const timeout = setTimeout(() => {
      startTime.current = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime.current;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(eased * target);

        if (progress < 1) {
          rafId.current = requestAnimationFrame(animate);
        }
      };

      rafId.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafId.current);
    };
  }, [target, duration, delay]);

  return value;
}
