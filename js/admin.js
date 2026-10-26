/* =====================================================================
   admin.js — kerangka Panel Guru/Admin/Superadmin + komponen bersama + Dashboard
   Masuk: Google (verifikasi token di server) → Superadmin wajib PIN 6 angka.
   Akses darurat tersembunyi: admin.html#darurat.
   Modul halaman lain: admin-kelas.js, admin-konten.js, admin-laporan.js,
   admin-notif.js, admin-sistem.js (mendaftar ke A.hal).
   ===================================================================== */
(function () {
  'use strict';
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.from((r || document).querySelectorAll(s)); };
  const esc = PC.esc, ik = PC.ik;
  const A = window.A = { hal: {}, boot: null, kelas: '', cache: {}, rendNo: 0, $: $, $$: $$ };

  const MENU = {
    dashboard: ['Dashboard', 'space_dashboard', 'kelas'],
    siswa: ['Data Siswa & Progres', 'groups', 'kelas'],
    tingkat: ['Tingkat Kesulitan', 'tune', 'kelas'],
    laporan: ['Laporan & Evaluasi', 'analytics', 'kelas'],
    soal: ['Bank Kuis', 'quiz', 'kelas'],
    catatan: ['Catatan & Misi', 'forum', 'kelas'],
    kelas: ['Kelola Kelas', 'meeting_room', 'konten'],
    mapel: ['Pulau & Mapel', 'public', 'konten'],
    lencana: ['Lencana', 'military_tech', 'konten'],
    karakter: ['Karakter', 'pets', 'konten'],
    wa: ['WhatsApp & Notifikasi', 'chat', 'komunikasi'],
    crm: ['CRM Kontak', 'contacts', 'komunikasi'],
    pengguna: ['Pengguna & Peran', 'manage_accounts', 'sistem'],
    pengaturan: ['Pengaturan', 'settings', 'sistem'],
    keamanan: ['Keamanan & Performa', 'shield_lock', 'sistem'],
    migrasi: ['Migrasi Data', 'move_up', 'sistem'],
    log: ['Log Aktivitas', 'history', 'sistem']
  };
  const GRUP = { kelas: 'Ruang Kelas', konten: 'Konten Belajar', komunikasi: 'Komunikasi', sistem: 'Sistem' };
  const PERAN = { superadmin: 'Superadmin', admin: 'Admin Sekolah', guru: 'Guru' };
  A.MENU = MENU; A.PERAN = PERAN;

  /* =================================================================
   * UTILITAS BERSAMA
   * ================================================================= */
  A.peran = function () { return (A.boot && A.boot.me.role) || (PC.Sesi.me && PC.Sesi.me.role) || ''; };
  A.bisa = function (tingkat) {
    const r = A.peran();
    if (tingkat === 'SA') return r === 'superadmin';
    if (tingkat === 'ADM') return r === 'superadmin' || r === 'admin';
    return !!r;
  };
  A.el = function (html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
  A.kerangka = function (tinggi) { return (tinggi || [120, 300]).map(function (h) { return '<div class="kerangka" style="height:' + h + 'px"></div>'; }).join(''); };
  A.kartuGalat = function (el, r, ulang) {
    el.innerHTML = '<div class="kartu kosong"><div class="emoji">☁️</div><h2 class="t-sm">Data belum bisa dimuat</h2><p>' + esc(r.message || 'Terjadi kesalahan.') + '</p>' +
      (ulang ? '<button class="btn biru" data-ulang>' + ik('refresh') + 'Coba lagi</button>' : '') + '</div>';
    const b = $('[data-ulang]', el); if (b) b.onclick = ulang;
  };
  A.namaKelas = function (id) { const k = (A.boot.kelas || []).filter(function (x) { return x.id === id; })[0]; return k ? k.nama : (id || '-'); };
  A.opsiKelas = function (pilih, opsi) {
    opsi = opsi || {};
    const l = (A.boot.kelas || []).filter(function (k) { return opsi.arsip || k.status !== 'arsip'; });
    return (opsi.semua ? '<option value="">' + esc(opsi.semua) + '</option>' : '') + l.map(function (k) { return '<option value="' + esc(k.id) + '"' + (k.id === pilih ? ' selected' : '') + '>' + esc(k.nama) + (k.julukan ? ' · ' + esc(k.julukan) : '') + '</option>'; }).join('');
  };
  A.opsiMapel = function (pilih, opsi) {
    opsi = opsi || {};
    const l = (A.boot.mapel || []).filter(function (m) { return !opsi.aktif || m.status === 'aktif'; });
    return (opsi.semua ? '<option value="">' + esc(opsi.semua) + '</option>' : '') + l.map(function (m) { return '<option value="' + esc(m.id) + '"' + (m.id === pilih ? ' selected' : '') + '>' + esc(m.nama) + (m.status !== 'aktif' ? ' (' + esc(m.status) + ')' : '') + '</option>'; }).join('');
  };
  A.namaMapel = function (id) { const m = (A.boot.mapel || []).filter(function (x) { return x.id === id; })[0]; return m ? m.nama : (id || '-'); };
  A.skorPil = function (s, kosong) {
    if (kosong) return '<span class="sel-kosong">—</span>';
    const k = s >= 90 ? ['biru', 'Sempurna', 'info'] : s >= 75 ? ['hijau', 'Baik', 'ok'] : s >= 60 ? ['kuning', 'Cukup', 'peringatan'] : ['oranye', 'Perlu latihan', 'bahaya'];
    return '<span class="pil ' + k[0] + '"><i class="titik-status ' + k[2] + '"></i>' + s + ' · ' + k[1] + '</span>';
  };
  A.labelTopik = function (p) { return p >= 90 ? 'Sangat Baik' : p >= 80 ? 'Tuntas' : p >= 70 ? 'Baik' : p >= 60 ? 'Cukup' : 'Perlu Penguatan'; };
  A.warnaTopik = function (p) { return p >= 80 ? 'biru' : p >= 70 ? 'hijau' : p >= 60 ? 'kuning' : 'oranye'; };
  /** Warna tanda grafik: langkah lebih tua dari warna tema (lolos uji buta warna; lihat validasi dataviz). */
  A.WARNA_GRAFIK = { biru: '#1b8ec4', kuning: '#d29a00', ungu: '#7b61ff', oranye: '#d9541e', hijau: '#1f9d6b', merah: '#c2367a', tosca: '#13917a' };
  A.urlSiswa = function () {
    const u = (A.boot && A.boot.setting && A.boot.setting.APP_URL) || '';
    return u || location.href.split('#')[0].split('?')[0].replace(/admin\.html$/, '');
  };
  A.tglInput = function (geser) { const d = new Date(); d.setDate(d.getDate() + (geser || 0)); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };

  /** Baca dengan SWR: tampilkan cache memori dulu, lalu segarkan. Aksi baca dipanggil bersamaan → digabung 'batch'. */
  A.swr = async function (action, data, render, opsi) {
    opsi = opsi || {};
    const k = action + '|' + JSON.stringify(data || {}), c = A.cache[k], no = A.rendNo;
    if (c) render(c, true);
    const r = await PC.apiQ(action, data || {});
    if (no !== A.rendNo && !opsi.tetap) return null;
    if (!r || !r.success) {
      if (!c) { if (opsi.galat) opsi.galat(r || {}); else PC.toast((r && r.message) || 'Gagal memuat.', 'galat'); }
      return null;
    }
    A.cache[k] = r.data;
    if (!c || JSON.stringify(c) !== JSON.stringify(r.data)) render(r.data, false);
    return r.data;
  };
  /** Tulis: tampilkan toast, bersihkan cache baca. */
  A.tulis = async function (action, data, opsi) {
    opsi = opsi || {};
    const selesai = opsi.btn ? PC.memuatTombol(opsi.btn, opsi.memuat || '') : function () {};
    const r = await PC.api(action, data || {});
    selesai();
    if (r.success) { A.cache = {}; if (!opsi.diam && r.message) PC.toast(r.message, 'ok'); }
    else if (!opsi.diamGagal) PC.toast(r.message, 'galat');
    return r;
  };

  /* ---------- grafik (Chart.js dimuat saat perlu) ---------- */
  A._grafik = [];
  A.grafik = async function (canvas, config) {
    await PC.muatSkrip(PC.LIB.chart);
    if (!canvas.isConnected) return null;
    const Ch = window.Chart;
    Ch.defaults.font.family = "'Nunito Sans', system-ui, sans-serif";
    Ch.defaults.font.weight = 700;
    Ch.defaults.color = '#6c6c8a';
    const g = new Ch(canvas, config);
    A._grafik.push(g);
    return g;
  };
  function hapusGrafik() { A._grafik.forEach(function (g) { try { g.destroy(); } catch (e) { /* abaikan */ } }); A._grafik = []; }
  A.opsiSumbu = function (maks, satuan) {
    return {
      x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 12, weight: 800 } } },
      y: { beginAtZero: true, max: maks, border: { display: false }, grid: { color: '#e8e5ff' }, ticks: { font: { size: 11 }, callback: function (v) { return v + (satuan || ''); }, maxTicksLimit: 5 } }
    };
  };
  A.tooltip = { backgroundColor: '#22223a', padding: 12, cornerRadius: 12, titleFont: { size: 13, weight: 800 }, bodyFont: { size: 13, weight: 700 }, boxPadding: 6, usePointStyle: true };

  /* ---------- tabel (urut, halaman, pilih banyak) ---------- */
  A.Tabel = function (wadah, o) {
    const t = { rows: o.rows || [], hal: 1, per: o.per || 25, urut: o.urut || null, arah: o.arah || -1, pilih: new Set() };
    const idOf = function (r) { return String(r[o.id || 'id']); };
    const urutkan = function (rows) {
      if (!t.urut) return rows;
      const kol = o.kolom.filter(function (k) { return k.k === t.urut; })[0];
      const f = kol && typeof kol.urut === 'function' ? kol.urut : function (r) { return r[t.urut]; };
      return rows.slice().sort(function (a, b) {
        const x = f(a), y = f(b);
        if (typeof x === 'number' || typeof y === 'number') return ((Number(x) || 0) - (Number(y) || 0)) * t.arah;
        return String(x === undefined || x === null ? '' : x).localeCompare(String(y === undefined || y === null ? '' : y), 'id') * t.arah;
      });
    };
    t.render = function () {
      const rows = urutkan(t.rows), total = rows.length, maks = Math.max(1, Math.ceil(total / t.per));
      if (t.hal > maks) t.hal = maks;
      if (!total) { wadah.innerHTML = '<div class="kosong"><div class="emoji">' + (o.emojiKosong || '🗂️') + '</div><p>' + esc(o.kosong || 'Belum ada data.') + '</p></div>'; bilah(); return; }
      const tampil = rows.slice((t.hal - 1) * t.per, t.hal * t.per);
      const semuaDipilih = tampil.every(function (r) { return t.pilih.has(idOf(r)); });
      let h = '<div class="tabel-wadah"><table class="tabel"><thead><tr>' +
        (o.pilih ? '<th class="cek"><input type="checkbox" data-t="semua" aria-label="Pilih semua di halaman ini"' + (semuaDipilih ? ' checked' : '') + '></th>' : '') +
        o.kolom.map(function (k) {
          const bisaUrut = k.k && k.urut !== false;
          return '<th' + (bisaUrut ? ' data-urut="' + esc(k.k) + '" aria-sort="' + (t.urut === k.k ? (t.arah > 0 ? 'ascending' : 'descending') : 'none') + '"' : '') + (k.kelas ? ' class="' + k.kelas + '"' : '') + '>' + esc(k.judul) +
            (t.urut === k.k ? ' ' + ik(t.arah > 0 ? 'arrow_upward' : 'arrow_downward', 's16') : '') + '</th>';
        }).join('') + '</tr></thead><tbody>' +
        tampil.map(function (r) {
          const id = idOf(r), p = t.pilih.has(id);
          return '<tr data-id="' + esc(id) + '"' + (p ? ' class="terpilih"' : '') + '>' +
            (o.pilih ? '<td class="cek"><input type="checkbox" data-t="satu" value="' + esc(id) + '"' + (p ? ' checked' : '') + ' aria-label="Pilih baris"></td>' : '') +
            o.kolom.map(function (k) { return '<td' + (k.kelas ? ' class="' + k.kelas + '"' : '') + '>' + (k.html ? k.html(r) : esc(r[k.k] === undefined || r[k.k] === null ? '' : r[k.k])) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
      if (total > t.per) {
        h += '<div class="paging"><span>Menampilkan ' + ((t.hal - 1) * t.per + 1) + '–' + Math.min(total, t.hal * t.per) + ' dari ' + PC.angka(total) + '</span><div class="tombol">' +
          '<button class="btn hantu kecil" data-hal="' + (t.hal - 1) + '"' + (t.hal <= 1 ? ' disabled' : '') + '>' + ik('chevron_left') + 'Sebelumnya</button>' +
          '<button class="btn hantu kecil" data-hal="' + (t.hal + 1) + '"' + (t.hal >= maks ? ' disabled' : '') + '>Berikutnya' + ik('chevron_right') + '</button></div></div>';
      } else if (o.tampilJumlah !== false) h += '<div class="paging"><span>' + PC.angka(total) + ' baris</span></div>';
      wadah.innerHTML = h;
      bilah();
    };
    function bilah() {
      if (!o.bilah) return;
      let b = wadah.nextElementSibling && wadah.nextElementSibling.classList.contains('bilah-pilih') ? wadah.nextElementSibling : null;
      if (!t.pilih.size) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement('div'); b.className = 'bilah-pilih'; wadah.after(b); }
      b.innerHTML = '<b>' + t.pilih.size + ' dipilih</b>' + o.bilah.filter(function (x) { return !x.tampil || x.tampil(); }).map(function (x, i) {
        return '<button class="btn kecil ' + (x.kelas || 'putih') + '" data-bilah="' + i + '">' + (x.ikon ? ik(x.ikon) : '') + esc(x.teks) + '</button>';
      }).join('') + '<button class="btn kecil teks" style="color:#fff" data-bilah="x">Batal</button>';
      const daftar = o.bilah.filter(function (x) { return !x.tampil || x.tampil(); });
      $$('[data-bilah]', b).forEach(function (btn) {
        btn.onclick = function () {
          if (btn.dataset.bilah === 'x') { t.kosongkan(); return; }
          daftar[Number(btn.dataset.bilah)].aksi(t.terpilih(), btn);
        };
      });
    }
    wadah.addEventListener('click', function (e) {
      const th = e.target.closest('th[data-urut]');
      if (th) { const k = th.dataset.urut; if (t.urut === k) t.arah = -t.arah; else { t.urut = k; t.arah = o.arahAwal && o.arahAwal[k] ? o.arahAwal[k] : -1; } t.render(); return; }
      const hb = e.target.closest('[data-hal]');
      if (hb) { t.hal = Number(hb.dataset.hal); t.render(); wadah.scrollIntoView({ block: 'nearest' }); return; }
      if (o.klikBaris) {
        const tr = e.target.closest('tbody tr');
        if (tr && !e.target.closest('input,button,a,select,label')) o.klikBaris(tr.dataset.id, e);
      }
    });
    wadah.addEventListener('change', function (e) {
      const c = e.target;
      if (c.dataset.t === 'semua') {
        $$('input[data-t="satu"]', wadah).forEach(function (x) { x.checked = c.checked; if (c.checked) t.pilih.add(x.value); else t.pilih.delete(x.value); x.closest('tr').classList.toggle('terpilih', c.checked); });
        bilah();
      } else if (c.dataset.t === 'satu') {
        if (c.checked) t.pilih.add(c.value); else t.pilih.delete(c.value);
        c.closest('tr').classList.toggle('terpilih', c.checked);
        bilah();
      }
    });
    t.set = function (rows) { t.rows = rows || []; const ids = new Set(t.rows.map(idOf)); Array.from(t.pilih).forEach(function (id) { if (!ids.has(id)) t.pilih.delete(id); }); t.render(); };
    t.terpilih = function () { return Array.from(t.pilih); };
    t.kosongkan = function () { t.pilih.clear(); t.render(); };
    t.cari = function (id) { return t.rows.filter(function (r) { return idOf(r) === String(id); })[0]; };
    t.render();
    return t;
  };

  /* ---------- formulir ---------- */
  let nForm = 0;
  function medan(f, val) {
    if (val === undefined || val === null) val = f.bawaan !== undefined ? f.bawaan : '';
    const id = 'f' + (++nForm) + '_' + f.k;
    const penuh = f.penuh || f.jenis === 'area' || f.jenis === 'info' ? ' penuh' : '';
    if (f.jenis === 'info') return '<div class="penuh">' + f.html + '</div>';
    if (f.jenis === 'saklar') {
      return '<div class="medan' + penuh + '"><label class="saklar"><input type="checkbox" name="' + esc(f.k) + '"' + (val === true || val === 'YA' || val === 'aktif' ? ' checked' : '') + '><i></i><span>' + esc(f.label) + '</span></label>' + (f.bantuan ? '<small>' + f.bantuan + '</small>' : '') + '</div>';
    }
    if (f.jenis === 'warna') {
      return '<div class="medan' + penuh + '"><span>' + esc(f.label) + '</span><div class="pilih-warna" role="radiogroup" aria-label="' + esc(f.label) + '">' + Object.keys(PC.WARNA).map(function (w) {
        return '<label title="' + esc(w) + '"><input type="radio" name="' + esc(f.k) + '" value="' + w + '"' + (w === (val || 'biru') ? ' checked' : '') + ' aria-label="' + w + '"><span style="background:' + PC.WARNA[w].a + '"></span></label>';
      }).join('') + '</div></div>';
    }
    let inp;
    const attr = ' class="isian" id="' + id + '" name="' + esc(f.k) + '"' + (f.wajib ? ' required' : '') + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + (f.maks ? ' maxlength="' + f.maks + '"' : '') + (f.ro ? ' readonly' : '');
    if (f.jenis === 'pilih') {
      inp = '<select' + attr + '>' + (f.opsiHtml || f.opsi.map(function (o) { const ov = Array.isArray(o) ? o[0] : o, ol = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(ov) + '"' + (String(ov) === String(val) ? ' selected' : '') + '>' + esc(ol) + '</option>'; }).join('')) + '</select>';
    } else if (f.jenis === 'area') {
      inp = '<textarea' + attr + ' rows="' + (f.baris || 4) + '">' + esc(val) + '</textarea>';
    } else {
      inp = '<input' + attr + ' type="' + (f.jenis || 'text') + '" value="' + esc(val) + '"' + (f.min !== undefined ? ' min="' + f.min + '"' : '') + (f.max !== undefined ? ' max="' + f.max + '"' : '') + (f.jenis === 'number' ? ' inputmode="numeric"' : '') + (f.auto ? ' autocomplete="' + f.auto + '"' : '') + '>';
    }
    return '<label class="medan' + penuh + '" for="' + id + '"><span>' + esc(f.label) + (f.wajib ? ' *' : '') + '</span>' + inp + (f.bantuan ? '<small>' + f.bantuan + '</small>' : '') + '</label>';
  }
  A.form = function (fields, v) { v = v || {}; return '<div class="grid-form">' + fields.map(function (f) { return medan(f, v[f.k]); }).join('') + '</div>'; };
  A.bacaForm = function (el) {
    const o = {};
    $$('[name]', el).forEach(function (i) {
      if (i.type === 'checkbox') o[i.name] = i.checked;
      else if (i.type === 'radio') { if (i.checked) o[i.name] = i.value; }
      else o[i.name] = String(i.value).trim();
    });
    return o;
  };
  /** Modal formulir: o.simpan(data, tirai) → false agar tetap terbuka. */
  A.modalForm = function (o) {
    return PC.modal({ judul: o.judul, ikon: o.ikon, lebar: o.lebar || '', saatBuka: o.saatBuka, wajib: o.wajib,
      isi: (o.atas || '') + A.form(o.fields, o.nilai) + (o.bawah || ''),
      tombol: [{ teks: o.batalTeks || 'Batal' }, { teks: o.simpanTeks || 'Simpan', kelas: o.kelasSimpan || 'biru', ikon: o.ikonSimpan || 'check', aksi: async function (tutup, tirai) {
        const data = A.bacaForm(tirai);
        for (let i = 0; i < o.fields.length; i++) { const f = o.fields[i]; if (f.wajib && (data[f.k] === '' || data[f.k] === undefined)) { PC.toast(f.label + ' wajib diisi.', 'galat'); const inp = tirai.querySelector('[name="' + f.k + '"]'); if (inp) inp.focus(); return false; } }
        const ok = await o.simpan(data, tirai);
        return ok === false ? false : undefined;
      } }] });
  };

  /* ---------- laci (panel samping) ---------- */
  let laciAktif = null;
  A.laci = function (o) {
    if (laciAktif) laciAktif.tutup();
    const tirai = document.createElement('div'); tirai.className = 'laci-tirai';
    const el = document.createElement('aside'); el.className = 'laci'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', o.judul || '');
    el.innerHTML = '<div class="laci-kepala">' + (o.ikon ? '<div class="blok-ikon kecil biru">' + ik(o.ikon, 'isi') + '</div>' : '') + '<h3>' + esc(o.judul || '') + '</h3><button class="btn hantu btn-ikon kecil" data-tutup aria-label="Tutup">' + ik('close') + '</button></div><div class="laci-isi">' + (o.isi || A.kerangka([90, 200, 160])) + '</div>';
    document.body.appendChild(tirai); document.body.appendChild(el);
    const sebelum = document.activeElement;
    const kb = function (e) { if (e.key === 'Escape' && !document.querySelector('.tirai')) tutup(); };
    const tutup = function () { el.remove(); tirai.remove(); document.removeEventListener('keydown', kb); laciAktif = null; if (sebelum && sebelum.focus) try { sebelum.focus(); } catch (e) { /* abaikan */ } };
    document.addEventListener('keydown', kb);
    tirai.onclick = tutup;
    $('[data-tutup]', el).onclick = tutup;
    setTimeout(function () { try { $('[data-tutup]', el).focus(); } catch (e) { /* abaikan */ } }, 50);
    laciAktif = { el: el, isi: $('.laci-isi', el), tutup: tutup };
    return laciAktif;
  };

  /* ---------- unduhan ---------- */
  A.unduhXlsx = async function (nama, sheets) {
    try { await PC.muatSkrip(PC.LIB.xlsx); } catch (e) { PC.toast('Pustaka Excel gagal dimuat. Periksa koneksi internet.', 'galat'); return; }
    const X = window.XLSX, wb = X.utils.book_new();
    sheets.forEach(function (s) {
      const ws = X.utils.json_to_sheet(s.rows.length ? s.rows : [{ Info: 'Tidak ada data' }]);
      const kol = Object.keys(s.rows[0] || { Info: '' });
      ws['!cols'] = kol.map(function (k) { const maks = Math.max(k.length, ...s.rows.slice(0, 200).map(function (r) { return String(r[k] === undefined ? '' : r[k]).length; })); return { wch: Math.min(48, Math.max(8, maks + 2)) }; });
      X.utils.book_append_sheet(wb, ws, String(s.nama).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31));
    });
    X.writeFile(wb, nama);
  };
  A.unduhCsv = function (nama, rows, kolom) { PC.unduh(nama, PC.keCsv(rows, kolom || Object.keys(rows[0] || {})), 'text/csv;charset=utf-8'); };

  /* ---------- kartu login siswa (QR + PIN) ---------- */
  A.cetakKartu = async function (kartu, judul) {
    if (!kartu || !kartu.length) return;
    try { await PC.muatSkrip(PC.LIB.qr); } catch (e) { PC.toast('Pustaka QR gagal dimuat. Kartu dicetak tanpa QR.', 'info'); }
    const base = A.urlSiswa();
    const qr = function (k) {
      if (!window.qrcode) return '';
      const q = window.qrcode(0, 'M');
      q.addData(base + '#k=' + encodeURIComponent(k.kode) + '&s=' + encodeURIComponent(k.id));
      q.make();
      return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true, alt: 'QR masuk ' + k.nama });
    };
    const daftar = kartu.map(function (k) { return Object.assign({}, k, { svg: qr(k) }); });
    const set = A.boot.setting || {};
    PC.modal({ judul: judul || 'Kartu Masuk Siswa', ikon: 'badge', lebar: 'sangat-lebar',
      isi: '<div class="catatan-info kuning">' + ik('warning', 'isi') + '<span><b>PIN hanya tampil sekali.</b> Cetak atau simpan sebagai PDF sekarang. PIN tersimpan di server sebagai hash, jadi tidak bisa dilihat lagi — bila lupa, reset PIN.</span></div>' +
        '<div class="grid-kartu-login">' + daftar.map(function (k) {
          return '<div class="kartu-login"><div class="qr">' + k.svg + '</div><div class="isi1"><b>' + esc(k.emoji || '🙂') + ' ' + esc(k.nama) + '</b><div class="kecil redup">Kelas ' + esc(k.kelas) + ' · Kode <b>' + esc(k.kode) + '</b></div><div class="pin">PIN ' + esc(k.pin) + '</div></div></div>';
        }).join('') + '</div>',
      tombol: [{ teks: 'Tutup' }, { teks: 'Cetak / Simpan PDF', kelas: 'biru', ikon: 'print', aksi: function () { cetakDokumen(daftar, set, base); return false; } }] });
  };
  function cetakDokumen(daftar, set, base) {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    const kartu = daftar.map(function (k) {
      return '<div class="k"><div class="h"><b>' + esc(set.NAMA_APP || 'Petualangan Cerdas') + '</b><span>' + esc(set.NAMA_SEKOLAH || '') + '</span></div>' +
        '<div class="b"><div class="kiri"><div class="emo">' + esc(k.emoji || '🙂') + '</div><div class="nm">' + esc(k.nama) + '</div><div class="kl">Kelas ' + esc(k.kelas) + '</div>' +
        '<div class="baris"><span>Kode kelas</span><b>' + esc(k.kode) + '</b></div><div class="baris"><span>PIN</span><b class="pin">' + esc(k.pin) + '</b></div></div><div class="qr">' + k.svg + '<small>Pindai untuk masuk</small></div></div>' +
        '<div class="f">Buka ' + esc(base.replace(/^https?:\/\//, '')) + ' → kode kelas → ketuk namamu → PIN</div></div>';
    }).join('');
    const css = '@page{size:A4;margin:10mm}*{box-sizing:border-box}body{margin:0;font-family:"Nunito Sans",Arial,sans-serif;color:#22223a}' +
      '.g{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm}.k{border:1.5px dashed #9aa3b5;border-radius:4mm;overflow:hidden;break-inside:avoid;height:62mm;display:flex;flex-direction:column}' +
      '.h{background:#2db6f5;color:#fff;padding:2.4mm 3mm;display:flex;flex-direction:column;line-height:1.15}.h b{font-size:11pt}.h span{font-size:7.5pt;opacity:.9}' +
      '.b{display:flex;gap:2mm;padding:2.5mm 3mm;flex:1}.kiri{flex:1;min-width:0}.emo{font-size:18pt;line-height:1}.nm{font-weight:800;font-size:11pt;margin-top:1mm;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kl{font-size:8pt;color:#6c6c8a;margin-bottom:1.5mm}' +
      '.baris{display:flex;justify-content:space-between;align-items:baseline;font-size:8pt;border-top:1px solid #eee;padding-top:1mm;margin-top:1mm}.baris b{font-family:monospace;font-size:12pt;letter-spacing:1px}.pin{color:#a73a05}' +
      '.qr{width:24mm;text-align:center;font-size:6.5pt;color:#6c6c8a}.qr svg{width:24mm;height:24mm;display:block}.f{font-size:6.5pt;color:#4a4a66;background:#fff4d6;padding:1.5mm 3mm}';
    const d = f.contentDocument;
    d.open();
    d.write('<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Kartu Masuk Siswa</title><style>' + css + '</style></head><body><div class="g">' + kartu + '</div></body></html>');
    d.close();
    setTimeout(function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { PC.toast('Gagal membuka dialog cetak.', 'galat'); } setTimeout(function () { f.remove(); }, 60000); }, 300);
  }

  /* =================================================================
   * MASUK
   * ================================================================= */
  const elMasuk = function () { return $('#masuk'); };
  async function layarMasuk(pesan) {
    $('#panel').hidden = true;
    const m = elMasuk(); m.hidden = false;
    document.title = 'Masuk — Panel Guru';
    const cfg = PC.simpan.get('pc_cfg', {}) || {};
    const gambar = function (c) {
      m.innerHTML = '<div class="layar-masuk-adm"><section class="sisi-hias"><div class="flex tengah g12"><div class="blok-ikon" style="background:#fff;color:var(--pri-ink);box-shadow:0 4px 0 rgba(0,0,0,.15)">' + ik('school', 'isi s28') + '</div><div><b style="font-size:20px">' + esc(c.namaApp || 'Petualangan Cerdas') + '</b><div class="kecil" style="opacity:.9">' + esc(c.namaSekolah || 'Panel Guru SD') + '</div></div></div>' +
        '<div><h1>Pantau petualangan belajar siswa dengan mudah.</h1><p>Dashboard kelas, laporan perkembangan, bank kuis, dan notifikasi orang tua — dalam satu panel.</p>' +
        '<div class="fitur"><div>' + ik('insights') + 'Grafik nilai &amp; penguasaan topik per kelas</div><div>' + ik('tune') + 'Atur tingkat kesulitan sesuai kemampuan</div><div>' + ik('shield_lock') + 'Login Google, data anak minimal &amp; aman</div></div></div>' +
        '<div class="kecil" style="opacity:.85">Siswa masuk lewat aplikasi siswa dengan kode kelas + PIN.</div></section>' +
        '<section class="sisi-form"><div class="kartu kartu-masuk-adm" id="kotakMasuk"></div></section></div>';
    };
    gambar(cfg);
    const kotak = $('#kotakMasuk');
    kotak.innerHTML = '<div class="memuat"><div class="putar"></div></div>';
    PC.warmUp('pub');
    const r = await PC.api('auth.config', {}, { tanpaToken: true });
    if (r.success) { PC.simpan.set('pc_cfg', r.data); if (JSON.stringify(r.data) !== JSON.stringify(cfg)) { gambar(r.data); } }
    const c = r.success ? r.data : cfg;
    const k = $('#kotakMasuk');
    if (/darurat/.test(location.hash)) { formDarurat(k, pesan); return; }
    k.innerHTML = '<div><span class="pil biru">' + ik('verified_user', 's18') + 'Panel Guru &amp; Admin</span><h2 class="t-lg" style="margin-top:12px">Masuk ke Panel</h2><p class="redup">Gunakan akun Google yang sudah didaftarkan Superadmin.</p></div>' +
      (pesan ? '<div class="catatan-info merah">' + ik('error', 'isi') + '<span>' + esc(pesan) + '</span></div>' : '') +
      (!r.success ? '<div class="catatan-info merah">' + ik('cloud_off', 'isi') + '<span>' + esc(r.message) + '</span></div>' : '') +
      '<div class="gis" id="gisTombol">' + (c.googleClientId ? '<div class="putar"></div>' : '') + '</div>' +
      (!c.googleClientId && r.success ? '<div class="catatan-info kuning">' + ik('info', 'isi') + '<span>Login Google belum diaktifkan. Superadmin: masuk lewat <b>akses darurat</b>, lalu isi Google Client ID di menu Keamanan.</span></div>' : '') +
      '<p class="kecil redup">Siswa? <a href="./">Buka aplikasi siswa</a></p>';
    if (c.googleClientId) pasangGoogle(c.googleClientId, $('#gisTombol'));
  }
  async function pasangGoogle(clientId, wadah) {
    try { await PC.muatSkrip('https://accounts.google.com/gsi/client'); }
    catch (e) { wadah.innerHTML = '<div class="catatan-info merah">' + ik('error', 'isi') + '<span>Layanan login Google tidak bisa dimuat. Periksa koneksi, lalu muat ulang halaman.</span></div>'; return; }
    const g = window.google && window.google.accounts && window.google.accounts.id;
    if (!g) { wadah.textContent = 'Login Google tidak tersedia.'; return; }
    g.initialize({ client_id: clientId, callback: saatGoogle, ux_mode: 'popup', auto_select: false, cancel_on_tap_outside: true });
    wadah.innerHTML = '';
    g.renderButton(wadah, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 320, locale: 'id', logo_alignment: 'left' });
  }
  async function saatGoogle(resp) {
    const k = $('#kotakMasuk');
    if (!k) return;
    const gis = $('#gisTombol');
    if (gis) gis.innerHTML = '<div class="putar"></div>';
    const r = await PC.api('auth.google', { idToken: resp.credential, appUrl: location.href.split('#')[0] }, { tanpaToken: true });
    if (!r.success) { layarMasuk(r.message); return; }
    if (r.data.perluPin) { langkahPin(k, r.data); return; }
    selesaiMasuk(r.data.token, r.data.me);
  }
  function langkahPin(k, d, galat) {
    const baru = d.pinBaru;
    k.innerHTML = '<div class="flex tengah g12"><div class="blok-ikon oranye">' + ik('pin', 'isi') + '</div><div><h2 class="t-md">' + (baru ? 'Buat PIN Superadmin' : 'Verifikasi PIN') + '</h2><p class="redup kecil">Halo, ' + esc(d.nama || '') + '. ' + (baru ? 'Buat PIN 6 angka untuk lapisan keamanan kedua.' : 'Masukkan PIN Superadmin 6 angka.') + '</p></div></div>' +
      (galat ? '<div class="catatan-info merah" role="alert">' + ik('error', 'isi') + '<span>' + esc(galat) + '</span></div>' : '') +
      '<form class="kolom g12" id="fPin" autocomplete="off"><label class="medan"><span>PIN 6 angka</span><input class="isian isian-pin" id="iPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" required></label>' +
      (baru ? '<label class="medan"><span>Ulangi PIN</span><input class="isian isian-pin" id="iPin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" required></label><small class="redup">Hindari 123456 atau angka berulang. PIN disimpan sebagai hash di Script Properties.</small>' : '') +
      '<button class="btn besar biru penuh" type="submit">' + ik('lock_open') + 'Masuk</button><button class="btn teks" type="button" id="batalPin">' + ik('arrow_back', 's18') + 'Ganti akun</button></form>';
    setTimeout(function () { $('#iPin').focus(); }, 50);
    $('#batalPin').onclick = function () { layarMasuk(); };
    $('#fPin').onsubmit = async function (e) {
      e.preventDefault();
      const pin = $('#iPin').value.trim(), ulang = baru ? $('#iPin2').value.trim() : '';
      if (!/^\d{6}$/.test(pin)) { langkahPin(k, d, 'PIN harus 6 angka.'); return; }
      if (baru && pin !== ulang) { langkahPin(k, d, 'Kedua PIN tidak sama.'); return; }
      const selesai = PC.memuatTombol($('#fPin button[type=submit]'), 'Memeriksa…');
      const r = await PC.api('auth.pin', { tiket: d.tiket, pin: pin, pinUlang: ulang, appUrl: location.href.split('#')[0] }, { tanpaToken: true });
      selesai();
      if (!r.success) { if (r.code === 'AUTH') layarMasuk(r.message); else langkahPin(k, d, r.message); return; }
      selesaiMasuk(r.data.token, r.data.me);
    };
  }
  function formDarurat(k, galat) {
    k.innerHTML = '<div class="flex tengah g12"><div class="blok-ikon oranye">' + ik('emergency', 'isi') + '</div><div><h2 class="t-md">Akses Darurat</h2><p class="redup kecil">Hanya untuk Superadmin bila login Google bermasalah. Setiap percobaan dicatat.</p></div></div>' +
      (galat ? '<div class="catatan-info merah" role="alert">' + ik('error', 'isi') + '<span>' + esc(galat) + '</span></div>' : '') +
      '<form class="kolom g12" id="fDarurat" autocomplete="off"><label class="medan"><span>Nama pengguna</span><input class="isian" id="dUser" autocomplete="username" required></label>' +
      '<label class="medan"><span>Kata sandi</span><input class="isian" id="dPass" type="password" autocomplete="current-password" required></label>' +
      '<button class="btn besar oranye penuh" type="submit">' + ik('login') + 'Masuk Darurat</button><a class="btn teks" href="#" id="keGoogle">' + ik('arrow_back', 's18') + 'Kembali ke login Google</a></form>';
    $('#keGoogle').onclick = function (e) { e.preventDefault(); history.replaceState(null, '', location.pathname); layarMasuk(); };
    $('#fDarurat').onsubmit = async function (e) {
      e.preventDefault();
      const selesai = PC.memuatTombol($('#fDarurat button[type=submit]'), 'Memeriksa…');
      const r = await PC.api('auth.darurat', { username: $('#dUser').value.trim(), password: $('#dPass').value }, { tanpaToken: true });
      selesai();
      if (!r.success) { formDarurat(k, r.message); return; }
      history.replaceState(null, '', location.pathname + '#/keamanan');
      selesaiMasuk(r.data.token, r.data.me);
    };
  }
  function selesaiMasuk(token, me) {
    PC.Sesi.set(token, me);
    if (/darurat/.test(location.hash) || !location.hash) history.replaceState(null, '', location.pathname + (me.darurat ? '#/keamanan' : '#/dashboard'));
    mulaiPanel();
  }
  function keluar(pesan) {
    const email = PC.Sesi.me && PC.Sesi.me.email;
    PC.Sesi.hapus();
    A.boot = null; A.cache = {};
    if (email) PC.simpan.del('pc_admboot_' + email);
    try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) { /* abaikan */ }
    hapusGrafik();
    if (laciAktif) laciAktif.tutup();
    $$('.tirai').forEach(function (t) { t.remove(); });
    history.replaceState(null, '', location.pathname);
    layarMasuk(pesan);
  }
  A.keluar = keluar;

  /* =================================================================
   * PANEL
   * ================================================================= */
  async function mulaiPanel() {
    PC.Sesi.muat('pc_staf');
    if (!PC.Sesi.token) { layarMasuk(); return; }
    PC.Aktivitas.init();
    const kunciBoot = 'pc_admboot_' + (PC.Sesi.me && PC.Sesi.me.email);
    const c = PC.simpan.get(kunciBoot, null);
    if (c) { A.boot = c; tampilPanel(); rute(); }
    else { elMasuk().innerHTML = '<div class="memuat" style="min-height:90vh"><div class="putar"></div><p style="margin-top:12px">Menyiapkan panel…</p></div>'; elMasuk().hidden = false; }
    const r = await PC.api('adm.boot');
    if (!r.success) { if (r.code !== 'AUTH' && !c) layarMasuk(r.message); return; }
    const berubah = !c || JSON.stringify(c) !== JSON.stringify(r.data);
    A.boot = r.data;
    PC.simpan.set(kunciBoot, r.data);
    if (berubah) { tampilPanel(); rute(); }
  }
  A.segarkanBoot = async function () {
    const r = await PC.api('adm.boot');
    if (r.success) { A.boot = r.data; PC.simpan.set('pc_admboot_' + A.boot.me.email, r.data); tampilPanel(); }
  };
  function tampilPanel() {
    const b = A.boot, me = b.me;
    elMasuk().hidden = true; elMasuk().innerHTML = '';
    $('#panel').hidden = false;
    $('#merekNama').textContent = b.setting.NAMA_APP || 'Petualangan Cerdas';
    $('#merekPeran').textContent = me.darurat ? 'Akses Darurat' : 'Panel ' + (PERAN[me.role] || 'Guru');
    // navigasi per peran
    let grup = '', h = '';
    b.menu.forEach(function (id) {
      const m = MENU[id]; if (!m) return;
      if (m[2] !== grup) { grup = m[2]; h += '<div class="grup">' + esc(GRUP[grup]) + '</div>'; }
      h += '<a href="#/' + id + '" data-nav="' + id + '">' + ik(m[1]) + '<span>' + esc(m[0]) + '</span></a>';
    });
    $('#nav').innerHTML = h;
    // pilih kelas global
    const sel = $('#pilihKelas'), aktif = b.kelas.filter(function (k) { return k.status !== 'arsip'; });
    const simpanan = PC.simpan.get('pc_admkelas_' + me.email, '');
    const tunggal = me.role === 'guru' && aktif.length === 1;
    A.kelas = aktif.some(function (k) { return k.id === simpanan; }) ? simpanan : (tunggal ? aktif[0].id : '');
    sel.innerHTML = (tunggal ? '' : '<option value="">' + (me.role === 'guru' ? 'Semua kelas saya' : 'Semua kelas') + '</option>') + aktif.map(function (k) { return '<option value="' + esc(k.id) + '"' + (k.id === A.kelas ? ' selected' : '') + '>Kelas ' + esc(k.nama) + (k.julukan ? ' · ' + esc(k.julukan) : '') + '</option>'; }).join('');
    sel.hidden = !aktif.length;
    sel.onchange = function () { A.kelas = sel.value; PC.simpan.set('pc_admkelas_' + me.email, A.kelas); rute(true); };
    const inisial = String(me.nama || me.email || '?').trim().charAt(0).toUpperCase();
    $('#profilAdm').innerHTML = '<span class="ava">' + (PC.Sesi.me && PC.Sesi.me.foto ? '<img src="' + esc(PC.Sesi.me.foto) + '" alt="" referrerpolicy="no-referrer">' : esc(inisial)) + '</span><span class="teks"><b>' + esc(me.nama || me.email) + '</b><small>' + esc(PERAN[me.role] || me.role) + (me.darurat ? ' · darurat' : '') + '</small></span>' + ik('expand_more', 's18');
    document.title = 'Panel ' + (PERAN[me.role] || '') + ' — ' + (b.setting.NAMA_APP || 'Petualangan Cerdas');
  }
  function rute(segar) {
    if (!A.boot) return;
    const bag = location.hash.replace(/^#\/?/, '').split('/');
    let hal = bag[0] || 'dashboard';
    if (A.boot.menu.indexOf(hal) === -1 || !A.hal[hal]) hal = A.boot.menu[0] || 'dashboard';
    A.rendNo++;
    hapusGrafik();
    if (laciAktif && segar !== true) laciAktif.tutup();
    $$('.bilah-pilih').forEach(function (b) { b.remove(); });
    $$('[data-nav]').forEach(function (a) { if (a.dataset.nav === hal) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const m = MENU[hal];
    const kls = A.kelas ? A.namaKelas(A.kelas) : '';
    $('#remah').innerHTML = '<span class="awal">Panel ' + esc(PERAN[A.peran()] || '') + '</span><span class="pemisah">' + ik('chevron_right', 's16') + '</span><b class="potong">' + esc(m[0]) + (kls && m[2] === 'kelas' ? ' · Kelas ' + esc(kls) : '') + '</b>';
    $('#sisi').classList.remove('buka'); $('#tiraiSisi').classList.remove('buka');
    const isi = $('#isi');
    if (segar !== true) window.scrollTo(0, 0);
    try { A.hal[hal].render(isi, bag.slice(1).join('/')); }
    catch (e) { console.error(e); A.kartuGalat(isi, { message: e.message }); }
  }
  A.rute = rute;
  A.ke = function (h) { if (location.hash === '#/' + h) rute(); else location.hash = '#/' + h; };

  function menuProfil(btn) {
    const ada = $('.menu-adm'); if (ada) { ada.remove(); return; }
    const me = A.boot.me, r = btn.getBoundingClientRect();
    const m = document.createElement('div');
    m.className = 'menu-adm'; m.setAttribute('role', 'menu');
    m.style.top = (r.bottom + 8) + 'px'; m.style.right = Math.max(12, innerWidth - r.right) + 'px';
    m.innerHTML = '<div class="kepala-menu"><b>' + esc(me.nama || '') + '</b><div class="kecil redup">' + esc(me.email) + '</div><span class="pil biru" style="margin-top:6px">' + esc(PERAN[me.role] || me.role) + '</span></div>' +
      (me.role === 'superadmin' && !me.darurat ? '<button data-m="pin" role="menuitem">' + ik('pin') + 'Ganti PIN Superadmin</button>' : '') +
      '<button data-m="bantuan" role="menuitem">' + ik('help_center') + 'Bantuan &amp; Panduan</button>' +
      '<button data-m="semua" role="menuitem">' + ik('devices') + 'Keluar dari semua perangkat</button>' +
      '<button data-m="keluar" class="bahaya" role="menuitem">' + ik('logout') + 'Keluar</button>';
    document.body.appendChild(m);
    const tutup = function (e) { if (!e || (!m.contains(e.target) && !btn.contains(e.target))) { m.remove(); document.removeEventListener('click', tutup); } };
    setTimeout(function () { document.addEventListener('click', tutup); }, 0);
    m.onclick = async function (e) {
      const b = e.target.closest('[data-m]'); if (!b) return;
      m.remove(); document.removeEventListener('click', tutup);
      if (b.dataset.m === 'keluar') keluarTanya();
      else if (b.dataset.m === 'bantuan') bantuan();
      else if (b.dataset.m === 'pin') gantiPin();
      else if (b.dataset.m === 'semua') {
        const ya = await PC.konfirmasi('Semua sesi akun Anda di perangkat lain (dan perangkat ini) akan berakhir.', { judul: 'Keluar dari semua perangkat?', ya: 'Ya, keluar semua', bahaya: true, ikon: 'devices' });
        if (!ya) return;
        const r = await A.tulis('auth.keluarSemua', {});
        if (r.success) keluar('Semua sesi telah diakhiri. Silakan masuk lagi.');
      }
    };
  }
  async function keluarTanya() {
    const ya = await PC.konfirmasi('Anda akan keluar dari panel di perangkat ini.', { judul: 'Keluar?', ya: 'Keluar', ikon: 'logout' });
    if (ya) keluar('');
  }
  function gantiPin() {
    A.modalForm({ judul: 'Ganti PIN Superadmin', ikon: 'pin', fields: [
      { k: 'pinLama', label: 'PIN lama', jenis: 'password', wajib: true, maks: 6, penuh: true },
      { k: 'pinBaru', label: 'PIN baru (6 angka)', jenis: 'password', wajib: true, maks: 6 },
      { k: 'pinUlang', label: 'Ulangi PIN baru', jenis: 'password', wajib: true, maks: 6 }],
      simpan: async function (d) {
        if (d.pinBaru !== d.pinUlang) { PC.toast('PIN baru tidak sama.', 'galat'); return false; }
        const r = await A.tulis('pin.ganti', { pinLama: d.pinLama, pinBaru: d.pinBaru });
        return r.success;
      } });
  }
  function bantuan() {
    const r = A.peran();
    PC.modal({ judul: 'Bantuan & Panduan Singkat', ikon: 'help_center', lebar: 'lebar', isi:
      '<div class="grid-2a"><div class="kartu lav kolom g8"><b>' + ik('groups') + ' Siswa masuk</b><p class="kecil">Bagikan <b>kode kelas</b> (menu Kelola Kelas / Data Siswa). Siswa membuka aplikasi siswa, mengetik kode, mengetuk namanya, lalu memasukkan PIN 4 angka. Cetak <b>kartu masuk ber-QR</b> setelah menambah siswa atau mereset PIN.</p></div>' +
      '<div class="kartu lav kolom g8"><b>' + ik('tune') + ' Tingkat kesulitan</b><p class="kecil">Secara otomatis level Sedang/Sulit terbuka setelah siswa meraih bintang di level sebelumnya. Guru dapat membuka atau mengunci level per pulau untuk kelasnya.</p></div>' +
      '<div class="kartu lav kolom g8"><b>' + ik('forum') + ' Catatan &amp; misi</b><p class="kecil">Kirim apresiasi (bonus bintang), misi penguatan ke pulau/level tertentu, atau pengingat ceria. Pengingat & apresiasi juga dikirim ke wali bila notifikasi aktif.</p></div>' +
      '<div class="kartu lav kolom g8"><b>' + ik('analytics') + ' Laporan</b><p class="kecil">Saring per kelas, mapel, siswa, dan tanggal; unduh Excel atau PDF untuk rapat guru dan rapor.</p></div></div>' +
      (r === 'superadmin' ? '<div class="catatan-info">' + ik('shield_lock', 'isi') + '<span>Superadmin: semua rahasia (token Fonnte, Client ID, kredensial darurat, PIN) tersimpan di <b>Script Properties</b> — tidak pernah di kode atau Sheets. Akses darurat: buka <b>admin.html#darurat</b>.</span></div>' : ''),
      tombol: [{ teks: 'Tutup', kelas: 'biru' }] });
  }

  /* ---------- event global ---------- */
  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-aksi]');
    if (!t) return;
    const a = t.dataset.aksi;
    if (a === 'menu') { $('#sisi').classList.toggle('buka'); $('#tiraiSisi').classList.toggle('buka'); }
    else if (a === 'profil') menuProfil(t);
    else if (a === 'keluar') keluarTanya();
    else if (a === 'bantuan') bantuan();
  });

  /* =================================================================
   * DASHBOARD
   * ================================================================= */
  let rentangDash = 7;
  function sapaan() { const j = new Date().getHours(); return j < 11 ? 'Selamat Pagi' : j < 15 ? 'Selamat Siang' : j < 18 ? 'Selamat Sore' : 'Selamat Malam'; }
  A.hal.dashboard = { render: function (el) {
    el.innerHTML = A.kerangka([150, 150, 220, 360]);
    const muat = function (segar) {
      A.swr('adm.dashboard', { kelasId: A.kelas, rentang: rentangDash }, function (d) { gambarDash(el, d); },
        { galat: function (r) { A.kartuGalat(el, r, function () { muat(); }); } });
      void segar;
    };
    muat();
  } };
  function gambarDash(el, d) {
    const b = A.boot, k = d.kpi, nama = String(b.me.nama || '').split(' ').slice(0, 2).join(' ');
    const kelasNama = A.kelas ? 'Kelas ' + A.namaKelas(A.kelas) : (b.me.role === 'guru' ? 'kelas Anda' : 'seluruh kelas');
    hapusGrafik();
    el.innerHTML =
      '<section class="sambut"><div class="flex g16" style="align-items:flex-start;max-width:760px"><div class="matahari">' + ik(new Date().getHours() < 18 ? 'sunny' : 'bedtime', 'isi s40') + '</div><div>' +
      '<div class="flex tengah g10 bungkus"><h1>' + esc(sapaan()) + ', ' + esc(nama) + '! ' + (new Date().getHours() < 18 ? '☀️' : '🌙') + '</h1><span class="pil biru">' + esc(b.setting.SEMESTER || '') + '</span></div>' +
      '<p><b>' + k.aktifPekan + ' dari ' + k.totalSiswa + ' siswa</b> telah aktif berpetualang pekan ini di ' + esc(kelasNama) + '.' + (d.sorot ? ' Penguasaan terbaik ada pada materi <span class="sorot">' + esc(d.sorot) + '</span>.' : '') + '</p></div></div>' +
      '<div class="flex g10 bungkus"><div class="segmen" role="group" aria-label="Rentang waktu">' + [[7, '7 Hari'], [30, '30 Hari'], [180, 'Semester']].map(function (x) { return '<button data-rentang="' + x[0] + '" aria-pressed="' + (rentangDash === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<button class="btn putih" data-ke="laporan">' + ik('download') + 'Unduh Laporan</button>' +
      '<button class="btn oranye" data-dash="misi">' + ik('rocket_launch', 'isi') + 'Tugaskan Misi Baru</button></div></section>' +
      // KPI
      '<section class="kpi-grid">' +
      kpi('Total Siswa Aktif', k.totalSiswa, 'Siswa', 'groups', 'biru', '<span class="flex tengah g6"><i class="titik"></i><b>' + k.aktifHari + ' aktif</b> hari ini</span><span class="pil biru">' + k.persenAktif + '% aktif pekan ini</span>') +
      kpi('Rata-rata Skor Kuis', k.rataSkor || 0, '/100', 'insights', 'lav', (k.trenSkor === null ? '<span class="redup">Belum ada pembanding</span>' : '<span class="flex tengah g4 ' + (k.trenSkor >= 0 ? 'naik' : 'turun') + '">' + ik(k.trenSkor >= 0 ? 'trending_up' : 'trending_down', 's18') + '<b>' + (k.trenSkor >= 0 ? '+' : '') + k.trenSkor + ' poin</b> vs periode lalu</span>') + '<span class="pil lav">' + esc(k.rataSkor >= 85 ? 'Performa Hebat 🎯' : k.rataSkor >= 70 ? 'Baik 👍' : k.sesi ? 'Perlu dorongan 💪' : 'Belum ada kuis') + '</span>') +
      kpi('Bintang & Poin Kelas', PC.angka(k.totalXp), 'XP', 'kid_star', '', '<span class="flex tengah g4">' + ik('star', 'isi s18') + 'Total <b>' + PC.angka(k.totalBintang) + ' ⭐</b></span><span class="pil kuning">Lv. ' + k.levelKolektif + ' Kolektif</span>') +
      kpi('Perlu Bimbingan', k.perluBimbingan, 'Siswa', 'support_agent', 'oranye', '<span class="potong" style="max-width:150px">' + esc(perluRingkas(d.perlu)) + '</span>' + (k.perluBimbingan ? '<span class="pil oranye">Perlu Aksi 🔔</span>' : '<span class="pil hijau">Semua aman ✓</span>'), true) +
      '</section>' +
      // PERHATIAN
      '<section class="kartu"><div class="judul-kartu"><h2><span class="blok-ikon kecil oranye" style="width:34px;height:34px;border-radius:50%;box-shadow:none">' + ik('favorite', 'isi s20') + '</span>Perhatian Khusus Guru <span class="pil oranye">' + d.perlu.length + ' Siswa</span></h2><p>Dukungan tepat waktu meningkatkan kepercayaan diri siswa!</p></div>' +
      (d.perlu.length ? '<div class="perhatian-grid">' + d.perlu.slice(0, 6).map(kartuPerhatian).join('') + '</div>' + (d.perlu.length > 6 ? '<button class="btn teks" data-ke="siswa">Lihat ' + (d.perlu.length - 6) + ' siswa lainnya →</button>' : '')
        : '<div class="kosong"><div class="emoji">🌈</div><p>Tidak ada siswa yang perlu perhatian khusus saat ini. Hebat!</p></div>') + '</section>' +
      // ANALITIK
      '<section class="grid-analitik"><div class="kartu"><div class="judul-kartu"><div><h2>Tren Nilai Kuis ' + (d.rentang === 7 ? 'Harian' : 'Mingguan') + '</h2><p>Rata-rata persentase jawaban benar per pulau</p></div>' +
      '<button class="btn hantu kecil" data-dash="tabel" aria-pressed="false">' + ik('table') + 'Lihat tabel</button></div>' +
      '<div class="legenda">' + d.grafik.seri.map(function (s) { return '<span><i style="background:' + (A.WARNA_GRAFIK[s.warna] || A.WARNA_GRAFIK.biru) + '"></i>' + esc(s.nama) + '</span>'; }).join('') + '</div>' +
      '<div class="grafik-wadah"><canvas id="grafikDash" role="img" aria-label="Grafik rata-rata skor per pulau"></canvas></div><div id="tabelGrafik" hidden></div>' +
      '<div class="mini-grid"><div class="mini"><span class="bulat">' + ik('timer') + '</span><div><span class="lbl redup">Rata-rata Waktu Belajar</span><div><b>' + k.menitPerHari + '</b> <span class="kecil">Menit/Hari</span></div></div></div>' +
      '<div class="mini"><span class="bulat" style="background:var(--sek-soft);color:var(--sek-ink)">' + ik('flag') + '</span><div><span class="lbl redup">Penyelesaian Misi Hari Ini</span><div><b>' + k.misiTuntas + '%</b> <span class="kecil">Tuntas</span></div></div></div></div></div>' +
      '<div class="kartu"><div class="judul-kartu"><div><h2>Penguasaan Topik</h2><p>Evaluasi kurikulum ' + esc(kelasNama) + '</p></div><span class="blok-ikon kecil lav" style="width:36px;height:36px;border-radius:50%;box-shadow:none">' + ik('auto_graph', 's20') + '</span></div>' +
      (d.topik.length ? '<div class="topik-list">' + d.topik.map(function (t, i) {
        return '<div class="topik-item"><div class="baris"><span>' + (i + 1) + '. ' + esc(t.topik) + ' <small>· ' + esc(t.mapel) + '</small></span><span style="color:var(--' + (t.persen >= 60 ? 'pri-ink' : 'ter-ink') + ')">' + t.persen + '% <small>(' + A.labelTopik(t.persen) + ')</small></span></div>' +
          '<div class="progres tipis ' + A.warnaTopik(t.persen) + '"><i style="width:' + t.persen + '%"></i></div></div>';
      }).join('') + '</div>' : '<div class="kosong"><div class="emoji">📊</div><p>Belum ada data jawaban.</p></div>') +
      (b.menu.indexOf('tingkat') > -1 ? '<a class="flex antara tengah tebal" href="#/tingkat" style="margin-top:18px;padding-top:14px;border-top:2px solid var(--lav2)"><span class="flex tengah g6">' + ik('tune', 's18') + 'Atur Tingkat Kesulitan Topik</span>' + ik('arrow_forward', 's20') + '</a>' : '') + '</div></section>' +
      // TABEL SISWA
      '<section class="kartu"><div class="judul-kartu"><div><div class="flex tengah g10 bungkus"><h2>Pemantauan Belajar Siswa</h2><span class="pil lav">' + d.siswa.length + ' Siswa Terdaftar</span></div><p>Data aktivitas permainan, skor kuis, dan akumulasi bintang secara langsung.</p></div>' +
      '<div class="alat"><div class="cari"><span class="ik" aria-hidden="true">search</span><input class="isian" id="dCari" type="search" placeholder="Cari nama siswa…" aria-label="Cari nama siswa"></div>' +
      '<select class="isian" id="dStatus" aria-label="Saring status"><option value="">Status: Semua</option><option value="perhatian">Perlu perhatian</option><option value="hariini">Aktif hari ini</option><option value="belum">Belum pernah main</option></select></div></div>' +
      '<div id="dTabel"></div></section>';
    animasi(el);
    // grafik
    const seri = d.grafik.seri;
    A.grafik($('#grafikDash', el), { type: 'bar', data: { labels: d.grafik.label, datasets: seri.map(function (s) {
      const w = A.WARNA_GRAFIK[s.warna] || A.WARNA_GRAFIK.biru;
      return { label: s.nama, data: s.skor, sesi: s.sesi, backgroundColor: w, hoverBackgroundColor: w, borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'bottom', maxBarThickness: 18, categoryPercentage: .62, barPercentage: .9, borderColor: '#f5f2ff', borderWidth: { left: 1, right: 1 } };
    }) }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 600 }, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: Object.assign({}, A.tooltip, { callbacks: { label: function (c) { const n = c.dataset.sesi[c.dataIndex]; return ' ' + c.dataset.label + ': ' + (n ? c.parsed.y + '% benar · ' + n + ' kuis' : 'belum ada kuis'); } } }) },
      scales: A.opsiSumbu(100, '%') } });
    $('#tabelGrafik', el).innerHTML = '<div class="tabel-wadah" style="margin-top:12px"><table class="tabel"><thead><tr><th>Periode</th>' + seri.map(function (s) { return '<th class="kanan">' + esc(s.nama) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      d.grafik.label.map(function (l, i) { return '<tr><td>' + esc(l) + '</td>' + seri.map(function (s) { return '<td class="kanan">' + (s.sesi[i] ? s.skor[i] + '% (' + s.sesi[i] + ' kuis)' : '—') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    // tabel siswa
    const tbl = A.Tabel($('#dTabel', el), { rows: d.siswa, per: 10, urut: 'xp', kosong: 'Belum ada siswa di kelas ini.', emojiKosong: '🧒', klikBaris: function (id) { if (A.detailSiswa) A.detailSiswa(id); },
      kolom: [
        { k: 'nama', judul: 'Siswa', html: function (s) { return '<div class="nama-sel"><span class="ava-siswa kecil">' + esc(s.kar) + '</span><div><b>' + esc(s.nama) + '</b><small>Kelas ' + esc(s.kelas) + (s.streak > 1 ? ' · 🔥 ' + s.streak + ' hari' : '') + '</small></div></div>'; } },
        { k: 'level', judul: 'Level & Bintang', html: function (s) { return '<span class="pil biru">Lv. ' + s.level + '</span> <span class="tebal" style="color:var(--sek-ink)">' + ik('star', 'isi s16') + ' ' + s.bintang + '</span>'; } },
        { k: 'xp', judul: 'Total XP', html: function (s) { return '<b>' + PC.angka(s.xp) + '</b> <span class="redup kecil">XP</span>'; } },
        { k: 'persenPeta', judul: 'Progres Peta', html: function (s) { return '<div class="progres-sel"><div class="baris"><span>' + s.bintangPeta + ' / ' + s.maksPeta + ' ⭐</span><span style="color:var(--pri-ink)">' + s.persenPeta + '%</span></div><div class="progres tipis biru"><i style="width:' + s.persenPeta + '%"></i></div></div>'; } },
        { k: 'rata', judul: 'Rata-rata Skor', html: function (s) { return A.skorPil(s.rata, !s.kuis); } },
        { k: 'terakhir', judul: 'Terakhir Main', urut: function (s) { return s.terakhir ? new Date(s.terakhir).getTime() : 0; }, html: function (s) { return s.terakhir ? '<span class="kecil">' + esc(PC.relatif(s.terakhir)) + '</span>' : '<span class="pil oranye">Belum main</span>'; } },
        { judul: 'Aksi', kelas: 'kanan', html: function (s) { return '<div class="aksi-baris"><button class="btn hantu btn-ikon kecil" data-detail="' + esc(s.id) + '" aria-label="Lihat rapor ' + esc(s.nama) + '" title="Lihat rapor">' + ik('visibility') + '</button><button class="btn hantu btn-ikon kecil" data-catat="' + esc(s.id) + '" aria-label="Kirim catatan ke ' + esc(s.nama) + '" title="Kirim catatan">' + ik('edit_note') + '</button></div>'; } }
      ] });
    const saring = function () {
      const q = PC.norm($('#dCari', el).value), st = $('#dStatus', el).value;
      tbl.set(d.siswa.filter(function (s) {
        if (q && PC.norm(s.nama + ' ' + s.panggilan).indexOf(q) === -1) return false;
        if (st === 'perhatian') return !!s.perhatian;
        if (st === 'hariini') return s.tglMain === PC.hariIni();
        if (st === 'belum') return !s.kuis;
        return true;
      }));
    };
    $('#dCari', el).oninput = PC.debounce(saring, 150);
    $('#dStatus', el).onchange = saring;
    el.onclick = function (e) {
      const t = e.target.closest('[data-rentang],[data-ke],[data-dash],[data-detail],[data-catat],[data-perhatian]');
      if (!t) return;
      if (t.dataset.rentang) { rentangDash = Number(t.dataset.rentang); el.onclick = null; A.hal.dashboard.render(el); }
      else if (t.dataset.ke) A.ke(t.dataset.ke);
      else if (t.dataset.dash === 'misi') { if (A.kirimCatatan) A.kirimCatatan({ jenis: 'misi', kelasId: A.kelas }); }
      else if (t.dataset.dash === 'tabel') { const tb = $('#tabelGrafik', el), on = tb.hidden; tb.hidden = !on; t.setAttribute('aria-pressed', String(on)); }
      else if (t.dataset.detail) { if (A.detailSiswa) A.detailSiswa(t.dataset.detail); }
      else if (t.dataset.catat) { const s = d.siswa.filter(function (x) { return x.id === t.dataset.catat; })[0]; if (A.kirimCatatan && s) A.kirimCatatan({ jenis: 'catatan', kelasId: s.kelasId, siswaIds: [s.id], namaSiswa: s.nama }); }
      else if (t.dataset.perhatian) {
        const p = d.perlu.filter(function (x) { return x.id === t.dataset.perhatian; })[0], s = d.siswa.filter(function (x) { return x.id === t.dataset.perhatian; })[0];
        if (!p || !s) return;
        const a = p.perhatian.aksi;
        if (a === 'rapor') { if (A.detailSiswa) A.detailSiswa(s.id); }
        else if (A.kirimCatatan) A.kirimCatatan({ jenis: a === 'pengingat' ? 'pengingat' : 'misi', kelasId: s.kelasId, siswaIds: [s.id], namaSiswa: s.nama, mapelId: p.perhatian.mapel || '', punyaWali: p.punyaWali });
      }
    };
  }
  function kpi(label, angka, satuan, ikon, warna, bawah, oranye) {
    return '<div class="kpi"><div class="atas"><div><span class="lbl-up">' + esc(label) + '</span><div class="angka"' + (oranye ? ' style="color:var(--ter-ink)"' : '') + '>' + esc(angka) + ' <small>' + esc(satuan) + '</small></div></div><div class="blok-ikon ' + warna + '">' + ik(ikon, 'isi s28') + '</div></div><div class="bawah">' + bawah + '</div></div>';
  }
  function perluRingkas(perlu) {
    const j = {};
    perlu.forEach(function (p) { const k = p.perhatian.jenis === 'topik' ? p.perhatian.judul.replace(/^Kesulitan di /, '') : p.perhatian.jenis === 'pasif' ? 'Belum aktif' : p.perhatian.jenis === 'turun' ? 'Skor turun' : 'Skor rendah'; j[k] = 1; });
    return Object.keys(j).slice(0, 3).join(' & ') || 'Tidak ada';
  }
  function kartuPerhatian(p) {
    const a = p.perhatian.aksi;
    const tombol = a === 'pengingat' ? ['btn kuning', 'notifications_active', 'Kirim Pengingat Ceria'] : a === 'rapor' ? ['btn hantu', 'visibility', 'Lihat Rapor Detail'] : ['btn biru', 'send_time_extension', 'Kirim Misi Penguatan'];
    return '<div class="kartu-perhatian"><div class="flex g12" style="align-items:flex-start"><span class="ava-siswa">' + esc(p.kar) + '</span><div class="ket isi1"><b class="potong">' + esc(p.nama) + '</b><span class="alasan">' + esc(p.perhatian.judul) + '</span><br><small>' + esc(p.perhatian.ket) + ' · Kelas ' + esc(p.kelas) + '</small></div></div>' +
      '<button class="' + tombol[0] + ' kecil penuh" data-perhatian="' + esc(p.id) + '">' + ik(tombol[1], 's18') + esc(tombol[2]) + '</button></div>';
  }
  function animasi(el) { requestAnimationFrame(function () { $$('.progres > i', el).forEach(function (i) { const w = i.style.width; i.style.width = '0'; requestAnimationFrame(function () { i.style.width = w; }); }); }); }
  A.animasi = animasi;

  /* =================================================================
   * MULAI
   * ================================================================= */
  window.addEventListener('hashchange', function () {
    if (/darurat/.test(location.hash) && !PC.Sesi.token) { layarMasuk(); return; }
    if (A.boot) rute();
  });
  document.addEventListener('DOMContentLoaded', function () {
    if (!PC.siap()) { $('#masuk').innerHTML = ''; PC.layarKonfig($('#masuk')); return; }
    PC.onAuth = function (pesan) { keluar(pesan || 'Sesi berakhir. Silakan masuk lagi.'); };
    const cg = $('#cariGlobal');
    cg.addEventListener('keydown', function (e) { if (e.key === 'Enter') { A.cariSiswa = cg.value.trim(); cg.value = ''; A.ke('siswa'); } });
    PC.Sesi.muat('pc_staf');
    if (PC.Sesi.token && !/darurat/.test(location.hash)) mulaiPanel(); else layarMasuk();
  });
})();
