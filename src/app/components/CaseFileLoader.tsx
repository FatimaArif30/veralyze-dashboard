import { useEffect, useRef, useState } from "react";
import { Check, Pin } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import veralyzeLogo from "../../imports/image-2.png";

type CaseFileMode = "manipulation" | "sources";
type Beat = "rising" | "subject" | "evidence-1" | "evidence-2" | "evidence-3" | "evidence-4" | "pending";

const MIN_DISPLAY_MS = 2500;
const FAST_BEAT_MS = 220;
const BEAT_DURATIONS: Record<Exclude<Beat, "pending">, number> = {
  rising: 900,
  subject: 800,
  "evidence-1": 1400,
  "evidence-2": 1400,
  "evidence-3": 1400,
  "evidence-4": 1400,
};
const BEAT_ORDER: Exclude<Beat, "pending">[] = ["rising", "subject", "evidence-1", "evidence-2", "evidence-3", "evidence-4"];

const SLOTS: Record<CaseFileMode, { label: string; active: string; done: string }[]> = {
  manipulation: [
    { label: "Transcript", active: "pulling…", done: "pulled" },
    { label: "Claims extracted", active: "extracting…", done: "extracted" },
    { label: "Sources cross-checked", active: "cross-checking…", done: "cross-checked" },
    { label: "Manipulation patterns", active: "weighing…", done: "weighed" },
  ],
  sources: [
    { label: "Transcript", active: "pulling…", done: "pulled" },
    { label: "Claims extracted", active: "extracting…", done: "extracted" },
    { label: "Sources cross-checked", active: "cross-checking…", done: "cross-checked" },
    { label: "Evidence weighed", active: "weighing…", done: "weighed" },
  ],
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

function shortenUrl(url?: string | null): string {
  if (!url) return "";
  const stripped = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  return stripped.length > 46 ? `${stripped.slice(0, 46)}…` : stripped;
}

type Stamp = { label: string; sub: string; tone: "lime" | "amber" | "red" | "muted" };

function computeStamp(mode: CaseFileMode, result: any): Stamp | null {
  if (!result || result.ok === false) return null;
  if (mode === "manipulation") {
    const verdict = result.verdict === "AVOID" ? "AVOID" : result.verdict === "CAUTION" ? "CAUTION" : "TRUST";
    const score = typeof result.stats?.trust_score === "number" ? result.stats.trust_score : null;
    const tone = verdict === "AVOID" ? "red" : verdict === "CAUTION" ? "amber" : "lime";
    return { label: verdict, sub: score != null ? `${score} / 100` : "— / 100", tone };
  }
  const status = result.summary?.status;
  const map: Record<string, { label: string; tone: Stamp["tone"] }> = {
    VERIFIED: { label: "VERIFIED", tone: "lime" },
    MIXED: { label: "MIXED", tone: "amber" },
    DISPUTED: { label: "DISPUTED", tone: "red" },
  };
  const { label, tone } = map[status] || { label: "INCONCLUSIVE", tone: "muted" };
  const score = result.summary?.credibility_score;
  return { label, sub: typeof score === "number" ? `${score}%` : "—", tone };
}

const TONE_CLASSES: Record<Stamp["tone"], string> = {
  lime: "border-primary/50 bg-primary text-[#181818]",
  amber: "border-orange-300/50 bg-orange-400 text-[#181818]",
  red: "border-red-400/50 bg-red-500 text-white",
  muted: "border-[#9a9f62]/50 bg-[#9a9f62] text-[#181818]",
};

export interface CaseFileLoaderProps {
  mode: CaseFileMode;
  videoId?: string | null;
  title?: string | null;
  url?: string | null;
  result?: any | null;
  onRevealComplete?: () => void;
}

export function CaseFileLoader({ mode, videoId, title, url, result, onRevealComplete }: CaseFileLoaderProps) {
  const reducedMotion = usePrefersReducedMotion();
  const mountedAt = useRef(Date.now());
  const resultRef = useRef(result);
  resultRef.current = result;
  const doneRef = useRef(false);

  const [beat, setBeat] = useState<Beat>("rising");
  const [revealStage, setRevealStage] = useState<"idle" | "stamping" | "stamped" | "fading">("idle");
  const [imgErr, setImgErr] = useState(false);
  const [typed, setTyped] = useState(false);

  const safeTitle = title && title.trim().toLowerCase() !== "youtube" ? title.trim() : null;
  const displayText = safeTitle || shortenUrl(url) || "Untitled video";
  const thumbSrc = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;

  useEffect(() => {
    setImgErr(false);
  }, [thumbSrc]);

  // Once the type-in effect has played, settle into normal wrapped/clamped text
  // so long titles don't stay pinned to a single non-wrapping line.
  useEffect(() => {
    if (beat === "rising") return;
    const t = setTimeout(() => setTyped(true), 750);
    return () => clearTimeout(t);
  }, [beat]);

  const complete = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onRevealComplete?.();
  };

  // Choreography timeline (skipped entirely for reduced motion).
  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let i = 0;
    function step() {
      if (cancelled) return;
      if (i >= BEAT_ORDER.length) {
        setBeat("pending");
        return;
      }
      const key = BEAT_ORDER[i];
      setBeat(key);
      const dur = resultRef.current != null ? Math.min(BEAT_DURATIONS[key], FAST_BEAT_MS) : BEAT_DURATIONS[key];
      timer = setTimeout(() => {
        i += 1;
        step();
      }, dur);
    }
    step();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  // Reveal trigger once a result exists and the boot sequence has reached its pending loop.
  useEffect(() => {
    if (reducedMotion) return;
    if (beat !== "pending" || result == null || revealStage !== "idle") return;
    const elapsed = Date.now() - mountedAt.current;
    const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
    const t = setTimeout(() => {
      if (result.ok === false) {
        setRevealStage("fading");
        setTimeout(complete, 380);
        return;
      }
      setRevealStage("stamping");
      setTimeout(() => setRevealStage("stamped"), 700);
      setTimeout(() => setRevealStage("fading"), 1300);
      setTimeout(complete, 1680);
    }, wait);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, result, reducedMotion, revealStage]);

  // Reduced-motion reveal: skip choreography, just honor the minimum display time.
  useEffect(() => {
    if (!reducedMotion || result == null) return;
    const elapsed = Date.now() - mountedAt.current;
    const wait = Math.max(0, 900 - elapsed);
    const t = setTimeout(complete, wait);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, result]);

  const slots = SLOTS[mode];
  const evidenceIndex = beat === "pending" ? slots.length : Math.max(0, BEAT_ORDER.indexOf(beat) - 1);
  const stamp = computeStamp(mode, result);
  const showTag = revealStage === "stamped" || revealStage === "fading" ? "Closed" : "Open";

  if (reducedMotion) {
    return (
      <div className="relative mx-auto min-h-[220px] w-full max-w-[720px] overflow-hidden rounded-[28px] border border-white/[.095] bg-white/[.055] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,.30),inset_0_1px_0_rgba(255,255,255,.075)] backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-[#111]">
            {thumbSrc && !imgErr ? (
              <img src={thumbSrc} alt="" onError={() => setImgErr(true)} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-white/[.06]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 break-words text-sm font-black leading-snug text-white">{displayText}</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[.14em] text-white/40">Analysing…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto min-h-[480px] w-full max-w-[720px]">
      <style>{`
        @keyframes cfl-rise{from{opacity:0;transform:translateY(28px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes cfl-pin{from{opacity:0;transform:translateY(-10px) rotate(0deg)}to{opacity:1;transform:translateY(0) rotate(-4deg)}}
        @keyframes cfl-sweep{from{background-position:-140% 0}to{background-position:240% 0}}
        @keyframes cfl-pop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
        @keyframes cfl-dot{0%,100%{opacity:.35;transform:scale(.85)}50%{opacity:1;transform:scale(1.1)}}
        @keyframes cfl-type{from{width:0}to{width:100%}}
        @keyframes cfl-stamp{0%{opacity:0;transform:scale(2.2) rotate(-14deg)}55%{opacity:1;transform:scale(.92) rotate(-6deg)}75%{transform:scale(1.06) rotate(-8deg)}100%{transform:scale(1) rotate(-6deg);opacity:1}}
        @keyframes cfl-flash{0%{opacity:.85}100%{opacity:0}}
        @keyframes cfl-fadeout{from{opacity:1}to{opacity:0}}
        .cfl-card-rise{animation:cfl-rise .6s cubic-bezier(.22,1,.36,1) both}
        .cfl-pin{animation:cfl-pin .45s cubic-bezier(.22,1,.36,1) both}
        .cfl-type{display:inline-block;overflow:hidden;white-space:nowrap;vertical-align:bottom;max-width:100%;border-right:2px solid rgba(231,255,71,.7);animation:cfl-type .7s steps(30,end) both}
        .cfl-sweep{background-image:linear-gradient(100deg,transparent 30%,rgba(231,255,71,.55) 50%,transparent 70%);background-size:220% 100%;animation:cfl-sweep 1s ease-in-out both}
        .cfl-pop{animation:cfl-pop .35s cubic-bezier(.22,1,.36,1) both}
        .cfl-dot{animation:cfl-dot 1.4s ease-in-out infinite}
        .cfl-stamp{animation:cfl-stamp .55s cubic-bezier(.34,1.56,.64,1) both}
        .cfl-flash{animation:cfl-flash .5s ease-out both}
        .cfl-fadeout{animation:cfl-fadeout .4s ease-out both}
        @keyframes cfl-flow{to{stroke-dashoffset:-322}}
        .cfl-flow{stroke-dasharray:22 300;filter:drop-shadow(0 0 6px rgba(231,255,71,.55));animation:cfl-flow 1.5s linear infinite}
      `}</style>
      <div
        className={`relative overflow-hidden rounded-[28px] border border-white/[.095] bg-white/[.055] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,.30),inset_0_1px_0_rgba(255,255,255,.075)] backdrop-blur-xl cfl-card-rise ${
          revealStage === "fading" ? "cfl-fadeout" : ""
        }`}
      >
        <div className="pointer-events-none absolute inset-x-10 top-0 -z-0 h-32 rounded-full bg-primary/[.09] blur-3xl" />
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 120 120" className="size-8 shrink-0" aria-hidden="true">
              <path d="M28 36 L60 90 L92 36" fill="none" stroke="rgba(231,255,71,.16)" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M41 64 L79 64" fill="none" stroke="rgba(231,255,71,.16)" strokeWidth={12} strokeLinecap="round" />
              <path className="cfl-flow" d="M28 36 L60 90 L92 36" fill="none" stroke="#E7FF47" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
              <path className="cfl-flow" d="M41 64 L79 64" fill="none" stroke="#E7FF47" strokeWidth={12} strokeLinecap="round" />
            </svg>
            <span className="text-xs font-black tracking-[.18em] text-white/70">VERALYZE</span>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] transition-colors duration-300 ${
              showTag === "Closed" ? "border-white/20 bg-white/[.08] text-white/70" : "border-primary/30 bg-primary/[.10] text-primary"
            }`}
          >
            Case file · {showTag}
          </span>
        </div>

        <div className="relative z-10 mt-6 flex items-start gap-4">
          <div className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-[#111] shadow-lg ${beat !== "rising" ? "cfl-pin" : "opacity-0"}`}>
            {thumbSrc && !imgErr ? (
              <img src={thumbSrc} alt="" onError={() => setImgErr(true)} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-white/[.05]" />
            )}
            <span className="absolute -top-2 left-1/2 grid -translate-x-1/2 place-items-center rounded-full bg-[#181818] p-1 shadow-md" aria-hidden="true">
              <Pin size={14} className="rotate-45 text-primary" fill="#E7FF47" />
            </span>
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/35">Subject under review</p>
            {beat !== "rising" ? (
              <p className="mt-1 max-w-full text-sm font-black leading-snug text-white">
                {typed ? (
                  <span className="line-clamp-2 break-words">{displayText}</span>
                ) : (
                  <span className="cfl-type max-w-full truncate">{displayText}</span>
                )}
              </p>
            ) : (
              <p className="mt-1 text-sm font-black text-transparent">.</p>
            )}
          </div>
        </div>

        <div className="relative z-10 mt-6 grid gap-2">
          {slots.map((s, i) => {
            const isDone = i < evidenceIndex;
            const isActive = i === evidenceIndex && beat !== "pending" && beat !== "rising" && beat !== "subject";
            return (
              <div
                key={s.label}
                className={`relative flex items-center justify-between overflow-hidden rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors duration-300 ${
                  isDone ? "border-primary/25 bg-primary/[.08] text-white" : isActive ? "border-white/15 bg-white/[.05] text-white" : "border-white/10 bg-black/20 text-white/35"
                } ${isActive ? "cfl-sweep" : ""}`}
              >
                <span className="uppercase tracking-[.08em]">{s.label}</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-white/45">{isDone ? s.done : isActive ? s.active : ""}</span>
                  {isDone && (
                    <span className="cfl-pop grid size-4 place-items-center rounded-full bg-primary text-[#181818]">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <div className="relative z-10 mt-5 flex min-h-[34px] items-center gap-2 border-t border-white/10 pt-4">
          {revealStage === "idle" && (
            <>
              <span className="cfl-dot size-2 shrink-0 rounded-full bg-primary" />
              <span className="text-xs font-black uppercase tracking-[.14em] text-white/45">Verdict · Pending</span>
            </>
          )}
          {(revealStage === "stamping" || revealStage === "stamped" || revealStage === "fading") && stamp && (
            <div className={`cfl-stamp flex items-center gap-3 rounded-2xl border-2 px-4 py-2 ${TONE_CLASSES[stamp.tone]}`}>
              <span className="text-sm font-black uppercase tracking-[.1em]">{stamp.label}</span>
              <span className="text-sm font-black">{stamp.sub}</span>
            </div>
          )}
        </div>
      </div>
      {revealStage === "stamping" && <div className="cfl-flash pointer-events-none absolute inset-0 z-20 rounded-[28px] bg-white" />}
    </div>
  );
}
