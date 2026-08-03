import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Minimal, centered loader: a full-screen blurred overlay with only the
// Veralyze monogram animating as a "pipe flow". When the result arrives it
// fades out and the parent reveals the report.

type CaseFileMode = "manipulation" | "sources";

const MIN_DISPLAY_MS = 1600;
const FADE_MS = 360;

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

  useEffect(() => {
    if (result == null || doneRef.current) return;
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

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-md transition-opacity duration-300 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      aria-label="Analysing"
      role="status"
    >
      <style>{`
        @keyframes vz-flow{to{stroke-dashoffset:-322}}
        .vz-flow{stroke-dasharray:22 300;filter:drop-shadow(0 0 10px rgba(231,255,71,.55));animation:vz-flow 1.5s linear infinite}
      `}</style>
      <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden="true">
        <path d="M28 36 L60 90 L92 36" fill="none" stroke="rgba(231,255,71,.16)" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M41 64 L79 64" fill="none" stroke="rgba(231,255,71,.16)" strokeWidth={12} strokeLinecap="round" />
        <path className="vz-flow" d="M28 36 L60 90 L92 36" fill="none" stroke="#E7FF47" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
        <path className="vz-flow" d="M41 64 L79 64" fill="none" stroke="#E7FF47" strokeWidth={12} strokeLinecap="round" />
      </svg>
    </div>,
    document.body
  );
}
