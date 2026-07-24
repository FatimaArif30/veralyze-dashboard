import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hjcxigxeajihshkgslvt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqY3hpZ3hlYWppaHNoa2dzbHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNTk4NzksImV4cCI6MjA5NjkzNTg3OX0.MooXRoAB_8tI7RhepMK75TNr5AKPkMIiIHn1w6YORK4';

const COOKIE_DOMAIN = '.veralyze.net';
const useCookies =
  typeof window !== 'undefined' &&
  window.location.hostname.endsWith('veralyze.net');

const MAX_CHUNK = 3000;
const MAX_CHUNKS = 20;

function writeCookie(name: string, value: string) {
  document.cookie = [
    name + '=' + encodeURIComponent(value),
    'path=/',
    'max-age=31536000',
    'SameSite=Lax',
    'Secure',
    'domain=' + COOKIE_DOMAIN,
  ].join('; ');
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/\./g, '\\.') + '=([^;]*)')
  );
  return m ? decodeURIComponent(m[1]) : null;
}

function deleteCookie(name: string) {
  document.cookie = [
    name + '=',
    'path=/',
    'max-age=0',
    'domain=' + COOKIE_DOMAIN,
  ].join('; ');
}

function clearAll(key: string) {
  deleteCookie(key);
  for (let i = 0; i < MAX_CHUNKS; i++) deleteCookie(key + '.' + i);
}

const cookieStorage = {
  getItem(key: string): string | null {
    try {
      const single = readCookie(key);
      if (single !== null) return single;
      let out = '';
      for (let i = 0; i < MAX_CHUNKS; i++) {
        const part = readCookie(key + '.' + i);
        if (part === null) break;
        out += part;
      }
      return out.length ? out : null;
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string) {
    try {
      clearAll(key);
      if (value.length <= MAX_CHUNK) {
        writeCookie(key, value);
        return;
      }
      let i = 0;
      for (let pos = 0; pos < value.length; pos += MAX_CHUNK) {
        writeCookie(key + '.' + i, value.slice(pos, pos + MAX_CHUNK));
        i++;
      }
    } catch {
      /* best effort */
    }
  },

  removeItem(key: string) {
    try {
      clearAll(key);
    } catch {
      /* ignore */
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: useCookies ? cookieStorage : undefined,
    storageKey: 'veralyze-auth',
    persistSession: true,
    autoRefreshToken: true,
  },
});
