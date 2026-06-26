// useTourHighlight.ts — Computes spotlight cutout position for onboarding tour
import { useState, useEffect } from 'react';

export interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function useTourHighlight(selector: string | null): SpotlightRect | null {
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(selector);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });

    const observer = new ResizeObserver(() => {
      const r2 = el.getBoundingClientRect();
      setRect({ top: r2.top, left: r2.left, width: r2.width, height: r2.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [selector]);

  return rect;
}
