import { supabase } from './supabase';

// Persistent anonymous id for this browser (so we can count unique visitors
// and free analyses done without an account).
function anonId(): string {
  try {
    let a = localStorage.getItem('vz_anon');
    if (!a) {
      a =
        (crypto as any)?.randomUUID?.() ||
        's' + Date.now().toString(36) + Math.random().toString(36).slice(2);
      localStorage.setItem('vz_anon', a);
    }
    return a;
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

// One row every time the app loads.
export function trackVisit() {
  log('visit');
}

// One row every time an analysis result comes back (anonymous or signed-in).
export function trackAnalysis(mode: string) {
  log('analysis', { mode });
}
