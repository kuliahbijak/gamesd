/* =====================================================================
   admin-sistem.js — Pengguna & Peran · Pengaturan · Keamanan & Performa
   (rahasia di Script Properties, akses darurat, PIN, keep-warm, cache,
   data contoh, bersihkan riwayat) · Migrasi Data · Log Aktivitas
   ===================================================================== */
(function () {
  'use strict';
  const A = window.A, $ = A.$, $$ = A.$$, esc = PC.esc, ik = PC.ik;

  /* =================================================================
   * PENGGUNA & PERAN
   * ================================================================= */
  A.hal.pengguna = { render: function (el) {
    el.innerHTML = '<div class="kepala-hal"><div><h1>Pengguna &amp; Peran</h1><p>Guru dan admin masuk dengan akun Google. Superadmin dibatasi maksimal 2 orang dan wajib PIN 6 angka.</p></div><div class="aksi"><button class="btn oranye" data-p="tambah">' + ik('person_add') + 'Tambah Pengguna</button></div></div>' +
      '<div class="grid-3"><div class="kartu lav kolom g6"><b>' + ik('shield_person') + ' Superadmin</b><span class="kecil">Semua menu, pengaturan, keamanan, migrasi, log. Login Google + PIN.</span></div><div class="kartu lav kolom g6"><b>' + ik('admin_panel_settings') + ' Admin Sekolah</b><span class="kecil">Kelola kelas, siswa, konten, WhatsApp & CRM.</span></div><div class="kartu lav kolom g6"><b>' + ik('school') + ' Guru</b><span class="kecil">Hanya kelas yang diampu: dashboard, siswa, tingkat kesulitan, laporan, catatan.</span></div></div>' +
      '<section class="kartu"><div id="pTabel">' + A.kerangka([60, 60, 60]) + '</div></section>';
    let data = null, tbl = null;
    const muat = function () {
      A.swr('pengguna.list', {}, function (d) {
        data = d;
        if (!tbl) tbl = A.Tabel($('#pTabel', el), { rows: [], id: 'Email', urut: 'Peran', arah: 1, arahAwal: { Nama: 1, Peran: 1 }, kosong: 'Belum ada pengguna.',
          kolom: [
            { k: 'Nama', judul: 'Nama', html: function (u) { return '<b>' + esc(u.Nama) + '</b><div class="kecil redup">' + esc(u.Email) + '</div>'; } },
            { k: 'Peran', judul: 'Peran', urut: function (u) { return ['superadmin', 'admin', 'guru'].indexOf(u.Peran); }, html: function (u) { return '<span class="pil ' + ({ superadmin: 'oranye', admin: 'biru', guru: 'hijau' }[u.Peran] || 'lav') + '">' + esc(A.PERAN[u.Peran] || u.Peran) + '</span>' + (u.Peran === 'superadmin' ? ' <span class="kecil ' + (u.pinAda ? 'naik' : 'turun') + '">' + (u.pinAda ? 'PIN ✓' : 'PIN belum dibuat') + '</span>' : ''); } },
            { k: 'Status', judul: 'Status', html: function (u) { return '<span class="pil ' + (u.Status === 'aktif' ? 'hijau' : 'lav') + '">' + esc(u.Status) + '</span>'; } },
            { k: 'kelas', judul: 'Kelas Diampu', urut: false, html: function (u) { return u.kelas.length ? u.kelas.map(function (k) { return '<span class="tag">' + esc(k) + '</span>'; }).join('') : '<span class="redup kecil">—</span>'; } },
            { k: 'NoWA', judul: 'WhatsApp', html: function (u) { return esc(u.NoWA || '—'); } },
            { k: 'LoginTerakhir', judul: 'Login Terakhir', urut: function (u) { return new Date(u.LoginTerakhir).getTime() || 0; }, html: function (u) { return u.LoginTerakhir ? '<span class="kecil">' + esc(PC.relatif(u.LoginTerakhir)) + '</span>' : '<span class="redup kecil">Belum pernah</span>'; } },
            { judul: 'Aksi', kelas: 'kanan', html: function (u) { return '<div class="aksi-baris"><button class="btn hantu btn-ikon kecil" data-ubah="' + esc(u.Email) + '" aria-label="Ubah ' + esc(u.Nama) + '" title="Ubah">' + ik('edit') + '</button>' + (u.Email !== A.boot.me.email ? '<button class="btn hantu btn-ikon kecil" data-hapus="' + esc(u.Email) + '" aria-label="Hapus ' + esc(u.Nama) + '" title="Hapus">' + ik('person_remove') + '</button>' : '') + '</div>'; } }
          ] });
        tbl.set(d.rows);
      }, { galat: function (r) { A.kartuGalat($('#pTabel', el), r, muat); } });
    };
    muat();
    el.onclick = async function (e) {
      const t = e.target.closest('[data-p],[data-ubah],[data-hapus]'); if (!t || !data) return;
      if (t.dataset.hapus) {
        const ya = await PC.konfirmasi('Akun ' + t.dataset.hapus + ' dihapus dan semua sesinya berakhir. Kelas yang diampu perlu diberi guru baru.', { judul: 'Hapus pengguna?', ya: 'Hapus', bahaya: true, ikon: 'person_remove' });
        if (ya && (await A.tulis('pengguna.hapus', { email: t.dataset.hapus })).success) muat();
        return;
      }
      const u = t.dataset.ubah ? data.rows.filter(function (x) { return x.Email === t.dataset.ubah; })[0] : null;
      A.modalForm({ judul: u ? 'Ubah Pengguna' : 'Tambah Pengguna', ikon: 'manage_accounts',
        atas: u ? '' : '<div class="catatan-info">' + ik('info', 'isi') + '<span>Gunakan alamat <b>akun Google</b> (Gmail atau Google Workspace sekolah). Pengguna baru mendapat email undangan bila email aktif.</span></div>',
        nilai: u || { Peran: 'guru', Status: 'aktif' },
        fields: [
          { k: 'Email', label: 'Email Google', jenis: 'email', wajib: true, ro: !!u, penuh: true },
          { k: 'Nama', label: 'Nama lengkap', maks: 80, ph: 'Ibu Dewi Sartika, S.Pd.' },
          { k: 'NoWA', label: 'No. WhatsApp', jenis: 'tel', ph: '08…' },
          { k: 'Peran', label: 'Peran', jenis: 'pilih', opsi: [['guru', 'Guru'], ['admin', 'Admin Sekolah'], ['superadmin', 'Superadmin (maks. 2)']] },
          { k: 'Status', label: 'Status', jenis: 'pilih', opsi: [['aktif', 'Aktif'], ['nonaktif', 'Nonaktif']] }
        ],
        simpan: async function (d) {
          const r = await A.tulis('pengguna.simpan', { pengguna: d });
          if (!r.success) return false;
          muat();
          if (d.Email === A.boot.me.email) A.segarkanBoot();
        } });
    };
  } };

  /* =================================================================
   * PENGATURAN
   * ================================================================= */
  const GRUP_SET = [
    ['Identitas Sekolah', 'school', ['NAMA_SEKOLAH', 'NAMA_APP', 'SLOGAN', 'SEMESTER', 'TAHUN_AJARAN', 'LOGO_URL']],
    ['Aturan Permainan', 'sports_esports', ['JUMLAH_SOAL', 'NYAWA', 'BATCH_JAWAB', 'POIN_MUDAH', 'POIN_SEDANG', 'POIN_SULIT', 'BONUS_BINTANG_XP', 'SUARA_AKTIF']],
    ['Bintang & Buka Level', 'star', ['BINTANG_3_MIN', 'BINTANG_2_MIN', 'BINTANG_1_MIN', 'BUKA_SEDANG_BINTANG', 'BUKA_SULIT_BINTANG']],
    ['Level & Misi Harian', 'military_tech', ['LEVEL_XP', 'LEVEL_NAMA', 'MISI_KUIS', 'MISI_BINTANG', 'MISI_MENIT', 'MISI_XP', 'PETI_XP']],
    ['Kelas, Guru & Peringkat', 'groups', ['PERINGKAT_AKTIF', 'PERINGKAT_TAMPIL', 'GURU_RESET_PIN', 'APRESIASI_BINTANG', 'PASIF_HARI', 'SESI_SISWA_HARI']],
    ['Rapor Mingguan ke Wali', 'event', ['RAPOR_HARI', 'RAPOR_JAM']]
  ];
  A.hal.pengaturan = { render: function (el) {
    el.innerHTML = A.kerangka([200, 300, 300]);
    A.swr('pengaturan.get', {}, function (d) {
      const peta = {}; d.rows.forEach(function (r) { peta[r.kunci] = r; });
      const dipakai = {};
      const medan = function (k) {
        const r = peta[k]; if (!r) return '';
        dipakai[k] = 1;
        const nilai = r.nilai === undefined || r.nilai === null ? '' : String(r.nilai);
        if (/_AKTIF$|^GURU_RESET_PIN$/.test(k)) return '<div class="medan"><label class="saklar"><input type="checkbox" data-set="' + k + '" data-awal="' + esc(nilai) + '"' + (nilai === 'YA' ? ' checked' : '') + '><i></i><span>' + esc(r.ket) + '</span></label><small class="mono">' + k + '</small></div>';
        const panjang = /LEVEL_NAMA|LEVEL_XP|LOGO_URL/.test(k);
        return '<label class="medan' + (panjang ? ' penuh' : '') + '"><span>' + esc(r.ket) + '</span>' + (k === 'LEVEL_NAMA' ? '<textarea class="isian" rows="2" data-set="' + k + '" data-awal="' + esc(nilai) + '">' + esc(nilai) + '</textarea>' : '<input class="isian" data-set="' + k + '" data-awal="' + esc(nilai) + '" value="' + esc(nilai) + '" placeholder="' + esc(r.bawaan) + '">') + '<small class="mono">' + k + ' · bawaan: ' + esc(String(r.bawaan).slice(0, 60) || '—') + '</small></label>';
      };
      el.innerHTML = '<div class="kepala-hal"><div><h1>Pengaturan</h1><p>Nilai disimpan di sheet <b>Pengaturan</b> (bukan rahasia). Token & kredensial ada di menu Keamanan dan tersimpan di Script Properties.</p></div><div class="aksi"><button class="btn biru" id="setSimpan">' + ik('save') + 'Simpan Perubahan</button></div></div>' +
        GRUP_SET.map(function (g) { return '<section class="kartu"><div class="judul-kartu"><h2>' + ik(g[1]) + esc(g[0]) + '</h2></div><div class="grid-form">' + g[2].map(medan).join('') + '</div></section>'; }).join('') +
        (function () { const sisa = d.rows.filter(function (r) { return !dipakai[r.kunci]; }); return sisa.length ? '<section class="kartu"><div class="judul-kartu"><h2>' + ik('tune') + 'Lainnya</h2></div><div class="grid-form">' + sisa.map(function (r) { return medan(r.kunci); }).join('') + '</div></section>' : ''; })() +
        '<div class="catatan-info">' + ik('info', 'isi') + '<span>Pengaturan notifikasi WhatsApp/Email ada di menu <a href="#/wa">WhatsApp &amp; Notifikasi → Konfigurasi</a>.</span></div>';
      $('#setSimpan', el).onclick = async function () {
        const kv = {};
        $$('[data-set]', el).forEach(function (i) { const v = i.type === 'checkbox' ? (i.checked ? 'YA' : 'TIDAK') : i.value.trim(); if (v !== i.dataset.awal) kv[i.dataset.set] = v; });
        if (!Object.keys(kv).length) { PC.toast('Belum ada perubahan.', 'info'); return; }
        const r = await A.tulis('pengaturan.simpan', { kv: kv }, { btn: this, memuat: 'Menyimpan…' });
        if (r.success) { await A.segarkanBoot(); A.rute(true); }
      };
    }, { galat: function (r) { A.kartuGalat(el, r, function () { A.rute(true); }); } });
  } };

  /* =================================================================
   * KEAMANAN & PERFORMA
   * ================================================================= */
  A.hal.keamanan = { render: function (el) {
    el.innerHTML = A.kerangka([160, 260, 260]);
    A.swr('keamanan.status', {}, function (s) {
      const p = s.performa, dm = s.dummy;
      const totalDummy = dm.Kelas + dm.Siswa + dm.Sesi + dm.Catatan + dm.Pengguna;
      el.innerHTML = '<div class="kepala-hal"><div><h1>Keamanan &amp; Performa</h1><p>Semua rahasia — token Fonnte, Google Client ID, secret sesi, pepper PIN, kredensial darurat, PIN Superadmin — tersimpan di <b>Script Properties</b>, tidak di kode, Sheets, atau browser.</p></div><span class="pil lav">Versi ' + esc(s.versi) + '</span></div>' +
        (A.boot.me.darurat ? '<div class="catatan-info kuning">' + ik('emergency', 'isi') + '<span>Anda masuk dengan <b>akses darurat</b>. Selesaikan perbaikan (mis. isi Google Client ID), lalu keluar dan masuk normal dengan Google + PIN.</span></div>' : '') +
        '<div class="grid-2a">' +
        // Google Client ID
        '<section class="kartu kolom" style="gap:12px"><div class="judul-kartu" style="margin:0"><h2>' + ik('login') + 'Login Google</h2><span class="pil ' + (s.googleClientId ? 'hijau' : 'oranye') + '">' + (s.googleClientId ? 'Aktif' : 'Belum diatur') + '</span></div>' +
        '<label class="medan"><span>OAuth Client ID (Web)</span><input class="isian mono" id="kCid" value="' + esc(s.googleClientId || '') + '" placeholder="123…apps.googleusercontent.com"><small>Buat di Google Cloud Console → APIs &amp; Services → Credentials → OAuth client ID (Web). Tambahkan origin GitHub Pages Anda di <i>Authorized JavaScript origins</i>.</small></label>' +
        '<div class="flex g8"><button class="btn biru kecil" id="kCidSimpan">' + ik('save', 's18') + 'Simpan Client ID</button></div></section>' +
        // Superadmin
        '<section class="kartu kolom" style="gap:12px"><div class="judul-kartu" style="margin:0"><h2>' + ik('shield_person') + 'Superadmin (' + s.superadmin.length + '/2)</h2></div>' +
        s.superadmin.map(function (u) { return '<div class="flex antara tengah kartu lav" style="padding:12px 14px"><div><b>' + esc(u.nama) + '</b><div class="kecil redup">' + esc(u.email) + '</div></div><span class="pil ' + (u.pin ? 'hijau' : 'oranye') + '">' + (u.pin ? 'PIN aktif' : 'PIN dibuat saat login pertama') + '</span></div>'; }).join('') +
        '<p class="kecil redup">PIN lupa? Superadmin lain atau pemilik skrip menjalankan <code>resetPinSuperadmin("email")</code> di editor Apps Script.</p>' + (s.pinSaya !== null ? '<button class="btn putih kecil" id="kGantiPin" style="align-self:flex-start">' + ik('pin', 's18') + 'Ganti PIN saya</button>' : '') + '</section>' +
        // Darurat
        '<section class="kartu kolom" style="gap:12px"><div class="judul-kartu" style="margin:0"><h2>' + ik('emergency') + 'Akses Darurat</h2><span class="pil ' + (s.darurat.terkunci ? 'merah' : 'lav') + '">' + (s.darurat.terkunci ? 'Terkunci sementara' : 'Pengguna: ' + esc(s.darurat.user || '—')) + '</span></div>' +
        '<p class="kecil">Halaman tersembunyi <b>admin.html#darurat</b>. Kata sandi tersimpan sebagai hash + salt. 5× salah → dikunci 15 menit. Ganti segera setelah dipakai.</p>' +
        '<div class="grid-form"><label class="medan"><span>Nama pengguna baru</span><input class="isian" id="dUserBaru" autocomplete="off" value="' + esc(s.darurat.user || '') + '"></label><label class="medan"><span>Kata sandi baru (≥12, huruf+angka)</span><input class="isian" id="dPassBaru" type="password" autocomplete="new-password"></label></div>' +
        '<div class="flex g8 bungkus"><button class="btn putih kecil" id="dAcak">' + ik('casino', 's18') + 'Buat sandi acak</button><button class="btn oranye kecil" id="dRotasi">' + ik('autorenew', 's18') + 'Ganti kredensial darurat</button></div></section>' +
        // Fonnte
        '<section class="kartu kolom" style="gap:12px"><div class="judul-kartu" style="margin:0"><h2>' + ik('key') + 'Token Fonnte</h2><span class="pil ' + (s.fonnte.ada ? 'hijau' : 'lav') + '">' + (s.fonnte.ada ? esc(s.fonnte.samar) : 'Belum diisi') + '</span></div>' +
        '<label class="medan"><span>Token baru</span><input class="isian" id="fToken" type="password" autocomplete="off" placeholder="Tempel token dari dashboard Fonnte"></label>' +
        '<div class="flex g8 bungkus"><button class="btn biru kecil" id="fSimpan">' + ik('save', 's18') + 'Simpan token</button>' + (s.fonnte.ada ? '<button class="btn hantu kecil" id="fHapus">' + ik('delete', 's18') + 'Hapus token</button>' : '') + '</div><small class="redup">Rotasi token: buat token baru di Fonnte → simpan di sini → token lama otomatis tidak dipakai lagi.</small></section>' +
        '</div>' +
        // Performa
        '<section class="kartu"><div class="judul-kartu"><div><h2>' + ik('speed') + 'Performa &amp; Kuota</h2><p>Keep-warm menjaga server tetap siap sehingga siswa tidak menunggu "cold start". Data cache dihangatkan tiap menit oleh pemicu.</p></div><button class="btn putih kecil" id="pSegar">' + ik('refresh', 's18') + 'Segarkan</button></div>' +
        '<div class="ubin-adm"><div><span>Pemicu tiap menit</span><b>' + (p.trigger ? '✓ Aktif' : '✗ Mati') + '</b></div><div><span>Keep-warm</span><b>' + (p.keepWarm ? 'Nyala' : 'Mati') + '</b></div><div><span>Warmup terakhir</span><b style="font-size:15px">' + (p.warmTerakhir && p.warmTerakhir.at ? esc(PC.relatif(p.warmTerakhir.at)) : '—') + '</b></div>' +
        '<div><span>Cache pengaturan</span><b style="font-size:15px">' + esc(p.cache.pengaturan) + '</b></div><div><span>Cache indeks siswa</span><b style="font-size:15px">' + esc(p.cache.indeksSiswa) + '</b></div><div><span>Script Properties</span><b style="font-size:15px">' + PC.angka(p.ukuranProperti) + ' B (' + p.persenProperti + '%)</b></div></div>' +
        '<div class="flex g10 bungkus" style="margin-top:14px"><label class="saklar"><input type="checkbox" id="pWarm"' + (p.keepWarm ? ' checked' : '') + '><i></i><span>Keep-warm aktif</span></label><button class="btn hantu kecil" id="pBersih">' + ik('cleaning_services', 's18') + 'Bersihkan cache server</button><button class="btn hantu kecil" id="pUkur">' + ik('timer', 's18') + 'Ukur kecepatan perangkat ini</button></div><div id="pHasil"></div>' +
        '<div class="catatan-info" style="margin-top:14px">' + ik('info', 'isi') + '<span>Kuota Apps Script akun gratis ±90 menit pemicu/hari; keep-warm + antrean memakai ±1 eksekusi singkat per menit. Bila kuota mepet, matikan keep-warm di luar jam sekolah.</span></div></section>' +
        // Data contoh & riwayat
        '<div class="grid-2a"><section class="kartu kolom" style="gap:12px"><div class="judul-kartu" style="margin:0"><h2>' + ik('science') + 'Data Contoh</h2><span class="pil ' + (totalDummy ? 'kuning' : 'lav') + '">' + (totalDummy ? 'Ada data contoh' : 'Bersih') + '</span></div>' +
        '<p class="kecil">Kelas ' + dm.Kelas + ' · siswa ' + dm.Siswa + ' · sesi ' + dm.Sesi + ' · catatan ' + dm.Catatan + ' · guru ' + dm.Pengguna + ' · soal contoh ' + dm.SoalContoh + '. Semua ber-ID <code>DMY-</code> / <code>CTH-</code>.</p>' +
        '<div class="flex g8 bungkus"><button class="btn merah kecil" id="dmHapus"' + (totalDummy ? '' : ' disabled') + '>' + ik('delete_sweep', 's18') + 'Hapus data contoh</button><button class="btn hantu kecil" id="dmHapusSoal"' + (dm.SoalContoh ? '' : ' disabled') + '>' + ik('delete', 's18') + 'Hapus juga soal contoh</button><button class="btn putih kecil" id="dmIsi">' + ik('add_circle', 's18') + 'Isi ulang data contoh</button></div></section>' +
        '<section class="kartu kolom" style="gap:12px"><div class="judul-kartu" style="margin:0"><h2>' + ik('auto_delete') + 'Bersihkan Riwayat Jawaban</h2></div><p class="kecil">Hapus riwayat jawaban & sesi lama agar spreadsheet tetap ringan. Bintang, XP, level, lencana, dan penguasaan topik siswa tetap.</p>' +
        '<div class="grid-form"><label class="medan"><span>Sebelum tanggal</span><input class="isian" type="date" id="rSebelum" value="' + A.tglInput(-365) + '"></label><label class="medan"><span>Kelas (opsional)</span><select class="isian" id="rKelas">' + A.opsiKelas('', { semua: 'Semua kelas', arsip: true }) + '</select></label></div>' +
        '<button class="btn oranye kecil" id="rHapus" style="align-self:flex-start">' + ik('auto_delete', 's18') + 'Hapus riwayat</button></section></div>';
      const bind = function (sel, fn) { const b = $(sel, el); if (b) b.onclick = fn; };
      bind('#kCidSimpan', async function () { const r = await A.tulis('rahasia.simpan', { kunci: 'GOOGLE_CLIENT_ID', nilai: $('#kCid', el).value.trim() }, { btn: this }); if (r.success) { PC.simpan.del('pc_cfg'); A.rute(true); } });
      bind('#kGantiPin', function () { const b = document.querySelector('[data-m="pin"]'); void b; A.modalForm({ judul: 'Ganti PIN Superadmin', ikon: 'pin', fields: [{ k: 'pinLama', label: 'PIN lama', jenis: 'password', wajib: true, maks: 6, penuh: true }, { k: 'pinBaru', label: 'PIN baru (6 angka)', jenis: 'password', wajib: true, maks: 6 }, { k: 'pinUlang', label: 'Ulangi', jenis: 'password', wajib: true, maks: 6 }], simpan: async function (d) { if (d.pinBaru !== d.pinUlang) { PC.toast('PIN baru tidak sama.', 'galat'); return false; } return (await A.tulis('pin.ganti', { pinLama: d.pinLama, pinBaru: d.pinBaru })).success; } }); });
      bind('#dAcak', function () { const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const a = new Uint32Array(16); crypto.getRandomValues(a); let s2 = ''; a.forEach(function (x) { s2 += c[x % c.length]; }); s2 = s2.slice(0, 14) + '7k'; const i = $('#dPassBaru', el); i.type = 'text'; i.value = s2; i.select(); PC.toast('Catat sandi ini di tempat aman sebelum menyimpan.', 'info', 6000); });
      bind('#dRotasi', async function () {
        const u = $('#dUserBaru', el).value.trim(), pw = $('#dPassBaru', el).value;
        const ya = await PC.konfirmasi('Kredensial darurat lama tidak berlaku lagi dan sesi darurat yang aktif berakhir.', { judul: 'Ganti kredensial darurat?', ya: 'Ganti', ikon: 'autorenew' });
        if (!ya) return;
        const r = await A.tulis('darurat.rotasi', { username: u, password: pw }, { btn: this });
        if (r.success) { $('#dPassBaru', el).value = ''; if (A.boot.me.darurat) A.keluar('Kredensial darurat diganti. Masuk lagi dengan kredensial baru atau Google.'); else A.rute(true); }
      });
      bind('#fSimpan', async function () { const v = $('#fToken', el).value.trim(); if (!v) { PC.toast('Tempel token dulu.', 'info'); return; } const r = await A.tulis('rahasia.simpan', { kunci: 'FONNTE_TOKEN', nilai: v }, { btn: this }); if (r.success) A.rute(true); });
      bind('#fHapus', async function () { const ya = await PC.konfirmasi('Notifikasi WhatsApp berhenti sampai token baru diisi.', { judul: 'Hapus token Fonnte?', ya: 'Hapus', bahaya: true, ikon: 'delete' }); if (ya && (await A.tulis('rahasia.simpan', { kunci: 'FONNTE_TOKEN', nilai: '__HAPUS__' })).success) A.rute(true); });
      bind('#pSegar', function () { A.cache = {}; A.rute(true); });
      bind('#pBersih', async function () { const r = await A.tulis('performa.set', { bersihkanCache: true }, { btn: this }); if (r.success) A.rute(true); });
      bind('#pUkur', async function () {
        const btn = this, selesai = PC.memuatTombol(btn, 'Mengukur…'), hasil = [];
        for (let i = 0; i < 3; i++) { const t0 = performance.now(); const r = await PC.api('auth.me', {}); hasil.push({ total: Math.round(performance.now() - t0), server: r.ms || 0 }); }
        selesai();
        const rata = function (k) { return Math.round(hasil.reduce(function (a, x) { return a + x[k]; }, 0) / hasil.length); };
        $('#pHasil', el).innerHTML = '<div class="catatan-info hijau" style="margin-top:12px">' + ik('timer', 'isi') + '<span>Rata-rata 3 panggilan: <b>' + rata('total') + ' ms</b> total (server ' + rata('server') + ' ms, jaringan ' + (rata('total') - rata('server')) + ' ms). Buka konsol browser lalu jalankan <code>PC.Perf.summary()</code> untuk rincian semua panggilan.</span></div>';
      });
      const w = $('#pWarm', el); if (w) w.onchange = async function () { const r = await A.tulis('performa.set', { keepWarm: w.checked }); if (!r.success) w.checked = !w.checked; };
      bind('#dmHapus', async function () { const ya = await PC.konfirmasi('Kelas, siswa, sesi, catatan, dan guru contoh (DMY-) dihapus. Data asli tidak tersentuh.', { judul: 'Hapus data contoh?', ya: 'Hapus', bahaya: true, ikon: 'delete_sweep' }); if (ya && (await A.tulis('dummy.hapus', { soalContoh: false }, { btn: this })).success) { await A.segarkanBoot(); A.rute(true); } });
      bind('#dmHapusSoal', async function () { const ya = await PC.konfirmasi('Soal contoh (CTH-) dihapus dari bank soal, termasuk data contoh lain. Pastikan bank soal sekolah sudah terisi.', { judul: 'Hapus soal contoh?', ya: 'Hapus', bahaya: true, ikon: 'delete' }); if (ya && (await A.tulis('dummy.hapus', { soalContoh: true }, { btn: this })).success) { await A.segarkanBoot(); A.rute(true); } });
      bind('#dmIsi', async function () { const r = await A.tulis('dummy.isi', {}, { btn: this, memuat: 'Mengisi…' }); if (r.success) { await A.segarkanBoot(); A.rute(true); } });
      bind('#rHapus', async function () {
        const sb = $('#rSebelum', el).value, kl = $('#rKelas', el).value;
        const ya = await PC.konfirmasi('Riwayat jawaban & sesi sebelum ' + PC.tgl(sb) + (kl ? ' untuk Kelas ' + A.namaKelas(kl) : '') + ' dihapus permanen. Laporan untuk periode itu tidak bisa dibuat lagi.', { judul: 'Hapus riwayat?', ya: 'Hapus riwayat', bahaya: true, ikon: 'auto_delete' });
        if (ya) await A.tulis('riwayat.hapus', { sebelum: sb, kelasId: kl }, { btn: this });
      });
    }, { galat: function (r) { A.kartuGalat(el, r, function () { A.rute(true); }); } });
  } };

  /* =================================================================
   * MIGRASI DATA
   * ================================================================= */
  const SHEET_MIG = ['Pengguna', 'Kelas', 'Mapel', 'Karakter', 'Lencana', 'Siswa', 'Soal', 'Progres', 'Penguasaan', 'LencanaSiswa', 'Catatan', 'Sesi', 'Riwayat', 'RekapHarian'];
  const BERAT = { Sesi: 1, Riwayat: 1, RekapHarian: 1 };
  A.hal.migrasi = { render: function (el) {
    el.innerHTML = '<div class="kepala-hal"><div><h1>Migrasi Data</h1><p>Pindahkan data dari spreadsheet aplikasi lama (atau versi sebelumnya) ke aplikasi ini. Spreadsheet lama hanya <b>dibaca</b> — tidak pernah diubah. Aman diulang (upsert berdasarkan ID/email).</p></div></div>' +
      '<div class="grid-3">' + [['1', 'backup', 'Cadangkan', 'File → Buat salinan untuk spreadsheet baru (database aplikasi ini).'], ['2', 'radar', 'Pindai dulu', 'Lihat pemetaan kolom & uji coba tanpa menyimpan.'], ['3', 'sync', 'Jalankan & ulangi', 'Jalankan import; ulangi menjelang pindah (delta) — data tidak ganda.']].map(function (x) {
        return '<div class="kartu lav flex g12"><span class="blok-ikon kecil biru">' + ik(x[1], 'isi') + '</span><div><b>' + x[0] + '. ' + x[2] + '</b><div class="kecil">' + x[3] + '</div></div></div>';
      }).join('') + '</div>' +
      '<section class="kartu kolom" style="gap:14px"><label class="medan"><span>URL atau ID spreadsheet sumber</span><input class="isian mono" id="mSumber" placeholder="https://docs.google.com/spreadsheets/d/…"><small>Akun pemilik skrip harus punya akses baca ke spreadsheet tersebut.</small></label>' +
      '<div class="medan"><span>Sheet yang dimigrasi</span><div class="flex g8 bungkus" id="mSheet">' + SHEET_MIG.map(function (s) { return '<label class="tag" style="padding:6px 12px;cursor:pointer"><input type="checkbox" value="' + s + '"' + (BERAT[s] ? '' : ' checked') + ' style="accent-color:var(--pri)"> ' + s + (BERAT[s] ? ' <span class="redup">(besar)</span>' : '') + '</label>'; }).join('') + '</div><small>Nama sheet & kolom dicocokkan otomatis, termasuk istilah PRD ("ID Siswa", "Token/PIN", "Level Kesulitan", "Pilihan Jawaban", "Kunci Jawaban").</small></div>' +
      '<label class="saklar"><input type="checkbox" id="mTimpa"><i></i><span>Timpa nilai yang sudah ada (default: hanya mengisi kolom yang kosong)</span></label>' +
      '<div class="flex g10 bungkus"><button class="btn biru" id="mPindai">' + ik('radar') + 'Pindai &amp; Uji Coba</button><button class="btn oranye" id="mJalan" disabled>' + ik('play_arrow') + 'Jalankan Import</button></div></section><div id="mHasil"></div>';
    const opsi = function () { return { sumber: $('#mSumber', el).value.trim(), sheets: $$('#mSheet input:checked', el).map(function (c) { return c.value; }), timpa: $('#mTimpa', el).checked }; };
    const tampil = function (d, judul) {
      const lap = d.laporan, pm = d.pemetaan;
      $('#mHasil', el).innerHTML = '<section class="kartu kolom" style="gap:14px"><div class="judul-kartu" style="margin:0"><h2>' + ik(d.dryRun ? 'radar' : 'task_alt') + esc(judul) + '</h2><span class="pil lav">Sumber: ' + esc(d.sumber.nama) + '</span></div>' +
        (d.peringatan.length ? '<div class="catatan-info kuning">' + ik('warning', 'isi') + '<ul style="margin:0;padding-left:18px">' + d.peringatan.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>' : '') +
        '<div class="tabel-wadah"><table class="tabel"><thead><tr><th>Sheet tujuan</th><th>Sheet sumber</th><th class="kanan">Baris</th><th class="kanan">Ditambah</th><th class="kanan">Diperbarui</th><th class="kanan">Dilewati</th><th>Kolom tidak dikenal</th></tr></thead><tbody>' +
        Object.keys(pm).map(function (t) { const r = lap[t] || {}; return '<tr><td><b>' + esc(t) + '</b></td><td>' + esc(pm[t].sheet) + '</td><td class="kanan">' + (r.sumber || 0) + '</td><td class="kanan">' + (r.ditambah || 0) + '</td><td class="kanan">' + (r.diperbarui || 0) + '</td><td class="kanan">' + (r.dilewati || 0) + '</td><td class="kecil redup">' + esc(pm[t].tidakDikenal.join(', ') || '—') + '</td></tr>'; }).join('') +
        '</tbody></table></div><details><summary class="tebal kecil">Rincian pemetaan kolom</summary>' + Object.keys(pm).map(function (t) { return '<div class="kecil" style="margin-top:8px"><b>' + esc(t) + '</b>: ' + Object.keys(pm[t].kolom).map(function (k) { return esc(k) + ' ← <span class="mono">' + esc(pm[t].kolom[k]) + '</span>'; }).join(' · ') + '</div>'; }).join('') + '</details>' +
        '<div class="kecil redup">Sheet di sumber: ' + esc(d.sheetSumber.join(', ')) + '</div>' +
        (d.kartu && d.kartu.length ? '<button class="btn kuning" id="mKartu" style="align-self:flex-start">' + ik('badge') + 'Cetak ' + d.kartu.length + ' kartu PIN baru</button>' : '') + '</section>';
      const kb = $('#mKartu', el); if (kb) kb.onclick = function () { A.cetakKartu(d.kartu, 'Kartu Masuk (hasil migrasi)'); };
    };
    $('#mPindai', el).onclick = async function () {
      const o = opsi(); if (!o.sumber) { PC.toast('Isi URL/ID spreadsheet sumber.', 'info'); return; }
      const s = PC.memuatTombol(this, 'Memindai…'); const r = await PC.api('migrasi.pindai', o); s();
      if (!r.success) { PC.toast(r.message, 'galat'); return; }
      tampil(r.data, 'Hasil uji coba (belum disimpan)');
      $('#mJalan', el).disabled = false;
    };
    $('#mJalan', el).onclick = async function () {
      const o = opsi();
      const ya = await PC.konfirmasi('Data dari "' + o.sumber.slice(0, 60) + '" akan diimpor ke database aplikasi ini.', { judul: 'Jalankan import?', ya: 'Jalankan', ikon: 'play_arrow' });
      if (!ya) return;
      const r = await A.tulis('migrasi.jalankan', o, { btn: this, memuat: 'Mengimpor…' });
      if (!r.success) return;
      tampil(r.data, 'Import selesai');
      A.segarkanBoot();
    };
  } };

  /* =================================================================
   * LOG AKTIVITAS
   * ================================================================= */
  A.hal.log = { render: function (el) {
    el.innerHTML = '<div class="kepala-hal"><div><h1>Log Aktivitas</h1><p>Jejak audit: login, perubahan data, reset PIN, blast, migrasi. Rahasia tidak pernah dicatat.</p></div><div class="aksi"><button class="btn putih" id="logCsv">' + ik('download') + 'Unduh CSV</button></div></div>' +
      '<section class="kartu"><div class="alat" style="margin-bottom:14px"><div class="cari"><span class="ik" aria-hidden="true">search</span><input class="isian" id="logCari" type="search" placeholder="Cari pelaku, aksi, detail…" aria-label="Cari log"></div><select class="isian" id="logAksi" aria-label="Aksi"><option value="">Semua aksi</option></select></div><div id="logTabel">' + A.kerangka([50, 50, 50, 50]) + '</div></section>';
    const F = { cari: '', aksi: '' };
    let data = null, tbl = null;
    const muat = function () {
      A.swr('log.list', Object.assign({}, F), function (d) {
        data = d;
        const sel = $('#logAksi', el);
        if (sel.options.length <= 1) sel.innerHTML = '<option value="">Semua aksi</option>' + d.aksi.map(function (a) { return '<option>' + esc(a) + '</option>'; }).join('');
        if (!tbl) tbl = A.Tabel($('#logTabel', el), { rows: [], id: 'i', per: 50, urut: 'waktu', kosong: 'Belum ada log.',
          kolom: [
            { k: 'waktu', judul: 'Waktu', urut: function (x) { return new Date(x.waktu).getTime() || 0; }, html: function (x) { return '<span class="kecil">' + esc(PC.tgl(x.waktu, true)) + '</span>'; } },
            { k: 'pelaku', judul: 'Pelaku', html: function (x) { return '<b class="kecil">' + esc(x.pelaku) + '</b><div class="kecil redup">' + esc(x.peran || '') + '</div>'; } },
            { k: 'aksi', judul: 'Aksi', html: function (x) { return '<span class="pil ' + (/GAGAL|DITOLAK|DARURAT/.test(x.aksi) ? 'oranye' : /LOGIN/.test(x.aksi) ? 'biru' : 'lav') + '">' + esc(x.aksi) + '</span>'; } },
            { k: 'entitas', judul: 'Entitas', html: function (x) { return '<span class="kecil mono">' + esc(x.entitas || '') + '</span>'; } },
            { k: 'detail', judul: 'Detail', urut: false, html: function (x) { return '<div class="log-detail">' + esc(x.detail || '') + '</div>'; } }
          ] });
        tbl.set(d.rows.map(function (x, i) { return Object.assign({ i: i }, x); }));
      }, { galat: function (r) { A.kartuGalat($('#logTabel', el), r, muat); } });
    };
    $('#logCari', el).oninput = PC.debounce(function () { F.cari = this.value.trim(); muat(); }.bind($('#logCari', el)), 400);
    $('#logAksi', el).onchange = function () { F.aksi = this.value; muat(); };
    $('#logCsv', el).onclick = function () { if (data) A.unduhCsv('log-aktivitas-' + PC.hariIni() + '.csv', data.rows, ['waktu', 'pelaku', 'peran', 'aksi', 'entitas', 'detail']); };
    muat();
  } };
})();
