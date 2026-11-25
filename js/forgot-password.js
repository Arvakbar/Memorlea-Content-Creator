document.getElementById('forgot-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const btn = document.getElementById('forgot-btn');
  if (btn.disabled) return;
  const email = MemorleaAuth.email(document.getElementById('email').value);
  if (!MemorleaAuth.validEmail(email)) return MemorleaAuth.message('Masukkan email yang valid.');
  MemorleaAuth.message('');
  MemorleaAuth.busy(btn, true, 'Kirim Tautan Pemulihan');
  try {
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: MemorleaAuth.redirectUrl('reset-password.html'),
    });
    // Jangan tampilkan pesan provider yang dapat membocorkan keberadaan email.
    if (error && (error.status >= 500 || error.name === 'AuthRetryableFetchError')) throw error;
    if (error && (error.status === 429 || error.code?.includes('rate_limit'))) {
      return MemorleaAuth.message('Permintaan belum dapat diproses. Tunggu beberapa saat lalu coba lagi.');
    }
    MemorleaAuth.message('Jika email tersebut terdaftar, tautan pemulihan akan dikirim. Periksa inbox dan spam. Jika belum diterima, tunggu lalu coba lagi atau hubungi pengelola.', 'success');
  } catch (_) {
    MemorleaAuth.message('Permintaan belum dapat diproses. Periksa koneksi lalu coba lagi.');
  } finally {
    MemorleaAuth.busy(btn, false, 'Kirim Tautan Pemulihan');
  }
});
