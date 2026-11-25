document.getElementById('register-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const btn = document.getElementById('register-btn');
  if (btn.disabled) return;
  const email = MemorleaAuth.email(document.getElementById('email').value);
  const password = document.getElementById('password').value;
  const confirmation = document.getElementById('confirm-password').value;
  if (!MemorleaAuth.validEmail(email)) return MemorleaAuth.message('Masukkan email yang valid.');
  const validation = MemorleaAuth.passwordError(password, confirmation);
  if (validation) return MemorleaAuth.message(validation);
  MemorleaAuth.message('');
  MemorleaAuth.busy(btn, true, 'Daftar');
  try {
    const { data, error } = await db.auth.signUp({
      email, password,
      options: { emailRedirectTo: MemorleaAuth.redirectUrl('admin-login.html') },
    });
    if (error) throw error;
    // Supabase dapat mengaburkan akun duplikat sebagai user tanpa identities.
    if (data.user?.identities?.length === 0) {
      return MemorleaAuth.message('Pendaftaran tidak dapat dilanjutkan. Jika email sudah terdaftar, gunakan Login atau Lupa Password.');
    }
    if (!data.user) throw new Error('Missing signup user');
    if (data.session) await db.auth.signOut({ scope: 'local' });
    MemorleaAuth.message(data.session
      ? 'Pendaftaran berhasil. Akun belum memiliki izin Admin; hubungi pengelola untuk aktivasi, lalu Login.'
      : 'Permintaan pendaftaran diterima. Periksa email untuk konfirmasi. Jika email sudah digunakan, pilih Login atau Lupa Password. Akses Admin tetap memerlukan persetujuan pengelola.', 'success');
    document.getElementById('register-form').reset();
  } catch (error) {
    MemorleaAuth.message(MemorleaAuth.errorMessage(error));
  } finally {
    document.getElementById('password').value = '';
    document.getElementById('confirm-password').value = '';
    MemorleaAuth.busy(btn, false, 'Daftar');
  }
});
