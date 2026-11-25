// Ganti dengan credentials dari Supabase Dashboard → Project Settings → API
const SUPABASE_URL      = 'https://rugcnyuuowbwzvrmduet.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1Z2NueXV1b3did3p2cm1kdWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NzMxMDAsImV4cCI6MjEwODE0OTEwMH0.9qCFTzEDv7jCUxp9HwRRt4k9LZ_Do97uRxJylKQUxq4';

// 'supabase' di sini adalah global dari CDN (window.supabase)
// Kita simpan ke variable 'db' supaya tidak conflict dengan nama global CDN
// Form auth baru memakai sesi memori terpisah dari sesi admin di tab lain.
const AUTH_PAGE = document.body.dataset.authPage || '';
const RECOVERY_PARAMS = new URLSearchParams(window.location.hash.slice(1));
const HAS_RECOVERY_LINK = AUTH_PAGE === 'reset' &&
  RECOVERY_PARAMS.get('type') === 'recovery' &&
  !!RECOVERY_PARAMS.get('access_token') && !!RECOVERY_PARAMS.get('refresh_token') &&
  !RECOVERY_PARAMS.has('error');
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY,
  AUTH_PAGE ? { auth: {
    storageKey: 'memorlea-auth-' + AUTH_PAGE,
    persistSession: false,
    autoRefreshToken: AUTH_PAGE === 'reset',
    detectSessionInUrl: AUTH_PAGE === 'reset',
    flowType: 'implicit',
  } } : undefined);
