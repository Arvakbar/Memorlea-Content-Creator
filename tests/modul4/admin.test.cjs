const assert = require('node:assert/strict');
const { after, describe, test } = require('node:test');
const { calls, coverage, harness, root, supabaseStub } = require('./harness.cjs');

if (coverage) after(() => require('./coverage-report.cjs').writeCoverage(coverage, root));

const now = Date.parse('2026-11-25T12:00:00Z');
class FixedDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : [now]));
  }
  static now() { return now; }
}
const day = 24 * 60 * 60 * 1000;

function admin(t, globals) {
  return harness(t, ['js/admin.js'], globals);
}

function catalog(t, globals) {
  return harness(t, ['js/catalog-rules.js', 'js/admin-catalog.js'], globals);
}

function json(value) {
  return JSON.parse(JSON.stringify(value));
}

describe('Dashboard', () => {
  for (const [label, statuses, expected] of [
    ['menghitung setiap status dan menggabungkan lunas dengan selesai',
      ['belum_dp', 'sudah_dp', 'lunas', 'selesai', 'selesai'], [5, 1, 1, 3]],
    ['menampilkan nol untuk daftar booking kosong', [], [0, 0, 0, 0]],
  ]) test('renderSummaryCards ' + label, t => {
    const h = admin(t);
    const cards = ['total', 'belum', 'dp', 'lunas'].map(id => h.add('card-' + id));
    h.seed({ allBookings: statuses.map(status => ({ status })) });

    h.context.renderSummaryCards();

    assert.deepEqual(cards.map(card => card.textContent), expected);
  });

  test('renderReminders hanya menampilkan booking belum DP yang melewati tiga hari', t => {
    const h = admin(t, { Date: FixedDate });
    const wrap = h.add('reminder-wrap');
    const list = h.add('reminder-list');
    const booking = (couple_name, age, props) => ({
      couple_name, status: 'belum_dp', created_at: new Date(now - age * day).toISOString(), ...props,
    });
    h.seed({ allBookings: [
      booking('Lewat batas', 4, { phone: '0812-3456', city: 'Malang', wedding_date: '2026-12-01' }),
      booking('Tanpa telepon', 5),
      booking('Tepat batas', 3),
      booking('Sudah lunas', 6, { status: 'lunas' }),
      booking('Tanpa tanggal', 6, { created_at: null }),
    ] });

    h.context.renderReminders();

    assert.equal(wrap.style.display, 'block');
    assert.match(list.innerHTML, /Lewat batas/);
    assert.match(list.innerHTML, /Tanpa telepon/);
    assert.match(list.innerHTML, /wa\.me\/628123456/);
    assert.equal((list.innerHTML.match(/wa\.me/g) ?? []).length, 1);
    assert.doesNotMatch(list.innerHTML, /Tepat batas|Sudah lunas|Tanpa tanggal/);
  });

  test('renderReminders menyembunyikan panel saat daftar kosong', t => {
    const h = admin(t);
    const wrap = h.add('reminder-wrap', { style: { display: 'block' } });
    h.add('reminder-list');

    h.context.renderReminders();

    assert.equal(wrap.style.display, 'none');
  });

  test('renderReminders berhenti aman jika elemen daftar tidak ada', t => {
    const h = admin(t);
    const wrap = h.add('reminder-wrap', { style: { display: 'block' } });

    h.context.renderReminders();

    assert.equal(wrap.style.display, 'block');
  });
});

describe('Bookings', () => {
  for (const [label, filters, expected] of [
    ['mencocokkan email tanpa membedakan kapital dan menggabungkan empat filter',
      ['ALFA', 'lunas', 'Malang', '2026-12'], ['a']],
    ['mengembalikan semua booking saat filter kosong', ['', '', '', ''], ['a', 'b', 'c', 'd', 'e']],
    ['mengembalikan daftar kosong saat kata kunci tidak cocok', ['ZETA', '', '', ''], []],
    ['mengabaikan filter bulan bila elemennya absen', ['alfa', '', 'Malang'], ['a', 'b', 'd', 'e']],
  ]) test('filterTable ' + label, t => {
    const h = admin(t);
    ['search-input', 'filter-status', 'filter-city', 'filter-month'].slice(0, filters.length)
      .forEach((id, index) => h.add(id, { value: filters[index] }));
    h.seed({ allBookings: [
      { id: 'a', city: 'Malang', email: 'alfa@example.test', status: 'lunas', wedding_date: '2026-12-03' },
      { id: 'b', city: 'Malang', email: 'alfa@example.test', status: 'belum_dp', wedding_date: '2026-12-01' },
      { id: 'c', city: 'Batu', email: 'alfa@example.test', status: 'lunas', wedding_date: '2026-12-01' },
      { id: 'd', city: 'Malang', email: 'alfa@example.test', status: 'lunas', wedding_date: '2026-11-01' },
      { id: 'e', city: 'Malang', email: 'alfa@example.test', status: 'lunas' },
    ] });
    const render = h.spy('renderTable');

    h.context.filterTable();

    assert.equal(render.mock.callCount(), 1);
    assert.deepEqual(json(render.mock.calls[0].arguments[0]).map(row => row.id), expected);
  });

  function statusFixture(t, responses, editingId, bookings) {
    const stub = supabaseStub(t, ...responses);
    const h = admin(t, { db: stub.db, Date: FixedDate });
    h.seed({ editingId, allBookings: bookings });
    h.add('modal-status', { value: 'lunas' });
    const refresh = ['closeModal', 'filterTable', 'renderSummaryCards', 'renderDashboardCharts',
      'renderCalendar', 'updateBadge', 'renderReminders'].map(name => h.spy(name));
    return { h, refresh, toast: h.spy('showToast'), request: stub.spy };
  }

  for (const status_log of [undefined, [{ from: 'belum_dp', to: 'sudah_dp', at: '2026-11-20T12:00:00Z' }]]) {
    test('saveStatus menyimpan status dan ' + (status_log ? 'mempertahankan riwayat lama' : 'membuat riwayat baru'), async t => {
      const booking = { id: 'a', status: 'sudah_dp', status_log };
      const f = statusFixture(t, [{ error: null }], 'a', [booking]);
      const log = [...(status_log ?? []), { from: 'sudah_dp', to: 'lunas', at: new Date(now).toISOString() }];

      await f.h.context.saveStatus();

      assert.deepEqual(calls(f.request), [[['from', 'bookings'], ['update', { status: 'lunas', status_log: log }], ['eq', 'id', 'a']]]);
      assert.deepEqual(json(booking), { id: 'a', status: 'lunas', status_log: log });
      assert.ok(f.refresh.every(spy => spy.mock.callCount() === 1));
      assert.deepEqual(calls(f.toast), [['Status berhasil diupdate!']]);
    });
  }

  for (const editingId of [null, 'tidak-ada']) test('saveStatus tidak mengirim query saat booking edit ' + editingId, async t => {
    const f = statusFixture(t, [], editingId, [{ id: 'a', status: 'belum_dp' }]);

    await f.h.context.saveStatus();

    assert.equal(f.request.mock.callCount(), 0);
    assert.equal(f.toast.mock.callCount(), 0);
    assert.ok(f.refresh.every(spy => spy.mock.callCount() === 0));
  });

  test('saveStatus mempertahankan status lokal jika Supabase gagal', async t => {
    const booking = { id: 'a', status: 'belum_dp' };
    const f = statusFixture(t, [{ error: { message: 'offline' } }], 'a', [booking]);

    await f.h.context.saveStatus();

    assert.equal(booking.status, 'belum_dp');
    assert.deepEqual(calls(f.toast), [['Gagal update status', 'error']]);
    assert.ok(f.refresh.every(spy => spy.mock.callCount() === 0));
  });

  test('saveStatus tidak memasukkan lagi booking yang hilang selama request', async t => {
    const bookings = [{ id: 'a', status: 'belum_dp' }];
    const f = statusFixture(t, [() => { bookings.pop(); return { error: null }; }], 'a', bookings);

    await f.h.context.saveStatus();

    assert.deepEqual(bookings, []);
    assert.ok(f.refresh.every(spy => spy.mock.callCount() === 1));
  });
});

describe('Kalender', () => {
  for (const [name, month, expected] of [
    ['prevMonth', 5, [2026, 4]], ['prevMonth', 0, [2025, 11]],
    ['nextMonth', 5, [2026, 6]], ['nextMonth', 11, [2027, 0]],
  ]) test(name + ' dari indeks bulan ' + month, t => {
    const h = admin(t);
    h.seed({ calMonth: month, calYear: 2026 });
    const render = h.spy('renderCalendar');

    h.context[name]();

    assert.deepEqual(json(h.read('[calYear, calMonth]')), expected);
    assert.equal(render.mock.callCount(), 1);
  });
});

describe('Analytics', () => {
  test('getPackageData memakai snapshot, nama lama, atau kode, lalu mengelompokkan duplikat', t => {
    const h = admin(t);
    h.seed({ allBookings: [
      { package: 'tara', package_name_snapshot: 'Paket Edisi Lama' },
      { package: 'tara' }, { package: 'tara' },
      { package: 'kustom' }, { package_name_snapshot: 'Tanpa kode' },
    ] });

    const result = h.context.getPackageData();

    assert.deepEqual(json(result), { labels: ['Paket Edisi Lama', 'Tara Package', 'kustom'], values: [1, 2, 1] });
  });

  test('getPackageData menghasilkan label dan nilai kosong tanpa data', t => {
    const h = admin(t);

    const result = h.context.getPackageData();

    assert.deepEqual(json(result), { labels: [], values: [] });
  });

  test('getCityData mengurutkan berdasarkan jumlah dan membatasi ke delapan kota', t => {
    const h = admin(t);
    const cities = ['Batu', 'Blitar', 'Kediri', 'Surabaya', 'Jombang', 'Madiun', 'Pasuruan', 'Gresik'];
    h.seed({ allBookings: [...cities.map(city => ({ city })), { city: 'Malang' }, { city: 'Malang' }, {}] });

    const result = h.context.getCityData();

    assert.deepEqual(json(result), { labels: ['Malang', ...cities.slice(0, 7)], values: [2, 1, 1, 1, 1, 1, 1, 1] });
  });

  test('getCityData mengabaikan booking tanpa kota', t => {
    const h = admin(t);
    h.seed({ allBookings: [{ city: '' }, { city: null }] });

    const result = h.context.getCityData();

    assert.deepEqual(json(result), { labels: [], values: [] });
  });
});

describe('Kru', () => {
  for (const [status, expected] of [['', ['a', 'b']], ['nonaktif', ['b']], ['lainnya', []]]) {
    test('filterKru memilih ' + (status || 'semua status'), t => {
      const h = admin(t);
      h.seed({ allKru: [{ id: 'a', status: 'aktif' }, { id: 'b', status: 'nonaktif' }] });
      h.add('filter-kru-status', { value: status });
      const render = h.spy('renderKruTable');

      h.context.filterKru();

      assert.equal(render.mock.callCount(), 1);
      assert.deepEqual(json(render.mock.calls[0].arguments[0]).map(row => row.id), expected);
    });
  }

  const crewPayload = { name: 'Nadia', phone: '0800', city: 'Batu', role: 'Editor', status: 'aktif', notes: 'Uji' };
  function crewFixture(t, editingKruId, name, ...responses) {
    const stub = supabaseStub(t, ...responses);
    const h = admin(t, { db: stub.db });
    h.seed({ editingKruId });
    const fields = { ...crewPayload, name, phone: ' 0800 ', notes: ' Uji ' };
    for (const [field, value] of Object.entries(fields)) h.add('kru-' + field, { value });
    return { h, query: stub.spy, toast: h.spy('showToast'), reload: h.spy('loadKru') };
  }

  test('saveKru membuat kru dan memangkas spasi dari field teks', async t => {
    const f = crewFixture(t, null, ' Nadia ', { error: null });

    await f.h.context.saveKru();

    assert.deepEqual(calls(f.query), [[['from', 'crew'], ['insert', [crewPayload]]]]);
    assert.equal(f.reload.mock.callCount(), 1);
    assert.deepEqual(calls(f.toast), [['Kru baru berhasil ditambahkan!']]);
  });

  test('saveKru memperbarui kru sesuai ID', async t => {
    const f = crewFixture(t, 'kr-1', 'Nadia', { error: null });

    await f.h.context.saveKru();

    assert.deepEqual(calls(f.query), [[['from', 'crew'], ['update', crewPayload], ['eq', 'id', 'kr-1']]]);
    assert.equal(f.reload.mock.callCount(), 1);
    assert.equal(f.h.read('editingKruId'), null);
  });

  test('saveKru memberi pesan pembaruan setelah edit', { todo: 'INC-003: closeKruModal mereset editingKruId sebelum toast' }, async t => {
    const f = crewFixture(t, 'kr-1', 'Nadia', { error: null });

    await f.h.context.saveKru();

    assert.deepEqual(calls(f.toast), [['Data kru berhasil diupdate!']]);
  });

  test('saveKru menolak nama kosong tanpa query', async t => {
    const f = crewFixture(t, null, '   ');

    await f.h.context.saveKru();

    assert.equal(f.query.mock.callCount(), 0);
    assert.equal(f.reload.mock.callCount(), 0);
    assert.deepEqual(calls(f.toast), [['Nama kru wajib diisi', 'error']]);
  });

  test('saveKru memberi pesan gagal dan mempertahankan ID edit saat update gagal', async t => {
    const f = crewFixture(t, 'kr-1', 'Nadia', { error: { message: 'offline' } });

    await f.h.context.saveKru();

    assert.equal(f.h.read('editingKruId'), 'kr-1');
    assert.equal(f.query.mock.callCount(), 1);
    assert.equal(f.reload.mock.callCount(), 0);
    assert.deepEqual(calls(f.toast), [['Gagal simpan data kru', 'error']]);
  });
});

describe('Stats Counter', () => {
  for (const [label, data, expected] of [
    ['mengisi data dan memberi nilai nol untuk nilai kosong', { clients: 12, vendors: null, cities: 4 }, [12, 0, 4]],
    ['mempertahankan input saat data belum ada', null, [99, 99, 99]],
  ]) test('loadStats ' + label, async t => {
    const stub = supabaseStub(t, { data });
    const h = admin(t, { db: stub.db });
    const fields = ['clients', 'vendors', 'cities'].map(id => h.add('stat-' + id, { value: 99 }));

    await h.context.loadStats();

    assert.deepEqual(fields.map(field => field.value), expected);
    assert.deepEqual(calls(stub.spy), [[['from', 'stats'], ['select', '*'], ['limit', 1], ['single']]]);
  });

  for (const [label, existing, error, values, expected] of [
    ['update baris yang tersedia', { id: 1 }, null, ['12', '5', '4', '6'], { clients: 12, vendors: 5, cities: 4, crew: 6 }],
    ['insert dengan fallback nol untuk input kosong', null, null, ['', '', '', ''], { clients: 0, vendors: 0, cities: 0, crew: 0 }],
    ['menangani Supabase gagal', { id: 1 }, { message: 'offline' }, ['12', '5', '4', '6'], { clients: 12, vendors: 5, cities: 4, crew: 6 }],
  ]) test('saveStats ' + label, async t => {
    const stub = supabaseStub(t, { data: existing }, { error });
    const timer = t.mock.fn();
    const h = admin(t, { db: stub.db, setTimeout: timer });
    const message = h.add('stats-msg', { style: { display: 'none' } });
    const toast = h.spy('showToast');
    Object.keys(expected).forEach((key, i) => h.add('stat-' + key, { value: values[i] }));

    await h.context.saveStats();

    const write = existing ? [['update', expected], ['eq', 'id', 1]] : [['insert', [expected]]];
    assert.deepEqual(calls(stub.spy), [
      [['from', 'stats'], ['select', 'id'], ['limit', 1], ['single']],
      [['from', 'stats'], ...write],
    ]);
    assert.equal(message.style.display, error ? 'none' : 'block');
    assert.deepEqual(calls(toast), [error ? ['Gagal simpan stats', 'error'] : ['Stats disimpan!']]);
    assert.equal(timer.mock.callCount(), error ? 0 : 1);
    if (!error) {
      const [hide, delay] = timer.mock.calls[0].arguments;
      assert.equal(delay, 3000);
      hide();
      assert.equal(message.style.display, 'none');
    }
  });
});

const packageInput = {
  code: ' UJI-P ', name: ' Paket Uji ', description: ' Sampel ', price: '100000', duration_hours: '1', active: true,
};
const voucherInput = {
  code: ' promo10 ', percent: '10', min_purchase: '0', starts_on: '2026-11-25', ends_on: '2026-11-25', active: true,
};

describe('Paket Layanan', () => {
  for (const [price, duration] of [['100000', '1'], ['10000000', '24']]) {
    test('packageData menerima harga ' + price + ' dan durasi ' + duration, t => {
      const h = catalog(t);
      const input = { ...packageInput, price, duration_hours: duration };

      const result = h.context.MemorleaCatalog.packageData(input);

      assert.deepEqual(json(result), {
        code: 'uji-p', name: 'Paket Uji', description: 'Sampel', price: Number(price), duration_hours: Number(duration), active: true,
      });
    });
  }

  for (const [field, value, error] of [
    ['code', '', /Kode paket/], ['name', undefined, /Nama paket/], ['name', 'ab', /Nama paket/], ['name', 'a'.repeat(81), /Nama paket/],
    ['description', 'x'.repeat(1001), /Deskripsi/], ['price', '99999', /Harga/],
    ['price', '10000001', /Harga/], ['price', 'abc', /Harga/], ['price', '', /Harga wajib/],
    ['duration_hours', '0', /Durasi/], ['duration_hours', '25', /Durasi/], ['duration_hours', '1.5', /Durasi/],
  ]) test('packageData menolak ' + field + ' ' + String(value).slice(0, 15), t => {
    const h = catalog(t);
    const input = { ...packageInput, [field]: value };

    const act = () => h.context.MemorleaCatalog.packageData(input);

    assert.throws(act, error);
  });

  test('packageData memberi deskripsi kosong jika opsional tidak diisi', t => {
    const h = catalog(t);
    const input = { ...packageInput, description: undefined, active: false };

    const result = h.context.MemorleaCatalog.packageData(input);

    assert.equal(result.description, '');
    assert.equal(result.active, false);
  });

  for (const [label, response, expected] of [
    ['mengirim paket hasil query ke renderer', { data: [{ code: 'uji-p' }] }, [{ code: 'uji-p' }]],
    ['mengubah data null menjadi daftar kosong', { data: null }, []],
    ['memberi pesan dan mengosongkan state ketika query gagal', { error: { message: 'offline' } }, []],
  ]) test('loadCatalog packages ' + label, async t => {
    const stub = supabaseStub(t, response);
    const h = catalog(t, { db: stub.db });
    const rows = h.add('packages-rows', { textContent: 'data lama' });
    const message = h.add('packages-message');
    const render = h.spy('renderCatalog');
    h.read("catalogState.packages = [{ code: 'lama' }]");

    await h.context.loadCatalog('packages');

    assert.deepEqual(calls(stub.spy), [[['from', 'service_packages'], ['select', '*'], ['order', 'created_at', { ascending: false }]]]);
    assert.deepEqual(json(h.read('catalogState.packages')), expected);
    assert.equal(rows.textContent, '');
    assert.deepEqual(calls(render), response.error ? [] : [['packages']]);
    if (response.error) assert.match(message.textContent, /Data belum dapat dimuat/);
    else assert.equal(message.textContent, '');
  });
});

describe('Voucher / Diskon', () => {
  for (const [percent, min_purchase] of [['1', '0'], ['50', '10000000']]) {
    test('voucherData menerima diskon ' + percent + ' dan tanggal mulai sama dengan akhir', t => {
      const h = catalog(t);
      const input = { ...voucherInput, percent, min_purchase };

      const result = h.context.MemorleaCatalog.voucherData(input);

      assert.deepEqual(json(result), {
        ...voucherInput, code: 'PROMO10', percent: Number(percent), min_purchase: Number(min_purchase),
      });
    });
  }

  for (const [field, value, error] of [
    ['code', '?!', /Kode voucher/], ['code', undefined, /Kode voucher/],
    ['starts_on', '25-11-2026', /Tanggal voucher/], ['starts_on', '2026-02-30', /Tanggal voucher/],
    ['ends_on', '2026-11-24', /Tanggal voucher/], ['ends_on', '', /Tanggal voucher/],
    ['percent', '0', /Diskon/], ['percent', '51', /Diskon/], ['min_purchase', '-1', /Minimal transaksi/],
    ['min_purchase', '10000001', /Minimal transaksi/],
  ]) test('voucherData menolak ' + field + ' ' + value, t => {
    const h = catalog(t);
    const input = { ...voucherInput, [field]: value };

    const act = () => h.context.MemorleaCatalog.voucherData(input);

    assert.throws(act, error);
  });

  function voucherFixture(t, options, ...responses) {
    const stub = supabaseStub(t, ...responses);
    const data = { ...voucherInput, ...options.input };
    const btn = { disabled: Boolean(options.disabled), textContent: 'Simpan' };
    const form = {
      fields: Object.entries(data),
      querySelector: () => btn,
      elements: { code: { value: data.code }, active: { checked: data.active } },
      dataset: { editCode: options.editCode || '' },
    };
    const h = catalog(t, { db: stub.db, FormData: class { constructor(node) { return new Map(node.fields); } } });
    const message = h.add('vouchers-message');
    const event = { preventDefault: t.mock.fn(), currentTarget: form };
    return {
      h, btn, message, event, query: stub.spy,
      reset: h.spy('resetCatalog'), load: h.spy('loadCatalog'),
    };
  }

  for (const editCode of ['', 'PROMO10']) test('saveCatalog vouchers ' + (editCode ? 'memperbarui' : 'menambah') + ' voucher', async t => {
    const f = voucherFixture(t, { editCode }, { data: [{ code: 'PROMO10' }] });
    const { code, ...changes } = { ...voucherInput, code: 'PROMO10', percent: 10, min_purchase: 0 };

    await f.h.context.saveCatalog(f.event, 'vouchers');

    const write = editCode ? [['update', changes], ['eq', 'code', editCode]] : [['insert', { code, ...changes }]];
    assert.deepEqual(calls(f.query), [[['from', 'vouchers'], ...write, ['select', 'code']]]);
    assert.equal(f.event.preventDefault.mock.callCount(), 1);
    assert.deepEqual(calls(f.reset), [['vouchers']]);
    assert.deepEqual(calls(f.load), [['vouchers']]);
    assert.equal(f.message.textContent, 'Voucher berhasil disimpan.');
    assert.deepEqual(f.btn, { disabled: false, textContent: 'Simpan' });
  });

  for (const [label, response, expected] of [
    ['kode duplikat', { error: { code: '23505' } }, /Kode sudah digunakan/],
    ['gangguan koneksi', { error: { code: 'offline' } }, /Data gagal disimpan/],
    ['tidak mengembalikan baris', { data: [] }, /Data gagal disimpan/],
    ['mengembalikan data null', { data: null }, /Data gagal disimpan/],
  ]) test('saveCatalog vouchers memulihkan tombol saat ' + label, async t => {
    const f = voucherFixture(t, {}, response);

    await f.h.context.saveCatalog(f.event, 'vouchers');

    assert.equal(f.query.mock.callCount(), 1);
    assert.equal(f.reset.mock.callCount(), 0);
    assert.equal(f.load.mock.callCount(), 0);
    assert.match(f.message.textContent, expected);
    assert.deepEqual(f.btn, { disabled: false, textContent: 'Simpan' });
  });

  test('saveCatalog vouchers tidak mengirim request untuk voucher invalid', async t => {
    const f = voucherFixture(t, { input: { percent: '51' } });

    await f.h.context.saveCatalog(f.event, 'vouchers');

    assert.equal(f.query.mock.callCount(), 0);
    assert.match(f.message.textContent, /Diskon/);
    assert.equal(f.btn.disabled, false);
  });

  test('saveCatalog vouchers mengabaikan submit saat tombol sedang dinonaktifkan', async t => {
    const f = voucherFixture(t, { disabled: true });

    await f.h.context.saveCatalog(f.event, 'vouchers');

    assert.equal(f.event.preventDefault.mock.callCount(), 1);
    assert.equal(f.query.mock.callCount(), 0);
    assert.equal(f.btn.disabled, true);
  });
});
