import { useEffect, useState } from 'react';

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface GuidedTourOverlayProps {
  targetRect: HighlightRect | null;
}

export function GuidedTourOverlay({ targetRect }: GuidedTourOverlayProps) {
  // data-tour-overlay is used by AppLayout cleanup logic
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { w, h } = windowSize;
  const pad = 8;
  const radius = 8;

  // If no target, render full overlay (no cutout) — no onClick, tour only closes via buttons/Escape
  if (!targetRect) {
    return (
      <div
        data-tour-overlay=""
        className="fixed inset-0 z-[9998] transition-opacity duration-300"
        style={{ backgroundColor: 'rgba(0,0,0,0.65)', pointerEvents: 'auto' }}
      />
    );
  }

  const x = Math.max(0, targetRect.left - pad);
  const y = Math.max(0, targetRect.top - pad);
  const rw = targetRect.width + pad * 2;
  const rh = targetRect.height + pad * 2;

  // SVG path: full rectangle minus rounded rectangle cutout
  const path = `
    M 0 0
    H ${w}
    V ${h}
    H 0
    V 0
    Z
    M ${x + radius} ${y}
    H ${x + rw - radius}
    Q ${x + rw} ${y} ${x + rw} ${y + radius}
    V ${y + rh - radius}
    Q ${x + rw} ${y + rh} ${x + rw - radius} ${y + rh}
    H ${x + radius}
    Q ${x} ${y + rh} ${x} ${y + rh - radius}
    V ${y + radius}
    Q ${x} ${y} ${x + radius} ${y}
    Z
  `;

  return (
    <svg
      data-tour-overlay=""
      className="fixed inset-0 z-[9998] transition-all duration-300"
      width={w}
      height={h}
      style={{ pointerEvents: 'none' }}
    >
      <path
        d={path}
        fill="rgba(0,0,0,0.65)"
        fillRule="evenodd"
        style={{ pointerEvents: 'auto' }}
      />
    </svg>
  );
}
