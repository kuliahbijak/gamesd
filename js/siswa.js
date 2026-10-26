/* =====================================================================
   siswa.js — aplikasi siswa Petualangan Cerdas (SPA, rute hash)
   Masuk (kode kelas → nama → PIN) · Beranda · Peta Misi · Tantangan Kuis ·
   Arena kuis (PG, tebak gambar, mencocokkan pasangan, nyawa, suara) ·
   Hasil (bintang, XP, level, lencana) · Lencana & Peringkat · Rapor.
   Tampil instan dari cache lokal, lalu diperbarui dari server (SWR).
   ===================================================================== */
(function () {
  'use strict';
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.from((r || document).querySelectorAll(s)); };
  const esc = PC.esc, ik = PC.ik;
  const S = { boot: null, rapor: null, filterPeta: 'semua', kuisAktif: null };
  let app, kepala, navBawah, kaki, arena;
  const MENU = [
    ['beranda', 'Beranda Petualangan', 'home', 'Beranda'],
    ['peta', 'Peta Misi', 'map', 'Peta'],
    ['kuis', 'Tantangan Kuis', 'sports_esports', 'Kuis'],
    ['lencana', 'Lencana & Peringkat', 'military_tech', 'Lencana'],
    ['rapor', 'Rapor Petualang', 'assignment_ind', 'Rapor']
  ];
  /* kunci penyimpanan lokal per siswa: pc_s<ID>_<nama> (tablet kelas dipakai bergantian) */
  const kunci = function (n, id) { return 'pc_s' + (id || (PC.Sesi.me && PC.Sesi.me.id) || '') + '_' + n; };
  /** Bersihkan cache siswa lain (paket soal, boot, rapor) agar penyimpanan HP/tablet tidak penuh. Hasil tertunda dipertahankan. */
  function bersihkanCache(kecualiId) {
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf('pc_s') !== 0 || /_tunda$/.test(k)) return;
        if (kecualiId && k.indexOf('pc_s' + kecualiId + '_') === 0) return;
        localStorage.removeItem(k);
      });
    } catch (e) { /* abaikan */ }
  }

  /* =================================================================
   * MULAI
   * ================================================================= */
  document.addEventListener('DOMContentLoaded', mulai);
  function mulai() {
    app = $('#utama'); kepala = $('#kepala'); navBawah = $('#navBawah'); kaki = $('#kaki'); arena = $('#arena');
    if (!PC.siap()) { PC.layarKonfig(app); return; }
    PC.Suara.aktif = PC.simpan.get('pc_suara', null) !== false;
    PC.onAuth = function (pesan) { keluar(pesan || 'Sesi berakhir. Silakan masuk lagi.'); };
    if (!mulai._pasang) {
      mulai._pasang = true;
      window.addEventListener('hashchange', rute);
      document.addEventListener('click', klik);
      document.addEventListener('keydown', tombolKeyboard);
      window.addEventListener('online', kirimTertunda);
    }
    const qr = bacaHashQr();
    PC.Sesi.muat('pc_siswa');
    if (!PC.Sesi.token || (qr && qr.s && PC.Sesi.me && qr.s !== PC.Sesi.me.id)) { layarMasuk(qr); return; }
    const c = PC.simpan.get(kunci('boot'), null);
    if (c) { S.boot = c; tampilShell(); rute(); }
    muatBoot().then(kirimTertunda);
  }
  function bacaHashQr() {
    const h = location.hash;
    if (!/[#&]k=/.test(h)) return null;
    const p = {};
    h.replace(/^#\/?/, '').split('&').forEach(function (x) { const kv = x.split('='); p[kv[0]] = decodeURIComponent(kv[1] || ''); });
    history.replaceState(null, '', location.pathname + location.search);
    return { k: p.k || '', s: p.s || '' };
  }
  async function muatBoot(diam) {
    const r = await PC.api('siswa.boot');
    if (r.success) {
      S.boot = r.data;
      PC.simpan.set(kunci('boot'), r.data);
      tampilShell();
      if (!S.kuisAktif) rute(true);
      return true;
    }
    if (!S.boot && !diam && r.code !== 'AUTH') {
      app.innerHTML = '<div class="wadah"><div class="kartu kosong"><div class="emoji">☁️</div><h2 class="t-md">Belum bisa terhubung</h2><p>' + esc(r.message) + '</p><button class="btn biru" data-aksi="segar">' + ik('refresh') + 'Coba lagi</button></div></div>';
    }
    return false;
  }
  function keluar(pesan) {
    PC.Sesi.hapus();
    S.boot = null; S.rapor = null;
    tutupArena();
    if (pesan) PC.toast(pesan, 'info');
    layarMasuk(null);
  }

  /* =================================================================
   * KERANGKA (kepala, navigasi, kaki)
   * ================================================================= */
  function tampilShell() {
    const b = S.boot; if (!b) return;
    document.body.classList.add('ada-nav');
    kepala.hidden = false; navBawah.hidden = false; kaki.hidden = false;
    const st = b.stat, me = b.me, set = b.setting || {};
    kepala.innerHTML = '<div class="kepala-isi">' +
      '<a class="logo" href="#/beranda" aria-label="Beranda"><span class="logo-ikon">' + ik('explore', 'isi') + '</span><span class="logo-teks"><b>' + esc(set.NAMA_APP || 'Petualangan Cerdas') + '</b><small>' + esc(set.SLOGAN || 'Dunia Belajar Ceria') + '</small></span></a>' +
      '<nav class="nav-atas" aria-label="Menu">' + MENU.map(function (m) { return '<a href="#/' + m[0] + '" data-rute="' + m[0] + '"><span class="pjg">' + esc(m[1]) + '</span><span class="pdk">' + esc(m[3]) + '</span></a>'; }).join('') + '</nav>' +
      '<div class="stat-kepala">' +
      (st.streak > 1 ? '<span class="pil-stat api" title="Hari berturut-turut">' + ik('local_fire_department', 'isi s20') + st.streak + '</span>' : '') +
      '<span class="pil-stat bintang" title="Bintang">' + ik('star', 'isi s20') + '<span id="hdrBintang">' + PC.angka(st.bintang) + '</span></span>' +
      '<span class="pil-stat xp" title="XP">' + ik('bolt', 'isi s20') + '<span id="hdrXp">' + PC.angka(st.xp) + '</span> XP</span>' +
      '<span class="pil-stat lv">' + ik('military_tech', 'isi s18') + 'Level ' + st.level + '</span>' +
      '<button class="profil-tombol" data-aksi="menu-profil" aria-haspopup="true" aria-label="Menu profil">' + avatar(me.karakter) + '<span class="nama">' + esc(me.panggilan) + '</span>' + ik('expand_more', 's18') + '</button>' +
      '</div></div>';
    navBawah.innerHTML = MENU.map(function (m) { return '<a href="#/' + m[0] + '" data-rute="' + m[0] + '">' + ik(m[2]) + '<span>' + esc(m[3]) + '</span></a>'; }).join('');
    $('#kakiNama').textContent = set.NAMA_APP || 'Petualangan Cerdas';
    $('#kakiSekolah').textContent = set.NAMA_SEKOLAH || '';
    $('#kakiTahun').textContent = new Date().getFullYear();
    if (PC.simpan.get('pc_suara', null) === null && String(set.SUARA_AKTIF || 'YA') === 'TIDAK') PC.Suara.aktif = false;
    tandaiMenu();
  }
  function avatar(k, besar) {
    k = k || {};
    if (k.gambar) return '<span class="avatar' + (besar ? ' besar' : '') + '"><img src="' + esc(k.gambar) + '" alt=""></span>';
    return '<span class="avatar" style="background:' + PC.warna(k.warna).s + '">' + esc(k.emoji || '🐯') + '</span>';
  }
  function tandaiMenu() {
    const r = (location.hash.replace(/^#\/?/, '').split('/')[0]) || 'beranda';
    $$('[data-rute]').forEach(function (a) { if (a.dataset.rute === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }
  function tampilMenuProfil(btn) {
    const ada = $('.menu-profil');
    if (ada) { ada.remove(); return; }
    const b = S.boot, m = document.createElement('div');
    m.className = 'menu-profil';
    m.setAttribute('role', 'menu');
    m.innerHTML = '<div class="kepala-menu"><b>' + esc(b.me.nama) + '</b><div class="lbl" style="color:var(--sek-ink)">' + esc(b.stat.levelInfo.nama) + ' · Kelas ' + esc(b.me.kelas) + '</div></div>' +
      '<button data-aksi="ke" data-ke="rapor" role="menuitem">' + ik('account_box') + 'Profil &amp; Rapor</button>' +
      '<button data-aksi="karakter" role="menuitem">' + ik('pets') + 'Ganti Karakter</button>' +
      '<button data-aksi="suara" role="menuitem">' + ik(PC.Suara.aktif ? 'volume_up' : 'volume_off') + (PC.Suara.aktif ? 'Suara: Nyala' : 'Suara: Mati') + '</button>' +
      '<button data-aksi="keluar" class="bahaya" role="menuitem">' + ik('logout') + 'Keluar</button>';
    document.body.appendChild(m);
    setTimeout(function () {
      const tutup = function (e) { if (!m.contains(e.target) && e.target !== btn) { m.remove(); document.removeEventListener('click', tutup); } };
      document.addEventListener('click', tutup);
    }, 0);
  }

  /* =================================================================
   * RUTE
   * ================================================================= */
  function rute(segar) {
    if (!S.boot) return;
    const bagian = location.hash.replace(/^#\/?/, '').split('/');
    const hal = bagian[0] || 'beranda';
    if (S.kuisAktif && hal !== 'main') {
      if (!S.kuisAktif.selesai) { konfirmasiKeluarKuis(); return; }
      tutupArena();
    }
    if (hal === 'main') return;
    tandaiMenu();
    const scrollTetap = segar === true && rute._akhir === location.hash;
    const y = window.scrollY;
    if (hal === 'peta') halPeta();
    else if (hal === 'kuis') halKuis(bagian[1]);
    else if (hal === 'lencana') halLencana();
    else if (hal === 'rapor') halRapor();
    else halBeranda();
    rute._akhir = location.hash;
    if (scrollTetap) window.scrollTo(0, y); else window.scrollTo(0, 0);
  }

  /* =================================================================
   * ILUSTRASI PULAU (SVG orisinal)
   * ================================================================= */
  let nIlus = 0;
  function ilus(w) {
    if (w.gambar && /^https:\/\//.test(w.gambar)) return '<img src="' + esc(w.gambar) + '" alt="" loading="lazy">';
    const c = PC.warna(w.warna), id = 'il' + (++nIlus);
    return '<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(w.dunia || w.nama) + '" preserveAspectRatio="xMidYMid slice">' +
      '<defs><linearGradient id="' + id + 'l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c.b + '"/><stop offset="1" stop-color="#ffffff"/></linearGradient>' +
      '<linearGradient id="' + id + 't" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98b5a"/><stop offset="1" stop-color="#7a4b2a"/></linearGradient>' +
      '<radialGradient id="' + id + 'c" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="' + c.s + '"/></radialGradient></defs>' +
      '<rect width="320" height="200" fill="url(#' + id + 'l)"/>' +
      '<g fill="#fff" opacity=".92"><ellipse cx="58" cy="42" rx="34" ry="12"/><ellipse cx="80" cy="34" rx="22" ry="13"/><ellipse cx="256" cy="58" rx="30" ry="10"/><ellipse cx="274" cy="51" rx="18" ry="10"/></g>' +
      '<path d="M58 130 Q160 228 262 130 Z" fill="url(#' + id + 't)"/>' +
      '<path d="M96 150 L112 182 L124 153 Z M186 156 L200 188 L212 154 Z M146 168 L156 196 L166 168 Z" fill="#5e391d" opacity=".5"/>' +
      '<ellipse cx="160" cy="129" rx="104" ry="29" fill="' + c.a + '"/>' +
      '<ellipse cx="160" cy="123" rx="94" ry="22" fill="#fff" opacity=".28"/>' +
      '<g><rect x="84" y="108" width="5" height="16" rx="2" fill="#7a4b2a"/><circle cx="86.5" cy="104" r="13" fill="#3fb85a"/><circle cx="80" cy="110" r="8" fill="#5ccf74"/>' +
      '<rect x="232" y="104" width="5" height="18" rx="2" fill="#7a4b2a"/><circle cx="234.5" cy="98" r="15" fill="#3fb85a"/><circle cx="242" cy="106" r="8" fill="#5ccf74"/></g>' +
      '<circle cx="160" cy="84" r="42" fill="url(#' + id + 'c)" stroke="' + c.a + '" stroke-width="6"/>' +
      '<text x="160" y="106" text-anchor="middle" font-family="Material Symbols Outlined" font-size="54" fill="' + c.d + '">' + esc(w.ikon || 'explore') + '</text>' +
      '<g fill="#ffd34d"><path d="M118 40 l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/><path d="M212 26 l2 5 5 .7-3.6 3.5.9 5-4.3-2.3-4.3 2.3.9-5-3.6-3.5 5-.7z"/></g>' +
      '</svg>';
  }
  function bintangIkon(n, maks) {
    let s = '';
    for (let i = 0; i < (maks || 3); i++) s += ik('star', i < n ? 'isi s16' : 's16');
    return s;
  }
  function levelAktif(w) {
    const terbuka = w.levels.filter(function (l) { return l.terbuka && l.soal > 0; });
    const belum = terbuka.filter(function (l) { return l.bintang < 3; });
    const x = belum.length ? belum[belum.length - 1] : terbuka[terbuka.length - 1];
    return x ? x.level : 'Mudah';
  }
  function rekomendasi() {
    const d = S.boot.dunia.filter(function (w) { return !w.terkunci; });
    const misi = S.boot.catatan.filter(function (c) { return c.jenis === 'misi' && !c.selesai && c.mapel; })[0];
    if (misi) {
      const w = d.filter(function (x) { return x.id === misi.mapel; })[0];
      if (w) { const lv = misi.level && w.levels.some(function (l) { return l.level === misi.level && l.terbuka; }) ? misi.level : levelAktif(w); return { w: w, level: lv, misi: misi }; }
    }
    let best = null;
    d.forEach(function (w) { if (!best || w.persen < best.persen) best = w; });
    return best ? { w: best, level: levelAktif(best) } : null;
  }

  /* =================================================================
   * BERANDA
   * ================================================================= */
  function halBeranda() {
    const b = S.boot, st = b.stat, lv = st.levelInfo, rek = rekomendasi();
    const sisaXp = lv.xpNext === null ? 0 : lv.xpNext - st.xp;
    app.innerHTML = '<div class="wadah"><div class="grid-2"><div class="kol">' +
      // HERO
      '<section class="hero"><div class="hero-isi"><div class="hero-teks">' +
      (st.streak > 1 ? '<span class="chip-api">' + ik('local_fire_department', 'isi') + st.streak + ' Hari Berturut-turut! Hebat!</span>' : '<span class="chip-api">' + ik('waving_hand', 'isi') + esc(sapaan()) + '</span>') +
      '<div><h1 class="t-xl">Halo ' + esc(b.me.panggilan.split(' ')[0]) + '! Siap bertualang hari ini? 🌟</h1>' +
      '<p class="sub">Karaktermu kini <b>Level ' + lv.level + ': ' + esc(lv.nama) + '</b>.' + (lv.xpNext !== null ? ' Sedikit lagi menuju ' + esc(lv.namaBerikut) + '!' : ' Kamu sudah di puncak!') + '</p></div>' +
      '<div class="kotak-progres"><div class="baris"><span>' + ik('military_tech', 'isi s20') + (lv.xpNext !== null ? 'Progres Menuju Level ' + (lv.level + 1) : 'Level Tertinggi') + '</span><span>' + lv.persen + '%' + (lv.xpNext !== null ? ' (' + PC.angka(st.xp - lv.xpMin) + ' / ' + PC.angka(lv.xpNext - lv.xpMin) + ' XP)' : '') + '</span></div>' +
      '<div class="progres"><i style="width:' + lv.persen + '%"></i></div>' + (sisaXp > 0 ? '<div class="kecil redup" style="margin-top:6px">Butuh ' + PC.angka(sisaXp) + ' XP lagi</div>' : '') + '</div>' +
      (rek ? '<div><button class="btn besar oranye" data-aksi="main" data-mapel="' + esc(rek.w.id) + '" data-level="' + esc(rek.level) + '">' + ik('rocket_launch', 'isi s28') + '<span>Lanjut Petualangan ' + esc(rek.w.dunia) + '!</span></button></div>' : '') +
      '</div><div class="karakter-hero"><div class="karakter-bulat">' + (b.me.karakter.gambar ? '<img src="' + esc(b.me.karakter.gambar) + '" alt="">' : esc(b.me.karakter.emoji)) + '</div>' +
      '<div class="label-karakter"><i></i>' + esc(b.me.karakter.nama) + ' ' + esc(b.me.panggilan.split(' ')[0]) + '</div></div></div></section>' +
      // MISI HARIAN
      kartuMisi() +
      // DUNIA
      '<section class="kol" style="gap:20px"><div class="judul-blok"><div class="kiri"><div class="blok-ikon kecil biru">' + ik('public', 'isi') + '</div><h2 class="t-md">Pilih Dunia Petualangan</h2></div>' +
      '<a href="#/peta" class="tebal flex tengah g4">Lihat Peta Lengkap ' + ik('arrow_forward', 's18') + '</a></div>' +
      '<div class="grid-dunia">' + b.dunia.map(kartuDunia).join('') + '</div></section>' +
      '</div><aside class="kol">' + kartuSahabat(true) + kartuLencanaBaru() + kartuCatatan() + '</aside></div></div>';
    animasiProgres();
  }
  function sapaan() { const j = new Date().getHours(); return j < 11 ? 'Selamat pagi!' : j < 15 ? 'Selamat siang!' : j < 18 ? 'Selamat sore!' : 'Selamat malam!'; }
  function animasiProgres() { requestAnimationFrame(function () { $$('.progres > i').forEach(function (i) { const w = i.style.width; i.style.width = '0'; requestAnimationFrame(function () { i.style.width = w; }); }); }); }
  function kartuMisi() {
    const m = S.boot.misi, siap = m.semuaSelesai && !m.petiDiklaim;
    const sisa = m.daftar.filter(function (x) { return !x.selesai; }).length;
    const warna = { kuis: 'hijau', bintang: 'kuning', menit: 'biru' };
    return '<section class="kartu" aria-labelledby="judulMisi"><div class="kol" style="gap:20px">' +
      '<div class="judul-blok"><div class="kiri"><div class="blok-ikon">' + ik('checklist', 'isi s28') + '</div><div><h2 class="t-md" id="judulMisi">Papan Misi Harian</h2><p class="kecil redup">Selesaikan semua misi hari ini untuk membuka peti harta karun!</p></div></div>' +
      '<span class="pil kuning">' + ik('alarm', 's18') + 'Sisa waktu: ' + sisaHari() + '</span></div>' +
      '<div class="misi-grid">' + m.daftar.map(function (x) {
        const persen = Math.round(x.nilai / x.target * 100);
        return '<div class="misi-kartu' + (x.selesai ? ' selesai' : '') + '"><div class="atas"><span class="ikon-bulat">' + ik(x.selesai ? 'task_alt' : x.ikon, x.kode === 'bintang' ? 'isi' : '') + '</span>' +
          '<span class="pil ' + (x.selesai ? 'hijau">Selesai!' : warna[x.kode] + '">' + x.nilai + ' / ' + x.target + (x.kode === 'menit' ? ' Mnt' : x.kode === 'bintang' ? ' Bintang' : '')) + '</span></div>' +
          '<div><h3>' + esc(x.judul) + '</h3><p class="kecil redup">' + esc(x.ket) + '</p></div>' +
          (x.selesai ? '' : '<div class="progres tipis ' + (x.kode === 'bintang' ? 'kuning' : 'biru') + '"><i style="width:' + persen + '%"></i></div>') +
          '<div class="bawah"><span class="xp-chip">' + ik('bolt', 's18') + '+' + x.xp + ' XP</span><span class="redup">' + (x.selesai ? x.target + ' / ' + x.target : (x.target - x.nilai) + (x.kode === 'menit' ? ' mnt' : '') + ' lagi') + '</span></div></div>';
      }).join('') + '</div>' +
      '<div class="peti' + (siap ? ' siap' : '') + '"><div class="blok-ikon" style="width:56px;height:56px">' + ik(m.petiDiklaim ? 'redeem' : 'card_giftcard', 'isi s32') + '</div>' +
      '<div class="isi1"><div class="t-sm" style="font-size:18px">Peti Harta Karun Harian</div><div class="kecil redup">' +
      (m.petiDiklaim ? 'Peti hari ini sudah kamu buka. Kembali besok ya! 🎉' : siap ? 'Semua misi selesai! Buka petinya untuk +' + m.petiXP + ' XP!' : 'Selesaikan ' + sisa + ' misi lagi untuk membuka +' + m.petiXP + ' XP!') + '</div></div>' +
      (m.petiDiklaim ? '<span class="pil hijau">' + ik('check') + 'Sudah dibuka</span>' : siap ? '<button class="btn kuning-tua" data-aksi="peti">' + ik('lock_open') + 'Buka Peti!</button>' : '<button class="btn hantu" disabled>Terkunci (' + (3 - sisa) + '/3)</button>') +
      '</div></div></section>';
  }
  function sisaHari() { const d = new Date(), a = new Date(d); a.setHours(24, 0, 0, 0); const m = Math.floor((a - d) / 60000); return ('0' + Math.floor(m / 60)).slice(-2) + 'j ' + ('0' + (m % 60)).slice(-2) + 'm'; }
  function kartuDunia(w) {
    const lvAktif = levelAktif(w);
    const segera = w.status === 'segera';
    const tombol = segera ? '<button class="btn hantu penuh" disabled>Segera Hadir ' + ik('schedule', 's18') + '</button>'
      : w.terkunci ? '<button class="btn hantu penuh" disabled>' + ik('lock', 's18') + 'Buka di Level ' + w.levelBuka + '</button>'
      : '<button class="btn ' + (w.warna === 'kuning' ? 'kuning' : 'biru') + ' penuh" data-aksi="ke" data-ke="kuis/' + esc(w.id) + '">Mainkan Misi ' + ik('play_circle', 's20') + '</button>';
    return '<article class="kartu-dunia' + (w.terkunci ? ' kunci' : '') + '"><div class="ilus-wadah">' + ilus(w) +
      (w.terkunci ? '<div class="lapis-kunci"><span class="gembok">' + ik(segera ? 'construction' : 'lock') + '</span><span class="pil putih">' + (segera ? 'Dalam pembangunan' : 'Buka di Level ' + w.levelBuka) + '</span></div>' : '<span class="pil">' + esc(lvAktif) + '</span>') +
      '</div><div class="kol" style="gap:6px;flex:1"><div class="meta-dunia"><span class="lbl-up"' + (w.terkunci ? ' style="color:var(--ink3)"' : '') + '>' + esc(w.nama) + '</span><span class="bintang-teks">' + ik(w.terkunci ? 'lock' : 'star', 'isi s18') + w.bintang + ' / ' + w.bintangMaks + '</span></div>' +
      '<h3>' + esc(w.dunia) + '</h3><p>' + esc(w.desk) + '</p></div>' + tombol + '</article>';
  }
  function kartuSahabat(ringkas) {
    const p = S.boot.peringkat;
    if (!p) return '';
    const baris = p.top.map(function (x) {
      return '<div class="baris-sahabat' + (x.saya ? ' saya' : '') + '"><span class="nomor n' + x.rank + '">' + x.rank + '</span><span class="avatar" style="width:40px;height:40px">' + esc(x.kar) + '</span>' +
        '<div class="isi1"><div class="tebal potong">' + esc(x.nama) + (x.saya ? '<span class="kamu">Kamu</span>' : '') + '</div><div class="lbl redup potong">' + esc(x.level) + '</div></div>' +
        '<div class="xp">' + PC.angka(x.xp) + '<small>XP</small></div></div>';
    }).join('');
    const saya = p.saya;
    let pesan;
    if (saya.rank === 1) pesan = 'Kamu memimpin pekan ini! Pertahankan ya! 🏆';
    else if (saya.rank) pesan = 'Hanya butuh ' + PC.angka(saya.kurangNaik) + ' XP lagi untuk naik peringkat!';
    else pesan = 'Kamu sudah mengumpulkan ' + PC.angka(saya.xp) + ' XP pekan ini. ' + (saya.kurangMasuk ? PC.angka(saya.kurangMasuk) + ' XP lagi untuk masuk papan!' : 'Terus semangat!');
    return '<section class="kartu kol" style="gap:16px" aria-labelledby="judulSahabat"><div class="judul-blok"><div class="kiri"><div class="blok-ikon kecil">' + ik('leaderboard', 'isi') + '</div><h2 class="t-sm" id="judulSahabat">Papan Sahabat</h2></div>' +
      (ringkas ? '<a href="#/lencana" class="lbl">Lihat Kelas</a>' : '<span class="pil lav">Pekan ini</span>') + '</div>' +
      (p.top.length ? '<div class="kol g10">' + baris + '</div>' : '<p class="redup kecil">Belum ada yang bermain pekan ini. Jadilah yang pertama!</p>') +
      '<div class="semangat">' + ik('trending_up', 's18') + esc(pesan) + '</div></section>';
  }
  function medali(l, ukuran) {
    const c = PC.warna(l.warna);
    return '<span class="medali" style="background:' + c.s + ';color:' + c.i + ';box-shadow:0 5px 0 ' + c.b + (ukuran ? ';width:' + ukuran + 'px;height:' + ukuran + 'px' : '') + '">' + ik(l.ikon, 'isi') + '</span>';
  }
  function kartuLencanaBaru() {
    const L = S.boot.lencana, t = L.daftar.filter(function (x) { return x.id === L.terbaru; })[0];
    return '<section class="kartu kol" style="gap:16px;background:linear-gradient(135deg,#fff,var(--lav))"><div class="judul-blok"><h2 class="t-sm flex tengah g8">' + ik('military_tech', 'isi') + 'Lencana Terbaru</h2>' + (t ? '<span class="pil oranye">Baru Diraih!</span>' : '') + '</div>' +
      (t ? '<div class="lencana-sorot">' + medali(t) + '<div><div class="tebal" style="font-size:18px">' + esc(t.nama) + '</div><p class="kecil redup">' + esc(t.desk) + '</p></div></div>'
        : '<div class="lencana-sorot"><span class="medali" style="background:var(--lav2);color:var(--ink3)">' + ik('lock') + '</span><p class="kecil redup">Selesaikan kuis pertamamu untuk meraih lencana <b>Langkah Pertama</b>!</p></div>') +
      '<div class="flex antara tengah bungkus g8"><span class="kecil redup">Total koleksi: <b>' + L.dimiliki + ' dari ' + L.total + ' lencana</b></span><a href="#/lencana" class="lbl">Semua Lencana →</a></div></section>';
  }
  function kartuCatatan() {
    const c = S.boot.catatan[0];
    if (!c) return '';
    const ikon = { apresiasi: '⭐', misi: '🎯', pengingat: '⏰', catatan: '💬' }[c.jenis] || '💬';
    return '<section class="kartu kol" style="gap:16px"><div class="flex tengah g12"><span class="guru-ava">👩‍🏫</span><div><div class="tebal">Catatan ' + esc(c.dari) + '</div><div class="lbl" style="color:var(--pri-ink)">' + esc({ apresiasi: 'Bintang apresiasi', misi: 'Misi khusus', pengingat: 'Pengingat ceria', catatan: 'Pesan untukmu' }[c.jenis] || 'Pesan') + '</div></div></div>' +
      '<div class="gelembung' + (c.jenis === 'misi' ? ' catatan-misi' : '') + '"><p>' + ikon + ' “' + esc(c.pesan) + '”</p>' +
      (c.jenis === 'misi' && c.mapel && !c.selesai ? '<button class="btn kecil biru" style="margin-top:12px" data-aksi="main" data-mapel="' + esc(c.mapel) + '" data-level="' + esc(c.level || '') + '">' + ik('rocket_launch', 's18') + 'Kerjakan misi</button>' : '') +
      (c.jenis === 'misi' && c.selesai ? '<span class="pil hijau" style="margin-top:10px">' + ik('check') + 'Misi selesai</span>' : '') + '</div>' +
      '<div class="flex antara tengah"><button class="btn-suka" data-aksi="suka" data-id="' + esc(c.id) + '" aria-pressed="' + (c.disukai ? 'true' : 'false') + '">' + ik('favorite', 's18') + (c.disukai ? 'Kamu menyukai ini' : 'Suka') + '</button>' +
      '<span class="lbl redup">' + esc(PC.relatif(c.tanggal)) + '</span></div></section>';
  }

  /* =================================================================
   * PETA MISI
   * ================================================================= */
  function halPeta() {
    const b = S.boot, f = S.filterPeta;
    const semua = b.dunia, aktif = semua.filter(function (w) { return !w.terkunci; }), kunci = semua.filter(function (w) { return w.terkunci; });
    const tampil = aktif.filter(function (w) { return f === 'semua' || w.id === f; });
    const tot = semua.reduce(function (a, w) { return a + w.bintang; }, 0), maks = aktif.length * 9;
    const takluk = aktif.filter(function (w) { return w.bintang >= 9; }).length;
    app.innerHTML = '<div class="wadah kol" style="gap:24px">' +
      '<section class="kartu peta-kepala kol" style="gap:18px"><div class="flex antara tengah bungkus g16"><div class="flex tengah g16">' +
      '<div class="blok-ikon" style="width:56px;height:56px">' + ik('explore', 'isi s32') + '</div><div><div class="flex tengah g8 bungkus"><span class="pil biru">' + esc(b.setting.SEMESTER || '') + '</span><span class="lbl" style="color:var(--sek-ink)">' + ik('stars', 's16') + ' Kurikulum Merdeka</span></div>' +
      '<h1 class="t-lg" style="color:var(--pri-ink)">Peta Ekspedisi Pengetahuan — Kelas ' + esc(b.me.kelas) + '</h1></div></div>' +
      '<div class="flex g12 bungkus"><span class="pil-stat bintang" style="padding:10px 16px">' + ik('star', 'isi s28') + '<span class="kol" style="line-height:1.1"><b style="font-size:18px">' + tot + ' / ' + maks + '</b><small class="lbl">Bintang Terkumpul</small></span></span>' +
      '<span class="pil-stat" style="padding:10px 16px;background:var(--lav3);box-shadow:0 4px 0 var(--outline);color:var(--pri-ink)">' + ik('wb_sunny', 's28') + '<span class="kol" style="line-height:1.1"><b style="font-size:18px">' + takluk + ' / ' + aktif.length + '</b><small class="lbl redup">Pulau Ditaklukkan</small></span></span></div></div>' +
      '<div class="flex antara tengah bungkus g12"><div class="tab-filter" role="group" aria-label="Saring pulau"><button data-aksi="filter-peta" data-f="semua" aria-pressed="' + (f === 'semua') + '">Semua Pulau</button>' +
      aktif.map(function (w) { return '<button data-aksi="filter-peta" data-f="' + esc(w.id) + '" aria-pressed="' + (f === w.id) + '">' + ik(w.ikon, 's18') + ' ' + esc(w.nama) + '</button>'; }).join('') + '</div>' +
      '<span class="kecil redup flex tengah g6">' + ik('touch_app', 's18') + 'Ketuk tingkat kesulitan untuk langsung bermain!</span></div></section>' +
      '<div class="grid-2"><div class="kanvas-peta"><div class="pelangi"></div><span class="awan" style="width:190px;height:70px;top:-20px;left:40px"></span><span class="awan" style="width:240px;height:90px;top:30%;right:-60px"></span><span class="awan" style="width:260px;height:100px;top:66%;left:-70px"></span>' +
      '<svg class="jalur" viewBox="0 0 800 900" preserveAspectRatio="none" aria-hidden="true"><path d="M 220 160 C 380 180, 600 230, 560 420 C 520 600, 260 600, 240 740 C 220 860, 480 840, 560 860" fill="none" stroke="#bdc8d1" stroke-width="10" stroke-dasharray="14 16" stroke-linecap="round" opacity=".6"/>' +
      '<path d="M 220 160 C 380 180, 600 230, 560 420" fill="none" stroke="#2db6f5" stroke-width="8" stroke-dasharray="14 14" stroke-linecap="round"/></svg>' +
      '<div class="pulau-list">' + (tampil.length ? tampil.map(pulauBesar).join('') : '<div class="kartu kosong"><div class="emoji">🗺️</div><p>Belum ada pulau yang terbuka.</p></div>') + '</div>' +
      (kunci.length && f === 'semua' ? '<div class="pulau-kunci-grid" style="margin-top:28px;position:relative;z-index:1">' + kunci.map(pulauKecil).join('') + '</div>' : '') +
      '<div class="status-peta"><span class="flex tengah g8"><i class="titik-hidup"></i><span style="color:var(--pri-ink)">Dunia belajar aktif &amp; terhubung</span></span><span>Peta versi ' + esc(PC.versi) + '</span></div></div>' +
      '<aside class="kol">' + kartuMaskot() + kartuPencapaian() + kartuMisiRingkas() + '</aside></div></div>';
  }
  function pulauBesar(w, i) {
    const lvAktif = levelAktif(w);
    return '<article class="pulau"><div class="atas"><div class="gambar">' + ilus(w) + '<span class="zona">ZONA ' + (i + 1) + '</span></div>' +
      '<div class="isi1 kol" style="gap:4px"><div class="flex antara tengah g6"><span class="pil biru">' + esc(w.nama) + '</span><span class="bintang-teks">' + ik('star', 'isi s18') + w.bintang + '/' + w.bintangMaks + '</span></div>' +
      '<h2 class="t-sm potong">' + esc(w.dunia) + '</h2><p class="kecil redup" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + esc(w.desk) + '</p>' +
      '<div class="flex antara lbl" style="margin-top:4px"><span>Progres Pulau</span><span style="color:var(--pri-ink)">' + w.persen + '% Tuntas</span></div><div class="progres tipis biru"><i style="width:' + w.persen + '%"></i></div></div></div>' +
      '<div class="tangga">' + w.levels.map(function (l) {
        const kelas = !l.terbuka || !l.soal ? 'kunci' : l.level === lvAktif ? 'aktif' : '';
        const ikon = !l.terbuka ? 'lock' : l.bintang >= 3 ? 'check_circle' : l.level === lvAktif ? 'play_circle' : 'radio_button_unchecked';
        const ket = !l.terbuka ? 'Terkunci' : !l.soal ? 'Belum ada soal' : l.bintang ? '<span class="bintang3">' + bintangIkon(l.bintang) + '</span>' : 'Mulai!';
        return '<button class="anak-tangga ' + kelas + '"' + (l.terbuka && l.soal ? ' data-aksi="main" data-mapel="' + esc(w.id) + '" data-level="' + l.level + '"' : ' disabled') + ' aria-label="' + l.level + (l.terbuka ? '' : ' terkunci') + '">' +
          ik(ikon, 'isi s20') + '<span>' + l.level + '</span><span>' + ket + '</span></button>';
      }).join('') + '</div>' +
      '<button class="btn oranye penuh besar" style="margin-top:16px" data-aksi="main" data-mapel="' + esc(w.id) + '" data-level="' + esc(lvAktif) + '">' + ik('swords', 'isi') + 'Masuk Tantangan ' + esc(w.dunia) + '</button></article>';
  }
  function pulauKecil(w) {
    const segera = w.status === 'segera';
    return '<div class="pulau-kecil"><div class="gambar">' + ilus(w) + '<span class="gembok">' + ik(segera ? 'construction' : 'lock', 's20') + '</span></div><div class="isi1 kol g4"><span class="pil lav" style="align-self:flex-start">' + esc(w.nama) + '</span>' +
      '<h3 class="potong">' + esc(w.dunia) + '</h3><span class="lbl flex tengah g4" style="color:' + (segera ? 'var(--sek-ink)' : 'var(--ter-ink)') + '">' + ik(segera ? 'handyman' : 'lock_clock', 's16') + (segera ? 'Dalam pembangunan misi' : 'Terbuka di Level Petualang ' + w.levelBuka) + '</span></div></div>';
  }
  function tipsMaskot() {
    const b = S.boot, nama = esc(b.me.panggilan.split(' ')[0]);
    const misiGuru = b.catatan.filter(function (c) { return c.jenis === 'misi' && !c.selesai && c.mapel; })[0];
    if (misiGuru) { const w = b.dunia.filter(function (x) { return x.id === misiGuru.mapel; })[0]; return { teks: 'Halo ' + nama + '! ' + esc(misiGuru.dari) + ' memberimu misi khusus di <b>' + esc(w ? w.dunia : 'pulau') + '</b>' + (misiGuru.level ? ' level <b>' + esc(misiGuru.level) + '</b>' : '') + '. Ayo taklukkan!', hadiah: 'Misi dari guru', aksi: { mapel: misiGuru.mapel, level: misiGuru.level || '' } }; }
    const m = b.misi.daftar.filter(function (x) { return !x.selesai; })[0];
    if (m) return { teks: 'Halo ' + nama + '! Selesaikan misi <b>' + esc(m.judul) + '</b> untuk mendapat <b>+' + m.xp + ' XP</b> dan selangkah lebih dekat ke peti harta karun!', hadiah: 'Hadiah: +' + m.xp + ' XP' };
    for (let i = 0; i < b.dunia.length; i++) {
      const w = b.dunia[i];
      if (w.terkunci) continue;
      for (let j = 1; j < 3; j++) {
        const L = w.levels[j], prev = w.levels[j - 1];
        if (!L.terbuka && prev.terbuka) {
          const butuh = Number(b.setting[j === 1 ? 'BUKA_SEDANG_BINTANG' : 'BUKA_SULIT_BINTANG'] || 2) - prev.bintang;
          if (butuh > 0) return { teks: 'Kumpulkan <b>' + butuh + ' bintang</b> lagi di ' + esc(w.dunia) + ' level ' + prev.level + ' untuk membuka level <b>' + L.level + '</b>!', hadiah: 'Level baru menanti', aksi: { mapel: w.id, level: prev.level } };
        }
      }
    }
    return { teks: 'Hebat, ' + nama + '! Semua misi hari ini selesai. Coba raih 3 bintang di level yang lebih sulit ya!', hadiah: 'Tantang dirimu' };
  }
  function kartuMaskot() {
    const t = tipsMaskot();
    return '<section class="kartu kol" style="gap:14px"><div class="maskot"><div class="wajah">🦌<span class="lampu">' + ik('tips_and_updates') + '</span></div><div class="isi1"><div class="flex antara tengah"><b style="font-size:20px">Kancil Pintar</b><span class="pil kuning">Pemandu</span></div><span class="lbl redup">Tips Petualangan Hari Ini</span></div></div>' +
      '<div class="gelembung" style="font-style:normal"><p>“' + t.teks + '”</p><div class="flex antara tengah bungkus g8" style="margin-top:12px"><span class="lbl flex tengah g4" style="color:var(--sek-ink)">' + ik('redeem', 's16') + esc(t.hadiah) + '</span>' +
      (t.aksi ? '<button class="btn kecil putih" data-aksi="main" data-mapel="' + esc(t.aksi.mapel) + '" data-level="' + esc(t.aksi.level) + '">Ayo main!</button>' : '') + '</div></div></section>';
  }
  function kartuPencapaian() {
    const st = S.boot.stat, p = S.boot.peringkat;
    return '<section class="kartu kol" style="gap:16px"><div class="judul-blok"><div class="kiri"><div class="blok-ikon kecil biru">' + ik('military_tech') + '</div><div><h2 class="t-sm">Pencapaian Aktif</h2><p class="lbl redup">Statistik petualanganmu</p></div></div>' +
      (p && p.saya.rank ? '<span class="pil kuning">Peringkat #' + p.saya.rank + '</span>' : '') + '</div>' +
      '<div class="ubin-grid"><div class="ubin"><span class="lbl redup flex tengah g4">' + ik('local_fire_department', 's16') + 'Rata-rata Skor</span><b style="color:var(--ter-ink)">' + st.rataSkor + '</b></div>' +
      '<div class="ubin"><span class="lbl redup flex tengah g4">' + ik('sports_esports', 's16') + 'Kuis Selesai</span><b style="color:var(--pri-ink)">' + st.kuis + '</b></div>' +
      '<div class="ubin"><span class="lbl redup flex tengah g4">' + ik('workspace_premium', 's16') + 'Nilai Sempurna</span><b style="color:var(--sek-ink)">' + st.sempurna + '</b></div>' +
      '<div class="ubin"><span class="lbl redup flex tengah g4">' + ik('bolt', 's16') + 'XP Pekan Ini</span><b style="color:var(--ok-ink)">' + PC.angka(st.xpPekan) + '</b></div></div></section>';
  }
  function kartuMisiRingkas() {
    const m = S.boot.misi;
    return '<section class="kartu kol" style="gap:12px;background:linear-gradient(135deg,#fff,#fff,var(--lav))"><div class="judul-blok"><h2 class="t-sm flex tengah g8">' + ik('assignment_turned_in', 'isi') + 'Misi Harian Petualang</h2><span class="pil oranye">Sisa ' + sisaHari().split(' ')[0].replace('j', ' jam') + '</span></div>' +
      m.daftar.map(function (x) {
        return '<div class="quest' + (x.selesai ? ' selesai' : '') + '"><span class="kotak">' + ik(x.selesai ? 'done' : x.ikon, 's18') + '</span><div class="isi1"><div class="tebal potong">' + esc(x.judul) + '</div><span class="lbl" style="color:' + (x.selesai ? 'var(--sek-ink)' : 'var(--ink3)') + '">' + (x.selesai ? '+' + x.xp + ' XP diraih' : x.nilai + ' / ' + x.target) + '</span></div>' +
          (x.selesai ? '<span class="lbl" style="color:var(--pri-ink)">Selesai!</span>' : '<a class="pil biru" href="#/kuis">Mulai</a>') + '</div>';
      }).join('') + '</section>';
  }

  /* =================================================================
   * TANTANGAN KUIS (pemilih dunia & level)
   * ================================================================= */
  function halKuis(mapelId) {
    const b = S.boot;
    if (mapelId) {
      const w = b.dunia.filter(function (x) { return x.id === mapelId; })[0];
      if (!w) { location.hash = '#/kuis'; return; }
      const c = PC.warna(w.warna);
      app.innerHTML = '<div class="wadah kol" style="gap:24px"><a href="#/kuis" class="tebal flex tengah g4">' + ik('arrow_back', 's18') + 'Semua dunia</a>' +
        '<section class="kartu flex tengah g20 bungkus" style="background:linear-gradient(120deg,' + c.s + ',#fff)"><div style="width:140px;border-radius:24px;overflow:hidden;aspect-ratio:16/10;flex:none">' + ilus(w) + '</div>' +
        '<div class="isi1"><span class="lbl-up" style="color:' + c.i + '">' + esc(w.nama) + '</span><h1 class="t-lg">' + esc(w.dunia) + '</h1><p class="redup">' + esc(w.desk) + '</p></div>' +
        '<span class="pil-stat bintang">' + ik('star', 'isi s20') + w.bintang + ' / 9</span></section>' +
        (w.terkunci ? '<div class="kartu kosong"><div class="emoji">🔒</div><p>' + (w.status === 'segera' ? 'Pulau ini sedang dibangun. Segera hadir!' : 'Pulau ini terbuka di Level ' + w.levelBuka + '. Kumpulkan XP dulu ya!') + '</p></div>' :
        '<div class="pilih-level">' + w.levels.map(function (l, i) {
          const prev = w.levels[i - 1];
          const butuh = prev ? Number(b.setting[i === 1 ? 'BUKA_SEDANG_BINTANG' : 'BUKA_SULIT_BINTANG'] || 2) : 0;
          const alasan = !l.terbuka ? (prev && prev.bintang < butuh ? 'Raih ' + butuh + ' bintang di level ' + prev.level + ' (sekarang ' + prev.bintang + ')' : 'Dikunci oleh guru') : !l.soal ? 'Soal belum tersedia' : '';
          const ikon = { Mudah: 'sentiment_satisfied', Sedang: 'local_fire_department', Sulit: 'bolt' }[l.level];
          return '<article class="kartu-level' + (alasan ? ' kunci' : '') + '"><div class="flex antara tengah"><span class="lencana-level lv-' + l.level + '">' + ik(alasan ? 'lock' : ikon, 'isi s32') + '</span><span class="bintang-besar">' + bintangIkon(l.bintang) + '</span></div>' +
            '<h2 class="t-md">' + l.level + '</h2><p class="kecil redup">' + (alasan ? esc(alasan) : l.soal + ' soal tersedia · ' + (l.dimainkan ? 'Skor terbaik ' + l.skor : 'Belum pernah dimainkan')) + '</p>' +
            '<button class="btn ' + (alasan ? 'hantu' : i === 2 ? 'oranye' : i === 1 ? 'biru' : 'hijau') + ' penuh"' + (alasan ? ' disabled' : ' data-aksi="main" data-mapel="' + esc(w.id) + '" data-level="' + l.level + '"') + '>' + ik(alasan ? 'lock' : 'play_arrow', 'isi') + (alasan ? 'Terkunci' : l.dimainkan ? 'Main lagi' : 'Mulai') + '</button></article>';
        }).join('') + '</div>') + '</div>';
      return;
    }
    const misi = b.catatan.filter(function (c) { return c.jenis === 'misi' && !c.selesai && c.mapel; });
    app.innerHTML = '<div class="wadah kol" style="gap:24px"><div class="judul-blok"><div class="kiri"><div class="blok-ikon oranye">' + ik('sports_esports', 'isi s28') + '</div><div><h1 class="t-lg">Tantangan Kuis</h1><p class="redup">Pilih pulau dan tingkat kesulitan. Jawab benar untuk dapat XP dan bintang!</p></div></div>' +
      '<span class="pil putih">' + ik('favorite', 'isi s18') + ' ' + (b.setting.NYAWA || 3) + ' nyawa · ' + (b.setting.JUMLAH_SOAL || 10) + ' soal</span></div>' +
      (misi.length ? '<section class="kartu catatan-misi kol g10" style="border-radius:32px"><h2 class="t-sm flex tengah g8">🎯 Misi dari guru</h2>' + misi.map(function (c) {
        const w = b.dunia.filter(function (x) { return x.id === c.mapel; })[0];
        return '<div class="flex antara tengah bungkus g10"><span>' + esc(c.pesan) + '</span><button class="btn kecil oranye" data-aksi="main" data-mapel="' + esc(c.mapel) + '" data-level="' + esc(c.level || '') + '">' + esc(w ? w.dunia : 'Mulai') + (c.level ? ' · ' + esc(c.level) : '') + '</button></div>';
      }).join('') + '</section>' : '') +
      '<div class="grid-dunia">' + b.dunia.map(kartuDunia).join('') + '</div></div>';
  }

  /* =================================================================
   * ARENA KUIS
   * ================================================================= */
  async function mulaiKuis(mapelId, level) {
    const b = S.boot, w = b.dunia.filter(function (x) { return x.id === mapelId; })[0];
    if (!w || w.terkunci) { PC.toast('Pulau ini belum terbuka.', 'info'); return; }
    if (!level) level = levelAktif(w);
    const L = w.levels.filter(function (x) { return x.level === level; })[0];
    if (!L || !L.terbuka) { level = levelAktif(w); }
    PC.Suara.klik();
    bukaArena('<div class="memuat" style="min-height:80vh"><div class="putar"></div><p style="margin-top:14px">Menyiapkan soal petualangan…</p></div>');
    const kk = kunci('pk_' + mapelId + '_' + level);
    let paket = PC.simpan.get(kk, null);
    if (!paket || paket.versi !== b.kv) {
      const r = await PC.api('siswa.paket', { mapelId: mapelId, level: level });
      if (!r.success) { tutupArena(); PC.toast(r.message, 'galat'); if (r.code === 'LOCKED') muatBoot(true); return; }
      paket = r.data;
      PC.simpan.set(kk, paket);
    }
    const n = Math.min(Number(paket.jumlah) || 10, paket.soal.length);
    const pilih = PC.acak(paket.soal).slice(0, n).map(function (s) {
      const x = Object.assign({}, s);
      if (x.pilihan) x.pilihan = PC.acak(x.pilihan);
      if (x.kanan) x.kanan = PC.acak(x.kanan);
      return x;
    });
    S.kuisAktif = { w: w, mapelId: mapelId, level: level, nonce: paket.nonce, soal: pilih, i: 0, nyawa: Number(paket.nyawa) || 3, nyawaAwal: Number(paket.nyawa) || 3, batch: Number(paket.batch) || 5,
      jawaban: [], terkirim: 0, benar: 0, sesiId: PC.sesiId(), mulaiMs: Date.now(), selesai: false, sibuk: false };
    if (location.hash !== '#/main') { S._kembali = location.hash || '#/beranda'; history.pushState(null, '', '#/main'); }
    tampilSoal();
  }
  function bukaArena(html) {
    arena.hidden = false; arena.innerHTML = html; document.body.style.overflow = 'hidden';
    const m = $('.menu-profil'); if (m) m.remove();
  }
  function tutupArena() {
    arena.hidden = true; arena.innerHTML = ''; document.body.style.overflow = '';
    S.kuisAktif = null;
  }
  function hatiHtml() {
    const K = S.kuisAktif; let s = '';
    for (let i = 0; i < K.nyawaAwal; i++) s += ik('favorite', 'isi' + (i >= K.nyawa ? ' hilang' : ''));
    return s;
  }
  function atasArena() {
    const K = S.kuisAktif, persen = Math.round(K.i / K.soal.length * 100);
    return '<div class="arena-atas"><button class="btn hantu btn-ikon" data-aksi="tutup-kuis" aria-label="Keluar dari kuis">' + ik('close') + '</button>' +
      '<div class="progres" role="progressbar" aria-valuemin="0" aria-valuemax="' + K.soal.length + '" aria-valuenow="' + K.i + '" aria-label="Kemajuan kuis"><i style="width:' + persen + '%"></i></div>' +
      '<span class="lbl" style="min-width:48px;text-align:center">' + (K.i + 1) + '/' + K.soal.length + '</span><span class="nyawa" aria-label="Nyawa ' + K.nyawa + '">' + hatiHtml() + '</span></div>';
  }
  function gambarSoal(s) {
    if (!s.gambar) return '';
    if (/^https:\/\//.test(s.gambar)) return '<div class="gambar-soal"><img src="' + esc(s.gambar) + '" alt="Gambar soal"></div>';
    return '<div class="gambar-soal emoji" aria-hidden="true">' + esc(s.gambar) + '</div>';
  }
  function tampilSoal() {
    const K = S.kuisAktif, s = K.soal[K.i];
    K.pas = { kiri: null, pasangan: {} };
    let badan;
    if (s.jenis === 'PASANGAN') {
      badan = '<p class="kecil redup">Ketuk satu kotak kiri, lalu pasangannya di kanan. Ketuk lagi untuk melepas.</p><div class="pasangan"><div class="kol-pas">' +
        s.kiri.map(function (t, i) { return '<button class="item-pas" data-aksi="pas-kiri" data-i="' + i + '">' + esc(t) + '</button>'; }).join('') + '</div><div class="kol-pas">' +
        s.kanan.map(function (t, i) { return '<button class="item-pas" data-aksi="pas-kanan" data-i="' + i + '">' + esc(t) + '</button>'; }).join('') + '</div></div>';
    } else {
      badan = '<div class="pilihan-grid" role="group" aria-label="Pilihan jawaban">' + s.pilihan.map(function (p, i) {
        return '<button class="pilihan" data-aksi="pilih" data-i="' + i + '"><span class="huruf">' + 'ABCDEF'.charAt(i) + '</span><span>' + esc(p) + '</span></button>';
      }).join('') + '</div>';
    }
    arena.innerHTML = atasArena() + '<div class="arena-isi"><div class="kartu-soal"><div class="flex g8 bungkus"><span class="pil biru">' + ik(K.w.ikon, 's18') + esc(K.w.dunia) + '</span><span class="pil lav">' + esc(s.topik) + '</span><span class="pil lv-' + K.level + '">' + esc(K.level) + '</span><span class="pil oranye">' + ik('bolt', 's16') + '+' + s.poin + ' XP</span></div>' +
      gambarSoal(s) + '<div class="tanya" id="tanyaSoal">' + esc(s.tanya) + '</div></div>' + badan + '</div>' +
      (s.jenis === 'PASANGAN' ? '<div class="aksi-bawah"><div class="isi"><button class="btn besar biru" data-aksi="periksa-pas" disabled>' + ik('fact_check') + 'Periksa</button></div></div>' : '');
    arena.scrollTop = 0;
    const f = $('.pilihan, .item-pas', arena); if (f) f.focus({ preventScroll: true });
  }
  async function pilihPG(i) {
    const K = S.kuisAktif; if (!K || K.sibuk) return;
    K.sibuk = true;
    const s = K.soal[K.i], teks = s.pilihan[i];
    const btns = $$('.pilihan', arena);
    btns.forEach(function (b) { b.disabled = true; });
    btns[i].classList.add('dipilih');
    const benar = (await PC.sidik(K.nonce, s.id, '', teks)) === s.h;
    let kunciTeks = teks;
    if (!benar) {
      for (let j = 0; j < s.pilihan.length; j++) if ((await PC.sidik(K.nonce, s.id, '', s.pilihan[j])) === s.h) { kunciTeks = s.pilihan[j]; btns[j].classList.add('benar'); }
      btns[i].classList.add('salah');
    } else btns[i].classList.add('benar');
    btns.forEach(function (b, j) { if (j !== i && !b.classList.contains('benar')) b.classList.add('redup'); });
    catatJawaban(s, teks, benar);
    umpanBalik(benar, s, benar ? '' : kunciTeks);
  }
  function pasKlik(sisi, i) {
    const K = S.kuisAktif; if (!K || K.sibuk) return;
    const P = K.pas;
    PC.Suara.klik();
    if (sisi === 'kiri') {
      if (P.pasangan[i] !== undefined) { delete P.pasangan[i]; P.kiri = null; }
      else P.kiri = P.kiri === i ? null : i;
    } else {
      const sudah = Object.keys(P.pasangan).filter(function (k) { return P.pasangan[k] === i; })[0];
      if (sudah !== undefined) delete P.pasangan[sudah];
      else if (P.kiri !== null) { P.pasangan[P.kiri] = i; P.kiri = null; }
    }
    gambarPasangan();
  }
  function gambarPasangan() {
    const K = S.kuisAktif, P = K.pas, s = K.soal[K.i];
    const warnaKanan = {};
    Object.keys(P.pasangan).forEach(function (k, n) { warnaKanan[P.pasangan[k]] = k; });
    $$('[data-aksi="pas-kiri"]', arena).forEach(function (b) {
      const i = Number(b.dataset.i);
      b.classList.toggle('pilih', P.kiri === i);
      if (P.pasangan[i] !== undefined) b.dataset.pasang = String(i); else delete b.dataset.pasang;
    });
    $$('[data-aksi="pas-kanan"]', arena).forEach(function (b) {
      const i = Number(b.dataset.i);
      if (warnaKanan[i] !== undefined) b.dataset.pasang = String(warnaKanan[i]); else delete b.dataset.pasang;
    });
    const tombol = $('[data-aksi="periksa-pas"]', arena);
    if (tombol) tombol.disabled = Object.keys(P.pasangan).length < s.kiri.length;
  }
  async function periksaPasangan() {
    const K = S.kuisAktif; if (!K || K.sibuk) return;
    K.sibuk = true;
    const s = K.soal[K.i], P = K.pas;
    const jawab = s.kiri.map(function (_, i) { return s.kanan[P.pasangan[i]]; });
    const hasil = [];
    for (let i = 0; i < s.kiri.length; i++) hasil.push((await PC.sidik(K.nonce, s.id, i, jawab[i])) === s.hp[i]);
    const benar = hasil.every(Boolean);
    // cari pasangan yang benar untuk ditampilkan
    const kunci = [];
    for (let i = 0; i < s.kiri.length; i++) {
      for (let j = 0; j < s.kanan.length; j++) if ((await PC.sidik(K.nonce, s.id, i, s.kanan[j])) === s.hp[i]) { kunci[i] = s.kanan[j]; break; }
    }
    $$('.item-pas', arena).forEach(function (b) { b.disabled = true; });
    $$('[data-aksi="pas-kiri"]', arena).forEach(function (b) {
      const i = Number(b.dataset.i);
      b.insertAdjacentHTML('beforeend', '<span class="tanda ' + (hasil[i] ? 'ok' : 'no') + '">' + ik(hasil[i] ? 'check' : 'close', 's18') + '</span>');
    });
    const ab = $('.aksi-bawah', arena); if (ab) ab.remove();
    catatJawaban(s, jawab, benar);
    const salahList = s.kiri.map(function (l, i) { return hasil[i] ? null : l + ' = ' + (kunci[i] || '?'); }).filter(Boolean);
    umpanBalik(benar, s, salahList.join(' · '));
  }
  function catatJawaban(s, j, benar) {
    const K = S.kuisAktif;
    K.jawaban.push({ id: s.id, j: j });
    if (benar) { K.benar++; PC.Suara.benar(); }
    else {
      PC.Suara.salah();
      K.nyawa--;
      const hati = $$('.nyawa .ik', arena);
      const h = hati[K.nyawa];
      if (h) { h.classList.add('hilang', 'pecah'); }
    }
    if (K.jawaban.length - K.terkirim >= K.batch && K.jawaban.length < K.soal.length && K.nyawa > 0) kirimBatch();
  }
  function kirimBatch() {
    const K = S.kuisAktif;
    const potong = K.jawaban.slice(K.terkirim);
    K.terkirim = K.jawaban.length;
    PC.api('siswa.jawab', { sesiId: K.sesiId, mapelId: K.mapelId, level: K.level, jawaban: potong });
  }
  function umpanBalik(benar, s, kunciTeks) {
    const K = S.kuisAktif;
    const habis = K.nyawa <= 0, akhir = K.i >= K.soal.length - 1;
    const pujian = ['Hebat! 🎉', 'Luar biasa! 🌟', 'Tepat sekali! ✨', 'Keren! 🚀', 'Pintar! 🧠'];
    const semangat = ['Belum tepat, tidak apa-apa!', 'Hampir! Ayo coba lagi nanti!', 'Tetap semangat ya!'];
    const el = document.createElement('div');
    el.className = 'lembar-umpan ' + (benar ? 'benar' : 'salah');
    el.setAttribute('role', 'alert');
    el.innerHTML = '<div class="isi"><span class="ik besar isi" aria-hidden="true">' + (benar ? 'check_circle' : 'lightbulb') + '</span><div class="isi1 kol g4">' +
      '<div class="judul">' + esc(benar ? pujian[Math.floor(Math.random() * pujian.length)] : semangat[Math.floor(Math.random() * semangat.length)]) + '</div>' +
      (!benar && kunciTeks ? '<div class="jelas"><b>Jawaban yang benar:</b> ' + esc(kunciTeks) + '</div>' : '') +
      (s.jelas ? '<div class="jelas">' + esc(s.jelas) + '</div>' : '') +
      (habis ? '<div class="jelas"><b>Nyawamu habis.</b> Kita lihat hasil petualanganmu ya!</div>' : '') + '</div>' +
      '<button class="btn besar ' + (benar ? 'hijau' : 'oranye') + '" data-aksi="lanjut">' + (habis || akhir ? 'Lihat Hasil' : 'Lanjut') + ik('arrow_forward') + '</button></div>';
    arena.appendChild(el);
    setTimeout(function () { const b = $('[data-aksi="lanjut"]', el); if (b) b.focus(); }, 50);
  }
  function lanjut() {
    const K = S.kuisAktif; if (!K) return;
    K.sibuk = false;
    if (K.nyawa <= 0 || K.i >= K.soal.length - 1) { selesaiKuis(); return; }
    K.i++;
    tampilSoal();
  }
  async function selesaiKuis() {
    const K = S.kuisAktif;
    K.selesai = true;
    bukaArena('<div class="memuat" style="min-height:80vh"><div class="bintang-hasil"><span class="ik isi">star</span><span class="ik isi">star</span><span class="ik isi">star</span></div><p class="t-sm" style="margin-top:16px">Menghitung bintangmu…</p></div>');
    const data = { sesiId: K.sesiId, mapelId: K.mapelId, level: K.level, jawaban: K.jawaban, jumlah: K.soal.length, mulaiMs: K.mulaiMs, selesaiMs: Date.now() };
    const r = await PC.api('siswa.selesai', data, { ulang: true });
    if (!S.kuisAktif) return;
    if (r.success) { tampilHasil(r.data); muatBoot(true); return; }
    if (r.code === 'NETWORK') {
      simpanTertunda(data);
      const skor = Math.round(K.benar / K.soal.length * 100);
      tampilHasil({ skor: skor, benar: K.benar, dijawab: K.jawaban.length, jumlah: K.soal.length, bintang: 0, xp: 0, offline: true, lencanaBaru: [], terbuka: [], status: K.nyawa <= 0 ? 'gagal' : 'selesai' });
      return;
    }
    tutupArena();
    PC.toast(r.message, 'galat');
    kembaliDariArena();
  }
  function tampilHasil(h) {
    const K = S.kuisAktif;
    const pesan = h.offline ? 'Hasil akan disimpan otomatis saat internet tersambung lagi.'
      : h.bintang === 3 ? 'Sempurna! Kamu penjelajah hebat!' : h.bintang === 2 ? 'Bagus sekali! Sedikit lagi menuju 3 bintang!' : h.bintang === 1 ? 'Kerja bagus! Latihan lagi untuk bintang lebih banyak!' : 'Tidak apa-apa! Setiap petualang belajar dari percobaan. Ayo coba lagi!';
    const levelBerikut = (h.terbuka || [])[0];
    arena.innerHTML = '<div class="hasil">' +
      '<div class="bintang-hasil" aria-label="' + (h.bintang || 0) + ' bintang"><span class="ik">star</span><span class="ik">star</span><span class="ik">star</span></div>' +
      '<div><h1 class="t-xl">' + (h.status === 'gagal' ? 'Nyawa habis!' : 'Petualangan selesai!') + '</h1><p class="redup" style="font-size:18px">' + esc(pesan) + '</p></div>' +
      '<div class="rincian-xp"><div class="ubin"><span class="lbl redup">Skor</span><b style="color:var(--pri-ink)">' + h.skor + '</b></div>' +
      '<div class="ubin"><span class="lbl redup">Benar</span><b style="color:var(--ok-ink)">' + h.benar + '/' + h.jumlah + '</b></div>' +
      '<div class="ubin"><span class="lbl redup">XP didapat</span><b style="color:var(--ter-ink)">+' + (h.xp || 0) + '</b></div></div>' +
      (h.xp ? '<p class="kecil redup">' + [h.xpSoal ? '+' + h.xpSoal + ' dari soal' : '', h.xpBintang ? '+' + h.xpBintang + ' bonus bintang' : '', h.xpMisi ? '+' + h.xpMisi + ' misi harian' : ''].filter(Boolean).join(' · ') + '</p>' : '') +
      (h.naikLevel ? '<div class="naik-level lompat"><div class="t-md">🎉 Naik ke Level ' + h.levelBaru + '!</div><div>Kamu sekarang <b>' + esc(h.levelInfo.nama) + '</b></div></div>' : '') +
      (levelBerikut ? '<div class="kartu-baru"><span class="blok-ikon biru">' + ik('lock_open', 'isi') + '</span><div><b>Level ' + esc(levelBerikut) + ' terbuka!</b><div class="kecil redup">Tantangan baru di ' + esc(K.w.dunia) + ' menunggumu.</div></div></div>' : '') +
      (h.lencanaBaru || []).map(function (l, i) { return '<div class="kartu-baru" style="animation-delay:' + (0.3 + i * 0.2) + 's">' + medali(l, 56) + '<div><b>Lencana baru: ' + esc(l.nama) + '</b><div class="kecil redup">' + esc(l.desk) + '</div></div></div>'; }).join('') +
      '<div class="flex g12 bungkus" style="justify-content:center;margin-top:8px">' +
      (levelBerikut ? '<button class="btn besar oranye" data-aksi="main" data-mapel="' + esc(K.mapelId) + '" data-level="' + esc(levelBerikut) + '">' + ik('rocket_launch') + 'Coba Level ' + esc(levelBerikut) + '</button>' : '') +
      '<button class="btn besar ' + (levelBerikut ? 'biru' : 'oranye') + '" data-aksi="main" data-mapel="' + esc(K.mapelId) + '" data-level="' + esc(K.level) + '">' + ik('replay') + 'Main Lagi</button>' +
      '<button class="btn besar putih" data-aksi="selesai-arena">' + ik('map') + 'Kembali</button></div></div>';
    const bintang = $$('.bintang-hasil .ik', arena);
    for (let i = 0; i < (h.bintang || 0); i++) setTimeout(function () { bintang[i].classList.add('nyala'); PC.Suara.bintang(i); }, 350 + i * 420);
    if (h.naikLevel) setTimeout(function () { PC.Suara.naikLevel(); }, 1500);
    if ((h.bintang || 0) >= 2 || h.naikLevel) setTimeout(konfeti, 500 + (h.bintang || 0) * 400);
  }
  function kembaliDariArena() {
    tutupArena();
    const ke = S._kembali || '#/beranda';
    if (location.hash === '#/main') history.replaceState(null, '', ke);
    rute();
  }
  async function konfirmasiKeluarKuis() {
    history.pushState(null, '', '#/main');
    const ya = await PC.konfirmasi('XP dan bintang hanya didapat bila kuis selesai. Jawaban yang sudah terkirim tetap tercatat.', { judul: 'Keluar dari kuis?', ya: 'Ya, keluar', batal: 'Lanjut bermain', ikon: 'logout', bahaya: true });
    if (ya) kembaliDariArena();
  }

  /* ---------- hasil tertunda (offline) ---------- */
  function simpanTertunda(data) { const l = PC.simpan.get(kunci('tunda'), []); l.push(data); PC.simpan.set(kunci('tunda'), l.slice(-10)); }
  async function kirimTertunda() {
    if (!PC.Sesi.token) return;
    const l = PC.simpan.get(kunci('tunda'), []);
    if (!l.length) return;
    const sisa = [];
    for (let i = 0; i < l.length; i++) {
      const r = await PC.api('siswa.selesai', l[i], { ulang: true });
      if (!r.success && r.code === 'NETWORK') sisa.push(l[i]);
    }
    PC.simpan.set(kunci('tunda'), sisa);
    if (sisa.length < l.length) { PC.toast('Hasil kuis yang tertunda sudah tersimpan! 🎉', 'ok'); muatBoot(true); }
  }

  /* ---------- konfeti ---------- */
  function konfeti() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = $('#konfeti'), cx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const warna = ['#2db6f5', '#fdc73a', '#ff8b5e', '#4cd964', '#8b7cf6', '#ff5e7a'];
    const p = Array.from({ length: 140 }, function () { return { x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, r: 4 + Math.random() * 6, c: warna[Math.floor(Math.random() * warna.length)], a: Math.random() * 6 }; });
    const t0 = performance.now();
    (function gambar(t) {
      cx.clearRect(0, 0, cv.width, cv.height);
      p.forEach(function (q) { q.vy += .35; q.x += q.vx; q.y += q.vy; q.a += .2; cx.save(); cx.translate(q.x, q.y); cx.rotate(q.a); cx.fillStyle = q.c; cx.fillRect(-q.r, -q.r / 2, q.r * 2, q.r); cx.restore(); });
      if (t - t0 < 2600) requestAnimationFrame(gambar); else cx.clearRect(0, 0, cv.width, cv.height);
    })(t0);
  }

  /* =================================================================
   * LENCANA & PERINGKAT
   * ================================================================= */
  function halLencana() {
    const L = S.boot.lencana;
    app.innerHTML = '<div class="wadah kol" style="gap:24px"><div class="judul-blok"><div class="kiri"><div class="blok-ikon">' + ik('military_tech', 'isi s28') + '</div><div><h1 class="t-lg">Lencana &amp; Peringkat</h1><p class="redup">Kumpulkan lencana dengan menyelesaikan tantangan istimewa.</p></div></div>' +
      '<span class="pil-stat bintang">' + ik('workspace_premium', 'isi s20') + L.dimiliki + ' / ' + L.total + ' lencana</span></div>' +
      '<div class="grid-2"><section class="kartu kol" style="gap:18px"><h2 class="t-sm">Koleksi Lencana</h2><div class="grid-lencana">' +
      L.daftar.map(function (l) {
        return '<div class="kartu-lencana' + (l.didapat ? '' : ' kunci') + '">' + medali(l) + '<h3>' + esc(l.nama) + '</h3><p>' + esc(l.desk) + '</p>' +
          (l.didapat ? '<span class="pil hijau">' + ik('check', 's16') + (l.tanggal ? PC.tgl(l.tanggal) : 'Diraih') + '</span>' : '<span class="pil lav">' + ik('lock', 's16') + 'Belum diraih</span>') + '</div>';
      }).join('') + '</div></section><aside class="kol">' + (S.boot.peringkat ? kartuSahabat(false) : '<section class="kartu"><p class="redup">Papan peringkat sedang dimatikan oleh sekolah.</p></section>') +
      '<section class="kartu kol g10"><h2 class="t-sm flex tengah g8">' + ik('favorite', 'isi') + 'Papan yang sehat</h2><p class="kecil redup">Papan sahabat dihitung dari XP <b>pekan ini</b>, jadi setiap Senin semua mulai lagi dari awal. Yang terpenting: kamu terus belajar dan lebih baik dari dirimu kemarin! 💪</p></section></aside></div></div>';
  }

  /* =================================================================
   * RAPOR PETUALANG
   * ================================================================= */
  async function halRapor() {
    const c = PC.simpan.get(kunci('rapor'), null);
    if (c) gambarRapor(c); else app.innerHTML = '<div class="wadah"><div class="kerangka" style="height:220px"></div><div class="kerangka" style="height:320px;margin-top:20px"></div></div>';
    const r = await PC.api('siswa.rapor');
    if (r.success) { PC.simpan.set(kunci('rapor'), r.data); if (location.hash.indexOf('#/rapor') === 0) gambarRapor(r.data); }
    else if (!c) app.innerHTML = '<div class="wadah"><div class="kartu kosong"><div class="emoji">📒</div><p>' + esc(r.message) + '</p></div></div>';
  }
  function gambarRapor(r) {
    const b = S.boot, st = b.stat, me = b.me;
    const topikBar = function (t) {
      const warna = t.persen >= 80 ? '' : t.persen >= 60 ? 'kuning' : 'oranye';
      return '<div class="batang-topik"><div class="baris"><span>' + esc(t.topik) + ' <span class="redup lbl">· ' + esc(t.mapel) + '</span></span><span>' + t.persen + '%</span></div><div class="progres tipis ' + warna + '"><i style="width:' + t.persen + '%"></i></div></div>';
    };
    app.innerHTML = '<div class="wadah kol" style="gap:24px">' +
      '<section class="kartu profil-rapor"><div class="karakter-bulat">' + (me.karakter.gambar ? '<img src="' + esc(me.karakter.gambar) + '" alt="">' : esc(me.karakter.emoji)) + '</div>' +
      '<div class="isi1 kol g6"><span class="lbl-up" style="color:var(--sek-ink)">Rapor Petualang</span><h1 class="t-lg">' + esc(me.nama) + '</h1><p class="redup">Kelas ' + esc(me.kelas) + (me.julukan ? ' · ' + esc(me.julukan) : '') + ' · ' + esc(me.karakter.nama) + '</p>' +
      '<div class="flex g8 bungkus"><span class="pil biru">' + ik('military_tech', 's18') + 'Level ' + st.level + ' · ' + esc(st.levelInfo.nama) + '</span><button class="btn kecil kuning" data-aksi="karakter">' + ik('pets', 's18') + 'Ganti Karakter</button></div></div></section>' +
      '<div class="grid-ubin">' + [['XP Total', PC.angka(st.xp), 'bolt', 'var(--ter-ink)'], ['Bintang', PC.angka(st.bintang), 'star', 'var(--sek-ink)'], ['Kuis Selesai', st.kuis, 'sports_esports', 'var(--pri-ink)'],
        ['Rata-rata Skor', st.rataSkor, 'insights', 'var(--ok-ink)'], ['Berturut-turut', st.streak + ' hari', 'local_fire_department', 'var(--ter-ink)'], ['Lencana', b.lencana.dimiliki, 'workspace_premium', 'var(--sek-ink)']].map(function (x) {
        return '<div class="ubin"><span class="lbl redup flex tengah g4">' + ik(x[2], 's16') + x[0] + '</span><b style="color:' + x[3] + '">' + x[1] + '</b></div>';
      }).join('') + '</div>' +
      '<div class="grid-2"><div class="kol">' +
      '<section class="kartu kol" style="gap:16px"><h2 class="t-sm">Kemajuan per Pulau</h2>' + r.dunia.filter(function (w) { return !w.terkunci; }).map(function (w) {
        return '<div class="flex tengah g16 bungkus" style="padding:12px;border-radius:22px;background:var(--lav)"><div style="width:90px;border-radius:16px;overflow:hidden;aspect-ratio:16/10">' + ilus(w) + '</div><div class="isi1 kol g6" style="min-width:180px"><b>' + esc(w.dunia) + '</b>' +
          '<div class="flex g8 bungkus">' + w.levels.map(function (l) { return '<span class="pil ' + (l.terbuka ? 'putih' : 'lav') + '">' + esc(l.level) + ' ' + bintangIkon(l.bintang) + '</span>'; }).join('') + '</div></div><span class="bintang-teks">' + ik('star', 'isi') + w.bintang + '/9</span></div>';
      }).join('') + '</section>' +
      '<section class="kartu kol" style="gap:14px"><h2 class="t-sm">Riwayat Kuis Terakhir</h2>' + (r.sesi.length ? r.sesi.map(function (s) {
        return '<div class="riwayat-baris"><span class="lencana-level lv-' + esc(s.level) + '" style="width:44px;height:44px;border-radius:14px;font-size:20px">' + ik(s.status === 'gagal' ? 'heart_broken' : 'flag', 'isi') + '</span><div class="isi1"><b>' + esc(s.mapel) + ' · ' + esc(s.level) + '</b><div class="lbl redup">' + esc(PC.relatif(s.waktu)) + '</div></div>' +
          '<span class="bintang-teks" style="color:var(--sek)">' + bintangIkon(s.bintang) + '</span><b style="min-width:42px;text-align:right">' + s.skor + '</b></div>';
      }).join('') : '<p class="redup">Belum ada kuis. Ayo mulai petualangan pertamamu!</p>') + '</section></div>' +
      '<aside class="kol"><section class="kartu kol" style="gap:14px"><h2 class="t-sm flex tengah g8">💪 Kamu Hebat di…</h2>' + (r.kuat.length ? r.kuat.map(topikBar).join('') : '<p class="kecil redup">Selesaikan beberapa kuis lagi agar kekuatanmu terlihat.</p>') + '</section>' +
      '<section class="kartu kol" style="gap:14px"><h2 class="t-sm flex tengah g8">📚 Ayo Latih Lagi</h2>' + (r.latih.length ? r.latih.map(topikBar).join('') + '<p class="kecil redup">Coba ulangi level Mudah di topik ini ya!</p>' : '<p class="kecil redup">Belum ada topik yang perlu dilatih. Keren!</p>') + '</section>' +
      '<section class="kartu kol" style="gap:12px"><h2 class="t-sm">Semua Topik</h2>' + (r.topik.length ? r.topik.slice(0, 12).map(topikBar).join('') : '<p class="kecil redup">Belum ada data.</p>') + '</section></aside></div></div>';
    animasiProgres();
  }
  function modalKarakter() {
    const b = S.boot;
    let pilih = b.me.karakter.id;
    const isi = '<p class="redup">Pilih teman petualanganmu. Karakter baru terbuka saat levelmu naik!</p><div class="pilih-karakter">' + b.karakter.map(function (k) {
      return '<button class="opsi-karakter" data-k="' + esc(k.id) + '" aria-pressed="' + (k.id === pilih) + '"' + (k.terbuka ? '' : ' disabled') + '><span class="emo">' + (k.gambar ? '<img src="' + esc(k.gambar) + '" alt="" style="width:52px;height:52px;object-fit:contain">' : esc(k.emoji)) + '</span>' + esc(k.nama) +
        (k.terbuka ? '' : '<span class="lbl redup">' + ik('lock', 's16') + 'Level ' + k.levelBuka + '</span>') + '</button>';
    }).join('') + '</div>';
    PC.modal({ judul: 'Ganti Karakter', ikon: 'pets', isi: isi, lebar: 'lebar',
      saatBuka: function (el) {
        $$('.opsi-karakter', el).forEach(function (btn) { btn.onclick = function () { pilih = btn.dataset.k; $$('.opsi-karakter', el).forEach(function (x) { x.setAttribute('aria-pressed', String(x === btn)); }); PC.Suara.klik(); }; });
      },
      tombol: [{ teks: 'Batal' }, { teks: 'Simpan Karakter', kelas: 'biru', ikon: 'check', aksi: async function () {
        if (pilih === b.me.karakter.id) return;
        const r = await PC.api('siswa.karakter', { karakterId: pilih });
        if (!r.success) { PC.toast(r.message, 'galat'); return false; }
        b.me.karakter = r.data.karakter;
        PC.simpan.set(kunci('boot'), b);
        PC.toast(r.message, 'ok');
        tampilShell(); rute(true);
      } }] });
  }

  /* =================================================================
   * AKSI
   * ================================================================= */
  async function bukaPeti(btn) {
    const selesai = PC.memuatTombol(btn, 'Membuka…');
    const r = await PC.api('siswa.peti');
    selesai();
    if (!r.success) { PC.toast(r.message, 'galat'); return; }
    PC.Suara.peti(); konfeti();
    PC.toast(r.message, 'ok');
    S.boot.stat = r.data.stat; S.boot.misi = r.data.misi;
    PC.simpan.set(kunci('boot'), S.boot);
    tampilShell(); rute(true);
    if (r.data.naikLevel) { PC.Suara.naikLevel(); PC.toast('🎉 Naik ke Level ' + r.data.levelInfo.level + '!', 'ok'); }
  }
  async function sukaCatatan(btn) {
    const id = btn.dataset.id, c = S.boot.catatan.filter(function (x) { return x.id === id; })[0];
    if (!c || c.disukai) return;
    c.disukai = true; c.dibaca = true;
    btn.setAttribute('aria-pressed', 'true');
    btn.innerHTML = ik('favorite', 's18') + 'Kamu menyukai ini';
    PC.Suara.klik();
    const r = await PC.api('siswa.catatan', { id: id, aksi: 'suka' });
    if (!r.success) { c.disukai = false; PC.toast(r.message, 'galat'); }
    PC.simpan.set(kunci('boot'), S.boot);
  }
  function klik(e) {
    const t = e.target.closest('[data-aksi]');
    if (!t) return;
    const a = t.dataset.aksi;
    if (a === 'main') { e.preventDefault(); mulaiKuis(t.dataset.mapel, t.dataset.level); }
    else if (a === 'ke') { location.hash = '#/' + t.dataset.ke; const m = $('.menu-profil'); if (m) m.remove(); }
    else if (a === 'filter-peta') { S.filterPeta = t.dataset.f; halPeta(); }
    else if (a === 'peti') bukaPeti(t);
    else if (a === 'suka') sukaCatatan(t);
    else if (a === 'menu-profil') tampilMenuProfil(t);
    else if (a === 'karakter') { const m = $('.menu-profil'); if (m) m.remove(); modalKarakter(); }
    else if (a === 'suara') { PC.Suara.set(!PC.Suara.aktif); const m = $('.menu-profil'); if (m) m.remove(); PC.toast(PC.Suara.aktif ? 'Suara dinyalakan 🔊' : 'Suara dimatikan 🔇', 'info'); }
    else if (a === 'keluar') { const m = $('.menu-profil'); if (m) m.remove(); PC.konfirmasi('Kamu bisa masuk lagi dengan kode kelas dan PIN-mu.', { judul: 'Keluar dari akun?', ya: 'Keluar', ikon: 'logout' }).then(function (y) { if (y) { bersihkanCache(''); keluar(''); } }); }
    else if (a === 'segar') muatBoot();
    else if (a === 'pilih') pilihPG(Number(t.dataset.i));
    else if (a === 'pas-kiri') pasKlik('kiri', Number(t.dataset.i));
    else if (a === 'pas-kanan') pasKlik('kanan', Number(t.dataset.i));
    else if (a === 'periksa-pas') periksaPasangan();
    else if (a === 'lanjut') lanjut();
    else if (a === 'tutup-kuis') { if (S.kuisAktif && !S.kuisAktif.selesai) konfirmasiKeluarKuis(); else kembaliDariArena(); }
    else if (a === 'selesai-arena') kembaliDariArena();
  }
  function tombolKeyboard(e) {
    if (!S.kuisAktif || arena.hidden) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const lanj = $('[data-aksi="lanjut"]', arena);
    if (lanj && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); lanjut(); return; }
    const n = '1234abcd'.indexOf(e.key.toLowerCase());
    if (n > -1 && !lanj) { const i = n % 4, b = $$('.pilihan', arena)[i]; if (b && !b.disabled) pilihPG(i); }
  }

  /* =================================================================
   * MASUK (kode kelas → nama → PIN)
   * ================================================================= */
  function layarMasuk(pre) {
    document.body.classList.remove('ada-nav');
    kepala.hidden = true; navBawah.hidden = true; kaki.hidden = true;
    PC.warmUp('pub');
    const M = { kode: (pre && pre.k) || PC.simpan.get('pc_kode', ''), kelas: null, siswa: [], pilih: null, pin: '' };
    let terakhir = PC.simpan.get('pc_terakhir', null);
    const bingkai = function (langkah, isi) {
      app.innerHTML = '<div class="layar-masuk"><div class="kartu-masuk"><div class="langkah-masuk" aria-hidden="true"><i class="' + (langkah >= 1 ? 'aktif' : '') + '"></i><i class="' + (langkah >= 2 ? 'aktif' : '') + '"></i><i class="' + (langkah >= 3 ? 'aktif' : '') + '"></i></div>' + isi + '</div>' +
        '<p class="kecil redup" style="margin-top:18px">🛡️ Ramah anak · tanpa email · data minimal</p></div>';
    };
    const langkah1 = function (galat) {
      bingkai(1, '<div class="maskot-masuk">🧭</div><div><h1 class="t-lg" style="color:var(--pri-ink)">Petualangan Cerdas</h1><p class="redup">Masukkan <b>kode kelas</b> dari gurumu untuk mulai bertualang!</p></div>' +
        (terakhir ? '<button class="btn besar kuning penuh" data-cepat>' + '<span style="font-size:26px">' + esc(terakhir.emoji || '🙂') + '</span>Masuk sebagai ' + esc(terakhir.nama) + '</button><div class="kecil redup">atau</div>' : '') +
        '<form class="kol g12" id="fKode" autocomplete="off"><label class="sr" for="iKode">Kode kelas</label><input id="iKode" class="isian isian-kode" maxlength="10" placeholder="KODE" value="' + esc(M.kode) + '" inputmode="text" autocapitalize="characters" spellcheck="false" required>' +
        (galat ? '<p class="kecil" style="color:var(--err-ink)" role="alert">' + esc(galat) + '</p>' : '') +
        '<button class="btn besar oranye penuh" type="submit">' + ik('arrow_forward') + 'Lanjut</button></form>');
      const f = $('#fKode'), inp = $('#iKode');
      inp.addEventListener('input', function () { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
      f.onsubmit = async function (e) {
        e.preventDefault();
        const kode = inp.value.trim();
        if (kode.length < 4) { langkah1('Kode kelas terdiri dari 6 huruf/angka.'); return; }
        const selesai = PC.memuatTombol(f.querySelector('button'), 'Mencari kelas…');
        const r = await PC.api('auth.kelas', { kode: kode }, { tanpaToken: true, ulang: true });
        selesai();
        if (!r.success) { M.kode = kode; langkah1(r.message); return; }
        M.kode = kode; M.kelas = r.data.kelas; M.siswa = r.data.siswa;
        PC.simpan.set('pc_kode', kode);
        if (pre && pre.s && M.siswa.some(function (s) { return s.id === pre.s; })) { M.pilih = M.siswa.filter(function (s) { return s.id === pre.s; })[0]; langkah3(); }
        else langkah2();
      };
      const cepat = $('[data-cepat]');
      if (cepat) cepat.onclick = function () { M.kode = terakhir.kode; M.kelas = { nama: terakhir.kelas }; M.pilih = { id: terakhir.id, nama: terakhir.nama, emoji: terakhir.emoji }; langkah3(); };
      if (!terakhir) setTimeout(function () { inp.focus(); }, 50);
    };
    const langkah2 = function () {
      bingkai(2, '<div><span class="pil biru">' + ik('groups', 's18') + 'Kelas ' + esc(M.kelas.nama) + (M.kelas.julukan ? ' · ' + esc(M.kelas.julukan) : '') + '</span><h1 class="t-md" style="margin-top:10px">Siapa namamu?</h1><p class="redup kecil">Ketuk kartu namamu.</p></div>' +
        (M.siswa.length > 12 ? '<input class="isian" id="cariNama" placeholder="Cari nama…" aria-label="Cari nama">' : '') +
        '<div class="grid-nama" id="gridNama">' + M.siswa.map(function (s) { return '<button class="kartu-nama" data-id="' + esc(s.id) + '"><span class="emo">' + esc(s.emoji) + '</span>' + esc(s.nama) + '</button>'; }).join('') + '</div>' +
        '<button class="btn teks" id="gantiKode">' + ik('arrow_back', 's18') + 'Ganti kode kelas</button>');
      $$('.kartu-nama').forEach(function (b) { b.onclick = function () { M.pilih = M.siswa.filter(function (s) { return s.id === b.dataset.id; })[0]; PC.Suara.klik(); langkah3(); }; });
      $('#gantiKode').onclick = function () { langkah1(); };
      const cari = $('#cariNama');
      if (cari) cari.oninput = function () { const q = PC.norm(cari.value); $$('.kartu-nama').forEach(function (b) { b.hidden = q && PC.norm(b.textContent).indexOf(q) === -1; }); };
    };
    const langkah3 = function (galat) {
      M.pin = '';
      bingkai(3, '<div class="maskot-masuk" style="font-size:64px">' + esc(M.pilih.emoji || '🙂') + '</div><div><h1 class="t-md">Halo, ' + esc(M.pilih.nama) + '!</h1><p class="redup">Masukkan <b>PIN</b> rahasiamu (4 angka).</p></div>' +
        '<div class="titik-pin" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
        '<p class="kecil" id="pesanPin" role="alert" style="min-height:20px;color:var(--err-ink)">' + esc(galat || '') + '</p>' +
        '<div class="keypad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button data-n="' + n + '" aria-label="' + n + '">' + n + '</button>'; }).join('') +
        '<button class="aksi" data-ganti aria-label="Bukan aku">Bukan aku</button><button data-n="0" aria-label="0">0</button><button class="aksi" data-hapus aria-label="Hapus">' + ik('backspace') + '</button></div>');
      const titik = $$('.titik-pin i');
      const gambarPin = function () { titik.forEach(function (t, i) { t.classList.toggle('isi', i < M.pin.length); }); };
      const ketik = async function (n) {
        if (M.pin.length >= 4 || ketik.sibuk) return;
        M.pin += n; PC.Suara.pin(); gambarPin();
        if (M.pin.length === 4) {
          ketik.sibuk = true;
          $('#pesanPin').style.color = 'var(--ink3)'; $('#pesanPin').textContent = 'Memeriksa…';
          const r = await PC.api('auth.siswa', { kode: M.kode, siswaId: M.pilih.id, pin: M.pin }, { tanpaToken: true });
          ketik.sibuk = false;
          if (!r.success) {
            PC.Suara.salah();
            $('.titik-pin').classList.add('goyang');
            setTimeout(function () { langkah3(r.message); }, 450);
            return;
          }
          PC.Sesi.set(r.data.token, r.data.me);
          bersihkanCache(r.data.me.id);
          PC.simpan.set('pc_terakhir', { kode: M.kode, id: M.pilih.id, nama: M.pilih.nama, emoji: M.pilih.emoji, kelas: M.kelas.nama });
          document.removeEventListener('keydown', ketik.kb);
          PC.Suara.benar();
          app.innerHTML = '<div class="layar-masuk"><div class="kartu-masuk lompat"><div class="maskot-masuk">' + esc(M.pilih.emoji || '🙂') + '</div><h1 class="t-lg">Selamat datang, ' + esc(M.pilih.nama) + '! 🎉</h1><div class="putar" style="margin:0 auto"></div></div></div>';
          if (!location.hash || location.hash === '#/main') history.replaceState(null, '', '#/beranda');
          mulai();
        }
      };
      $$('[data-n]').forEach(function (b) { b.onclick = function () { ketik(b.dataset.n); }; });
      $('[data-hapus]').onclick = function () { M.pin = M.pin.slice(0, -1); gambarPin(); };
      $('[data-ganti]').onclick = function () { document.removeEventListener('keydown', ketik.kb); if (M.siswa.length) langkah2(); else { PC.simpan.del('pc_terakhir'); terakhir = null; langkah1(); } };
      ketik.kb = function (e) { if (/^\d$/.test(e.key)) ketik(e.key); else if (e.key === 'Backspace') { M.pin = M.pin.slice(0, -1); gambarPin(); } };
      document.removeEventListener('keydown', layarMasuk._kb || function () {});
      layarMasuk._kb = ketik.kb;
      document.addEventListener('keydown', ketik.kb);
    };
    if (pre && pre.k) {
      const inpDulu = M.kode;
      langkah1();
      $('#iKode').value = inpDulu;
      $('#fKode').requestSubmit ? $('#fKode').requestSubmit() : $('#fKode').dispatchEvent(new Event('submit'));
    } else langkah1();
  }
})();
