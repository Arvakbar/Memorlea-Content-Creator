'use strict';
const catalogState = { packages: [], vouchers: [] };
const catalogConfig = {
  packages: { table: 'service_packages', title: 'Paket Layanan', singular: 'Paket', validate: MemorleaCatalog.packageData },
  vouchers: { table: 'vouchers', title: 'Voucher / Diskon', singular: 'Voucher', validate: MemorleaCatalog.voucherData },
};
function catalogMessage(kind, text, ok = false) {
  const el = document.getElementById(kind + '-message');
  el.textContent = text; el.style.color = ok ? '#167344' : '#b91c1c';
}
async function loadCatalog(kind) {
  const tableBody = document.getElementById(kind + '-rows');
  tableBody.textContent = '';
  catalogMessage(kind, 'Memuat data…', true);
  try {
    const { data, error } = await db.from(catalogConfig[kind].table).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    catalogState[kind] = data || [];
    renderCatalog(kind); catalogMessage(kind, '');
  } catch (error) {
    catalogState[kind] = [];
    catalogMessage(kind, 'Data belum dapat dimuat. Coba lagi; jika ini pemasangan awal, jalankan supabase_catalog.sql.');
  }
}
function renderCatalog(kind) {
  const tbody = document.getElementById(kind + '-rows');
  tbody.replaceChildren();
  const query = document.getElementById(kind + '-search').value.trim().toLowerCase();
  const rows = catalogState[kind].filter(row => (row.code + ' ' + (row.name || '')).toLowerCase().includes(query));
  if (!rows.length) {
    const tr = tbody.insertRow(); const td = tr.insertCell(); td.colSpan = 5; td.textContent = 'Belum ada data yang sesuai.';
  }
  for (const row of rows) {
    const tr = tbody.insertRow();
    const values = kind === 'packages'
      ? [row.name + ' (' + row.code + ')', MemorleaCatalog.money(row.price), row.duration_hours + ' jam', row.active ? 'Aktif' : 'Nonaktif']
      : [row.code, row.percent + '% · Min. ' + MemorleaCatalog.money(row.min_purchase), row.starts_on + ' — ' + row.ends_on, row.active ? 'Aktif' : 'Nonaktif'];
    values.forEach(value => { tr.insertCell().textContent = value; });
    const td = tr.insertCell(); const button = document.createElement('button');
    button.type = 'button'; button.className = 'action-btn action-edit'; button.textContent = 'Edit';
    button.addEventListener('click', () => editCatalog(kind, row)); td.append(button);
  }
}
function resetCatalog(kind) {
  const form = document.getElementById(kind + '-form');
  form.reset(); form.dataset.editCode = '';
  form.elements.code.disabled = false;
  document.getElementById(kind + '-form-title').textContent = 'Tambah ' + catalogConfig[kind].singular;
  catalogMessage(kind, '');
}
function editCatalog(kind, row) {
  resetCatalog(kind);
  const form = document.getElementById(kind + '-form');
  for (const [key, value] of Object.entries(row)) {
    const field = form.elements.namedItem(key);
    if (field) { if (field.type === 'checkbox') field.checked = value; else field.value = value; }
  }
  form.dataset.editCode = row.code; form.elements.code.disabled = true;
  document.getElementById(kind + '-form-title').textContent = 'Edit ' + catalogConfig[kind].singular;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function saveCatalog(event, kind) {
  event.preventDefault();
  const form = event.currentTarget; const btn = form.querySelector('[type="submit"]');
  if (btn.disabled) return;
  catalogMessage(kind, '');
  let payload;
  try {
    const raw = Object.fromEntries(new FormData(form));
    raw.code = form.elements.code.value; raw.active = form.elements.active.checked;
    payload = catalogConfig[kind].validate(raw);
  } catch (error) { return catalogMessage(kind, error.message); }
  btn.disabled = true; btn.textContent = 'Menyimpan…';
  try {
    const editing = form.dataset.editCode;
    let request;
    if (editing) {
      const { code, ...changes } = payload;
      request = db.from(catalogConfig[kind].table).update(changes).eq('code', editing);
    } else request = db.from(catalogConfig[kind].table).insert(payload);
    const { data, error } = await request.select('code');
    if (error) throw error;
    if (!data?.length) throw new Error('not-saved');
    resetCatalog(kind); await loadCatalog(kind);
    catalogMessage(kind, catalogConfig[kind].singular + ' berhasil disimpan.', true);
  } catch (error) {
    catalogMessage(kind, error.code === '23505' ? 'Kode sudah digunakan. Gunakan kode lain.' : 'Data gagal disimpan. Periksa koneksi dan izin akun, lalu coba lagi.');
  } finally { btn.disabled = false; btn.textContent = 'Simpan'; }
}
document.addEventListener('DOMContentLoaded', () => {
  for (const kind of Object.keys(catalogConfig)) {
    document.getElementById(kind + '-form').addEventListener('submit', event => saveCatalog(event, kind));
    document.getElementById(kind + '-cancel').addEventListener('click', () => resetCatalog(kind));
    document.getElementById(kind + '-search').addEventListener('input', () => renderCatalog(kind));
    document.getElementById(kind + '-reload').addEventListener('click', () => loadCatalog(kind));
  }
});
