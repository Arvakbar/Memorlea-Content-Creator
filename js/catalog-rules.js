// Aturan fitur paket dan voucher. Dipakai UI admin dan pengujian lokal.
(function (root) {
  'use strict';
  function integer(value, min, max, label) {
    if (String(value ?? '').trim() === '') throw new Error(label + ' wajib diisi.');
    const n = Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max)
      throw new Error(label + ' harus bilangan bulat antara ' + min + ' dan ' + max + '.');
    return n;
  }
  function packageData(raw) {
    const name = String(raw.name || '').trim();
    const code = String(raw.code || '').trim().toLowerCase();
    const description = String(raw.description || '').trim();
    if (!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(code)) throw new Error('Kode paket: 2–40 huruf kecil, angka, tanda - atau _.');
    if (name.length < 3 || name.length > 80) throw new Error('Nama paket harus 3–80 karakter.');
    if (description.length > 1000) throw new Error('Deskripsi maksimal 1000 karakter.');
    return { code, name, description,
      price: integer(raw.price, 100000, 10000000, 'Harga'),
      duration_hours: integer(raw.duration_hours, 1, 24, 'Durasi'),
      active: raw.active === true };
  }
  function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value || '') &&
      Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  }
  function voucherData(raw) {
    const code = String(raw.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,24}$/.test(code)) throw new Error('Kode voucher: 3–24 huruf, angka, tanda - atau _.');
    if (!validDate(raw.starts_on) || !validDate(raw.ends_on) || raw.ends_on < raw.starts_on)
      throw new Error('Tanggal voucher harus valid; tanggal akhir tidak boleh sebelum tanggal mulai.');
    return { code, percent: integer(raw.percent, 1, 50, 'Diskon'),
      min_purchase: integer(raw.min_purchase, 0, 10000000, 'Minimal transaksi'),
      starts_on: raw.starts_on, ends_on: raw.ends_on, active: raw.active === true };
  }
  const api = { integer, packageData, voucherData,
    money: value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MemorleaCatalog = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
