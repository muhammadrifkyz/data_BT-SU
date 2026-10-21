# ArsipTanah · Inventaris BT & SU

Prototipe React, TypeScript, dan Vite untuk input Buku Tanah dan Surat Ukur.
**Mode Demo — Belum terhubung ke Google Sheets.** Seluruh nama dan dokumen
contoh bersifat fiktif. Gunakan hanya data dummy; aplikasi ini belum untuk data kantor.

## Menjalankan

Prasyarat: Node.js 22.12+ atau 24+, serta npm. Lingkungan cloud ini memakai Node 24.

```sh
cd /workspace/data_BT-SU
npm ci --cache /tmp/data-btsu-npm-cache
npm run dev -- --port 5173 --strictPort
```

Server pengembangan mendengarkan pada port 5173. Buka aplikasi melalui fasilitas
akses aplikasi di lingkungan Anda atau alamat yang ditampilkan Vite saat menjalankan
di komputer sendiri. Tidak ada server database, kredensial, atau berkas `.env` yang dibutuhkan.

Build produksi dan pemeriksaan:

```sh
npm run build
npm test
npm run test:e2e
# atau ketiganya sekaligus:
npm run check
```

Uji browser menggunakan Chromium sistem pada `/usr/bin/chromium`, yang sudah
tersedia di lingkungan cloud ini. Untuk komputer lain, pasang Chromium melalui
package manager OS, lalu isi `CHROMIUM_PATH` jika lokasinya berbeda:

```sh
CHROMIUM_PATH=/lokasi/chromium npm run test:e2e
```

Playwright otomatis menjalankan server uji pada port 5173 bila belum ada server.
`npm run preview -- --port 4173 --strictPort` melayani hasil build untuk pemeriksaan
lokal. Pratinjau Vite bukan server deployment produksi.

## Mencoba alur utama

Ada tiga desa demo: Sukamaju, Mekarjaya, dan Sumberharjo, masing-masing 37 baris.
Kecamatan mengikuti konfigurasi desa secara otomatis.

1. Nomor hak **1024** berisi `SU 040`, NIB dengan nol awal, kode `08-2` / `E-5`,
   dan kolom pegawai. Edit kolom utama, simpan, lalu periksa data pegawai tetap utuh.
2. **Simpan & Berikutnya** membuka **1025** dengan `SU 40` dan isian parsial.
   Kolom kosong boleh tetap kosong. Pemilik akhir tidak disamakan otomatis.
3. Berikutnya **1026** menampilkan **Belum ada data**. Baris baru hanya dibuat
   setelah memilih tambah dan berhasil menyimpan.
4. Cari **1027** untuk mencoba pemilihan dua baris dengan nomor hak sama.
   Tidak ada baris yang dipilih atau ditimpa otomatis.
5. Coba tambah data, edit data terisi, hapus (dengan konfirmasi desa/nomor hak),
   serta berpindah desa atau data saat ada perubahan belum disimpan.
6. Gunakan pencarian tabel untuk nomor hak, SU, NIB, atau kedua nama pemilik.
   Tabel menampilkan 8 baris per halaman.

Pintasan **Ctrl+Enter** (atau Cmd+Enter) pada formulir menyimpan dan membuka nomor
hak berikutnya. Enter biasa pada input tidak menyimpan; textarea tetap mendukung
baris baru. Tombol penyalin pemilik meminta konfirmasi jika mengganti nama yang
sudah terisi. Penyimpanan perubahan atas nilai lama juga meminta konfirmasi.

NO. HAK wajib berupa angka, tanpa HM; kolom lain boleh kosong. NO. HAK disimpan
sebagai teks digit yang dinormalisasi, berbeda dari nomor urut **NO**. SU dan NIB
tetap berupa teks. LUAS disimpan sebagai angka atau `null` untuk kosong; ketik
`1250,5` tanpa titik ribuan, hasil tampil `1.250,5 m²`. Keterangan multi pilihan
dan teks bebas digabung dengan `; ` menjadi satu nilai teks.

## Urutan otomatis NIB dan nomor SU

Di bawah input **NO.SU** dan **NIB** terdapat tombol **Urutkan otomatis** yang
terpisah. Isi nilai awal lalu aktifkan salah satu atau kedua tombol. Tidak perlu
menentukan jumlah dokumen atau nomor akhir.

- Setelah **Simpan & Berikutnya** berhasil, nilai hasil simpan menjadi acuan `+1`
  untuk satu formulir berikutnya. **Simpan** biasa tidak memajukan urutan.
- SU mempertahankan nol awal: `SU 040 → SU 041`, `SU 40 → SU 41`. Lebar SU
  dipertahankan sebagai lebar minimum; `SU 999 → SU 1000` saat melewati batas.
- NIB hanya menaikkan bagian angka terakhir: `31.05.04.07.00009 →
31.05.04.07.00010`. Angka tanpa titik, misalnya `00009`, juga didukung.
  Format otomatis yang dikenali hanya digit atau kelompok digit dipisahkan
  titik. Format lain tetap dapat diisi manual, tanpa menebak awalan.
- NIB tidak diperlebar saat overflow. Misalnya `31.05.99999` menghentikan urutan
  NIB dan meminta isian manual. Urutan SU dapat tetap berjalan.
- Label **Saran — belum disimpan** menandai isian otomatis. Nilai baru disimpan
  saat menekan Simpan. Saran dianggap perubahan belum disimpan dan dilindungi
  oleh peringatan perpindahan. Mengoreksi lalu menyimpan memakai nilai koreksi
  sebagai acuan berikutnya.
- Jika kolom tujuan sudah berisi nilai, nilai tersebut ditampilkan tanpa diganti
  dan urutan **kolom itu saja** dihentikan, bahkan bila nilainya sama dengan
  saran. Aktifkan tombolnya lagi jika ingin melanjutkan dari nilai yang ada.
- Jika nomor hak berikutnya belum tersedia, saran menunggu pilihan **Tambah**;
  tidak ada baris yang dibuat otomatis. Jika duplikat, saran menunggu pemilihan
  baris, kemudian hanya mengisi kolom kosong pada baris yang dipilih.
- Klik tombol aktif untuk mematikan urutan kapan saja, termasuk saat menunggu
  tambah/pemilihan baris. Mematikan urutan tidak menghapus isian yang sudah
  disarankan pada formulir.
- Pengaturan reset ketika berganti desa, melakukan pencarian nomor hak, membuka
  baris lewat tabel, atau memulai tambah data di luar alur berikutnya. Pembatalan
  perpindahan mempertahankan draf dan pengaturan. Pengaturan juga tidak disimpan
  antar pemuatan halaman.
- Penyimpanan gagal atau konfirmasi yang dibatalkan tidak memajukan urutan.
  Fitur ini tidak menulis banyak baris sekaligus.

## Struktur kode dan kontrak data

- `src/domain.ts`: 18 kolom berurutan, tipe data, format dan validasi. Fungsi
  `toSheetValues` memetakan baris ke urutan spreadsheet, tanpa metadata internal.
- `src/services/inventory.ts`: kontrak `InventoryService`, seed fiktif, dan layanan
  mock berbasis browser. Ganti implementasi layanan ini saat integrasi tersedia.
- `src/components/`: formulir, tabel berhalaman, dan dialog konfirmasi.
- `src/App.tsx`: pemilihan desa, navigasi, status simpan, serta perlindungan draf.
- `src/sequencing.ts`: perhitungan saran SU/NIB dan penghentian per kolom,
  terpisah dari operasi penyimpanan.
- `src/**/*.test.ts`: pengujian aturan data, CRUD, benturan revisi, kegagalan
  penyimpanan, pelestarian kolom, dan pagination dengan 30.000 baris di memori.
- `e2e/`: pengujian browser terhadap alur pengguna, format, kesalahan penyimpanan,
  pintasan, konfirmasi, dan ukuran layar laptop/ponsel.

Urutan kolom:

```text
NO, KECAMATAN, DESA/KELURAHAN, KUPT, NO. HAK, NO.SU, TAHUN SU, CEK,
NIB, LUAS, LEMBAR, KOTAK, KAPLING, PEMILIK PERTAMA, PEMILIK AKHIR,
STATUS FISIK, KW, KETERANGAN
```

KUPT, CEK, KAPLING, STATUS FISIK, dan KW hanya baca. Layanan mock juga membatasi
update ke kolom yang boleh diedit, sehingga nilai pegawai, NO, dan lokasi tidak
diganti oleh payload edit. Setiap baris mempunyai ID internal terpisah dan revisi;
nomor hak duplikat tetap memiliki ID berbeda. Revisi mendeteksi edit yang sudah
kedaluwarsa antar tab, tetapi bukan penguncian atomik lintas tab.

## Batasan demo

- Tidak ada autentikasi Google, integrasi Sheets, endpoint data, atau sinkronisasi.
- Hanya menyimpan data demo di `localStorage`, kunci `bt-su:demo:v1`, pada browser
  dan origin yang sama. Menghapus data situs menghapus perubahan; tidak ada backup.
- Prototipe membaca/filter/sort seluruh data desa di memori lalu mengambil satu
  halaman untuk dirender. Ini belum strategi produksi untuk puluhan ribu baris
  Sheets. Kuota penyimpanan browser juga berbeda-beda. Uji 30.000 baris memakai
  penyimpanan memori pengujian, bukan klaim kapasitas `localStorage`.
- Revisi mencegah penyimpanan dari snapshot lama yang terdeteksi. Dua tab yang
  menulis tepat bersamaan belum memiliki jaminan transaksi; gunakan satu tab
  untuk mengedit. Integrasi nyata memerlukan kontrol konkurensi server.
- Belum ada role pegawai/admin, audit log, undo hapus, atau deployment produksi.
- Jika penyimpanan gagal, isian tetap ada dan tombol dapat dicoba lagi. Jangan
  memuat ulang tab sebelum mencatat draf yang belum berhasil disimpan.

Untuk mengulang demo dari awal, hapus **hanya** kunci `bt-su:demo:v1` melalui
DevTools → Application → Local Storage, lalu muat ulang. Ini membuang perubahan
demo di browser tersebut, tanpa menghubungi Google Sheets.

## Informasi untuk tahap Google Sheets

Siapkan informasi berikut, tanpa mengirim token atau kredensial melalui chat:

1. Pemetaan desa/kecamatan ke spreadsheet ID, tab/range, baris header, dan contoh
   struktur yang sudah dianonimkan. Pastikan ejaan/urutan 18 kolom dan apakah ada
   rumus, format khusus, protected ranges, merged cells, atau baris kosong.
2. Alur OAuth untuk akun pribadi yang sudah mendapat akses edit, aturan kantor
   tentang aplikasi OAuth, serta deployment dan redirect URI yang disetujui.
   Akses edit file tidak menggantikan persetujuan OAuth aplikasi. Scope minimum
   dipilih sesuai alur pemilihan file; kredensial disimpan melalui konfigurasi aman.
3. Kebijakan ID permanen (misalnya metadata baris atau kolom ID yang disetujui).
   Jangan memakai nomor baris spreadsheet atau nomor hak sebagai ID permanen.
4. Hak tambah/edit/hapus, kolom yang boleh diubah pemagang, audit, dan aturan
   konflik saat pegawai lain mengedit bersamaan. Backend harus menegakkan izin.
5. Volume aktual, kebutuhan pencarian, caching, batch update, pembatasan kuota,
   retry, dan cara mendeteksi perubahan di Sheets tanpa menimpa kolom pegawai.

Sambungan asli merupakan tahap terpisah; prototipe ini tidak mengakses file Google
dan tidak membuat endpoint publik untuk data kantor.
