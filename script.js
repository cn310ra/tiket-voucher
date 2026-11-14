/* ==========================================================
   Biru Kopi — Coffee Shop
   Satu script untuk tiga halaman:
     index.html   -> aplikasi pelanggan (mobile)
     kasir.html   -> POS kasir (tablet)
     manajer.html -> dasbor manajer (web)
   Pesanan disimpan di localStorage sehingga ketiga halaman
   saling terhubung tanpa backend (cocok untuk demo/prototipe).
   ========================================================== */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     1. DATA MASTER
     --------------------------------------------------------- */
  const CATEGORIES = [
    { id: 'semua', label: 'Semua' },
    { id: 'espresso', label: 'Espresso' },
    { id: 'susu', label: 'Kopi Susu' },
    { id: 'dingin', label: 'Kopi Dingin' },
    { id: 'nonkopi', label: 'Non-Kopi' },
    { id: 'snack', label: 'Camilan' },
  ];

  // look: hot (cangkir), iced (gelas tinggi), food (camilan)
  const PRODUCTS = [
    { id: 'espresso',   name: 'Espresso',          desc: 'Shot tunggal pekat dengan crema tebal',          price: 18000, cat: 'espresso', look: 'hot',  color: '#4a2c1a' },
    { id: 'americano',  name: 'Americano',         desc: 'Espresso ringan dengan air panas',               price: 22000, cat: 'espresso', look: 'hot',  color: '#5b3a24' },
    { id: 'long-black', name: 'Long Black',        desc: 'Double shot, aroma kuat dan bersih',             price: 25000, cat: 'espresso', look: 'hot',  color: '#3d2415' },
    { id: 'latte',      name: 'Cafe Latte',        desc: 'Espresso dan susu steam yang lembut',            price: 28000, cat: 'susu',     look: 'hot',  color: '#b98962' },
    { id: 'cappuccino', name: 'Cappuccino',        desc: 'Espresso, susu, dan foam tebal',                 price: 28000, cat: 'susu',     look: 'hot',  color: '#a87650' },
    { id: 'flat-white', name: 'Flat White',        desc: 'Microfoam halus, rasa kopi lebih menonjol',      price: 30000, cat: 'susu',     look: 'hot',  color: '#b08058' },
    { id: 'kopi-susu',  name: 'Kopi Susu Gula Aren', desc: 'Signature: susu segar dan gula aren pekat',    price: 26000, cat: 'susu',     look: 'iced', color: '#9a6a43' },
    { id: 'iced-latte', name: 'Iced Latte',        desc: 'Latte dingin yang segar dan creamy',             price: 29000, cat: 'dingin',   look: 'iced', color: '#c49a72' },
    { id: 'cold-brew',  name: 'Cold Brew',         desc: 'Diseduh dingin 16 jam, halus tanpa pahit',       price: 30000, cat: 'dingin',   look: 'iced', color: '#2f1b10' },
    { id: 'caramel',    name: 'Salted Caramel Latte', desc: 'Karamel asin, susu, dan espresso',            price: 32000, cat: 'dingin',   look: 'iced', color: '#b5793f' },
    { id: 'mocha',      name: 'Mocha',             desc: 'Perpaduan cokelat dan espresso',                 price: 31000, cat: 'susu',     look: 'hot',  color: '#6d4430' },
    { id: 'matcha',     name: 'Matcha Latte',      desc: 'Matcha Jepang dengan susu hangat',               price: 30000, cat: 'nonkopi',  look: 'hot',  color: '#8fb36a' },
    { id: 'choco',      name: 'Cokelat Dingin',    desc: 'Cokelat pekat, susu dingin, dan es',             price: 27000, cat: 'nonkopi',  look: 'iced', color: '#6b3f2e' },
    { id: 'lemon-tea',  name: 'Iced Lemon Tea',    desc: 'Teh segar dengan perasan lemon',                 price: 20000, cat: 'nonkopi',  look: 'iced', color: '#e0a93a' },
    { id: 'croissant',  name: 'Butter Croissant',  desc: 'Renyah berlapis, mentega Prancis',               price: 24000, cat: 'snack',    look: 'food', color: '#d9a15b' },
    { id: 'roti-bakar', name: 'Roti Bakar Cokelat Keju', desc: 'Roti tebal dengan isian lumer',            price: 22000, cat: 'snack',    look: 'food', color: '#c98a4a' },
    { id: 'donat',      name: 'Donat Gula',        desc: 'Lembut, ditaburi gula halus',                    price: 15000, cat: 'snack',    look: 'food', color: '#e2b073' },
  ];

  const TAX_RATE = 0.10;               // PB1 10%
  const KEY_TX = 'bk_tx_v1';
  const KEY_NAME = 'bk_name_v1';
  const TZ = 'Asia/Jakarta';
  const STATUSES = ['Diproses', 'Siap', 'Selesai'];

  /* ---------------------------------------------------------
     2. HELPER
     --------------------------------------------------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rupiah = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const sum = (arr, fn) => arr.reduce((a, x) => a + fn(x), 0);
  const getProduct = id => PRODUCTS.find(p => p.id === id);

  function loadJSON(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } }
  function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage diblokir/penuh */ } }

  const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  function parts(ts) { const o = {}; dtf.formatToParts(ts).forEach(p => { o[p.type] = p.value; }); if (o.hour === '24') o.hour = '00'; return o; }
  const dateOf = ts => { const p = parts(ts); return `${p.year}-${p.month}-${p.day}`; };
  const hourOf = ts => +parts(ts).hour;
  const timeOf = ts => { const p = parts(ts); return `${p.hour}:${p.minute}`; };
  const todayStr = () => dateOf(Date.now());
  const fmtDate = iso => new Date(iso + 'T12:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const mmdd = iso => iso.slice(5, 7) + iso.slice(8, 10);

  function shortMoney(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + ' jt';
    if (n >= 1e3) return Math.round(n / 1e3) + ' rb';
    return String(Math.round(n));
  }

  /* ---------- Ikon ---------- */
  const ICONS = {
    coffee: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    bag: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    receipt: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>',
    menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  };
  const ic = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  function hydrateIcons(root = document) { $$('[data-i]', root).forEach(el => { if (!el.firstElementChild) el.innerHTML = ic(el.dataset.i); }); }

  /* ---------- Ilustrasi produk (SVG) ---------- */
  function cupSvg(p) {
    const c = p.color;
    if (p.look === 'iced') return `<svg viewBox="0 0 64 64" aria-hidden="true">
      <line x1="38" y1="4" x2="33" y2="24" stroke="#2457d6" stroke-width="3" stroke-linecap="round"/>
      <path d="M17 14h30l-3.4 43a3 3 0 0 1-3 2.7H23.4a3 3 0 0 1-3-2.7z" fill="#fff" stroke="#93adeb" stroke-width="2"/>
      <path d="M19.2 26h25.6l-2.7 30.4a1.6 1.6 0 0 1-1.6 1.4H23.5a1.6 1.6 0 0 1-1.6-1.4z" fill="${c}"/>
      <path d="M18.4 17h27.2l-.6 7H19z" fill="#fff" opacity=".55"/>
      <rect x="24" y="30" width="9" height="9" rx="2" fill="#fff" opacity=".6" transform="rotate(-10 28 34)"/>
      <rect x="34" y="40" width="8" height="8" rx="2" fill="#fff" opacity=".5" transform="rotate(12 38 44)"/></svg>`;
    if (p.look === 'food') return `<svg viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="50" rx="22" ry="5" fill="#2457d6" opacity=".12"/>
      <path d="M8 40c0-12 10-22 24-22s24 10 24 22c0 4-4 8-8 8H16c-4 0-8-4-8-8z" fill="${c}"/>
      <path d="M20 26c3-4 7-6 12-6M40 28c3 2 6 5 7 9M22 38c4 2 8 3 12 3" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2.4" stroke-linecap="round"/></svg>`;
    return `<svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M22 8c-3 4 3 6 0 10M32 6c-3 4 3 6 0 10M42 8c-3 4 3 6 0 10" fill="none" stroke="#93adeb" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M12 26h34v14a14 14 0 0 1-14 14h-6a14 14 0 0 1-14-14z" fill="#fff" stroke="#93adeb" stroke-width="2"/>
      <path d="M14 28h30v6H14z" fill="${c}"/>
      <path d="M46 30h4a6 6 0 0 1 0 12h-5" fill="none" stroke="#93adeb" stroke-width="2.4" stroke-linecap="round"/>
      <ellipse cx="32" cy="58" rx="20" ry="3" fill="#2457d6" opacity=".12"/></svg>`;
  }
  const tile = (p, cls = '') => `<div class="tile ${cls}">${cupSvg(p)}</div>`;

  /* ---------- Toast & modal ---------- */
  let toastTimer;
  function toast(msg, type = '') {
    let el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
    el.className = 'toast ' + type; el.textContent = msg;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }
  function openModal(html, host = document.body) {
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop' + (host !== document.body ? ' in-phone' : '');
    bd.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    host.appendChild(bd); hydrateIcons(bd);
    const close = () => bd.remove();
    bd.addEventListener('click', e => { if (e.target === bd || e.target.closest('[data-close]')) close(); });
    return { el: bd, close };
  }

  /* ---------------------------------------------------------
     3. KERANJANG & TRANSAKSI
     --------------------------------------------------------- */
  /* cart = { [productId]: qty } */
  function calcCart(cart) {
    const lines = Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => { const p = getProduct(id); return { p, qty, amount: p.price * qty }; });
    const subtotal = sum(lines, l => l.amount);
    const tax = Math.round(subtotal * TAX_RATE);
    return { lines, subtotal, tax, total: subtotal + tax, itemQty: sum(lines, l => l.qty) };
  }

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const NAMES = ['Siti Rahma', 'Dinda Putri', 'Andi Pratama', 'Rizky Maulana', 'Nadia Safira', 'Budi Santoso', 'Dewi Lestari', 'Agus Setiawan', 'Maya Anggraini', 'Fajar Nugroho', 'Intan Permata', 'Bayu Wicaksono', 'Putri Ayu', 'Eko Prasetyo', 'Lina Marlina', 'Hendra Gunawan'];
  const HOURLY = [[7, 9], [8, 20], [9, 24], [10, 17], [11, 16], [12, 27], [13, 23], [14, 15], [15, 19], [16, 22], [17, 26], [18, 18], [19, 12], [20, 6]];
  const seedCache = {};

  /* Data ilustrasi harian (deterministik per tanggal). Untuk hari ini hanya sampai jam sekarang. */
  function seedTx(date) {
    if (!seedCache[date]) {
      const r = rng(+date.replace(/-/g, ''));
      const [y, mo, d] = date.split('-').map(Number);
      const drinks = PRODUCTS.filter(p => p.cat !== 'snack'), foods = PRODUCTS.filter(p => p.cat === 'snack');
      const list = [];
      HOURLY.forEach(([h, count]) => {
        for (let i = 0; i < count; i++) {
          const map = {};
          const nd = r() < .6 ? 1 : r() < .75 ? 2 : 3;
          for (let k = 0; k < nd; k++) { const p = drinks[Math.floor(r() * drinks.length)]; map[p.id] = (map[p.id] || 0) + 1; }
          if (r() < .35) { const f = foods[Math.floor(r() * foods.length)]; map[f.id] = (map[f.id] || 0) + 1; }
          const items = Object.entries(map).map(([id, qty]) => ({ id, qty, price: getProduct(id).price }));
          const subtotal = sum(items, i2 => i2.qty * i2.price), tax = Math.round(subtotal * TAX_RATE);
          const ts = Date.UTC(y, mo - 1, d, h - 7, Math.floor(r() * 60), Math.floor(r() * 60));
          const pr = r(), cr = r();
          list.push({ ts, date, customer: NAMES[Math.floor(r() * NAMES.length)], items, subtotal, tax, total: subtotal + tax,
            payment: pr < .5 ? 'QRIS' : pr < .8 ? 'Tunai' : 'Debit', channel: cr < .65 ? 'Kasir' : 'Aplikasi',
            orderType: r() < .55 ? 'Dine in' : 'Take away', status: 'Selesai' });
        }
      });
      list.sort((a, b) => a.ts - b.ts).forEach((t, i) => { t.id = `#BK-${mmdd(date)}-${pad(i + 1, 4)}`; });
      seedCache[date] = list;
    }
    return seedCache[date].filter(t => t.ts <= Date.now());
  }

  const getStoredTx = () => loadJSON(KEY_TX, []);
  const saveStoredTx = list => saveJSON(KEY_TX, list);
  const txOfDate = date => [...seedTx(date), ...getStoredTx().filter(t => t.date === date)].sort((a, b) => b.ts - a.ts);
  const todayTx = () => txOfDate(todayStr());
  function nextTxId() {
    const date = todayStr();
    const total = (seedCache[date] || (seedTx(date), seedCache[date])).length + getStoredTx().filter(t => t.date === date).length;
    return `#BK-${mmdd(date)}-${pad(total + 1, 4)}`;
  }

  function buildTx({ calc, customer, payment, channel, orderType, note = '', cash = null, change = null, cashier = null }) {
    const ts = Date.now();
    return { id: nextTxId(), ts, date: dateOf(ts), customer, items: calc.lines.map(l => ({ id: l.p.id, qty: l.qty, price: l.p.price })),
      subtotal: calc.subtotal, tax: calc.tax, total: calc.total, payment, channel, orderType, note, status: 'Diproses', cash, change, cashier };
  }
  function addTx(tx) { const all = getStoredTx(); all.push(tx); saveStoredTx(all); }
  function advanceStatus(id) {
    const all = getStoredTx(), t = all.find(x => x.id === id);
    if (!t) return;
    const i = STATUSES.indexOf(t.status);
    if (i < STATUSES.length - 1) t.status = STATUSES[i + 1];
    saveStoredTx(all);
  }
  const itemsText = tx => tx.items.map(i => `${i.qty}× ${getProduct(i.id).name}`).join(' · ');
  const statusBadge = s => `<span class="badge ${s === 'Selesai' ? 'ok' : s === 'Siap' ? '' : 'warn'}">${esc(s)}</span>`;
  const stepsHtml = s => { const i = STATUSES.indexOf(s); return `<div class="steps">${STATUSES.map((_, k) => `<span class="${k <= i ? 'on' : ''}"></span>`).join('')}</div><div class="steps-label">${STATUSES.map(x => `<span>${x}</span>`).join('')}</div>`; };

  /* ---------------------------------------------------------
     4. APLIKASI PELANGGAN
     --------------------------------------------------------- */
  function initCustomer() {
    const phone = $('.phone');
    const S = { cat: 'semua', cart: {}, view: 'menu', type: 'Dine in', pay: 'QRIS', name: loadJSON(KEY_NAME, ''), note: '' };
    const qty = id => S.cart[id] || 0;
    const stepper = id => `<div class="stepper"><button data-act="dec" data-id="${id}" aria-label="Kurangi">${ic('minus')}</button><span>${qty(id)}</span><button data-act="inc" data-id="${id}" aria-label="Tambah">${ic('plus')}</button></div>`;

    function renderMenu() {
      $('#catBar').innerHTML = CATEGORIES.map(c => `<button class="chip ${S.cat === c.id ? 'on' : ''}" data-cat="${c.id}">${c.label}</button>`).join('');
      const list = PRODUCTS.filter(p => S.cat === 'semua' || p.cat === S.cat);
      $('#menuList').innerHTML = list.map(p => `
        <article class="pcard">${tile(p)}
          <div class="body"><b>${esc(p.name)}</b><p>${esc(p.desc)}</p>
            <div class="foot"><span class="price">${rupiah(p.price)}</span>
              ${qty(p.id) ? stepper(p.id) : `<button class="add-btn" data-act="inc" data-id="${p.id}" aria-label="Tambah ${esc(p.name)}">${ic('plus')}</button>`}</div></div>
        </article>`).join('');
    }

    function myOrders() { return getStoredTx().filter(t => t.channel === 'Aplikasi' && t.date === todayStr()).sort((a, b) => b.ts - a.ts); }

    function renderOrders() {
      const mine = myOrders();
      $('#orderList').innerHTML = mine.length ? mine.map(t => `
        <div class="my-order"><div class="top"><div><b>${esc(t.id)}</b><br><small>${timeOf(t.ts)} WIB · ${esc(t.orderType)}</small></div>${statusBadge(t.status)}</div>
          <p class="items">${esc(itemsText(t))}</p><b class="price">${rupiah(t.total)}</b>${stepsHtml(t.status)}</div>`).join('')
        : `<div class="empty">Belum ada pesanan hari ini.<br>Pilih menu favoritmu di tab Menu.</div>`;
      const active = mine.filter(t => t.status !== 'Selesai').length;
      const dot = $('#ordersDot'); dot.hidden = !active; dot.textContent = active;
    }

    function renderCartBar() {
      const c = calcCart(S.cart);
      $('#cartBar').hidden = c.itemQty === 0 || S.view !== 'menu';
      $('#cartBarText').innerHTML = `${ic('cart')} Keranjang <span class="count">${c.itemQty}</span>`;
      $('#cartBarTotal').textContent = rupiah(c.total);
    }

    function renderCart() {
      const c = calcCart(S.cart);
      if (!c.lines.length) { $('#cartBody').innerHTML = '<div class="empty">Keranjang masih kosong.</div>'; return; }
      $('#cartBody').innerHTML = `
        <div>${c.lines.map(l => `<div class="cart-line">${tile(l.p)}<div class="grow"><b>${esc(l.p.name)}</b><span class="muted">${rupiah(l.p.price)}</span></div>${stepper(l.p.id)}</div>`).join('')}</div>
        <div><span class="field-label">Jenis pesanan</span><div class="seg">${['Dine in', 'Take away'].map(t => `<button class="${S.type === t ? 'on' : ''}" data-type="${t}">${t}</button>`).join('')}</div></div>
        <div><label class="field-label" for="custName">Nama pemesan</label><input id="custName" class="input" value="${esc(S.name)}" placeholder="Nama Anda" maxlength="40"></div>
        <div><label class="field-label" for="custNote">Catatan (opsional)</label><textarea id="custNote" class="textarea" rows="2" placeholder="Mis. less sugar, tanpa es" maxlength="120">${esc(S.note)}</textarea></div>
        <div><span class="field-label">Pembayaran</span><div class="seg">${['QRIS', 'Kartu Debit'].map(m => `<button class="${S.pay === m ? 'on' : ''}" data-pay="${m}">${m}</button>`).join('')}</div></div>
        <div class="totals"><div><span>Subtotal</span><span>${rupiah(c.subtotal)}</span></div><div><span>Pajak PB1 (10%)</span><span>${rupiah(c.tax)}</span></div>
          <div class="grand"><span>Total bayar</span><b>${rupiah(c.total)}</b></div></div>
        <button class="btn primary block lg" data-act="pay">Bayar ${rupiah(c.total)}</button>
        <p class="hint">Simulasi pembayaran — belum terhubung ke payment gateway.</p>`;
    }

    function refresh() {
      renderMenu(); renderOrders(); renderCartBar();
      if (!$('#cartSheet').hidden) renderCart();
      hydrateIcons(phone);
    }
    function go(view) {
      S.view = view;
      $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
      $$('.tab').forEach(t => t.classList.toggle('on', t.dataset.go === view));
      $('.views').scrollTop = 0; refresh();
    }
    const openCart = () => { $('#cartSheet').hidden = false; renderCart(); hydrateIcons(phone); };
    const closeCart = () => { $('#cartSheet').hidden = true; };
    function change(id, d) { const q = Math.max(0, qty(id) + d); if (q) S.cart[id] = q; else delete S.cart[id]; if (!Object.keys(S.cart).length) closeCart(); refresh(); }

    function checkout() {
      const c = calcCart(S.cart); if (!c.lines.length) return;
      S.name = ($('#custName')?.value || S.name).trim() || 'Pelanggan'; S.note = $('#custNote')?.value.trim() || '';
      saveJSON(KEY_NAME, S.name);
      const tx = buildTx({ calc: c, customer: S.name, payment: S.pay, channel: 'Aplikasi', orderType: S.type, note: S.note });
      addTx(tx); S.cart = {}; S.note = ''; closeCart(); refresh();
      const m = openModal(`<div class="success-ico">${ic('check')}</div><h3 style="text-align:center">Pembayaran berhasil</h3>
        <p class="muted" style="text-align:center">${rupiah(tx.total)} via ${esc(tx.payment)}</p>
        <div class="order-no"><small>Nomor pesanan</small><b>${esc(tx.id)}</b></div>
        <p class="hint">Barista sedang menyiapkan pesananmu. Pantau status di tab Pesanan.</p>
        <button class="btn primary block" data-close data-goto="orders" style="margin-top:12px">Lihat pesanan</button>`, phone);
      m.el.addEventListener('click', e => { if (e.target.closest('[data-goto]')) go('orders'); });
    }

    phone.addEventListener('click', e => {
      const t = e.target.closest('[data-go],[data-act],[data-cat],[data-pay],[data-type]'); if (!t) return;
      const d = t.dataset;
      if (d.act === 'inc') change(d.id, 1);
      else if (d.act === 'dec') change(d.id, -1);
      else if (d.act === 'open-cart') openCart();
      else if (d.act === 'close-cart') closeCart();
      else if (d.act === 'pay') checkout();
      else if (d.go) go(d.go);
      else if (d.cat) { S.cat = d.cat; renderMenu(); hydrateIcons(phone); }
      else if (d.pay) { S.pay = d.pay; renderCart(); }
      else if (d.type) { S.type = d.type; renderCart(); }
    });
    phone.addEventListener('input', e => { if (e.target.id === 'custName') S.name = e.target.value; if (e.target.id === 'custNote') S.note = e.target.value; });
    $('#cartSheet').addEventListener('click', e => { if (e.target.id === 'cartSheet') closeCart(); });
    $('#resetDemo')?.addEventListener('click', () => { if (confirm('Hapus semua pesanan demo di browser ini?')) { localStorage.removeItem(KEY_TX); location.reload(); } });
    window.addEventListener('storage', renderOrders);
    setInterval(() => { renderOrders(); hydrateIcons(phone); }, 4000);   // status diperbarui kasir
    go('menu');
  }

  /* ---------------------------------------------------------
     5. POS KASIR
     --------------------------------------------------------- */
  function initKasir() {
    const S = { cat: 'semua', q: '', items: {}, method: 'Tunai', type: 'Dine in' };
    const $cash = $('#cashInput');
    const parseCash = v => Number(String(v).replace(/\D/g, '')) || 0;
    const qty = id => S.items[id] || 0;

    function renderCatalog() {
      $('#catChips').innerHTML = CATEGORIES.map(c => `<button class="chip ${S.cat === c.id ? 'on' : ''}" data-cat="${c.id}">${c.label}</button>`).join('');
      const q = S.q.trim().toLowerCase();
      const list = PRODUCTS.filter(p => (S.cat === 'semua' || p.cat === S.cat) && (!q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)));
      $('#pgrid').innerHTML = list.length ? list.map(p => `
        <button class="kcard ${qty(p.id) ? 'sel' : ''}" data-id="${p.id}">${qty(p.id) ? `<span class="qty-badge">${qty(p.id)}</span>` : ''}${tile(p)}
          <div class="info"><b>${esc(p.name)}</b><p>${esc(p.desc)}</p><span class="price">${rupiah(p.price)}</span></div></button>`).join('') : '<p class="muted">Menu tidak ditemukan.</p>';
    }

    function quickAmounts(total) {
      const up = s => Math.ceil(total / s) * s;
      return [...new Set([total, up(10000), up(50000), up(100000)])].filter(v => v >= total && v > 0).slice(0, 4);
    }

    function updateOrder() {
      const c = calcCart(S.items);
      $('#orderId').textContent = nextTxId();
      $('#orderLines').innerHTML = c.lines.length ? c.lines.map(l => `
        <div class="oline"><div class="grow"><b>${esc(l.p.name)}</b><small>${rupiah(l.p.price)}</small></div>
          <div class="stepper"><button data-act="dec" data-id="${l.p.id}" aria-label="Kurangi">${ic('minus')}</button><span>${l.qty}</span><button data-act="inc" data-id="${l.p.id}" aria-label="Tambah">${ic('plus')}</button></div>
          <span class="amt">${rupiah(l.amount)}</span></div>`).join('') : '<div class="empty">Belum ada item.<br>Ketuk menu di sebelah kiri.</div>';
      $('#subVal').textContent = rupiah(c.subtotal); $('#taxVal').textContent = rupiah(c.tax); $('#totalVal').textContent = rupiah(c.total);
      $$('#typeSeg button').forEach(b => b.classList.toggle('on', b.dataset.type === S.type));
      $$('#methods button').forEach(b => b.classList.toggle('on', b.dataset.method === S.method));

      const tunai = S.method === 'Tunai';
      $('#cashBlock').hidden = !tunai;
      const cash = tunai ? parseCash($cash.value) : c.total;
      $('#quickCash').innerHTML = quickAmounts(c.total).map((v, i) => `<button data-cash="${v}">${i === 0 ? 'Uang pas' : v.toLocaleString('id-ID')}</button>`).join('');
      const diff = cash - c.total, ch = $('#changeVal');
      if (!c.lines.length) { ch.textContent = 'Rp 0'; ch.className = ''; }
      else if (diff >= 0) { ch.textContent = rupiah(diff); ch.className = ''; }
      else { ch.textContent = 'Kurang ' + rupiah(-diff); ch.className = 'bad'; }
      $('#payBtn').disabled = !c.lines.length || cash < c.total;
      $('#queueCount').textContent = activeOrders().length; $('#queueCount').hidden = !activeOrders().length;
      hydrateIcons($('.order'));
    }
    const activeOrders = () => getStoredTx().filter(t => t.date === todayStr() && t.status !== 'Selesai');
    function refresh() { renderCatalog(); updateOrder(); hydrateIcons($('.catalog')); }
    function change(id, d) { const q = Math.max(0, qty(id) + d); if (q) S.items[id] = q; else delete S.items[id]; refresh(); }
    function resetOrder() { S.items = {}; S.method = 'Tunai'; S.type = 'Dine in'; $('#custInput').value = ''; $cash.value = ''; refresh(); }

    function pay() {
      const c = calcCart(S.items), cash = S.method === 'Tunai' ? parseCash($cash.value) : c.total;
      if (!c.lines.length || cash < c.total) return;
      const tx = buildTx({ calc: c, customer: $('#custInput').value.trim() || 'Pelanggan umum', payment: S.method, channel: 'Kasir', orderType: S.type, cash, change: cash - c.total, cashier: 'Rani Aulia' });
      addTx(tx); showReceipt(tx); resetOrder();
    }

    function showReceipt(tx) {
      const m = openModal(`
        <div class="modal-head"><h3>Pembayaran berhasil</h3><button class="icon-btn" data-close aria-label="Tutup">${ic('x')}</button></div>
        <div class="receipt receipt-print">
          <div class="c"><b>BIRU KOPI</b><br>Specialty Coffee</div><hr>
          <div class="r"><span>${esc(tx.id)}</span><span>${fmtDate(tx.date)} ${timeOf(tx.ts)}</span></div>
          <div class="r"><span>Kasir: ${esc(tx.cashier)}</span><span>${esc(tx.orderType)}</span></div>
          <div>Pelanggan: ${esc(tx.customer)}</div><hr>
          ${tx.items.map(i => `<div class="r"><span>${i.qty} × ${esc(getProduct(i.id).name)}</span><span>${rupiah(i.qty * i.price)}</span></div>`).join('')}<hr>
          <div class="r"><span>Subtotal</span><span>${rupiah(tx.subtotal)}</span></div>
          <div class="r"><span>PB1 10%</span><span>${rupiah(tx.tax)}</span></div>
          <div class="r"><b>TOTAL</b><b>${rupiah(tx.total)}</b></div>
          <div class="r"><span>Bayar (${esc(tx.payment)})</span><span>${rupiah(tx.cash)}</span></div>
          <div class="r"><span>Kembalian</span><span>${rupiah(tx.change)}</span></div><hr>
          <div class="c">Terima kasih · sampai jumpa lagi</div>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px"><button class="btn outline grow" id="printBtn">${ic('printer')} Cetak</button><button class="btn primary grow" data-close>Pesanan baru</button></div>`);
      $('#printBtn', m.el).addEventListener('click', () => window.print());
    }

    function showQueue() {
      const render = () => {
        const list = activeOrders().sort((a, b) => a.ts - b.ts);
        return `<div class="modal-head"><h3>Antrean pesanan</h3><button class="icon-btn" data-close aria-label="Tutup">${ic('x')}</button></div>
          ${list.length ? `<div class="list">${list.map(t => `<div class="row"><div class="grow"><b>${esc(t.id)} · ${esc(t.customer)}</b><small>${esc(itemsText(t))}<br>${timeOf(t.ts)} · ${esc(t.channel)} · ${esc(t.orderType)}${t.note ? ' · “' + esc(t.note) + '”' : ''}</small></div>
            <button class="btn ${t.status === 'Diproses' ? 'outline' : 'primary'} sm" data-adv="${esc(t.id)}">${t.status === 'Diproses' ? 'Tandai siap' : 'Selesai'}</button></div>`).join('')}</div>` : '<div class="empty">Tidak ada pesanan yang menunggu.</div>'}`;
      };
      const m = openModal(render());
      m.el.addEventListener('click', e => {
        const b = e.target.closest('[data-adv]'); if (!b) return;
        advanceStatus(b.dataset.adv); $('.modal', m.el).innerHTML = render(); hydrateIcons(m.el); updateOrder();
      });
    }

    $('#pgrid').addEventListener('click', e => { const c = e.target.closest('.kcard'); if (c) change(c.dataset.id, 1); });
    $('#orderLines').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) change(b.dataset.id, b.dataset.act === 'inc' ? 1 : -1); });
    $('#catChips').addEventListener('click', e => { const c = e.target.closest('[data-cat]'); if (c) { S.cat = c.dataset.cat; renderCatalog(); } });
    $('#searchInput').addEventListener('input', e => { S.q = e.target.value; renderCatalog(); });
    $('#typeSeg').addEventListener('click', e => { const b = e.target.closest('[data-type]'); if (b) { S.type = b.dataset.type; updateOrder(); } });
    $('#methods').addEventListener('click', e => { const b = e.target.closest('[data-method]'); if (b) { S.method = b.dataset.method; if (S.method === 'Tunai') $cash.value = ''; updateOrder(); } });
    $('#quickCash').addEventListener('click', e => { const b = e.target.closest('[data-cash]'); if (b) { $cash.value = Number(b.dataset.cash).toLocaleString('id-ID'); updateOrder(); } });
    $cash.addEventListener('input', () => { const n = parseCash($cash.value); $cash.value = n ? n.toLocaleString('id-ID') : ''; updateOrder(); });
    $('#clearBtn').addEventListener('click', resetOrder);
    $('#payBtn').addEventListener('click', pay);
    $('#queueBtn').addEventListener('click', showQueue);

    const clock = () => { $('#clock').textContent = `${fmtDate(todayStr())} · ${timeOf(Date.now())} WIB`; };
    clock(); setInterval(clock, 30000);
    window.addEventListener('storage', updateOrder);
    setInterval(updateOrder, 5000);
    refresh();
  }

  /* ---------------------------------------------------------
     6. DASBOR MANAJER
     --------------------------------------------------------- */
  function initManajer() {
    const S = { channel: 'all', showAll: false };

    function summarize(txs) {
      const s = { revenue: 0, count: txs.length, cups: 0, hours: {}, products: {} };
      txs.forEach(t => {
        s.revenue += t.total;
        const h = hourOf(t.ts); s.hours[h] = (s.hours[h] || 0) + t.total;
        t.items.forEach(i => {
          const p = getProduct(i.id);
          if (p.cat !== 'snack') s.cups += i.qty;
          const pp = s.products[i.id] || (s.products[i.id] = { p, qty: 0, rev: 0 });
          pp.qty += i.qty; pp.rev += i.qty * i.price;
        });
      });
      return s;
    }
    function niceStep(x) { const pow = Math.pow(10, Math.floor(Math.log10(x))), n = x / pow; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow; }

    function renderChart(s) {
      const hs = Object.keys(s.hours).map(Number);
      const min = Math.min(7, ...hs), max = Math.max(20, ...hs);
      const buckets = []; for (let h = min; h <= max; h++) buckets.push({ h, v: s.hours[h] || 0 });
      const peakV = Math.max(...buckets.map(b => b.v), 100000), peak = buckets.find(b => b.v === peakV);
      const step = niceStep(peakV / 4), top = step * 4;
      const W = 760, H = 330, L = 48, R = 8, T = 24, B = 30, iw = W - L - R, ih = H - T - B, band = iw / buckets.length, bw = Math.min(36, band * .62), base = T + ih;
      let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik batang penjualan per jam">`;
      for (let i = 0; i <= 4; i++) { const y = base - ih * i / 4; svg += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 8}" y="${y + 3}" text-anchor="end">${i ? shortMoney(step * i) : '0'}</text>`; }
      buckets.forEach((b, i) => {
        const x = L + band * i + (band - bw) / 2, hh = b.v / top * ih, isPeak = peak && b.h === peak.h && b.v > 0;
        svg += `<g><title>${pad(b.h)}:00 — ${rupiah(b.v)}</title>`;
        if (hh > 0) svg += `<rect class="bar ${isPeak ? 'peak' : ''}" x="${x}" y="${base - hh}" width="${bw}" height="${hh}" rx="5"/>`;
        if (isPeak) svg += `<text class="val" x="${x + bw / 2}" y="${base - hh - 7}" text-anchor="middle">${shortMoney(b.v)}</text>`;
        svg += `</g><text x="${x + bw / 2}" y="${H - 9}" text-anchor="middle">${pad(b.h)}</text>`;
      });
      $('#chart').innerHTML = svg + '</svg>';
      $('#peakNote').textContent = peak && peak.v > 0 ? `Jam tersibuk ${pad(peak.h)}.00 · ${rupiah(peak.v)}` : 'Belum ada penjualan';
    }

    function renderTop(s) {
      const list = Object.values(s.products).sort((a, b) => b.qty - a.qty).slice(0, 5), mx = Math.max(...list.map(x => x.qty), 1);
      $('#topList').innerHTML = list.length ? list.map(x => `
        <div><div class="head"><div class="nm">${tile(x.p)}<div>${esc(x.p.name)}<small>${rupiah(x.rev)}</small></div></div><span class="qty">${x.qty} terjual</span></div>
        <div class="bar-track"><span style="width:${Math.round(x.qty / mx * 100)}%"></span></div></div>`).join('') : '<div class="empty">Belum ada penjualan.</div>';
    }

    function render() {
      let txs = todayTx(); if (S.channel !== 'all') txs = txs.filter(t => t.channel === S.channel);
      const s = summarize(txs);
      $('#kRevenue').textContent = rupiah(s.revenue);
      $('#kRevenueNote').textContent = `Sudah termasuk PB1 ${rupiah(sum(txs, t => t.tax))}`;
      $('#kCups').textContent = s.cups.toLocaleString('id-ID');
      $('#kCupsNote').textContent = 'Total minuman terjual';
      $('#kTx').textContent = s.count.toLocaleString('id-ID');
      $('#kTxNote').textContent = `${txs.filter(t => t.status !== 'Selesai').length} pesanan sedang diproses`;
      $('#kAvg').textContent = rupiah(s.count ? s.revenue / s.count : 0);
      $('#kAvgNote').textContent = s.count ? `${(sum(txs, t => sum(t.items, i => i.qty)) / s.count).toFixed(1).replace('.', ',')} item per transaksi` : 'Belum ada transaksi';
      renderChart(s); renderTop(s);

      const rows = S.showAll ? txs.slice(0, 30) : txs.slice(0, 6);
      $('#txSub').textContent = `${rows.length} dari ${txs.length} transaksi hari ini`;
      $('#txBody').innerHTML = rows.length ? rows.map(t => `
        <tr><td><span class="id">${esc(t.id)}</span><small>${timeOf(t.ts)} WIB</small></td>
          <td><b>${esc(t.customer)}</b><small class="items">${esc(itemsText(t))}</small></td>
          <td>${esc(t.payment)}<small>${esc(t.channel)} · ${esc(t.orderType)}</small></td>
          <td><b>${rupiah(t.total)}</b></td><td>${statusBadge(t.status)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">Belum ada transaksi.</td></tr>';
      $('#toggleAll').textContent = S.showAll ? 'Tampilkan ringkas' : 'Lihat semua →';
      $('#updated').textContent = `Data ilustrasi · Diperbarui ${fmtDate(todayStr())}, ${timeOf(Date.now())} WIB`;
    }

    function downloadReport() {
      const txs = todayTx().filter(t => S.channel === 'all' || t.channel === S.channel);
      const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const head = ['ID', 'Tanggal', 'Waktu (WIB)', 'Pelanggan', 'Pesanan', 'Jenis', 'Kanal', 'Pembayaran', 'Subtotal', 'Pajak', 'Total', 'Status'];
      const lines = [head.map(q).join(',')].concat(txs.map(t => [t.id, t.date, timeOf(t.ts), t.customer, itemsText(t), t.orderType, t.channel, t.payment, t.subtotal, t.tax, t.total, t.status].map(q).join(',')));
      const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `laporan-biru-kopi-${todayStr()}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href); toast('Laporan CSV diunduh.', 'ok');
    }

    $('#chSel').addEventListener('change', e => { S.channel = e.target.value; render(); });
    $('#toggleAll').addEventListener('click', () => { S.showAll = !S.showAll; render(); });
    $('#downloadBtn').addEventListener('click', downloadReport);
    $('#resetDemo').addEventListener('click', e => { e.preventDefault(); if (confirm('Hapus semua pesanan demo di browser ini?')) { localStorage.removeItem(KEY_TX); render(); toast('Data demo direset.', 'ok'); } });
    $$('[data-soon]').forEach(b => b.addEventListener('click', () => toast('Fitur ini belum tersedia di demo.')));
    $$('[data-scroll]').forEach(b => b.addEventListener('click', () => { $$('.side .nav').forEach(n => n.classList.toggle('on', n === b)); document.getElementById(b.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    $('#todayLabel').textContent = 'Hari ini · ' + fmtDate(todayStr());
    window.addEventListener('storage', render); window.addEventListener('focus', render); setInterval(render, 15000);
    render();
  }

  /* ---------------------------------------------------------
     7. START
     --------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    hydrateIcons();
    const page = document.body.dataset.page;
    if (page === 'customer') initCustomer(); else if (page === 'kasir') initKasir(); else if (page === 'manajer') initManajer();
    hydrateIcons();
  });
})();
