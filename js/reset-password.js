let recoveryReady = false;
const invalidRecoveryMessage = 'Tautan pemulihan tidak valid atau sudah kedaluwarsa. Minta tautan baru melalui Lupa Password.';

async function initializeRecovery() {
  try {
    // Klien reset tidak membaca sesi login biasa dari localStorage.
    if (!HAS_RECOVERY_LINK) {
      history.replaceState(null, '', window.location.pathname);
      MemorleaAuth.message(invalidRecoveryMessage);
      return;
    }
    // getSession menunggu SDK memproses callback resmi (implicit flow).
    const { data: { session }, error } = await db.auth.getSession();
    // Bersihkan token dari address bar, termasuk pada callback yang gagal.
    history.replaceState(null, '', window.location.pathname);
    if (error || !session) {
      MemorleaAuth.message(invalidRecoveryMessage);
      return;
    }
    const { data: { user }, error: userError } = await db.auth.getUser();
    if (userError || !user) {
      MemorleaAuth.message(userError?.name === 'AuthRetryableFetchError'
        ? 'Koneksi bermasalah saat memverifikasi tautan. Minta tautan baru dan coba lagi.' : invalidRecoveryMessage);
      return;
    }
    recoveryReady = true;
    document.getElementById('reset-fields').disabled = false;
    MemorleaAuth.message('Tautan terverifikasi. Silakan masukkan password baru.', 'success');
  } catch (_) {
    history.replaceState(null, '', window.location.pathname);
    MemorleaAuth.message('Koneksi bermasalah saat memverifikasi tautan. Minta tautan baru dan coba lagi.');
  }
}

document.getElementById('reset-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const btn = document.getElementById('reset-btn');
  if (btn.disabled) return;
  if (!recoveryReady) return MemorleaAuth.message(invalidRecoveryMessage);
  const password = document.getElementById('password').value;
  const validation = MemorleaAuth.passwordError(password, document.getElementById('confirm-password').value);
  if (validation) return MemorleaAuth.message(validation);
  MemorleaAuth.busy(btn, true, 'Simpan Password Baru');
  try {
    // Verifikasi ulang agar sesi yang kedaluwarsa saat form terbuka ditolak.
    const { data: { user }, error: sessionError } = await db.auth.getUser();
    if (sessionError?.name === 'AuthRetryableFetchError') throw sessionError;
    if (sessionError || !user) {
      recoveryReady = false;
      document.getElementById('reset-fields').disabled = true;
      return MemorleaAuth.message(invalidRecoveryMessage);
    }
    const { error } = await db.auth.updateUser({ password });
    if (error) {
      if (error.status === 401 || error.status === 403 || ['session_not_found', 'refresh_token_not_found'].includes(error.code)) {
        recoveryReady = false;
        document.getElementById('reset-fields').disabled = true;
        return MemorleaAuth.message(invalidRecoveryMessage);
      }
      throw error;
    }
    recoveryReady = false;
    document.getElementById('reset-form').hidden = true;
    document.getElementById('reset-form').reset();
    localStorage.removeItem(MemorleaAuth.sessionKey);
    // Perubahan password sudah berhasil; kegagalan logout tidak boleh memicu
    // percobaan update kedua. Sesi reset hanya berada dalam memori halaman ini.
    try { await db.auth.signOut({ scope: 'local' }); } catch (_) {}
    MemorleaAuth.message('Password berhasil diperbarui. Kembali ke Login dan gunakan password baru.', 'success');
  } catch (error) {
    MemorleaAuth.message(MemorleaAuth.errorMessage(error));
  } finally {
    document.getElementById('password').value = '';
    document.getElementById('confirm-password').value = '';
    MemorleaAuth.busy(btn, false, 'Simpan Password Baru');
  }
});
initializeRecovery();
