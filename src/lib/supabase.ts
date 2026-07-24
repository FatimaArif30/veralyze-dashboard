import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hjcxigxeajihshkgslvt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqY3hpZ3hlYWppaHNoa2dzbHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNTk4NzksImV4cCI6MjA5NjkzNTg3OX0.MooXRoAB_8tI7RhepMK75TNr5AKPkMIiIHn1w6YORK4';

const COOKIE_DOMAIN = '.veralyze.net';
const useCookies =
  typeof window !== 'undefined' &&
  window.location.hostname.endsWith('veralyze.net');

const cookieStorage = {
  getItem(key: string) {
    const m = document.cookie.match(new RegExp('(^|; )' + key + '=([^;]*)'));
    return m ? decodeURIComponent(m[2]) : null;
  },
  setItem(key: string, value: string) {
    document.cookie = [
      key + '=' + encodeURIComponent(value),
      'path=/',
      'max-age=31536000',
      'SameSite=Lax',
      'Secure',
      'domain=' + COOKIE_DOMAIN,
    ].join('; ');
  },
  removeItem(key: string) {
    document.cookie = [
      key + '=',
      'path=/',
      'max-age=0',
      'domain=' + COOKIE_DOMAIN,
    ].join('; ');
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
