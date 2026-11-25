# White-box Test Document

**Memorlea Content Creator** · Praktikum PKPL Modul 4 · Universitas Muhammadiyah Malang

| Versi | Penulis | Deskripsi |
|---|---|---|
| 1 | Arvakbar | Analisis manual dan unit testing untuk delapan menu Admin, dua fungsi per menu. Pengujian 25 November 2026. |

Lembar ini mengikuti bagian pada White Box Testing Template yang ditautkan di Modul 4 halaman 35. ID kasus di bagian Pre-Lab merujuk pada skenario yang dapat ditemukan dengan nama fungsi di suite. [White Box Testing Template](https://docs.google.com/document/d/1hsBzP0ow-yRaS6IrOlX84Xu0wP14UgmV2ast021UrOs/edit)

## Statement Coverage dan Branch Coverage manual

Target analisis adalah 100% untuk statement dan semua keluaran keputusan yang dapat dicapai. Angka manual di bawah memakai **blok statement**. `S1–S4` berarti semua statement dalam keempat blok yang diberi ID. `B1:T/F` berarti keputusan B1 bernilai benar atau salah. ID S dan B dimulai dari awal pada setiap fungsi. Kolom kumulatif menunjukkan gabungan blok yang sudah dilewati sampai kasus tersebut. Keputusan di dalam helper dicatat saat helper menjadi fungsi target. Istanbul menghitung setiap statement dan operand logika yang diinstrumentasi menurut aturannya sendiri. Hasil alat ada pada bagian praktikum.

### Dashboard

**`renderSummaryCards()`** menggunakan S1 untuk definisi penghitung dan S2–S5 untuk penulisan empat kartu (baris 181–185). Pada data campuran, callback membandingkan status yang cocok dan yang berbeda. Fungsi utama tidak mempunyai percabangan eksplisit. [Kode sumber](../../js/admin.js#L180)

| ID Test | Input | Expected Output | Covered Statements | Cumulative Coverage |
|---|---|---|---|---|
| D01 | 1 belum DP, 1 sudah DP, 1 lunas, 2 selesai | Total 5, belum DP 1, sudah DP 1, lunas/selesai 3 | S1–S5 | 5/5 |
| D02 | Daftar kosong | Keempat kartu bernilai nol | S1–S5 | 5/5 |

**`renderReminders()`** menggunakan S1 untuk mengambil elemen, S2 untuk keluar jika elemen absen, S3 untuk menghitung batas dan menyaring booking, S4 untuk mengatur visibilitas, S5 untuk keluar ketika hasil kosong, dan S6 untuk membuat HTML pengingat. B1 memeriksa kelengkapan elemen, B2 kelayakan tiap booking, B3 keberadaan hasil, dan B4 keberadaan nomor telepon. [Kode sumber](../../js/admin.js#L711)

| ID Test | Input | Expected Output | Covered Statements | Cumulative Coverage | Branch |
|---|---|---|---|---|---|
| D03 | Booking belum DP lewat 3 hari dengan dan tanpa telepon, booking tepat 3 hari, lunas, dan tanpa tanggal | Hanya dua booking lewat batas tampil, satu tautan WA | S1, S3, S4, S6 | 4/6 | B1:T, B2:T/F, B3:T, B4:T/F |
| D04 | Daftar kosong | Panel disembunyikan | S1, S3–S5 | 5/6 | B1:T, B3:F |
| D05 | Elemen daftar absen | Keluar tanpa mengubah panel | S1–S2 | 6/6 | B1:F |

### Bookings

**`filterTable()`** menggunakan S1 untuk membaca filter, S2 untuk mengevaluasi kecocokan nama/kota/email/telepon, status, kota, dan bulan, dan S3 untuk menyerahkan hasil ke renderer. B1–B4 adalah kelulusan keempat filter, B5 keberadaan elemen bulan. Predicate dalam S2 dievaluasi pada data yang lolos dan gagal. [Kode sumber](../../js/admin.js#L236)

| ID Test | Input | Expected Output | Covered Statements | Cumulative Coverage | Branch |
|---|---|---|---|---|---|
| B01 | Kata kunci `ALFA`, status lunas, kota Malang, bulan 2026-12 | Hanya booking yang memenuhi semuanya | S1–S3 | 3/3 | B1:T, B2:T/F, B3:T/F, B4:T/F, B5:T |
| B02 | Kata kunci yang tidak cocok | Renderer menerima daftar kosong | S1–S3 | 3/3 | B1:F |
| B03 | Elemen bulan absen, kata kunci dan kota cocok | Bulan diabaikan, hasil lain tetap tersaring | S1–S3 | 3/3 | B5:F |
| B04 | Keempat filter kosong | Renderer menerima seluruh booking | S1–S3 | 3/3 | B1–B4:T melalui fallback |

**`saveStatus()`** menggunakan S1 untuk memeriksa ID edit, S2 untuk membaca status dan mencari booking, S3 untuk membangun riwayat serta menjalankan update, S4 untuk menampilkan error, S5 untuk mencari indeks terkini, S6 untuk memperbarui data lokal, dan S7 untuk memuat ulang tampilan dan memberi pesan sukses. B1 memeriksa ID edit, B2 keberadaan booking awal, B3 hasil update, dan B4 keberadaan booking setelah update. [Kode sumber](../../js/admin.js#L328)

| ID Test | Input | Expected Output | Covered Statements | Cumulative Coverage | Branch |
|---|---|---|---|---|---|
| B05 | Booking ditemukan, update sukses, riwayat lama ada atau kosong | Tambah entri riwayat baru, simpan status, perbarui tampilan | S1–S3, S5–S7 | 6/7 | B1:T, B2:T, B3 sukses, B4:T |
| B06 | Stub mengembalikan error update | Pesan gagal, status lokal lama, refresh tidak dipanggil | S1–S4 | 7/7 | B3 gagal |
| B07 | ID edit kosong atau ID tidak ada di daftar | Tidak mengirim query | S1 atau S1–S2 | 7/7 | B1:F atau B2:F |
| B08 | Booking hilang saat request berjalan, update sukses | Booking tidak ditambahkan kembali, tampilan diperbarui | S1–S3, S5, S7 | 7/7 | B4:F |

### Kalender

**`prevMonth()`** dan **`nextMonth()`** masing-masing memakai S1 untuk menggeser indeks bulan dan memeriksa batas, S2 untuk mengoreksi indeks dan tahun, serta S3 untuk memanggil renderer. B1 memeriksa batas indeks bulan. [Kode sumber](../../js/admin.js#L533)

| ID Test | Fungsi dan input | Expected Output | Covered Statements | Cumulative Coverage per fungsi | Branch |
|---|---|---|---|---|---|
| K01 | `prevMonth()`, Juni 2026 | Mei 2026, render sekali | S1, S3 | 2/3 | B1:F |
| K02 | `prevMonth()`, Januari 2026 | Desember 2025, render sekali | S1–S3 | 3/3 | B1:T |
| K03 | `nextMonth()`, Juni 2026 | Juli 2026, render sekali | S1, S3 | 2/3 | B1:F |
| K04 | `nextMonth()`, Desember 2026 | Januari 2027, render sekali | S1–S3 | 3/3 | B1:T |

### Analytics

**`getPackageData()`** menggunakan S1 untuk memulai map dan memeriksa paket tiap booking, S2 untuk melewati booking tanpa paket, S3 untuk memilih label dan menambah hitungan, dan S4 untuk mengembalikan label serta nilai. B1 memeriksa keberadaan kode paket. B2 memilih label dari snapshot, nama bawaan, atau kode. [Kode sumber](../../js/admin.js#L645)

| ID Test | Input | Expected Output | Covered Statements | Cumulative Coverage | Branch |
|---|---|---|---|---|---|
| A01 | Snapshot lama, dua kode `tara`, kode kustom, dan booking tanpa kode | Label sesuai prioritas dengan nilai `1, 2, 1` | S1–S4 | 4/4 | B1:T/F, B2 ketiga sumber label |
| A02 | Booking kosong | Label dan nilai kosong | S1, S4 | 4/4 | Loop tanpa iterasi |

**`getCityData()`** menggunakan S1 untuk memulai map dan mengecek kota, S2 untuk menambah hitungan, dan S3 untuk mengurutkan serta mengembalikan hasil. B1 memeriksa keberadaan kota. [Kode sumber](../../js/admin.js#L655)

| ID Test | Input | Expected Output | Covered Statements | Cumulative Coverage | Branch |
|---|---|---|---|---|---|
| A03 | Sembilan kota, Malang dua kali, satu booking tanpa kota | Malang pertama, delapan kota total | S1–S3 | 3/3 | B1:T/F |
| A04 | Semua kota kosong | Label dan nilai kosong | S1, S3 | 3/3 | B1:F |

### Kru

**`filterKru()`** memakai S1 untuk membaca status, S2 untuk memilih daftar tersaring atau daftar lengkap, dan S3 untuk memanggil renderer. B1 memeriksa apakah filter status dipilih. [Kode sumber](../../js/admin.js#L1042)

| ID Test | Input | Expected Output | Covered Statements | Cumulative Coverage | Branch |
|---|---|---|---|---|---|
| R01 | Filter kosong, dua kru dengan status berbeda | Kedua kru diteruskan ke renderer | S1–S3 | 3/3 | B1:F |
| R02 | Filter nonaktif dan kemudian status yang tidak ada | Satu kru nonaktif dan daftar kosong | S1–S3 | 3/3 | B1:T |

**`saveKru()`** memakai S1 untuk membaca nama dan memeriksa isian, S2 untuk pesan nama wajib dan keluar, S3 untuk membuat payload, S4 untuk update atau S5 untuk insert, S6 untuk memproses hasil API, S7 untuk pesan gagal dan keluar, serta S8 untuk menutup modal, memuat ulang, dan menampilkan pesan. B1 memeriksa nama, B2 memilih update/insert, B3 memeriksa error, dan B4 memilih teks pesan berhasil. [Kode sumber](../../js/admin.js#L1077)

| ID Test | Input | Expected Output | Covered Statements | Cumulative Coverage | Branch |
|---|---|---|---|---|---|
| R03 | Nama valid, tambah berhasil | Insert dengan field teks dipangkas, muat ulang, pesan tambah | S1, S3, S5, S6, S8 | 5/8 | B1 valid, B2 insert, B3 sukses, B4 pesan tambah |
| R04 | ID edit ada, update berhasil | Update berdasarkan ID, muat ulang, pesan edit | S1, S3, S4, S6, S8 | 6/8 | B2 update. B4 pesan edit tidak tercapai |
| R05 | Nama hanya spasi | Pesan nama wajib, tanpa query | S1–S2 | 7/8 | B1 kosong |
| R06 | Stub mengembalikan error update | Pesan gagal, ID edit tetap dan tanpa reload | S1, S3, S4, S6–S7 | 8/8 | B3 gagal |

Penelusuran manual R04 menunjukkan bahwa `closeKruModal()` menghapus `editingKruId` sebelum B4. Akibatnya, pilihan teks edit tidak tercapai melalui alur sukses normal. Unit test TODO mempertahankan ekspektasi pesan edit dan merekam hasil aktual berupa pesan tambah.

### Stats Counter

**`loadStats()`** memakai S1 untuk membaca data dan memeriksa hasil, S2 untuk keluar ketika data kosong, S3 untuk mencari elemen input, dan S4 untuk menulis nilai dengan fallback nol. B1 memeriksa data, B2 keberadaan elemen, dan B3 pemilihan nilai hasil atau nol. [Kode sumber](../../js/admin.js#L602)

| ID Test | Input | Expected Output | Covered Statements | Cumulative Coverage | Branch |
|---|---|---|---|---|---|
| T01 | Data tersedia, satu nilai null dan satu elemen absen | Isi bidang yang ada, null menjadi nol | S1, S3–S4 | 3/4 | B1:T, B2:T/F, B3 nilai/fallback |
| T02 | Query menghasilkan data null | Nilai input sebelumnya tetap | S1–S2 | 4/4 | B1:F |

**`saveStats()`** memakai S1 untuk parsing payload, S2 untuk mencari baris, S3 untuk update atau S4 untuk insert, S5 untuk mengecek error, S6 untuk pesan gagal dan keluar, serta S7 untuk menampilkan dan menjadwalkan penutupan pesan sukses. B1 menentukan penggunaan nilai angka atau nol, B2 keberadaan baris, dan B3 hasil simpan. [Kode sumber](../../js/admin.js#L611)

| ID Test | Input | Expected Output | Covered Statements | Cumulative Coverage | Branch |
|---|---|---|---|---|---|
| T03 | Empat angka valid dan baris sudah ada | Update payload, pesan sukses, timer 3 detik | S1–S3, S5, S7 | 5/7 | B1 angka, B2 update, B3 sukses |
| T04 | Input kosong dan baris belum ada | Insert empat nilai nol, pesan sukses | S1–S2, S4–S5, S7 | 6/7 | B1 fallback, B2 insert |
| T05 | Stub mengembalikan error update | Pesan gagal, tanpa pesan sukses atau timer | S1–S3, S5–S6 | 7/7 | B3 gagal |

### Paket Layanan

**`packageData()`** memakai S1 untuk normalisasi, S2 untuk memeriksa kode dan S3 untuk error kode, S4 untuk memeriksa nama dan S5 untuk error nama, S6 untuk memeriksa deskripsi dan S7 untuk error deskripsi, serta S8 untuk membentuk payload dan memanggil validator angka. B1–B3 memeriksa kode, nama, deskripsi. B4 membedakan payload berhasil dan error dari validator angka. [Kode sumber](../../js/catalog-rules.js#L11)

| ID Test | Input | Expected Output | Covered Statements | Cumulative Coverage | Branch |
|---|---|---|---|---|---|
| P01 | Batas harga/durasi bawah dan atas, kode/nama valid | Objek ternormalisasi, harga dan durasi berupa angka | S1–S2, S4, S6, S8 | 5/8 | B1–B3 valid, B4 berhasil |
| P02 | Kode kosong | Error kode | S1–S3 | 6/8 | B1 invalid |
| P03 | Nama tidak diisi atau panjang kurang/lebih dari batas | Error nama | S1–S2, S4–S5 | 7/8 | B2 invalid |
| P04 | Deskripsi lebih dari 1.000 karakter | Error deskripsi | S1–S2, S4, S6–S7 | 8/8 | B3 invalid |
| P05 | Harga kosong, nonangka, di luar batas, atau durasi pecahan/di luar batas | Error dari validator angka | S1–S2, S4, S6, S8 | 8/8 | B4 error |

**`loadCatalog('packages')`** memakai S1 untuk membersihkan tabel dan menampilkan status muat, S2 untuk membaca data dan mengecek error, S3 untuk menyimpan data serta memanggil renderer, dan S4 untuk mengosongkan state serta memberi pesan error. B1 memeriksa error API dan B2 menentukan data atau fallback daftar kosong. [Kode sumber](../../js/admin-catalog.js#L11)

| ID Test | Input | Expected Output | Covered Statements | Cumulative Coverage | Branch |
|---|---|---|---|---|---|
| P06 | Stub mengembalikan satu paket | State berisi paket dan renderer dipanggil | S1–S3 | 3/4 | B1 sukses, B2 data |
| P07 | Stub mengembalikan data null | State kosong dan renderer dipanggil | S1–S3 | 3/4 | B1 sukses, B2 fallback |
| P08 | Stub mengembalikan error | State dikosongkan, pesan gagal, renderer tidak dipanggil | S1–S2, S4 | 4/4 | B1 gagal |

### Voucher / Diskon

**`voucherData()`** memakai S1 untuk normalisasi dan cek kode, S2 untuk error kode, S3 untuk memeriksa tanggal, S4 untuk error tanggal, dan S5 untuk membuat payload serta memvalidasi angka. B1 memeriksa kode, B2 memeriksa format dan urutan tanggal, serta B3 membedakan validasi angka sukses atau error. [Kode sumber](../../js/catalog-rules.js#L27)

| ID Test | Input | Expected Output | Covered Statements | Cumulative Coverage | Branch |
|---|---|---|---|---|---|
| V01 | Kode valid, batas diskon 1% dan 50%, tanggal sama | Kode huruf besar, angka valid dan tanggal diteruskan | S1, S3, S5 | 3/5 | B1 dan B2 valid, B3 berhasil |
| V02 | Kode mengandung simbol terlarang | Error kode | S1–S2 | 4/5 | B1 invalid |
| V03 | Tanggal salah format, tidak ada, atau rentang terbalik | Error tanggal | S1, S3–S4 | 5/5 | B2 invalid |
| V04 | Diskon 0% atau 51%, minimum di luar batas | Error diskon atau minimum | S1, S3, S5 | 5/5 | B3 error |

**`saveCatalog(event, 'vouchers')`** memakai S1 untuk mencegah submit bawaan dan memeriksa tombol, S2 untuk keluar jika sedang menyimpan, S3 untuk membaca serta memvalidasi form, S4 untuk pesan validasi, S5 untuk mengunci tombol, S6 untuk update atau S7 untuk insert, S8 untuk mengecek respons, S9 untuk reset/muat ulang/pesan sukses, S10 untuk pesan error, dan S11 untuk memulihkan tombol. B1 memeriksa tombol, B2 validasi, B3 mode edit, B4 error API, B5 keberadaan respons berisi baris, dan B6 kode error duplikat. [Kode sumber](../../js/admin-catalog.js#L62)

| ID Test | Input | Expected Output | Covered Statements | Cumulative Coverage | Branch |
|---|---|---|---|---|---|
| V05 | Form valid tanpa kode edit, respons berisi kode | Insert, reset dan muat ulang, pesan sukses, tombol pulih | S1, S3, S5, S7–S9, S11 | 7/11 | B1 bebas, B2 valid, B3 tambah, B4 sukses, B5 ada |
| V06 | Form valid dengan kode edit | Update berdasarkan kode, pesan sukses dan tombol pulih | S1, S3, S5–S6, S8–S9, S11 | 8/11 | B3 edit |
| V07 | Error 23505, error koneksi, atau hasil kosong/null | Pesan sesuai error, tombol pulih, tanpa reset atau reload | S1, S3, S5, S7–S8, S10–S11 | 9/11 | B4 gagal, B5 kosong saat tanpa error, B6 duplikat/umum |
| V08 | Diskon 51% | Pesan validasi, tanpa query | S1, S3–S4 | 10/11 | B2 invalid |
| V09 | Tombol sudah dinonaktifkan | Submit bawaan dicegah, tanpa query | S1–S2 | 11/11 | B1 terkunci |

**Statements Covered After All Test Cases** Penelusuran di atas mencakup seluruh 84 blok statement yang diberi ID (84/84, 100%). Jalur pesan edit R04 menjadi satu pengecualian pada keputusan yang dipetakan.

## Practicum Unit Testing

**Judul** Pengujian white-box delapan fitur Admin Memorlea

**Fitur dan fungsi** Dashboard, Bookings, Kalender, Analytics, Kru, Stats Counter, Paket Layanan, dan Voucher / Diskon. Daftar lengkap fungsi dan angka hasilnya ada pada tabel coverage.

**Testing** Suite memakai Node.js 24.16.0 dan `node:test`. Tes menyiapkan data serta Test Double (Arrange), memanggil fungsi asli (Act), lalu memeriksa nilai, perubahan state, pesan, atau pemanggilan dependensi (Assert). Skrip aplikasi dimuat dengan `node:vm` karena fungsi dashboard bergantung pada variabel global browser, DOM, dan klien Supabase. Skenario dapat diisolasi sebagai unit test dengan DOM minimal, waktu tetap untuk kasus tanggal, dan Test Double. [Suite unit test](../../tests/modul4/admin.test.cjs) · [Tangkapan kode pengujian](evidence/kode-unit-test.png)

**Result** Delapan suite menjalankan 74 kasus. **73 lulus, 0 gagal di luar TODO, dan 1 TODO merekam kegagalan yang diketahui**. Pada R04, operasi update benar berdasarkan ID, tetapi pesan aktual adalah `Kru baru berhasil ditambahkan!`. Ekspektasinya `Data kru berhasil diupdate!`. Regresi lokal 55 kasus pada skrip autentikasi dan katalog yang sudah ada juga lulus. Pengujian ini memakai data sintetis dan klien database pengganti. [Tangkapan hasil pengujian](evidence/hasil-unit-test.png)

**Commit Link** [Commit Unit Testing](https://github.com/Arvakbar/Memorlea-Content-Creator/commit/e4202fedb935ca2b9a7c8cc723b29d714593f662)

## Test Double Implementation

| Test Double | Type | Purpose | Reason for Selection |
|---|---|---|---|
| Respons builder Supabase | Stub | Menyediakan hasil yang sudah diatur untuk query berhasil, data kosong, kode duplikat, dan error. | Fungsi simpan serta muat bisa diuji berulang dengan hasil yang sama, tanpa akun, koneksi, atau perubahan data nyata. Contoh B06. |
| Pencatat query dan fungsi refresh | Spy | Mencatat jumlah panggilan serta argumen seperti tabel, payload, filter ID, dan panggilan renderer. | Nilai akhir saja belum menunjukkan query yang dikirim. Spy bisa membuktikan bahwa V08 tidak menyimpan voucher invalid dan B06 tidak memanggil fungsi pembaruan tampilan. |

[Implementasi Stub dan Spy](../../tests/modul4/harness.cjs)

## Hasil Statement Coverage dan Branch Coverage

Istanbul menginstrumentasi tiga file sumber yang dimuat suite. Untuk lingkup praktikum, agregat berikut menjumlahkan statement dan counter branch dalam tubuh 16 fungsi target, termasuk callback yang didefinisikan di dalamnya. `N/A` berarti Istanbul tidak menghitung branch untuk fungsi tersebut. [Snapshot hasil per fungsi](evidence/coverage-fungsi.json)

| Fitur | Fungsi | Statement | Branch |
|---|---|---:|---:|
| Dashboard | `renderSummaryCards` | 7/7 | N/A |
| Dashboard | `renderReminders` | 15/15 | 17/17 |
| Bookings | `filterTable` | 12/12 | 14/14 |
| Bookings | `saveStatus` | 26/26 | 10/10 |
| Kalender | `prevMonth` | 5/5 | 2/2 |
| Kalender | `nextMonth` | 5/5 | 2/2 |
| Analytics | `getPackageData` | 7/7 | 7/7 |
| Analytics | `getCityData` | 9/9 | 4/4 |
| Kru | `filterKru` | 4/4 | 2/2 |
| Kru | `saveKru` | 14/14 | 7/8 |
| Stats Counter | `loadStats` | 7/7 | 6/6 |
| Stats Counter | `saveStats` | 11/11 | 12/12 |
| Paket Layanan | `packageData` | 10/10 | 14/14 |
| Paket Layanan | `loadCatalog` | 12/12 | 4/4 |
| Voucher / Diskon | `voucherData` | 6/6 | 9/9 |
| Voucher / Diskon | `saveCatalog` | 31/31 | 10/10 |
| **Total fungsi target** | **16 fungsi** | **181/181 (100%)** | **120/121 (99,17%)** |

Satu branch tersisa pada `saveKru` baris 1101, yaitu pilihan pesan edit pada ekspresi ternary. Statement yang memanggil `showToast` tetap berjalan sehingga statement coverage fungsi mencapai 100%. Angka untuk **seluruh isi tiga file** adalah 232/847 statement (27,39%) dan 144/551 branch (26,13%). Angka tingkat file ikut menghitung fungsi di luar daftar target. [Cabang pesan edit](../../js/admin.js#L1097)

## GitHub Issues

[Issue #1 White-Box Testing 8 Fitur Admin](https://github.com/Raynsar/Memorlea-Content-Creator/issues/1) mencatat lingkup, checklist, temuan Kru, serta tautan commit. [Branch testing di fork Arvakbar](https://github.com/Arvakbar/Memorlea-Content-Creator/tree/testing)

## Langkah demo di VS Code

1. Buka folder proyek pada branch `testing`. Di terminal jalankan `npm ci` dan `npm run test:coverage`. Gunakan `npm test` untuk menjalankan suite tanpa instrumentasi.
2. Buka `coverage/index.html` untuk melihat laporan Istanbul. Buka `coverage/selected-functions.json` untuk angka 16 fungsi dan lokasi branch yang belum tercakup.
3. Tunjukkan tes `saveStatus` saat Supabase gagal. Siapkan booking dan respons error, panggil fungsi, lalu tunjukkan assertion untuk status lama, pesan gagal, dan jumlah panggilan refresh.
4. Jelaskan kasus R04. Tunjukkan baris yang mereset ID edit, lalu bandingkan pesan yang diharapkan dan pesan aktual pada tes TODO.
5. Buka commit `Unit Testing` dan Issue #1 sebagai bukti. Gunakan tabel manual dan tangkapan layar di atas untuk mengisi salinan dokumen Pre-Lab.
