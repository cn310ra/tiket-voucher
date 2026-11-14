# Triangle Sky Telomoyo — Coffee Shop & Tiket Sunrise

Prototipe web statis untuk coffee shop yang terintegrasi dengan sistem tiket sunrise di puncak gunung. Tema: clean blue & white. Tanpa build, tanpa backend.

## Halaman

| File | Peran | Fitur utama |
|------|-------|-------------|
| `index.html` | Aplikasi pelanggan (mobile) | Menu kopi, keranjang, pilih jam antrean sunrise, validasi voucher, tiket elektronik |
| `kasir.html` | POS kasir (tablet) | Katalog + pencarian, voucher, Tunai/QRIS/Debit, kembalian otomatis, struk cetak, validasi tiket gerbang |
| `manajer.html` | Dasbor manajer (web) | KPI, grafik penjualan per jam, performa produk, kuota voucher, tabel transaksi, unduh laporan CSV |
| `style.css` | Gaya bersama | Design tokens biru + layout tiga halaman |
| `script.js` | Logika bersama | Data produk/voucher, keranjang, transaksi, grafik SVG |

## Menjalankan

Buka `index.html` di browser (atau `kasir.html` / `manajer.html`). Untuk GitHub Pages: push semua file ke satu folder repo, lalu aktifkan Pages di Settings → Pages.

## Voucher untuk dicoba

- `HEMAT10K` — potongan Rp 10.000, minimal 2 tiket
- `KOPI15` — diskon 15% menu makanan & minuman, minimal belanja menu Rp 50.000
- `SUNRISE5` — diskon 5% semua pesanan
- `AKHIR20` — sengaja kedaluwarsa (untuk menguji pesan error)

## Cara data terhubung

Transaksi dan tiket disimpan di `localStorage`, jadi pesanan dari aplikasi atau kasir langsung muncul di dasbor (termasuk di tab lain). Transaksi dasar ±180 per hari dibuat otomatis sebagai **data ilustrasi**. Tombol "Reset data demo" menghapus data buatan pengguna.

## Catatan untuk produksi

- Gambar QR hanyalah pola visual dari kode tiket, bukan QR yang bisa dipindai. Ganti dengan library QR (mis. qrcode.js).
- Pembayaran di aplikasi pelanggan hanya simulasi (belum ada payment gateway).
- Data hanya tersimpan di satu browser. Ganti fungsi penyimpanan di `script.js` (`getStoredTx`, `addTx`, `getTickets`, `addTicket`) dengan panggilan ke API/backend Anda.
