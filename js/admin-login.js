async function checkExistingLogin() {
  try {
    const { data: { session }, error } = await db.auth.getSession();
    if (error) throw error;
    if (!session) return;
    const loginAt = Number(localStorage.getItem(MemorleaAuth.sessionKey));
    if (loginAt && Date.now() - loginAt > MemorleaAuth.timeoutMs) {
      await db.auth.signOut({ scope: 'local' });
      localStorage.removeItem(MemorleaAuth.sessionKey);
      return;
    }
    const { data: { user }, error: userError } = await db.auth.getUser();
    if (userError) throw userError;
    if (MemorleaAuth.isAdmin(user)) window.location.href = 'admin.html';
    else MemorleaAuth.message('Akun belum memiliki izin Admin. Hubungi pengelola untuk aktivasi.');
  } catch (error) {
    MemorleaAuth.message(MemorleaAuth.errorMessage(error));
  }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  if (btn.disabled) return;
  const email = MemorleaAuth.email(document.getElementById('email').value);
  const password = document.getElementById('password').value;
  if (!MemorleaAuth.validEmail(email) || !password) {
    return MemorleaAuth.message('Masukkan email yang valid dan password.');
  }
  MemorleaAuth.message('');
  MemorleaAuth.busy(btn, true, 'Masuk');
  try {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
      return MemorleaAuth.message(error.code === 'invalid_credentials'
        ? 'Email atau password salah.' : MemorleaAuth.errorMessage(error));
    }
    const { data: { user }, error: userError } = await db.auth.getUser();
    if (userError) throw userError;
    if (!MemorleaAuth.isAdmin(user)) {
      await db.auth.signOut({ scope: 'local' });
      localStorage.removeItem(MemorleaAuth.sessionKey);
      return MemorleaAuth.message('Akun belum memiliki izin Admin. Hubungi pengelola untuk aktivasi.');
    }
    localStorage.setItem(MemorleaAuth.sessionKey, Date.now().toString());
    window.location.href = 'admin.html';
  } catch (error) {
    MemorleaAuth.message(MemorleaAuth.errorMessage(error));
  } finally {
    document.getElementById('password').value = '';
    MemorleaAuth.busy(btn, false, 'Masuk');
  }
});
checkExistingLogin();
