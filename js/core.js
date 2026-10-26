/* =====================================================================
   core.js — fondasi bersama aplikasi siswa & panel guru/admin
   fetch ke GAS (POST text/plain, tanpa preflight CORS) · dedupe + epoch tulis ·
   penggabung batch · cache lokal SWR · antrean drain notifikasi · warmup ·
   pengukur performa (PC.Perf.table()) · toast/modal · utilitas.
   ===================================================================== */
(function () {
  'use strict';
  const cfg = window.APP_CONFIG || {};
  const PC = window.PC = window.PC || {};
  PC.versi = '1.0.0';
  PC.url = String(cfg.GAS_URL || '').trim();
  PC.siap = function () { return /^https?:\/\//.test(PC.url) && !/GANTI|XXXX/.test(PC.url); };

  /* ---------- penyimpanan lokal aman (bisa kosong / dilarang) ---------- */
  PC.simpan = {
    get: function (k, def) { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } },
    hapusAwalan: function (p) { try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(p) === 0) localStorage.removeItem(k); }); } catch (e) { /* abaikan */ } }
  };

  /* ---------- pengukur performa ---------- */
  PC.Perf = {
    log: [],
    catat: function (e) { this.log.push(e); if (this.log.length > 300) this.log.shift(); },
    table: function () { console.table(this.log.map(function (e) { return { aksi: e.aksi, total_ms: e.total, server_ms: e.server, jaringan_ms: e.total - (e.server || 0), cache: e.cached ? '✓' : '' }; })); },
    summary: function () {
      const m = {};
      this.log.forEach(function (e) { const x = m[e.aksi] = m[e.aksi] || { n: 0, total: 0, server: 0 }; x.n++; x.total += e.total; x.server += e.server || 0; });
      console.table(Object.keys(m).map(function (k) { const x = m[k]; return { aksi: k, panggilan: x.n, rata_total: Math.round(x.total / x.n), rata_server: Math.round(x.server / x.n) }; }));
    }
  };

  /* ---------- sesi ---------- */
  PC.Sesi = {
    kunci: 'pc_sesi', token: '', me: null,
    muat: function (kunci) { this.kunci = kunci || this.kunci; const s = PC.simpan.get(this.kunci, null); if (s && s.token) { this.token = s.token; this.me = s.me; } return !!this.token; },
    set: function (token, me) { this.token = token; this.me = me; PC.simpan.set(this.kunci, { token: token, me: me }); },
    hapus: function () { this.token = ''; this.me = null; PC.simpan.del(this.kunci); }
  };
  PC.onAuth = function () { /* ditimpa aplikasi */ };

  /* ---------- API ---------- */
  const BACA = /^(siswa\.(boot|paket|rapor|list|detail)|adm\.|kelas\.list|mapel\.list|soal\.list|lencana\.list|karakter\.list|laporan\.|catatan\.list|pengaturan\.get|pengguna\.list|log\.list|keamanan\.status|notif\.(config|queue)|wa\.(audience|blastList|device)|crm\.(list|stats|detail|duplikat)|auth\.(me|config)|migrasi\.pindai)$/;
  PC.adalahBaca = function (a) { return BACA.test(a); };
  const _inflight = {};
  let _epoch = 0;
  function tunda(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function apiRun(action, data, opsi) {
    opsi = opsi || {};
    if (!PC.siap()) return { success: false, message: 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js.', code: 'CONFIG' };
    const body = JSON.stringify({ action: action, token: opsi.tanpaToken ? '' : PC.Sesi.token, data: data || {} });
    const bolehUlang = opsi.ulang !== undefined ? opsi.ulang : BACA.test(action);
    const percobaan = bolehUlang ? 3 : 1;
    let terakhir = null;
    for (let i = 0; i < percobaan; i++) {
      const t0 = performance.now();
      try {
        const res = await fetch(PC.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body, redirect: 'follow' });
        const teks = await res.text();
        let j;
        try { j = JSON.parse(teks); } catch (e) { throw new Error('Respons server tidak terbaca (server sibuk).'); }
        PC.Perf.catat({ aksi: action, total: Math.round(performance.now() - t0), server: j.ms, cached: !!j.cached });
        if (!j.success && j.code === 'AUTH' && !opsi.tanpaToken) setTimeout(function () { PC.onAuth(j.message); }, 0);
        if (j.nq > 0) PC.jadwalDrain();
        return j;
      } catch (e) {
        terakhir = e;
        if (i < percobaan - 1) await tunda(350 * (i + 1) + Math.random() * 400);
      }
    }
    return { success: false, message: navigator.onLine === false ? 'Tidak ada koneksi internet. Periksa sambunganmu ya.' : 'Gagal menghubungi server. ' + ((terakhir && terakhir.message) || ''), code: 'NETWORK' };
  }
  /** Baca identik yang sedang berjalan ditumpangi; tulis menaikkan epoch agar baca berikutnya tidak memakai hasil basi. */
  PC.api = function (action, data, opsi) {
    if (!BACA.test(action)) { _epoch++; return apiRun(action, data, opsi); }
    const k = _epoch + '|' + action + '|' + PC.Sesi.token.slice(-12) + '|' + JSON.stringify(data || {});
    if (_inflight[k]) return _inflight[k];
    const p = apiRun(action, data, opsi);
    _inflight[k] = p;
    p.then(function () { delete _inflight[k]; }, function () { delete _inflight[k]; });
    return p;
  };
  /** Penggabung batch otomatis: aksi baca yang dipanggil di tik yang sama → 1 eksekusi 'batch'. */
  const Batcher = {
    q: null,
    add: function (action, data) {
      const self = this;
      return new Promise(function (res) {
        if (!self.q) { self.q = []; setTimeout(function () { self.flush(); }, 0); }
        self.q.push({ action: action, data: data || {}, res: res });
      });
    },
    flush: async function () {
      const q = this.q; this.q = null;
      const unik = [], peta = {};
      q.forEach(function (x) { const k = x.action + '|' + JSON.stringify(x.data); if (!peta[k]) { peta[k] = []; unik.push(x); } peta[k].push(x); });
      for (let i = 0; i < unik.length; i += 10) {
        const potong = unik.slice(i, i + 10);
        if (potong.length === 1) { const x = potong[0], r = await PC.api(x.action, x.data); peta[x.action + '|' + JSON.stringify(x.data)].forEach(function (y) { y.res(r); }); continue; }
        const r = await PC.api('batch', { calls: potong.map(function (x) { return { action: x.action, data: x.data }; }) });
        potong.forEach(function (x, n) {
          const h = r.success ? r.data.results[n] : r;
          peta[x.action + '|' + JSON.stringify(x.data)].forEach(function (y) { y.res(h); });
        });
      }
    }
  };
  PC.apiQ = function (action, data) { return BATCH_OK.test(action) ? Batcher.add(action, data) : PC.api(action, data); };
  const BATCH_OK = /^(adm\.|kelas\.list|mapel\.list|soal\.list|lencana\.list|karakter\.list|catatan\.list|pengaturan\.get|pengguna\.list|keamanan\.status|notif\.(config|queue)|wa\.blastList|crm\.(list|stats))/;

  /* ---------- drain antrean notifikasi (debounce 400 ms, ulang ≤3×) ---------- */
  let _drainT = null, _drainN = 0;
  PC.jadwalDrain = function () {
    clearTimeout(_drainT);
    _drainT = setTimeout(async function () {
      const r = await apiRun('drain', {});
      if (r && r.success && r.data.sisa > 0 && ++_drainN < 3) PC.jadwalDrain(); else _drainN = 0;
    }, 400);
  };

  /* ---------- warmup server (GET no-cors, maks 1×/4 menit per lingkup) ---------- */
  PC.warmUp = function (scope) {
    if (!PC.siap()) return;
    try {
      const k = 'pc_warm_' + scope, t = Number(sessionStorage.getItem(k) || 0);
      if (Date.now() - t < 240000) return;
      sessionStorage.setItem(k, String(Date.now()));
    } catch (e) { /* abaikan */ }
    fetch(PC.url + '?w=' + encodeURIComponent(scope), { mode: 'no-cors' }).catch(function () {});
  };

  /* ---------- aktivitas (polling adaptif) ---------- */
  PC.Aktivitas = {
    at: Date.now(), last: {},
    init: function () { const s = this; ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'].forEach(function (ev) { addEventListener(ev, function () { s.at = Date.now(); }, { passive: true }); }); },
    idle: function () { return Date.now() - this.at > 120000; },
    due: function (key, aktifMs, idleMs) {
      if (document.visibilityState !== 'visible') return false;
      if (Date.now() - (this.last[key] || 0) < (this.idle() ? idleMs : aktifMs) - 500) return false;
      this.last[key] = Date.now();
      return true;
    }
  };

  /* ---------- utilitas teks/angka/tanggal ---------- */
  PC.esc = function (s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  PC.ik = function (nama, kelas) { return '<span class="ik ' + (kelas || '') + '" aria-hidden="true">' + PC.esc(nama) + '</span>'; };
  PC.angka = function (n) { n = Number(n) || 0; return n.toLocaleString('id-ID'); };
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  PC.tgl = function (v, jam) {
    if (!v) return '-';
    const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T00:00:00') : new Date(v);
    if (isNaN(d)) return String(v);
    return d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear() + (jam ? ', ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) : '');
  };
  PC.relatif = function (v) {
    if (!v) return 'Belum pernah';
    const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T12:00:00') : new Date(v);
    if (isNaN(d)) return String(v);
    const hari = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
    const jam = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    if (hari <= 0) return /^\d{4}-\d{2}-\d{2}$/.test(v) ? 'Hari ini' : 'Hari ini, ' + jam;
    if (hari === 1) return /^\d{4}-\d{2}-\d{2}$/.test(v) ? 'Kemarin' : 'Kemarin, ' + jam;
    if (hari < 7) return hari + ' hari lalu';
    return PC.tgl(v);
  };
  PC.hariIni = function () { const d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  PC.debounce = function (fn, ms) { let t; return function () { const a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; };
  PC.norm = function (s) { return String(s === undefined || s === null ? '' : s).trim().replace(/\s+/g, ' ').toLowerCase(); };
  PC.acak = function (arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  PC.sesiId = function () { return 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); };
  PC.WARNA = {
    biru: { a: '#2db6f5', b: '#7be0ff', d: '#004460', s: '#c6e7ff', i: '#00658d' },
    kuning: { a: '#fdc73a', b: '#ffe58a', d: '#6f5400', s: '#ffdf9a', i: '#775a00' },
    hijau: { a: '#4cd964', b: '#a8f0b4', d: '#1f6b2e', s: '#d7f7dc', i: '#1f7a33' },
    oranye: { a: '#ff8b5e', b: '#ffc2a6', d: '#742400', s: '#ffdbcf', i: '#a73a05' },
    ungu: { a: '#8b7cf6', b: '#c9c1ff', d: '#3b2c99', s: '#e2dfff', i: '#4b3cc4' },
    merah: { a: '#ff5e7a', b: '#ffb3c0', d: '#7a1026', s: '#ffdbe2', i: '#a3203b' },
    tosca: { a: '#22c3b5', b: '#9cefe6', d: '#0b5e57', s: '#cff5f1', i: '#0e7a71' }
  };
  PC.warna = function (n) { return PC.WARNA[n] || PC.WARNA.biru; };

  /* ---------- SHA-256 (sidik kunci jawaban) ---------- */
  function sha256js(ascii) {
    const utf8 = unescape(encodeURIComponent(ascii));
    const K = [], H = [];
    let n = 2, c = 0;
    const isPrime = function (x) { for (let f = 2; f * f <= x; f++) if (x % f === 0) return false; return true; };
    while (c < 64) { if (isPrime(n)) { if (c < 8) H[c] = (Math.pow(n, 1 / 2) * 4294967296) | 0; K[c++] = (Math.pow(n, 1 / 3) * 4294967296) | 0; } n++; }
    const words = [], bitLen = utf8.length * 8;
    let s = utf8 + '\x80';
    while (s.length % 64 - 56) s += '\x00';
    for (let i = 0; i < s.length; i++) words[i >> 2] |= s.charCodeAt(i) << ((3 - i) % 4) * 8;
    words[words.length] = ((bitLen / 4294967296) | 0);
    words[words.length] = bitLen;
    const rot = function (v, a) { return (v >>> a) | (v << (32 - a)); };
    for (let j = 0; j < words.length;) {
      const w = words.slice(j, j += 16), old = H.slice(0, 8);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = H[0], e = H[4];
        const t1 = H[7] + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & H[5]) ^ ((~e) & H[6])) + K[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rot(w15, 7) ^ rot(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rot(w2, 17) ^ rot(w2, 19) ^ (w2 >>> 10))) | 0);
        const t2 = (rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & H[1]) ^ (a & H[2]) ^ (H[1] & H[2]));
        H.unshift((t1 + t2) | 0); H[4] = (H[4] + t1) | 0; H.pop();
      }
      for (let i = 0; i < 8; i++) H[i] = (H[i] + old[i]) | 0;
    }
    let out = '';
    for (let i = 0; i < 8; i++) for (let j2 = 3; j2 + 1; j2--) { const b = (H[i] >> (j2 * 8)) & 255; out += (b < 16 ? '0' : '') + b.toString(16); }
    return out;
  }
  PC.sha256 = async function (s) {
    try {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s)));
        return Array.from(new Uint8Array(buf)).map(function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      }
    } catch (e) { /* jatuh ke versi JS */ }
    return sha256js(String(s));
  };
  PC.sidik = function (nonce, id, extra, teks) { return PC.sha256(nonce + '|' + id + '|' + (extra === '' ? '' : extra + '|') + PC.norm(teks)).then(function (h) { return h.slice(0, 16); }); };

  /* ---------- toast & modal ---------- */
  function wadahToast() { let w = document.querySelector('.toast-wadah'); if (!w) { w = document.createElement('div'); w.className = 'toast-wadah'; w.setAttribute('role', 'status'); w.setAttribute('aria-live', 'polite'); document.body.appendChild(w); } return w; }
  PC.toast = function (pesan, jenis, ms) {
    const ikon = { ok: 'check_circle', galat: 'error', info: 'info' }[jenis || 'info'] || 'info';
    const el = document.createElement('div');
    el.className = 'toast ' + (jenis || 'info');
    el.innerHTML = PC.ik(ikon, 'isi') + '<span>' + PC.esc(pesan) + '</span>';
    wadahToast().appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .3s, transform .3s'; el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; setTimeout(function () { el.remove(); }, 320); }, ms || (jenis === 'galat' ? 5200 : 3200));
  };
  /** PC.modal({judul, isi (html|Node), tombol:[{teks, kelas, aksi(tutup) → false agar tidak menutup}], lebar, ikon, saatBuka(el)}) */
  PC.modal = function (o) {
    const tirai = document.createElement('div');
    tirai.className = 'tirai';
    tirai.innerHTML = '<div class="modal ' + (o.lebar || '') + '" role="dialog" aria-modal="true" aria-label="' + PC.esc(o.judul || '') + '">' +
      '<div class="modal-kepala">' + (o.ikon ? '<div class="blok-ikon kecil ' + (o.warnaIkon || '') + '">' + PC.ik(o.ikon, 'isi') + '</div>' : '') + '<h3>' + PC.esc(o.judul || '') + '</h3>' +
      '<button class="btn hantu btn-ikon kecil" data-tutup aria-label="Tutup">' + PC.ik('close') + '</button></div><div class="modal-isi"></div>' +
      (o.tombol && o.tombol.length ? '<div class="modal-kaki"></div>' : '') + '</div>';
    const isi = tirai.querySelector('.modal-isi');
    if (typeof o.isi === 'string') isi.innerHTML = o.isi; else if (o.isi) isi.appendChild(o.isi);
    const sebelum = document.activeElement;
    const tutup = function () { tirai.remove(); document.removeEventListener('keydown', esc); if (sebelum && sebelum.focus) try { sebelum.focus(); } catch (e) { /* abaikan */ } if (o.saatTutup) o.saatTutup(); };
    const esc = function (e) { if (e.key === 'Escape' && !o.wajib) tutup(); };
    document.addEventListener('keydown', esc);
    tirai.addEventListener('click', function (e) { if (e.target === tirai && !o.wajib) tutup(); });
    tirai.querySelector('[data-tutup]').onclick = tutup;
    const kaki = tirai.querySelector('.modal-kaki');
    (o.tombol || []).forEach(function (t) {
      const b = document.createElement('button');
      b.className = 'btn ' + (t.kelas || 'hantu');
      b.innerHTML = (t.ikon ? PC.ik(t.ikon) : '') + '<span>' + PC.esc(t.teks) + '</span>';
      b.onclick = async function () {
        if (!t.aksi) { tutup(); return; }
        b.disabled = true;
        try { const r = await t.aksi(tutup, tirai, b); if (r !== false) tutup(); } finally { b.disabled = false; }
      };
      kaki.appendChild(b);
    });
    document.body.appendChild(tirai);
    const f = tirai.querySelector('input,select,textarea,button:not([data-tutup])');
    if (f && !o.tanpaFokus) setTimeout(function () { try { f.focus(); } catch (e) { /* abaikan */ } }, 60);
    if (o.saatBuka) o.saatBuka(tirai);
    return { el: tirai, tutup: tutup };
  };
  PC.konfirmasi = function (pesan, opsi) {
    opsi = opsi || {};
    return new Promise(function (res) {
      let jawab = false;
      PC.modal({ judul: opsi.judul || 'Konfirmasi', ikon: opsi.ikon || 'help', warnaIkon: opsi.bahaya ? 'oranye' : 'biru', isi: '<p>' + PC.esc(pesan) + '</p>',
        tombol: [{ teks: opsi.batal || 'Batal', kelas: 'hantu' }, { teks: opsi.ya || 'Ya, lanjutkan', kelas: opsi.bahaya ? 'merah' : 'biru', aksi: function () { jawab = true; } }],
        saatTutup: function () { res(jawab); } });
    });
  };
  PC.memuatTombol = function (btn, teks) {
    if (!btn) return function () {};
    const asli = btn.innerHTML, w = btn.offsetWidth;
    btn.disabled = true; btn.style.minWidth = w + 'px';
    btn.innerHTML = '<span class="putar" style="width:20px;height:20px;border-width:3px"></span>' + (teks ? '<span>' + PC.esc(teks) + '</span>' : '');
    return function () { btn.disabled = false; btn.innerHTML = asli; btn.style.minWidth = ''; };
  };

  /* ---------- muat skrip pustaka secara malas ---------- */
  const _skrip = {};
  PC.muatSkrip = function (url) {
    if (_skrip[url]) return _skrip[url];
    _skrip[url] = new Promise(function (res, rej) {
      const s = document.createElement('script');
      s.src = url; s.async = true; s.onload = function () { res(); }; s.onerror = function () { delete _skrip[url]; rej(new Error('Gagal memuat ' + url)); };
      document.head.appendChild(s);
    });
    return _skrip[url];
  };
  PC.LIB = {
    chart: 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
    xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    autotable: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
    qr: 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'
  };

  /* ---------- berkas: unduh & CSV ---------- */
  PC.unduh = function (nama, isi, mime) {
    const blob = isi instanceof Blob ? isi : new Blob([isi], { type: mime || 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nama;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  PC.selCsv = function (v) {
    let s = String(v === undefined || v === null ? '' : v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;                                    // cegah formula injection di Excel
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  PC.keCsv = function (baris, kolom) {
    return '﻿' + [kolom.map(PC.selCsv).join(',')].concat(baris.map(function (r) { return kolom.map(function (k) { return PC.selCsv(r[k]); }).join(','); })).join('\n');
  };
  /** Pengurai CSV (koma/titik koma, tanda kutip, baris baru dalam kutipan). Mengembalikan array objek berdasarkan header (huruf kecil). */
  PC.bacaCsv = function (teks) {
    teks = String(teks || '').replace(/^﻿/, '');
    const pertama = teks.split(/\r?\n/)[0] || '';
    const pemisah = (pertama.match(/;/g) || []).length > (pertama.match(/,/g) || []).length ? ';' : (pertama.indexOf('\t') > -1 && pertama.indexOf(',') === -1 ? '\t' : ',');
    const baris = [];
    let sel = '', row = [], kutip = false;
    for (let i = 0; i < teks.length; i++) {
      const c = teks[i];
      if (kutip) {
        if (c === '"' && teks[i + 1] === '"') { sel += '"'; i++; }
        else if (c === '"') kutip = false;
        else sel += c;
      } else if (c === '"') kutip = true;
      else if (c === pemisah) { row.push(sel); sel = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && teks[i + 1] === '\n') i++; row.push(sel); baris.push(row); row = []; sel = ''; }
      else sel += c;
    }
    if (sel !== '' || row.length) { row.push(sel); baris.push(row); }
    const isi = baris.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
    if (!isi.length) return [];
    const h = isi[0].map(function (x) { return String(x).trim().toLowerCase().replace(/^'/, ''); });
    return isi.slice(1).map(function (r) { const o = {}; h.forEach(function (k, i) { if (k) o[k] = String(r[i] === undefined ? '' : r[i]).trim().replace(/^'(?=[=+\-@])/, ''); }); return o; });
  };
  PC.pilihBerkas = function (accept) {
    return new Promise(function (res) {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = accept || '';
      inp.onchange = function () { res(inp.files && inp.files[0]); };
      inp.click();
    });
  };
  PC.bacaBerkas = function (f, sebagai) {
    return new Promise(function (res, rej) {
      const r = new FileReader();
      r.onload = function () { res(r.result); }; r.onerror = rej;
      if (sebagai === 'dataurl') r.readAsDataURL(f); else r.readAsText(f);
    });
  };
  /** Kecilkan gambar di browser sebelum diunggah (maks sisi px, JPEG/PNG). */
  PC.kecilkanGambar = function (file, maks) {
    maks = maks || 900;
    return new Promise(function (res, rej) {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        const s = Math.min(1, maks / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const png = /png|gif/.test(file.type);
        const data = c.toDataURL(png ? 'image/png' : 'image/jpeg', .86);
        URL.revokeObjectURL(url);
        res({ mime: png ? 'image/png' : 'image/jpeg', data: data, nama: file.name });
      };
      img.onerror = function () { rej(new Error('Berkas bukan gambar yang valid.')); };
      img.src = url;
    });
  };

  /* ---------- halaman "konfigurasi belum lengkap" ---------- */
  PC.layarKonfig = function (wadah) {
    wadah.innerHTML = '<div class="kartu konfig-galat"><div class="kosong"><div class="emoji">🧭</div><h2 class="t-md">Konfigurasi belum lengkap</h2>' +
      '<p class="redup">Buka <b>js/config.js</b> lalu isi <code>GAS_URL</code> dengan URL Web App Apps Script yang berakhiran <code>/exec</code>.</p></div></div>';
  };
})();
