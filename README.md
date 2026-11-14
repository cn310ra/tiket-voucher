# Biru Kopi — Sistem Pemesanan Coffee Shop

Prototipe web statis untuk coffee shop: fokus murni pada pemesanan kopi (tanpa voucher dan tiket).
Tema clean blue & white: aksen biru profesional, permukaan putih, latar abu-abu terang, kartu membulat.

## Halaman

| File | Peran | Isi utama |
|------|-------|-----------|
| `index.html` | Aplikasi pelanggan (mobile) | Hero kedai, filter kategori, kartu produk + harga, bar keranjang bawah, lacak status pesanan |
| `kasir.html` | POS kasir (tablet, dua kolom) | Katalog menu instan (kiri), ringkasan & pembayaran Tunai/QRIS/Debit + kembalian otomatis (kanan), antrean pesanan |
| `manajer.html` | Dasbor manajer (web) | KPI harian, grafik batang tren per jam, menu terlaris, tabel transaksi terkini, unduh CSV |
| `style.css` | Gaya bersama | Design tokens biru + layout tiga halaman |
| `script.js` | Logika bersama | Data menu, keranjang, pajak PB1 10%, transaksi, grafik SVG |

## Menjalankan

Buka `index.html` di browser. Untuk GitHub Pages: push semua file ke satu folder repo lalu aktifkan Pages di Settings → Pages.

## Alur terintegrasi

1. Pelanggan memesan di `index.html` → pesanan berstatus **Diproses**.
2. Kasir melihatnya di tombol **Antrean** (`kasir.html`) dan menandainya **Siap** → **Selesai**. Status di aplikasi pelanggan ikut berubah.
3. Semua transaksi (kasir + aplikasi) masuk ke `manajer.html` secara otomatis.

Data disimpan di `localStorage`. Transaksi ilustrasi harian dibuat otomatis (hanya sampai jam saat ini). Tombol "Reset data demo" menghapus pesanan buatan pengguna.

## Catatan untuk produksi

- Pembayaran di aplikasi pelanggan hanya simulasi (belum ada payment gateway).
- Data hanya tersimpan di satu browser. Ganti fungsi `getStoredTx`, `saveStoredTx`, dan `addTx` di `script.js` dengan panggilan API/backend.
- Daftar menu ada di konstanta `PRODUCTS` pada `script.js`.
