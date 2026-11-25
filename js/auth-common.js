// Password tidak disimpan sendiri. Otorisasi sebenarnya ditegakkan oleh RLS.
const MemorleaAuth = {
  sessionKey: 'memorlea_admin_login_at',
  timeoutMs: 8 * 60 * 60 * 1000,
  isAdmin(user) { return user?.app_metadata?.role === 'admin'; },
  email(value) { return value.trim().toLowerCase(); },
  validEmail(value) { return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); },
  passwordError(password, confirmation) {
    if (password.length < 8) return 'Password minimal 8 karakter.';
    if (password !== confirmation) return 'Konfirmasi password tidak cocok.';
    return '';
  },
  redirectUrl(page) {
    const url = new URL(page, window.location.href);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Gunakan Live Server atau server HTTP lokal.');
    return url.href;
  },
  message(text, kind = 'error') {
    const el = document.getElementById('auth-message');
    el.textContent = text;
    el.dataset.kind = kind;
    el.hidden = !text;
  },
  busy(button, busy, idleText) {
    button.disabled = busy;
    button.textContent = busy ? 'Memproses...' : idleText;
  },
  errorMessage(error) {
    if (error?.code === 'email_not_confirmed') return 'Email belum terverifikasi. Buka tautan konfirmasi pada email pendaftaran terlebih dahulu.';
    if (error?.code === 'user_already_exists' || error?.code === 'email_exists') return 'Email sudah terdaftar. Silakan Login atau gunakan Lupa Password.';
    if (error?.status === 429 || error?.code?.includes('rate_limit')) return 'Terlalu banyak permintaan. Tunggu beberapa saat lalu coba lagi.';
    if (error?.code === 'weak_password') return 'Password ditolak. Gunakan minimal 8 karakter dan ikuti kebijakan password layanan.';
    if (error?.code === 'same_password') return 'Gunakan password baru yang berbeda dari password sebelumnya.';
    if (error?.name === 'AuthRetryableFetchError' || error instanceof TypeError) return 'Koneksi bermasalah. Periksa internet lalu coba lagi.';
    return 'Permintaan gagal diproses. Silakan coba lagi.';
  },
};
