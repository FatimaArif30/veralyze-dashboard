import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Centered, full-screen loader: the Veralyze monogram fills with lime like a
// vessel, acting as an estimated progress gauge. The fill eases toward ~93%
// over the expected analysis time and snaps to full the moment the report
// arrives, then fades out and the parent reveals the report.

type CaseFileMode = "manipulation" | "sources";

const MIN_DISPLAY_MS = 1600;
const FADE_MS = 360;
const EST_MS = 18000; // expected analysis time; the fill eases toward ~93% across this

export interface CaseFileLoaderProps {
  mode?: CaseFileMode;
  videoId?: string | null;
  title?: string | null;
  url?: string | null;
  result?: any | null;
  onRevealComplete?: () => void;
}

export function CaseFileLoader({ result, onRevealComplete }: CaseFileLoaderProps) {
  const mountedAt = useRef(Date.now());
  const doneRef = useRef(false);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(5);

  // Estimated progress: eases toward ~93% and never completes on its own.
  useEffect(() => {
    const start = Date.now();
    const tau = EST_MS / 2.4;
    const id = setInterval(() => {
      if (doneRef.current) return;
      const t = Date.now() - start;
      const p = 93 * (1 - Math.exp(-t / tau));
      setProgress(prev => (prev >= 100 ? prev : Math.max(prev, Math.min(93, p))));
    }, 60);
    return () => clearInterval(id);
  }, []);

  // When the report arrives: fill to 100%, hold a beat, fade, then reveal.
  useEffect(() => {
    if (result == null || doneRef.current) return;
    setProgress(100);
    const elapsed = Date.now() - mountedAt.current;
    const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
    let t2: ReturnType<typeof setTimeout>;
    const t1 = setTimeout(() => {
      setFading(true);
      t2 = setTimeout(() => {
        if (doneRef.current) return;
        doneRef.current = true;
        onRevealComplete?.();
      }, FADE_MS);
    }, wait);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [result, onRevealComplete]);

  const off = Math.max(0, Math.min(1, progress / 100));

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-md transition-opacity duration-300 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      aria-label="Analysing"
      role="status"
    >
      <style>{`
        @keyframes vz-breathe{0%,100%{opacity:.28;transform:scale(.9)}50%{opacity:.55;transform:scale(1.12)}}
        .vz-breathe{animation:vz-breathe 2.4s ease-in-out infinite}
      `}</style>
      <div className="relative grid place-items-center">
        <div className="vz-breathe pointer-events-none absolute h-56 w-56 rounded-full bg-primary/25 blur-3xl md:h-72 md:w-72" />
        <svg
          viewBox="0 0 120 120"
          className="relative h-44 w-44 md:h-56 md:w-56"
          style={{ filter: "drop-shadow(0 0 10px rgba(231,255,71,.35))" }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="vz-fill" gradientUnits="userSpaceOnUse" x1="60" y1="92" x2="60" y2="34">
              <stop offset={off} stopColor="#E7FF47" stopOpacity={1} />
              <stop offset={off} stopColor="#E7FF47" stopOpacity={0.16} />
            </linearGradient>
          </defs>
          <path d="M28 36 L60 90 L92 36" fill="none" stroke="url(#vz-fill)" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M41 64 L79 64" fill="none" stroke="url(#vz-fill)" strokeWidth={12} strokeLinecap="round" />
        </svg>
      </div>
    </div>,
    document.body
  );
}
