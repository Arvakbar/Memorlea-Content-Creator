'use strict';
let bookingPackages = [];
let quoteGeneration = 0;
let currentQuote = null;
async function loadBookingPackages() {
  const select = document.getElementById('package');
  const button = document.getElementById('submit-btn');
  select.disabled = true; button.disabled = true;
  try {
    const { data, error } = await db.from('service_packages').select('code,name,price,duration_hours').eq('active', true).order('price');
    if (error) throw error;
    bookingPackages = data || [];
    select.replaceChildren(new Option('— Pilih Paket —', ''));
    for (const pkg of bookingPackages) select.add(new Option(pkg.name + ' · ' + MemorleaCatalog.money(pkg.price) + ' · ' + pkg.duration_hours + ' jam', pkg.code));
    if (!bookingPackages.length) throw new Error('empty');
    select.disabled = false; button.disabled = false;
    document.getElementById('booking-quote').textContent = 'Pilih paket untuk melihat estimasi harga.';
  } catch (error) {
    document.getElementById('booking-quote').textContent = 'Paket belum dapat dimuat. Muat ulang halaman untuk mencoba lagi atau hubungi tim Memorlea.';
  }
}
async function refreshBookingQuote() {
  const generation = ++quoteGeneration;
  const pkg = document.getElementById('package').value;
  const message = document.getElementById('booking-quote');
  currentQuote = null;
  if (!pkg) { message.textContent = 'Pilih paket terlebih dahulu.'; return null; }
  const voucher = document.getElementById('voucher-code').value.trim().toUpperCase();
  message.textContent = 'Memeriksa harga dan voucher…';
  try {
    const { data, error } = await db.rpc('memorlea_quote', { p_package: pkg, p_voucher: voucher });
    if (generation !== quoteGeneration) return null;
    if (error) throw error;
    currentQuote = data;
    message.textContent = data.package_name + ': ' + MemorleaCatalog.money(data.package_price) + ' − diskon ' + MemorleaCatalog.money(data.discount_amount) + ' = ' + MemorleaCatalog.money(data.total_price) + '. Estimasi harga paket; belum termasuk biaya tambahan. Harga diperiksa kembali saat pengiriman.';
    return data;
  } catch (error) {
    if (generation !== quoteGeneration) return null;
    message.textContent = error.code === 'P0001' ? error.message : 'Harga belum dapat diperiksa. Coba lagi sebentar.';
    return null;
  }
}
document.addEventListener('DOMContentLoaded', () => {
  loadBookingPackages();
  document.getElementById('package').addEventListener('change', refreshBookingQuote);
  document.getElementById('check-voucher').addEventListener('click', refreshBookingQuote);
  document.getElementById('voucher-code').addEventListener('input', () => {
    ++quoteGeneration; currentQuote = null;
    document.getElementById('booking-quote').textContent = 'Klik Cek Voucher untuk memperbarui estimasi harga.';
  });
});
