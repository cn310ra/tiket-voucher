/* ==========================================================
   Triangle Sky Telomoyo — Coffee Shop & Tiket Sunrise
   Satu script untuk tiga halaman:
     index.html   -> aplikasi pelanggan (mobile)
     kasir.html   -> POS kasir (tablet)
     manajer.html -> dasbor manajer (web)
   Data disimpan di localStorage sehingga ketiga halaman saling
   terhubung tanpa backend (cocok untuk demo / prototipe).
   ========================================================== */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     1. DATA MASTER
     --------------------------------------------------------- */
  const PRODUCTS = [
    { id: 'tiket-masuk',   name: 'Tiket Masuk',               desc: 'Akses masuk destinasi · per orang',                   price: 50000, cat: 'tiket',   emoji: '🎟️' },
    { id: 'paket-sunrise', name: 'Paket Sunrise',             desc: 'Tiket masuk + 1 Kopi Susu hangat',                    price: 70000, cat: 'tiket',   emoji: '🌄' },
    { id: 'kopi-susu',     name: 'Kopi Susu',                 desc: 'Perpaduan espresso dan susu, teman menanti sunrise',   price: 30000, cat: 'minuman', emoji: '☕' },
    { id: 'brown-sugar',   name: 'Brown Sugar Ice Coffee',    desc: 'Kopi susu dingin dengan gula aren pekat',              price: 30000, cat: 'minuman', emoji: '🧋' },
    { id: 'avocado',       name: 'Avocado Coffee',            desc: 'Alpukat kental berpadu espresso yang manis',           price: 35000, cat: 'minuman', emoji: '🥑' },
    { id: 'salted-caramel',name: 'Salted Caramel Ice Coffee', desc: 'Kopi susu karamel dengan sentuhan garam laut',         price: 32000, cat: 'minuman', emoji: '🍮' },
    { id: 'choco-lava',    name: 'Choco Lava Ice Coffee',     desc: 'Cokelat lumer bertemu kopi dingin yang segar',         price: 30000, cat: 'minuman', emoji: '🍫' },
    { id: 'wedang-jahe',   name: 'Wedang Jahe Susu',          desc: 'Hangat menenangkan untuk udara dingin puncak',         price: 22000, cat: 'minuman', emoji: '🍵' },
    { id: 'mie-telur',     name: 'Mie Rebus Telur',           desc: 'Mie kuah panas, pelengkap udara dingin',               price: 25000, cat: 'makanan', emoji: '🍜' },
    { id: 'nasi-goreng',   name: 'Nasi Goreng Lereng',        desc: 'Nasi goreng bumbu rempah dengan telur mata sapi',      price: 35000, cat: 'makanan', emoji: '🍳' },
    { id: 'roti-bakar',    name: 'Roti Bakar Cokelat Keju',   desc: 'Roti bakar tebal, lumer di setiap gigitan',            price: 22000, cat: 'snack',   emoji: '🍞' },
    { id: 'pisang-goreng', name: 'Pisang Goreng Madu',        desc: 'Renyah di luar, manis di dalam',                       price: 20000, cat: 'snack',   emoji: '🍌' },
  ];

  const VOUCHERS = [
    { code: 'HEMAT10K',  name: 'Voucher Tiket',  desc: 'Hemat Rp 10.000 · min. pembelian 2 tiket',            type: 'flat',    value: 10000, scope: 'all',  minTicketQty: 2, expires: '2026-12-31', quota: 10, usedSeed: 9 },
    { code: 'KOPI15',    name: 'Voucher Menu',   desc: 'Diskon 15% menu makanan & minuman · min. Rp 50.000', type: 'percent', value: 15,    scope: 'menu', minBase: 50000,   maxDiscount: 25000, expires: '2026-12-31', quota: 12, usedSeed: 10 },
    { code: 'SUNRISE5',  name: 'Voucher Sunrise',desc: 'Diskon 5% untuk semua pesanan',                       type: 'percent', value: 5,     scope: 'all',  expires: '2027-01-31', quota: 8,  usedSeed: 5 },
    { code: 'AKHIR20',   name: 'Voucher Akhir Tahun Lalu', desc: 'Diskon 20% semua pesanan (sudah berakhir)', type: 'percent', value: 20,    scope: 'all',  expires: '2026-10-31', quota: 5,  usedSeed: 0 },
  ];

  /* Slot antrean sunrise (05:00 – 07:00). `seed` = kuota yang sudah terisi sebelum demo dimulai. */
  const SLOTS = [
    { id: '05:00', quota: 40, seed: 28 },
    { id: '05:30', quota: 40, seed: 36 },
    { id: '06:00', quota: 40, seed: 22 },
    { id: '06:30', quota: 40, seed: 15 },
    { id: '07:00', quota: 40, seed: 9 },
  ];

  const KEY_TX = 'tsky_tx_v1';
  const KEY_TICKETS = 'tsky_tickets_v1';
  const KEY_NAME = 'tsky_name_v1';
  const TZ = 'Asia/Jakarta';

  /* ---------------------------------------------------------
     2. HELPER UMUM
     --------------------------------------------------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rupiah = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const getProduct = id => PRODUCTS.find(p => p.id === id);
  const isMenu = p => p.cat !== 'tiket';
  const sum = (arr, fn) => arr.reduce((a, x) => a + fn(x), 0);

  function loadJSON(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
  }
  function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage penuh / diblokir */ } }

  /* Tanggal & jam selalu dalam WIB (Asia/Jakarta) agar konsisten di semua perangkat */
  const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  function parts(ts) {
    const o = {};
    dtf.formatToParts(ts).forEach(p => { o[p.type] = p.value; });
    if (o.hour === '24') o.hour = '00';
    return o;
  }
  const dateOf = ts => { const p = parts(ts); return `${p.year}-${p.month}-${p.day}`; };
  const hourOf = ts => +parts(ts).hour;
  const timeOf = ts => { const p = parts(ts); return `${p.hour}.${p.minute}`; };
  const todayStr = () => dateOf(Date.now());
  const fmtDate = iso => new Date(iso + 'T12:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const mmyy = iso => iso.slice(5, 7) + iso.slice(2, 4);

  function shortMoney(n) {
    if (n >= 1e6) return 'Rp ' + (n / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + ' jt';
    if (n >= 1e3) return 'Rp ' + Math.round(n / 1e3) + ' rb';
    return 'Rp ' + Math.round(n);
  }

  /* ---------- Ikon (inline SVG, gaya garis) ---------- */
  const ICONS = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    ticket: '<path d="M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/><path d="M13 5v2M13 11v2M13 17v2"/>',
    coffee: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
    percent: '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    receipt: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    sunrise: '<path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/><polyline points="8 6 12 2 16 6"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    bag: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    chevron: '<polyline points="9 18 15 12 9 6"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  };
  const ic = name => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  function hydrateIcons(root = document) {
    $$('[data-i]', root).forEach(el => { if (!el.firstElementChild) el.innerHTML = ic(el.dataset.i); });
  }

  /* ---------- Toast & modal ---------- */
  let toastTimer;
  function toast(msg, type = '') {
    let el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
    el.className = 'toast ' + type;
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function openModal(html, host = document.body) {
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    host.appendChild(bd);
    hydrateIcons(bd);
    const close = () => bd.remove();
    bd.addEventListener('click', e => { if (e.target === bd || e.target.closest('[data-close]')) close(); });
    return { el: bd, close };
  }

  /* ---------------------------------------------------------
     3. ACAK DETERMINISTIK, HASH & QR VISUAL
     --------------------------------------------------------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return h >>> 0;
  }
  const makeCode = seed => 'TSKY-' + hash(String(seed)).toString(36).toUpperCase().padStart(6, '0').slice(-6);

  /* CATATAN: ini pola visual berbasis kode tiket (bukan QR standar yang bisa dipindai kamera).
     Untuk produksi, ganti dengan library QR sungguhan, mis. qrcode.js, dengan isi `text` yang sama. */
  function drawQR(canvas, text) {
    const n = 25, size = canvas.width, cell = size / n, ctx = canvas.getContext('2d');
    const r = rng(hash(text));
    const m = Array.from({ length: n }, () => Array.from({ length: n }, () => r() > 0.5));
    [[0, 0], [n - 7, 0], [0, n - 7]].forEach(([ox, oy]) => {
      for (let dy = -1; dy <= 7; dy++) for (let dx = -1; dx <= 7; dx++) {
        const x = ox + dx, y = oy + dy;
        if (x < 0 || y < 0 || x >= n || y >= n) continue;
        const inside = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
        m[y][x] = inside && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
      }
    });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0f1b33';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) ctx.fillRect(Math.floor(x * cell), Math.floor(y * cell), Math.ceil(cell), Math.ceil(cell));
  }
  const drawAllQR = root => $$('canvas[data-qr]', root).forEach(c => drawQR(c, c.dataset.qr));

  /* ---------------------------------------------------------
     4. KERANJANG, VOUCHER & TRANSAKSI
     --------------------------------------------------------- */
  /* cart = { [productId]: qty } */
  function calcCart(cart, voucher) {
    const lines = Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => {
      const p = getProduct(id);
      return { p, qty, amount: p.price * qty };
    });
    const subtotal = sum(lines, l => l.amount);
    const ticketQty = sum(lines.filter(l => l.p.cat === 'tiket'), l => l.qty);
    const ticketSubtotal = sum(lines.filter(l => l.p.cat === 'tiket'), l => l.amount);
    const menuSubtotal = subtotal - ticketSubtotal;
    const base = { subtotal, ticketQty, ticketSubtotal, menuSubtotal };
    const discount = voucher ? discountFor(voucher, base) : 0;
    return { lines, ...base, itemQty: sum(lines, l => l.qty), discount, total: Math.max(0, subtotal - discount) };
  }

  function voucherBase(v, c) {
    return v.scope === 'menu' ? c.menuSubtotal : v.scope === 'tiket' ? c.ticketSubtotal : c.subtotal;
  }
  function discountFor(v, c) {
    const base = voucherBase(v, c);
    if (v.type === 'percent') return Math.min(Math.round(base * v.value / 100), v.maxDiscount ?? Infinity);
    return Math.min(v.value, base);
  }

  function storedVoucherUse(code) {
    return getStoredTx().filter(t => t.voucher === code).length;
  }
  const voucherUsed = v => v.usedSeed + storedVoucherUse(v.code);
  const voucherExpired = v => v.expires < todayStr();

  /* Validasi voucher: kembalikan {ok, voucher?, message} */
  function validateVoucher(raw, cart) {
    const code = (raw || '').trim().toUpperCase();
    if (!code) return { ok: false, message: 'Masukkan kode voucher terlebih dahulu.' };
    const v = VOUCHERS.find(x => x.code === code);
    if (!v) return { ok: false, message: 'Kode voucher tidak ditemukan.' };
    if (voucherExpired(v)) return { ok: false, message: `Voucher kedaluwarsa sejak ${fmtDate(v.expires)}.` };
    if (voucherUsed(v) >= v.quota) return { ok: false, message: 'Kuota voucher sudah habis.' };
    const c = calcCart(cart, null);
    if (c.subtotal === 0) return { ok: false, message: 'Tambahkan produk ke pesanan sebelum memakai voucher.' };
    const base = voucherBase(v, c);
    if (base === 0) return { ok: false, message: 'Voucher hanya berlaku untuk pembelian menu makanan & minuman.' };
    if (v.minTicketQty && c.ticketQty < v.minTicketQty) return { ok: false, message: `Voucher ini butuh minimal ${v.minTicketQty} tiket.` };
    if (v.minBase && base < v.minBase) return { ok: false, message: `Minimal belanja ${rupiah(v.minBase)} untuk voucher ini.` };
    return { ok: true, voucher: v, message: 'Voucher berlaku.' };
  }

  /* ---------- Transaksi: seed harian + data baru dari localStorage ---------- */
  const NAMES = ['Siti Rahma', 'Dinda Putri', 'Andi Pratama', 'Rizky Maulana', 'Nadia Safira', 'Budi Santoso', 'Dewi Lestari', 'Agus Setiawan', 'Maya Anggraini', 'Fajar Nugroho', 'Intan Permata', 'Bayu Wicaksono', 'Putri Ayu', 'Eko Prasetyo', 'Lina Marlina', 'Hendra Gunawan'];
  const HOURLY = [[5, 22], [6, 48], [7, 62], [8, 34], [9, 14]]; // [jam, jumlah transaksi] = 180 transaksi
  const seedCache = {};

  function seedTx(date) {
    if (seedCache[date]) return seedCache[date];
    const r = rng(+date.replace(/-/g, ''));
    const [y, mo, d] = date.split('-').map(Number);
    const menus = PRODUCTS.filter(isMenu);
    const list = [];
    HOURLY.forEach(([h, count]) => {
      for (let i = 0; i < count; i++) {
        const map = {};
        const tq = r() < 0.67 ? 1 : 2;
        map[r() < 0.15 ? 'paket-sunrise' : 'tiket-masuk'] = tq;
        const m = r() < 0.7 ? (r() < 0.4 ? 2 : 1) : 0;
        for (let k = 0; k < m; k++) { const p = menus[Math.floor(r() * menus.length)]; map[p.id] = (map[p.id] || 0) + 1; }
        const items = Object.entries(map).map(([id, qty]) => ({ id, qty, price: getProduct(id).price }));
        const subtotal = sum(items, i2 => i2.qty * i2.price);
        const ts = Date.UTC(y, mo - 1, d, h - 7, Math.floor(r() * 60), Math.floor(r() * 60));
        const pr = r(), lr = r();
        list.push({
          ts, date, customer: NAMES[Math.floor(r() * NAMES.length)], items, subtotal, discount: 0, total: subtotal, voucher: null,
          payment: pr < 0.5 ? 'QRIS' : pr < 0.8 ? 'Tunai' : 'Debit',
          loket: lr < 0.45 ? 'Loket 01' : lr < 0.8 ? 'Loket 02' : 'Aplikasi',
          status: 'Lunas', seed: true,
        });
      }
    });
    list.sort((a, b) => a.ts - b.ts).forEach((t, i) => { t.id = `#TRX-${mmyy(date)}-${pad(i + 1, 4)}`; });
    return (seedCache[date] = list);
  }

  const getStoredTx = () => loadJSON(KEY_TX, []);
  const txOfDate = date => [...seedTx(date), ...getStoredTx().filter(t => t.date === date)].sort((a, b) => b.ts - a.ts);
  const todayTx = () => txOfDate(todayStr());
  const nextTxId = (date = todayStr()) => `#TRX-${mmyy(date)}-${pad(txOfDate(date).length + 1, 4)}`;

  function buildTx({ calc, customer, payment, loket, voucher, cash = null, change = null, cashier = null }) {
    const ts = Date.now(), date = dateOf(ts);
    return {
      id: nextTxId(date), ts, date, customer,
      items: calc.lines.map(l => ({ id: l.p.id, qty: l.qty, price: l.p.price })),
      subtotal: calc.subtotal, discount: calc.discount, total: calc.total,
      voucher: voucher ? voucher.code : null, payment, loket, status: 'Lunas', cash, change, cashier,
    };
  }
  function addTx(tx) { const all = getStoredTx(); all.push(tx); saveJSON(KEY_TX, all); }
  const itemsText = tx => tx.items.map(i => `${i.qty} ${getProduct(i.id).name}`).join(' · ');

  /* ---------- Tiket sunrise ---------- */
  const getTickets = () => loadJSON(KEY_TICKETS, []);
  function addTicket({ txId, qty, slot, name, date }) {
    const all = getTickets();
    const t = { code: makeCode(txId + Date.now()), txId, qty, slot, name, date, status: 'Aktif' };
    all.push(t); saveJSON(KEY_TICKETS, all);
    return t;
  }
  function slotLeft(id) {
    const s = SLOTS.find(x => x.id === id);
    const used = sum(getTickets().filter(t => t.slot === id && t.date === todayStr()), t => t.qty);
    return Math.max(0, s.quota - s.seed - used);
  }
  function validateTicket(codeRaw) {
    const code = (codeRaw || '').trim().toUpperCase();
    const all = getTickets();
    const t = all.find(x => x.code === code);
    if (!t) return { ok: false, message: 'Kode tiket tidak ditemukan.' };
    if (t.date !== todayStr()) return { ok: false, message: `Tiket berlaku untuk tanggal ${fmtDate(t.date)}.` };
    if (t.status !== 'Aktif') return { ok: false, message: 'Tiket ini sudah digunakan.' };
    t.status = 'Terpakai'; saveJSON(KEY_TICKETS, all);
    return { ok: true, message: `Tiket valid — ${t.qty} pengunjung${t.slot ? ' · slot ' + t.slot : ''} (${t.name}). Silakan masuk.` };
  }
  const eticketHtml = t => `
    <div class="eticket">
      <canvas width="224" height="224" data-qr="${esc(t.code)}"></canvas>
      <div><b>${esc(t.code)}</b>
        <p>${t.qty} pengunjung${t.slot ? ' · antrean ' + t.slot + ' WIB' : ''}</p>
        <p>${fmtDate(t.date)} · a.n. ${esc(t.name)}</p>
        <span class="badge ${t.status === 'Aktif' ? 'ok' : ''}">${esc(t.status)}</span></div>
    </div>`;

  /* ---------------------------------------------------------
     5. HALAMAN PELANGGAN (index.html)
     --------------------------------------------------------- */
  function initCustomer() {
    const phone = $('.phone');
    const S = { view: 'home', cat: 'semua', cart: {}, wanted: null, voucher: null, vmsg: null, draft: null, slot: null, pay: 'QRIS', name: loadJSON(KEY_NAME, '') };

    const qty = id => S.cart[id] || 0;
    const stepper = id => `<div class="stepper"><button data-act="dec" data-id="${id}" aria-label="Kurangi">${ic('minus')}</button><span>${qty(id)}</span><button data-act="inc" data-id="${id}" aria-label="Tambah">${ic('plus')}</button></div>`;
    const addCtl = id => qty(id) ? stepper(id) : `<button class="add-btn" data-act="inc" data-id="${id}" aria-label="Tambah ke keranjang">${ic('plus')}</button>`;

    function derive() {
      if (!S.wanted) { S.voucher = null; S.vmsg = null; return; }
      const r = validateVoucher(S.wanted, S.cart);
      S.voucher = r.ok ? r.voucher : null;
      S.vmsg = r;
    }

    function slotChips() {
      const need = Math.max(1, calcCart(S.cart, null).ticketQty);
      return `<div class="chips">${SLOTS.map(s => {
        const left = slotLeft(s.id);
        return `<button class="chip ${S.slot === s.id ? 'on' : ''}" data-slot="${s.id}" ${left < need ? 'disabled' : ''}>${s.id}<small>sisa ${left}</small></button>`;
      }).join('')}</div>`;
    }

    /* --- render tiap tampilan --- */
    function renderMenu() {
      const list = PRODUCTS.filter(p => isMenu(p) && (S.cat === 'semua' || p.cat === S.cat));
      $('#menuList').innerHTML = list.map(p => `
        <div class="menu-item"><div class="thumb">${p.emoji}</div>
          <div class="mi-body grow"><b>${esc(p.name)}</b><p>${esc(p.desc)}</p><span class="price">${rupiah(p.price)}</span></div>
          ${addCtl(p.id)}</div>`).join('');
      $$('#catBar .chip').forEach(c => c.classList.toggle('on', c.dataset.cat === S.cat));
    }

    function renderTiket() {
      $('#ticketList').innerHTML = PRODUCTS.filter(p => p.cat === 'tiket').map(p => `
        <div class="ticket-card">
          <div class="ticket-cover">${mountainSvg()}<span class="badge">${p.id === 'paket-sunrise' ? 'PAKET HEMAT' : 'TIKET HARIAN'}</span></div>
          <div class="ticket-body"><div class="grow"><h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p><span class="price">${rupiah(p.price)}</span></div>
            ${qty(p.id) ? stepper(p.id) : `<button class="btn primary sm" data-act="inc" data-id="${p.id}">Beli tiket</button>`}</div>
        </div>`).join('');
      $('#slotBlock').innerHTML = slotChips();
      const mine = getTickets().slice().reverse();
      $('#myTickets').innerHTML = mine.length ? mine.map(t => `
        <div class="my-ticket"><span class="avatar">${ic('ticket')}</span>
          <div class="grow"><b>${t.qty} × Tiket · ${esc(t.code)}</b><small>${fmtDate(t.date)}${t.slot ? ' · ' + t.slot + ' WIB' : ''}</small></div>
          <span class="badge ${t.status === 'Aktif' ? 'ok' : ''}">${esc(t.status)}</span>
          <button class="link" data-act="open-ticket" data-code="${esc(t.code)}">Buka</button></div>`).join('')
        : '<div class="empty">Belum ada tiket. Beli tiket untuk menikmati sunrise.</div>';
    }

    function renderVoucher() {
      $('#voucherList').innerHTML = VOUCHERS.map(v => {
        const expired = voucherExpired(v), full = voucherUsed(v) >= v.quota, off = expired || full;
        const active = S.wanted === v.code;
        return `<div class="voucher-card ${off ? 'off' : ''}"><span class="vi">${ic('percent')}</span>
          <div class="grow"><h4>${esc(v.name)} · ${v.code}</h4><p>${esc(v.desc)}</p><p>${expired ? 'Berakhir ' + fmtDate(v.expires) : full ? 'Kuota habis' : 'Berlaku hingga ' + fmtDate(v.expires)}</p></div>
          ${off ? '' : `<button class="btn ${active ? 'outline' : 'primary'} sm" data-act="use-voucher" data-code="${v.code}">${active ? 'Dipakai' : 'Pakai'}</button>`}</div>`;
      }).join('');
    }

    function renderProfile() {
      const nm = S.name || 'Pengunjung';
      $('#profName').textContent = nm;
      $('#profAvatar').textContent = nm.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
      const mine = getStoredTx().filter(t => t.loket === 'Aplikasi').slice(-6).reverse();
      $('#history').innerHTML = mine.length ? mine.map(t => `<div class="hist"><div><b>${esc(t.id)}</b><br><span class="muted">${esc(itemsText(t))}</span></div><b>${rupiah(t.total)}</b></div>`).join('') : '<div class="empty">Belum ada pesanan dari perangkat ini.</div>';
    }

    function renderCartBar() {
      const c = calcCart(S.cart, S.voucher);
      const bar = $('#cartBar');
      bar.hidden = c.itemQty === 0;
      $('#cartBarText').innerHTML = `${ic('cart')} Keranjang · ${c.itemQty} item`;
      $('#cartBarTotal').textContent = rupiah(c.total);
    }

    function renderCart() {
      const c = calcCart(S.cart, S.voucher);
      if (!c.lines.length) { $('#cartBody').innerHTML = '<div class="empty">Keranjang masih kosong.</div>'; return; }
      let vm = '';
      if (S.wanted && S.vmsg) vm = S.vmsg.ok
        ? `<p class="vmsg ok">✓ ${esc(S.voucher.name)} dipakai — hemat ${rupiah(c.discount)}</p>`
        : `<p class="vmsg bad">${esc(S.vmsg.message)}</p>`;
      $('#cartBody').innerHTML = `
        <div>${c.lines.map(l => `<div class="cart-line"><div class="thumb sm">${l.p.emoji}</div><div class="grow"><b>${esc(l.p.name)}</b><span class="muted">${rupiah(l.p.price)}</span></div>${stepper(l.p.id)}</div>`).join('')}</div>
        ${c.ticketQty ? `<div class="block"><h4>Jam antrean sunrise (wajib)</h4>${slotChips()}</div>` : ''}
        <div class="block"><h4>Nama pemesan</h4><input id="custName" class="input" value="${esc(S.name)}" placeholder="Nama pengunjung" maxlength="40"></div>
        <div class="block"><h4>Voucher</h4>
          <div class="vrow"><input id="cartVoucher" class="input" placeholder="Masukkan kode voucher" value="${esc(S.draft ?? S.wanted ?? '')}" style="text-transform:uppercase"><button class="btn outline" data-act="apply-voucher">Cek</button></div>${vm}
          ${S.wanted ? '<button class="link" data-act="clear-voucher" style="margin-top:6px">Lepas voucher</button>' : ''}</div>
        <div class="block"><h4>Metode pembayaran</h4><div class="seg">${['QRIS', 'Debit'].map(m => `<button class="${S.pay === m ? 'on' : ''}" data-pay="${m}">${m === 'Debit' ? 'Kartu Debit' : m}</button>`).join('')}</div></div>
        <div class="totals"><div><span>Subtotal</span><span>${rupiah(c.subtotal)}</span></div>
          ${c.discount ? `<div class="disc"><span>Potongan voucher</span><span>− ${rupiah(c.discount)}</span></div>` : ''}
          <div class="grand"><span>Total bayar</span><b>${rupiah(c.total)}</b></div></div>
        <button class="btn primary block lg" data-act="pay">Bayar ${rupiah(c.total)}</button>
        <p class="hint">Simulasi pembayaran — belum terhubung ke payment gateway.</p>`;
    }

    function refresh() {
      derive();
      renderMenu(); renderTiket(); renderVoucher(); renderProfile(); renderCartBar();
      if (!$('#cartSheet').hidden) renderCart();
      hydrateIcons(phone);
    }

    function go(view) {
      S.view = view;
      $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
      $$('.tab').forEach(t => t.classList.toggle('on', t.dataset.go === (view === 'voucher' ? 'tiket' : view)));
      $('.views').scrollTop = 0;
      refresh();
    }

    function openCart() { $('#cartSheet').hidden = false; refresh(); }
    function closeCart() { $('#cartSheet').hidden = true; }

    function change(id, d) {
      const q = Math.max(0, qty(id) + d);
      if (q) S.cart[id] = q; else delete S.cart[id];
      refresh();
    }

    function checkout() {
      derive();
      const c = calcCart(S.cart, S.voucher);
      if (!c.lines.length) return;
      if (c.ticketQty > 0) {
        if (!S.slot) return toast('Pilih jam antrean sunrise terlebih dahulu.', 'error');
        if (slotLeft(S.slot) < c.ticketQty) return toast('Kuota slot tidak cukup untuk jumlah tiket ini.', 'error');
      }
      const name = ($('#custName')?.value || S.name).trim() || 'Pengunjung';
      S.name = name; saveJSON(KEY_NAME, name);
      const tx = buildTx({ calc: c, customer: name, payment: S.pay, loket: 'Aplikasi', voucher: S.voucher });
      addTx(tx);
      const ticket = c.ticketQty > 0 ? addTicket({ txId: tx.id, qty: c.ticketQty, slot: S.slot, name, date: tx.date }) : null;
      S.cart = {}; S.wanted = null; S.draft = null; S.slot = null;
      closeCart(); refresh();
      const m = openModal(`
        <div class="success-ico">${ic('check')}</div>
        <h3 style="text-align:center">Pembayaran berhasil</h3>
        <p class="muted" style="text-align:center">${esc(tx.id)} · ${rupiah(tx.total)} via ${esc(tx.payment)}</p>
        ${ticket ? eticketHtml(ticket) + '<p class="hint">Tunjukkan kode ini ke petugas gerbang. Tiket tersimpan di menu Tiket.</p>' : `<p class="empty">Tunjukkan nomor pesanan ke kasir untuk mengambil menu Anda.</p>`}
        <button class="btn primary block" data-close style="margin-top:12px">Selesai</button>`, phone);
      drawAllQR(m.el);
    }

    function showTicket(code) {
      const t = getTickets().find(x => x.code === code);
      if (!t) return;
      const m = openModal(`<div class="modal-head"><h3>Tiket Sunrise</h3><button class="icon-btn" data-close aria-label="Tutup">${ic('x')}</button></div>${eticketHtml(t)}<p class="hint">Pindai/tunjukkan kode ini di gerbang.</p>`, phone);
      drawAllQR(m.el);
    }

    /* --- event --- */
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-go],[data-act],[data-cat],[data-pay],[data-slot]');
      if (!t) return;
      const d = t.dataset;
      if (d.act) {
        switch (d.act) {
          case 'inc': change(d.id, 1); break;
          case 'dec': change(d.id, -1); break;
          case 'open-cart': openCart(); break;
          case 'close-cart': closeCart(); break;
          case 'apply-voucher': {
            S.wanted = ($('#cartVoucher').value || '').trim().toUpperCase() || null; S.draft = null;
            refresh();
            if (S.vmsg && S.vmsg.ok) toast('Voucher berhasil dipakai.', 'ok');
            break;
          }
          case 'clear-voucher': S.wanted = null; S.draft = null; refresh(); break;
          case 'use-voucher': {
            S.wanted = d.code; S.draft = null; refresh();
            if (S.vmsg.ok) toast('Voucher dipasang ke keranjang.', 'ok'); else toast('Voucher disimpan. ' + S.vmsg.message);
            break;
          }
          case 'pay': checkout(); break;
          case 'open-ticket': showTicket(d.code); break;
          case 'promo':
            S.cart['tiket-masuk'] = Math.max(2, qty('tiket-masuk')); S.wanted = 'HEMAT10K'; go('tiket'); openCart(); break;
          case 'reset':
            if (confirm('Hapus semua data demo (transaksi & tiket) di browser ini?')) { localStorage.removeItem(KEY_TX); localStorage.removeItem(KEY_TICKETS); location.reload(); }
            break;
        }
        return;
      }
      if (d.go) { go(d.go); if (d.scroll) $('#' + d.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      if (d.cat) { S.cat = d.cat; renderMenu(); hydrateIcons(phone); return; }
      if (d.pay) { S.pay = d.pay; renderCart(); hydrateIcons(phone); return; }
      if (d.slot) { S.slot = d.slot; refresh(); }
    });
    document.addEventListener('input', e => {
      if (e.target.id === 'cartVoucher') S.draft = e.target.value;
      if (e.target.id === 'custName') S.name = e.target.value;
    });
    $('#cartSheet').addEventListener('click', e => { if (e.target.id === 'cartSheet') closeCart(); });

    go('home');
  }

  function mountainSvg() {
    return '<svg viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden="true"><path d="M0 70V44l60-24 50 26 70-38 80 44 60-22 80 28v12z" fill="rgba(255,255,255,.35)"/><path d="M0 70V54l90-22 70 28 80-34 90 40 70-20v24z" fill="#fff"/></svg>';
  }

  /* ---------------------------------------------------------
     6. HALAMAN KASIR (kasir.html)
     --------------------------------------------------------- */
  function initKasir() {
    const S = { cat: 'semua', q: '', items: {}, wanted: null, voucher: null, vmsg: null, method: 'Tunai' };
    const $cash = $('#cashInput');
    const parseCash = v => Number(String(v).replace(/\D/g, '')) || 0;
    const qty = id => S.items[id] || 0;

    function renderGrid() {
      const q = S.q.trim().toLowerCase();
      const list = PRODUCTS.filter(p => {
        const catOk = S.cat === 'semua' || (S.cat === 'tiket' ? p.cat === 'tiket' : isMenu(p));
        return catOk && (!q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
      });
      $('#pgrid').innerHTML = list.length ? list.map(p => `
        <div class="pcard ${qty(p.id) ? 'sel' : ''}" data-id="${p.id}">
          ${qty(p.id) ? `<span class="qty-badge">${qty(p.id)}</span>` : ''}
          <div class="pthumb">${p.emoji}</div>
          <div class="pinfo"><b>${esc(p.name)}</b><p>${esc(p.desc)}</p>
            <div class="prow"><span class="price">${rupiah(p.price)}</span>
              <div class="pbtns">${qty(p.id) ? `<button class="plus" data-act="dec" data-id="${p.id}" aria-label="Kurangi">${ic('minus')}</button>` : ''}<button class="plus" data-act="inc" data-id="${p.id}" aria-label="Tambah">${ic('plus')}</button></div></div></div>
        </div>`).join('') : '<p class="muted">Produk tidak ditemukan.</p>';
      $$('#catChips .chip').forEach(c => c.classList.toggle('on', c.dataset.cat === S.cat));
    }

    function derive() {
      if (!S.wanted) { S.voucher = null; S.vmsg = null; return; }
      const r = validateVoucher(S.wanted, S.items);
      S.voucher = r.ok ? r.voucher : null; S.vmsg = r;
    }

    function quickAmounts(total) {
      const up = step => Math.ceil(total / step) * step;
      return [...new Set([total, up(10000), up(50000), up(100000)])].filter(v => v >= total && v > 0).slice(0, 4);
    }

    function updateOrder() {
      derive();
      const c = calcCart(S.items, S.voucher);
      $('#orderId').textContent = nextTxId();
      $('#orderLines').innerHTML = c.lines.length ? c.lines.map(l => `
        <div class="oline"><div class="grow"><b>${esc(l.p.name)}</b><small>${rupiah(l.p.price)} / item</small></div>
          <div class="stepper"><button data-act="dec" data-id="${l.p.id}" aria-label="Kurangi">${ic('minus')}</button><span>${l.qty}</span><button data-act="inc" data-id="${l.p.id}" aria-label="Tambah">${ic('plus')}</button></div>
          <span class="amt">${rupiah(l.amount)}</span></div>`).join('') : '<div class="empty">Belum ada item. Pilih produk di sebelah kiri.</div>';

      const vm = $('#vMsg');
      if (S.wanted && S.vmsg) {
        vm.hidden = false;
        vm.className = 'vmsg ' + (S.vmsg.ok ? 'ok' : 'bad');
        vm.textContent = S.vmsg.ok ? `✓ ${S.voucher.name} dipakai — hemat ${rupiah(c.discount)}` : S.vmsg.message;
      } else vm.hidden = true;

      $('#subVal').textContent = rupiah(c.subtotal);
      $('#discRow').hidden = !c.discount;
      $('#discVal').textContent = '− ' + rupiah(c.discount);
      $('#totalVal').textContent = rupiah(c.total);

      $$('#methods button').forEach(b => b.classList.toggle('on', b.dataset.method === S.method));
      const tunai = S.method === 'Tunai';
      $cash.disabled = !tunai;
      if (!tunai) $cash.value = c.total.toLocaleString('id-ID');
      const cash = tunai ? parseCash($cash.value) : c.total;
      $('#quickCash').hidden = !tunai || c.total === 0;
      $('#quickCash').innerHTML = quickAmounts(c.total).map((v, i) => `<button data-cash="${v}">${i === 0 ? 'Uang pas' : v.toLocaleString('id-ID')}</button>`).join('');

      const diff = cash - c.total;
      const ch = $('#changeVal');
      if (!c.lines.length) { ch.textContent = 'Rp 0'; ch.className = ''; }
      else if (diff >= 0) { ch.textContent = rupiah(diff); ch.className = ''; }
      else { ch.textContent = 'Kurang ' + rupiah(-diff); ch.className = 'bad'; }
      $('#payBtn').disabled = !c.lines.length || cash < c.total;
      $('#payBadge').textContent = 'Belum dibayar';
      hydrateIcons($('.order'));
    }

    function refresh() { renderGrid(); updateOrder(); hydrateIcons($('.pos-main')); }

    function change(id, d) {
      const q = Math.max(0, qty(id) + d);
      if (q) S.items[id] = q; else delete S.items[id];
      refresh();
    }

    function resetOrder() {
      S.items = {}; S.wanted = null; S.voucher = null; S.vmsg = null; S.method = 'Tunai';
      $('#custInput').value = ''; $('#vInput').value = ''; $cash.value = '';
      refresh();
    }

    function pay() {
      derive();
      const c = calcCart(S.items, S.voucher);
      const cash = S.method === 'Tunai' ? parseCash($cash.value) : c.total;
      if (!c.lines.length || cash < c.total) return;
      const tx = buildTx({
        calc: c, customer: $('#custInput').value.trim() || 'Pelanggan umum', payment: S.method, loket: $('#loketSel').value,
        voucher: S.voucher, cash, change: cash - c.total, cashier: 'Rani Aulia',
      });
      addTx(tx);
      const ticket = c.ticketQty > 0 ? addTicket({ txId: tx.id, qty: c.ticketQty, slot: null, name: tx.customer, date: tx.date }) : null;
      showReceipt(tx, ticket);
      resetOrder();
    }

    function showReceipt(tx, ticket) {
      const m = openModal(`
        <div class="modal-head"><h3>Pembayaran berhasil</h3><button class="icon-btn" data-close aria-label="Tutup">${ic('x')}</button></div>
        <div class="receipt receipt-print">
          <div class="c"><b>TRIANGLE SKY TELOMOYO</b><br>Coffee Shop &amp; Tiket Sunrise</div><hr>
          <div class="r"><span>${esc(tx.id)}</span><span>${fmtDate(tx.date)} ${timeOf(tx.ts)}</span></div>
          <div class="r"><span>Kasir: ${esc(tx.cashier)}</span><span>${esc(tx.loket)}</span></div>
          <div>Pelanggan: ${esc(tx.customer)}</div><hr>
          ${tx.items.map(i => `<div class="r"><span>${i.qty} × ${esc(getProduct(i.id).name)}</span><span>${rupiah(i.qty * i.price)}</span></div>`).join('')}<hr>
          <div class="r"><span>Subtotal</span><span>${rupiah(tx.subtotal)}</span></div>
          ${tx.discount ? `<div class="r"><span>Voucher ${esc(tx.voucher)}</span><span>− ${rupiah(tx.discount)}</span></div>` : ''}
          <div class="r"><b>TOTAL</b><b>${rupiah(tx.total)}</b></div>
          <div class="r"><span>Bayar (${esc(tx.payment)})</span><span>${rupiah(tx.cash)}</span></div>
          <div class="r"><span>Kembalian</span><span>${rupiah(tx.change)}</span></div>
          ${ticket ? `<hr><div class="c"><b>TIKET MASUK · ${ticket.qty} ORANG</b><canvas class="qr" width="240" height="240" data-qr="${esc(ticket.code)}"></canvas><b>${esc(ticket.code)}</b><br>Berlaku ${fmtDate(ticket.date)}</div>` : ''}
          <hr><div class="c">Terima kasih · selamat menikmati sunrise</div>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px"><button class="btn outline grow" id="printBtn">${ic('printer')} Cetak</button><button class="btn primary grow" data-close>Pesanan baru</button></div>`);
      drawAllQR(m.el);
      $('#printBtn', m.el).addEventListener('click', () => window.print());
    }

    /* --- panel samping: transaksi, voucher, antrean --- */
    function showTransactions() {
      const list = todayTx().slice(0, 12);
      openModal(`<div class="modal-head"><h3>Transaksi terbaru</h3><button class="icon-btn" data-close aria-label="Tutup">${ic('x')}</button></div>
        <div class="list">${list.map(t => `<div class="row"><div class="grow"><b>${esc(t.id)} · ${esc(t.customer)}</b><small>${timeOf(t.ts)} WIB · ${esc(t.loket)} · ${esc(t.payment)}</small></div><b>${rupiah(t.total)}</b></div>`).join('')}</div>
        <a class="link" href="manajer.html">Buka dasbor manajer →</a>`);
    }
    function showVouchers() {
      const m = openModal(`<div class="modal-head"><h3>Voucher</h3><button class="icon-btn" data-close aria-label="Tutup">${ic('x')}</button></div>
        <div class="list">${VOUCHERS.map(v => {
          const exp = voucherExpired(v), left = v.quota - voucherUsed(v), off = exp || left <= 0;
          return `<div class="row"><div class="grow"><b>${v.code}</b><small>${esc(v.desc)}<br>${exp ? 'Kedaluwarsa' : left <= 0 ? 'Kuota habis' : 'Sisa kuota ' + left}</small></div>${off ? '<span class="badge bad">Nonaktif</span>' : `<button class="btn outline sm" data-pick="${v.code}">Pasang</button>`}</div>`;
        }).join('')}</div>`);
      m.el.addEventListener('click', e => {
        const b = e.target.closest('[data-pick]'); if (!b) return;
        S.wanted = b.dataset.pick; $('#vInput').value = S.wanted; updateOrder(); m.close();
        toast(S.vmsg.ok ? 'Voucher dipasang.' : S.vmsg.message, S.vmsg.ok ? 'ok' : 'error');
      });
    }
    function showQueue() {
      const m = openModal(`<div class="modal-head"><h3>Antrean Sunrise 05:00–07:00</h3><button class="icon-btn" data-close aria-label="Tutup">${ic('x')}</button></div>
        <div class="list">${SLOTS.map(s => { const l = slotLeft(s.id); return `<div class="row"><div class="grow"><b>Slot ${s.id} WIB</b><small>Kuota ${s.quota} orang</small></div><span class="badge ${l > 8 ? 'ok' : l > 0 ? 'warn' : 'bad'}">sisa ${l}</span></div>`; }).join('')}</div>
        <h4 style="margin:14px 0 8px">Validasi tiket di gerbang</h4>
        <div style="display:flex;gap:8px"><input id="ticketCode" class="input" placeholder="Masukkan kode, mis. TSKY-AB12CD" style="text-transform:uppercase"><button class="btn primary" id="ticketBtn">Validasi</button></div>
        <p id="ticketMsg" class="vmsg" hidden></p>`);
      const run = () => {
        const r = validateTicket($('#ticketCode', m.el).value);
        const el = $('#ticketMsg', m.el); el.hidden = false; el.className = 'vmsg ' + (r.ok ? 'ok' : 'bad'); el.textContent = r.message;
      };
      $('#ticketBtn', m.el).addEventListener('click', run);
      $('#ticketCode', m.el).addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
    }

    /* --- event --- */
    $('#pgrid').addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (btn) { change(btn.dataset.id, btn.dataset.act === 'inc' ? 1 : -1); return; }
      const card = e.target.closest('.pcard'); if (card) change(card.dataset.id, 1);
    });
    $('#orderLines').addEventListener('click', e => {
      const btn = e.target.closest('[data-act]'); if (btn) change(btn.dataset.id, btn.dataset.act === 'inc' ? 1 : -1);
    });
    $('#catChips').addEventListener('click', e => { const c = e.target.closest('[data-cat]'); if (c) { S.cat = c.dataset.cat; renderGrid(); hydrateIcons($('.pos-main')); } });
    $('#searchInput').addEventListener('input', e => { S.q = e.target.value; renderGrid(); hydrateIcons($('.pos-main')); });
    $('#methods').addEventListener('click', e => {
      const b = e.target.closest('[data-method]'); if (!b) return;
      S.method = b.dataset.method; if (S.method === 'Tunai') $cash.value = ''; updateOrder();
    });
    $('#quickCash').addEventListener('click', e => { const b = e.target.closest('[data-cash]'); if (b) { $cash.value = Number(b.dataset.cash).toLocaleString('id-ID'); updateOrder(); } });
    $cash.addEventListener('input', () => { const n = parseCash($cash.value); $cash.value = n ? n.toLocaleString('id-ID') : ''; updateOrder(); });
    const applyV = () => { S.wanted = $('#vInput').value.trim().toUpperCase() || null; updateOrder(); if (!S.wanted) toast('Masukkan kode voucher terlebih dahulu.', 'error'); };
    $('#vBtn').addEventListener('click', applyV);
    $('#vInput').addEventListener('keydown', e => { if (e.key === 'Enter') applyV(); });
    $('#clearBtn').addEventListener('click', resetOrder);
    $('#payBtn').addEventListener('click', pay);
    $('#queueManage').addEventListener('click', showQueue);
    $$('.rail [data-rail]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.rail;
      if (k === 'transaksi') showTransactions(); else if (k === 'voucher') showVouchers(); else if (k === 'antrean') showQueue();
    }));

    const clock = () => { $('#clock').textContent = `${fmtDate(todayStr())} · ${timeOf(Date.now()).replace('.', ':')} WIB`; };
    clock(); setInterval(clock, 30000);
    window.addEventListener('storage', updateOrder);
    refresh();
  }

  /* ---------------------------------------------------------
     7. DASBOR MANAJER (manajer.html)
     --------------------------------------------------------- */
  function initManajer() {
    const S = { loket: 'all', showAll: false };

    function summarize(txs) {
      const s = { revenue: 0, count: txs.length, tickets: 0, revTicket: 0, revMenu: 0, vouchers: 0, hours: {}, products: {} };
      txs.forEach(t => {
        s.revenue += t.total;
        if (t.voucher) s.vouchers++;
        const f = t.subtotal ? t.total / t.subtotal : 1;
        const h = hourOf(t.ts);
        const b = s.hours[h] || (s.hours[h] = { tiket: 0, menu: 0 });
        t.items.forEach(i => {
          const p = getProduct(i.id), net = i.qty * i.price * f;
          if (p.cat === 'tiket') { s.tickets += i.qty; s.revTicket += net; b.tiket += net; } else { s.revMenu += net; b.menu += net; }
          const pp = s.products[i.id] || (s.products[i.id] = { p, qty: 0, rev: 0 });
          pp.qty += i.qty; pp.rev += net;
        });
      });
      return s;
    }

    function niceStep(x) {
      const pow = Math.pow(10, Math.floor(Math.log10(x))), n = x / pow;
      return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
    }

    function renderChart(s) {
      const hs = Object.keys(s.hours).map(Number);
      const min = Math.min(5, ...hs), max = Math.max(9, ...hs);
      const buckets = [];
      for (let h = min; h <= max; h++) { const b = s.hours[h] || { tiket: 0, menu: 0 }; buckets.push({ h, ...b, total: b.tiket + b.menu }); }
      const peak = Math.max(...buckets.map(b => b.total), 100000);
      const step = niceStep(peak / 4), top = step * 4;
      const W = 760, H = 270, L = 56, R = 10, T = 24, B = 30, iw = W - L - R, ih = H - T - B, band = iw / buckets.length, bw = Math.min(56, band * .52), base = T + ih;
      let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik penjualan per jam">`;
      for (let i = 0; i <= 4; i++) {
        const y = base - (ih * i) / 4;
        svg += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 8}" y="${y + 3}" text-anchor="end">${i === 0 ? '0' : shortMoney(step * i).replace('Rp ', '')}</text>`;
      }
      buckets.forEach((b, i) => {
        const x = L + band * i + (band - bw) / 2;
        const hT = (b.tiket / top) * ih, hM = (b.menu / top) * ih;
        svg += `<g><title>${pad(b.h)}:00 — Tiket ${rupiah(b.tiket)} · Menu ${rupiah(b.menu)}</title>`;
        if (hT > 0) svg += `<rect class="bar-t" x="${x}" y="${base - hT}" width="${bw}" height="${hT}" rx="3"/>`;
        if (hM > 0) svg += `<rect class="bar-m" x="${x}" y="${base - hT - hM}" width="${bw}" height="${hM}" rx="3"/>`;
        if (b.total > 0) svg += `<text class="val" x="${x + bw / 2}" y="${base - hT - hM - 6}" text-anchor="middle">${shortMoney(b.total).replace('Rp ', '')}</text>`;
        svg += `</g><text x="${x + bw / 2}" y="${H - 9}" text-anchor="middle">${pad(b.h)}:00</text>`;
      });
      $('#chart').innerHTML = svg + '</svg>';
    }

    function renderPerf(s) {
      const list = Object.values(s.products).sort((a, b) => b.rev - a.rev).slice(0, 4);
      const maxRev = Math.max(...list.map(x => x.rev), 1);
      $('#perf').innerHTML = list.length ? list.map(x => `
        <div><div class="head"><div class="nm"><span class="e">${x.p.emoji}</span><div>${esc(x.p.name)}<small>${rupiah(x.p.price)}</small></div></div><span class="qty">${x.qty} ${x.p.cat === 'tiket' ? 'tiket' : 'porsi'}</span></div>
        <div class="rev">${rupiah(x.rev)}</div><div class="bar"><span style="width:${Math.round(x.rev / maxRev * 100)}%"></span></div></div>`).join('') : '<div class="empty">Belum ada penjualan.</div>';

      const active = VOUCHERS.filter(v => !voucherExpired(v));
      const quota = sum(active, v => v.quota), used = Math.min(quota, sum(active, voucherUsed));
      const pct = quota ? Math.round(used / quota * 100) : 0;
      $('#vstat').innerHTML = `<div class="head"><div class="nm"><span class="e" style="width:34px;height:34px;border-radius:10px;background:var(--primary-50);color:var(--primary);display:inline-flex;align-items:center;justify-content:center">${ic('percent')}</span><div><b>Voucher aktif</b><br><small class="muted">${used} digunakan · ${quota - used} belum digunakan</small></div></div><span class="pct">${pct}%</span></div><div class="bar"><span style="width:${pct}%"></span></div>`;
      return { used, quota, pct };
    }

    function render() {
      let txs = todayTx();
      if (S.loket !== 'all') txs = txs.filter(t => t.loket === S.loket);
      const s = summarize(txs);

      $('#kRevenue').textContent = rupiah(s.revenue);
      $('#kRevenueNote').textContent = `Tiket ${shortMoney(s.revTicket)} · menu ${shortMoney(s.revMenu)}`;
      $('#kTickets').textContent = s.tickets.toLocaleString('id-ID');
      $('#kTicketsNote').textContent = s.tickets ? `Rata-rata ${rupiah(s.revTicket / s.tickets)} / tiket` : 'Belum ada tiket terjual';
      $('#kTx').textContent = s.count.toLocaleString('id-ID');
      $('#kTxNote').textContent = s.count ? `Rata-rata ${rupiah(s.revenue / s.count)} / transaksi` : 'Belum ada transaksi';
      const v = renderPerf(s);
      $('#kVoucher').innerHTML = `${v.used} <small>dari ${v.quota}</small>`;
      $('#kVoucherNote').textContent = `${v.pct}% digunakan · ${v.quota - v.used} belum digunakan`;

      renderChart(s);

      const rows = S.showAll ? txs.slice(0, 30) : txs.slice(0, 5);
      $('#txSub').textContent = `${rows.length} dari ${txs.length} transaksi lunas hari ini`;
      $('#txBody').innerHTML = rows.length ? rows.map(t => `
        <tr><td><span class="id">${esc(t.id)}</span><small>${timeOf(t.ts)} WIB</small></td>
          <td><b>${esc(t.customer)}</b><small class="items">${esc(itemsText(t))}</small></td>
          <td>${esc(t.payment)}<small>${esc(t.loket)}</small></td>
          <td><b>${rupiah(t.total)}</b>${t.voucher ? `<small>Voucher ${esc(t.voucher)}</small>` : ''}</td>
          <td><span class="badge ok">${esc(t.status)}</span></td></tr>`).join('') : '<tr><td colspan="5" class="empty">Belum ada transaksi.</td></tr>';
      $('#toggleAll').textContent = S.showAll ? 'Tampilkan ringkas' : 'Lihat semua transaksi →';
      $('#updated').textContent = `Data ilustrasi · Diperbarui ${fmtDate(todayStr())}, ${timeOf(Date.now())} WIB`;
      return txs;
    }

    function downloadReport() {
      const txs = todayTx().filter(t => S.loket === 'all' || t.loket === S.loket);
      const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const head = ['ID', 'Tanggal', 'Waktu (WIB)', 'Pelanggan', 'Pesanan', 'Pembayaran', 'Loket', 'Subtotal', 'Diskon', 'Voucher', 'Total', 'Status'];
      const lines = [head.map(q).join(',')].concat(txs.map(t => [t.id, t.date, timeOf(t.ts), t.customer, itemsText(t), t.payment, t.loket, t.subtotal, t.discount, t.voucher || '', t.total, t.status].map(q).join(',')));
      const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `laporan-triangle-sky-${todayStr()}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
      toast('Laporan CSV diunduh.', 'ok');
    }

    $('#areaSel').addEventListener('change', e => { S.loket = e.target.value; render(); hydrateIcons(); });
    $('#toggleAll').addEventListener('click', () => { S.showAll = !S.showAll; render(); });
    $('#downloadBtn').addEventListener('click', downloadReport);
    $('#resetDemo').addEventListener('click', e => {
      e.preventDefault();
      if (confirm('Hapus semua data demo (transaksi & tiket) di browser ini?')) { localStorage.removeItem(KEY_TX); localStorage.removeItem(KEY_TICKETS); render(); toast('Data demo direset.', 'ok'); }
    });
    $$('[data-soon]').forEach(b => b.addEventListener('click', () => toast('Fitur ini belum tersedia di demo.')));
    $$('[data-scroll]').forEach(b => b.addEventListener('click', () => {
      $$('.side .nav').forEach(n => n.classList.toggle('on', n === b));
      document.getElementById(b.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    $('#todayLabel').textContent = 'Hari ini · ' + fmtDate(todayStr());
    window.addEventListener('storage', render);   // otomatis update saat kasir/pelanggan membuat transaksi di tab lain
    window.addEventListener('focus', render);
    render();
  }

  /* ---------------------------------------------------------
     8. START
     --------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    hydrateIcons();
    const page = document.body.dataset.page;
    if (page === 'customer') initCustomer();
    else if (page === 'kasir') initKasir();
    else if (page === 'manajer') initManajer();
    hydrateIcons();
  });
})();
