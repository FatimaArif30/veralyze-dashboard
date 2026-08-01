import { supabase } from './supabase';

// Persistent anonymous id for this browser (so we can count unique visitors
// and free analyses done without an account).
// Shared anonymous id stored in a cookie scoped to .veralyze.net, so the same
// person is recognised across the landing page (veralyze.net) and this app
// (app.veralyze.net). localStorage is per-origin and would NOT be shared.
function anonId(): string {
  try {
    const m = document.cookie.match(/(?:^|;\s*)vz_anon=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
    const id =
      (crypto as any)?.randomUUID?.() ||
      's' + Date.now().toString(36) + Math.random().toString(36).slice(2);
    const shared = location.hostname.endsWith('veralyze.net') ? '; domain=.veralyze.net' : '';
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `vz_anon=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax${shared}${secure}`;
    return id;
  } catch {
    return 'unknown';
  }
}

async function log(type: string, extra: Record<string, any> = {}) {
  try {
    const { data } = await supabase.auth.getSession();
    await supabase.from('usage_events').insert({
      type,
      anon_id: anonId(),
      user_id: data?.session?.user?.id ?? null,
      path: typeof window !== 'undefined' ? window.location.pathname : null,
      ...extra,
    });
  } catch {
    // Analytics must never break the app.
  }
}

// One row every time the app loads. If the visitor arrived from a landing-page
// CTA, that button is passed as ?from=... and recorded as the visit source.
export function trackVisit() {
  let source: string | null = null;
  try {
    source = new URLSearchParams(window.location.search).get('from');
  } catch {
    /* ignore */
  }
  log('visit', { source: source ?? 'app' });
}

// One row every time an analysis result comes back (anonymous or signed-in).
// Also records which video was analysed, so we can see what anonymous users run.
export function trackAnalysis(mode: string, data?: any) {
  log('analysis', {
    mode,
    video_url: data?.video_url ?? null,
    video_id: data?.video_id ?? null,
    video_title: data?.video_title ?? null,
  });
}
