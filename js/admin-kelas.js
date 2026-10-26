/* =====================================================================
   admin-kelas.js — Data Siswa & Progres · detail/rapor siswa · reset PIN +
   kartu masuk · import siswa · Kelola Kelas · Tingkat Kesulitan · Catatan & Misi
   ===================================================================== */
(function () {
  'use strict';
  const A = window.A, $ = A.$, $$ = A.$$, esc = PC.esc, ik = PC.ik;

  /* =================================================================
   * DATA SISWA & PROGRES
   * ================================================================= */
  A.hal.siswa = { render: function (el) {
    const adm = A.bisa('ADM'), sa = A.bisa('SA');
    const kls = A.kelas ? (A.boot.kelas.filter(function (k) { return k.id === A.kelas; })[0]) : null;
    el.innerHTML = '<div class="kepala-hal"><div><h1>Data Siswa &amp; Progres</h1><p>Kelola akun siswa, pantau kemajuan, reset PIN, dan cetak kartu masuk ber-QR. Data anak disimpan minimal: nama, kelas, hasil belajar, kontak wali.</p></div>' +
      '<div class="aksi">' + (adm ? '<button class="btn oranye" data-s="tambah">' + ik('person_add') + 'Tambah Siswa</button><button class="btn putih" data-s="import">' + ik('upload_file') + 'Import CSV</button>' : '') +
      '<button class="btn putih" data-s="excel">' + ik('download') + 'Unduh Excel</button></div></div>' +
      (kls ? '<div class="kartu lav flex tengah antara bungkus g12"><div class="flex tengah g12"><div class="blok-ikon">' + ik('key', 'isi') + '</div><div><div class="lbl redup">Kode masuk Kelas ' + esc(kls.nama) + '</div><span class="kode-besar">' + esc(kls.kode) + '</span></div></div>' +
        '<div class="flex g8 bungkus"><button class="btn putih kecil" data-s="salinKode">' + ik('content_copy', 's18') + 'Salin kode &amp; tautan</button><button class="btn hantu kecil" data-s="kodeBaru">' + ik('autorenew', 's18') + 'Buat kode baru</button></div></div>' : '') +
      '<section class="kartu"><div class="judul-kartu"><div class="alat"><div class="cari"><span class="ik" aria-hidden="true">search</span><input class="isian" id="sCari" type="search" placeholder="Cari nama siswa atau wali…" aria-label="Cari siswa" value="' + esc(A.cariSiswa || '') + '"></div>' +
      '<select class="isian" id="sStatus" aria-label="Status"><option value="aktif">Siswa aktif</option><option value="nonaktif">Nonaktif</option><option value="">Semua status</option></select>' +
      '<select class="isian" id="sSaring" aria-label="Saring"><option value="">Semua</option><option value="perhatian">Perlu perhatian</option><option value="tanpaWali">Belum ada kontak wali</option><option value="tanpaPin">Belum punya PIN</option></select></div><span class="redup kecil" id="sJumlah"></span></div>' +
      '<div id="sTabel">' + A.kerangka([60, 60, 60, 60]) + '</div></section>';
    A.cariSiswa = '';
    let data = null, tbl = null;
    const saring = function () {
      if (!data) return;
      const q = PC.norm($('#sCari', el).value), st = $('#sStatus', el).value, sr = $('#sSaring', el).value;
      const rows = data.rows.filter(function (s) {
        if (st && s.status !== st) return false;
        if (q && PC.norm([s.nama, s.panggilan, s.NamaWali, s.kelas].join(' ')).indexOf(q) === -1) return false;
        if (sr === 'perhatian') return !!s.perhatian;
        if (sr === 'tanpaWali') return !s.NoWAWali && !s.EmailWali;
        if (sr === 'tanpaPin') return !s.punyaPin;
        return true;
      });
      $('#sJumlah', el).textContent = rows.length + ' dari ' + data.rows.length + ' siswa';
      tbl.set(rows);
    };
    const render = function (d) {
      data = d;
      if (!tbl) {
        tbl = A.Tabel($('#sTabel', el), { rows: [], per: 25, urut: 'nama', arah: 1, arahAwal: { nama: 1, kelas: 1 }, pilih: true, kosong: 'Tidak ada siswa yang cocok.', emojiKosong: '🧒',
          klikBaris: function (id) { A.detailSiswa(id); },
          kolom: [
            { k: 'nama', judul: 'Siswa', html: function (s) { return '<div class="nama-sel"><span class="ava-siswa kecil">' + esc(s.kar || '🙂') + '</span><div><b>' + esc(s.nama) + '</b><small>' + esc(s.panggilan) + ' · Kelas ' + esc(s.kelas) + (s.status !== 'aktif' ? ' · <span style="color:var(--err-ink)">' + esc(s.status) + '</span>' : '') + '</small></div></div>'; } },
            { k: 'xp', judul: 'Level & XP', html: function (s) { return '<span class="pil biru">Lv. ' + s.level + '</span> <b>' + PC.angka(s.xp) + '</b> <span class="kecil redup">XP</span>'; } },
            { k: 'persenPeta', judul: 'Progres Peta', html: function (s) { return '<div class="progres-sel"><div class="baris"><span>' + s.bintangPeta + '/' + s.maksPeta + ' ⭐</span><span>' + s.persenPeta + '%</span></div><div class="progres tipis biru"><i style="width:' + s.persenPeta + '%"></i></div></div>'; } },
            { k: 'rata', judul: 'Rata-rata', html: function (s) { return A.skorPil(s.rata, !s.kuis); } },
            { k: 'kuis', judul: 'Kuis', kelas: 'kanan' },
            { k: 'NamaWali', judul: 'Kontak Wali', html: function (s) {
              if (!s.NoWAWali && !s.EmailWali) return '<span class="pil lav">Belum ada</span>';
              return '<div class="kecil"><b>' + esc(s.NamaWali || 'Wali') + '</b><br>' + (s.NoWAWali ? ik('chat', 's16') + ' ' + esc(s.NoWAWali) + (s.StatusWA === 'Terdaftar' ? ' <span title="Terdaftar di WhatsApp" style="color:var(--ok-ink)">✓</span>' : s.StatusWA === 'Tidak Terdaftar' ? ' <span title="Tidak terdaftar di WhatsApp" style="color:var(--err-ink)">✗</span>' : '') : '') + (s.EmailWali ? ' ' + ik('mail', 's16') : '') + '</div>';
            } },
            { k: 'terakhir', judul: 'Terakhir Main', urut: function (s) { return s.terakhir ? new Date(s.terakhir).getTime() : 0; }, html: function (s) { return s.terakhir ? '<span class="kecil">' + esc(PC.relatif(s.terakhir)) + '</span>' : '<span class="pil oranye">Belum main</span>'; } },
            { judul: 'Aksi', kelas: 'kanan', html: function (s) {
              return '<div class="aksi-baris"><button class="btn hantu btn-ikon kecil" data-lihat="' + esc(s.id) + '" title="Lihat rapor" aria-label="Lihat rapor ' + esc(s.nama) + '">' + ik('visibility') + '</button>' +
                (adm ? '<button class="btn hantu btn-ikon kecil" data-ubah="' + esc(s.id) + '" title="Ubah data" aria-label="Ubah ' + esc(s.nama) + '">' + ik('edit') + '</button>' : '') +
                (d.bolehResetPin ? '<button class="btn hantu btn-ikon kecil" data-pin="' + esc(s.id) + '" title="Reset PIN" aria-label="Reset PIN ' + esc(s.nama) + '">' + ik('password') + '</button>' : '') + '</div>';
            } }
          ],
          bilah: [
            { teks: 'Reset PIN & cetak kartu', ikon: 'badge', kelas: 'kuning', tampil: function () { return data.bolehResetPin; }, aksi: function (ids) { resetPin(ids, function () { tbl.kosongkan(); }); } },
            { teks: 'Kirim catatan', ikon: 'edit_note', kelas: 'putih', aksi: function (ids) {
              const s = data.rows.filter(function (x) { return ids.indexOf(x.id) > -1; });
              const kelas = s.map(function (x) { return x.kelasId; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
              if (kelas.length > 1) { PC.toast('Pilih siswa dari satu kelas saja untuk mengirim catatan.', 'info'); return; }
              A.kirimCatatan({ jenis: 'apresiasi', kelasId: kelas[0], siswaIds: ids });
            } },
            { teks: 'Nonaktifkan', ikon: 'person_off', kelas: 'putih', tampil: function () { return adm; }, aksi: async function (ids) {
              const ya = await PC.konfirmasi(ids.length + ' siswa tidak bisa masuk lagi sampai diaktifkan kembali. Data dan riwayat tetap tersimpan.', { judul: 'Nonaktifkan siswa?', ya: 'Nonaktifkan', bahaya: true, ikon: 'person_off' });
              if (!ya) return;
              const r = await A.tulis('siswa.hapus', { ids: ids });
              if (r.success) { tbl.kosongkan(); muat(); A.segarkanBoot(); }
            } },
            { teks: 'Reset progres', ikon: 'restart_alt', kelas: 'putih', tampil: function () { return sa; }, aksi: async function (ids) {
              const ya = await PC.konfirmasi('XP, bintang, level, progres pulau, penguasaan, dan lencana ' + ids.length + ' siswa akan kembali ke nol. Riwayat jawaban tetap tersimpan. Tidak bisa dibatalkan.', { judul: 'Reset progres?', ya: 'Ya, reset', bahaya: true, ikon: 'restart_alt' });
              if (!ya) return;
              const r = await A.tulis('siswa.resetProgres', { ids: ids });
              if (r.success) { tbl.kosongkan(); muat(); }
            } },
            { teks: 'Hapus permanen', ikon: 'delete_forever', kelas: 'merah', tampil: function () { return sa; }, aksi: async function (ids) {
              const ya = await PC.konfirmasi('Akun ' + ids.length + ' siswa beserta seluruh progres, sesi, dan riwayat jawabannya akan dihapus permanen dari database. Tindakan ini tidak bisa dibatalkan.', { judul: 'Hapus permanen?', ya: 'Hapus permanen', bahaya: true, ikon: 'delete_forever' });
              if (!ya) return;
              const r = await A.tulis('siswa.hapus', { ids: ids, permanen: true });
              if (r.success) { tbl.kosongkan(); muat(); A.segarkanBoot(); }
            } }
          ] });
      }
      saring();
    };
    const muat = function () { A.swr('siswa.list', { kelasId: A.kelas, semua: true }, render, { galat: function (r) { A.kartuGalat($('#sTabel', el), r, muat); } }); };
    muat();
    $('#sCari', el).oninput = PC.debounce(saring, 150);
    $('#sStatus', el).onchange = saring;
    $('#sSaring', el).onchange = saring;
    el.onclick = async function (e) {
      const t = e.target.closest('[data-s],[data-lihat],[data-ubah],[data-pin]');
      if (!t) return;
      if (t.dataset.lihat) A.detailSiswa(t.dataset.lihat);
      else if (t.dataset.ubah) formSiswa(data.rows.filter(function (s) { return s.id === t.dataset.ubah; })[0], muat);
      else if (t.dataset.pin) resetPin([t.dataset.pin], muat);
      else if (t.dataset.s === 'tambah') formSiswa(null, muat);
      else if (t.dataset.s === 'import') importSiswa(muat);
      else if (t.dataset.s === 'excel') {
        if (!data) return;
        A.unduhXlsx('siswa-' + (kls ? kls.nama : 'semua') + '-' + PC.hariIni() + '.xlsx', [{ nama: 'Siswa', rows: data.rows.map(function (s) {
          return { ID: s.id, Nama: s.nama, Panggilan: s.panggilan, Kelas: s.kelas, Status: s.status, Level: s.level, XP: s.xp, Bintang: s.bintang, 'Progres Peta (%)': s.persenPeta, 'Kuis Selesai': s.kuis, 'Rata-rata Skor': s.rata,
            'Terakhir Main': s.terakhir ? PC.tgl(s.terakhir, true) : '', 'Nama Wali': s.NamaWali, 'WA Wali': s.NoWAWali, 'Email Wali': s.EmailWali, Perhatian: s.perhatian ? s.perhatian.judul : '' };
        }) }]);
      } else if (t.dataset.s === 'salinKode') {
        const teks = 'Kode kelas ' + kls.nama + ': ' + kls.kode + '\nBuka ' + A.urlSiswa() + ' lalu masukkan kode kelas, ketuk namamu, dan masukkan PIN.';
        try { await navigator.clipboard.writeText(teks); PC.toast('Kode & tautan disalin.', 'ok'); } catch (x) { PC.toast(teks, 'info', 8000); }
      } else if (t.dataset.s === 'kodeBaru') {
        const ya = await PC.konfirmasi('Kode lama ' + kls.kode + ' tidak berlaku lagi. Siswa yang sudah masuk tetap masuk; siswa baru memakai kode baru.', { judul: 'Buat kode kelas baru?', ya: 'Buat kode baru', ikon: 'autorenew' });
        if (!ya) return;
        const r = await A.tulis('kelas.kodeBaru', { id: kls.id });
        if (r.success) { await A.segarkanBoot(); A.rute(true); }
      }
    };
  } };

  function formSiswa(s, selesai) {
    const baru = !s;
    s = s || { KelasID: A.kelas || ((A.boot.kelas[0] || {}).id) };
    A.modalForm({ judul: baru ? 'Tambah Siswa' : 'Ubah Data Siswa', ikon: baru ? 'person_add' : 'edit', lebar: 'lebar',
      atas: baru ? '<div class="catatan-info">' + ik('info', 'isi') + '<span>PIN 4 angka dibuat otomatis dan ditampilkan <b>sekali</b> setelah disimpan, lengkap dengan kartu masuk ber-QR.</span></div>' : '',
      nilai: { Nama: s.nama, NamaPanggilan: s.panggilan, KelasID: s.kelasId || s.KelasID, NamaWali: s.NamaWali, NoWAWali: s.NoWAWali, EmailWali: s.EmailWali, Status: s.status || 'aktif' },
      fields: [
        { k: 'Nama', label: 'Nama lengkap', wajib: true, maks: 80 },
        { k: 'NamaPanggilan', label: 'Nama panggilan', maks: 24, bantuan: 'Tampil di aplikasi & papan peringkat. Kosong = otomatis.' },
        { k: 'KelasID', label: 'Kelas', jenis: 'pilih', wajib: true, opsiHtml: A.opsiKelas(s.kelasId || s.KelasID) },
        { k: 'Status', label: 'Status', jenis: 'pilih', opsi: [['aktif', 'Aktif'], ['nonaktif', 'Nonaktif']] },
        { k: 'NamaWali', label: 'Nama orang tua/wali', maks: 80 },
        { k: 'NoWAWali', label: 'No. WhatsApp wali', jenis: 'tel', ph: '0812…', bantuan: 'Untuk notifikasi PIN, naik level, rapor mingguan.' },
        { k: 'EmailWali', label: 'Email wali', jenis: 'email', penuh: true }
      ],
      simpan: async function (d) {
        const r = await A.tulis('siswa.simpan', { siswa: Object.assign({ SiswaID: baru ? '' : s.id }, d) }, { diam: baru });
        if (!r.success) return false;
        if (baru && r.data.pin) {
          PC.toast('Siswa ditambahkan.', 'ok');
          setTimeout(function () { A.cetakKartu([{ id: r.data.id, nama: r.data.nama, kelas: r.data.kelas, kode: r.data.kode, pin: r.data.pin, emoji: '🐯' }], 'Kartu Masuk — ' + r.data.nama); }, 200);
        }
        A.segarkanBoot();
        if (selesai) selesai();
      } });
  }

  async function resetPin(ids, selesai) {
    const n = ids.length;
    const m = PC.modal({ judul: 'Reset PIN ' + n + ' siswa', ikon: 'password', isi:
      '<p>PIN baru 4 angka dibuat untuk ' + n + ' siswa. PIN lama langsung tidak berlaku dan siswa perlu masuk ulang.</p>' +
      '<label class="saklar"><input type="checkbox" id="kirimWali"><i></i><span>Kirim PIN baru ke WhatsApp/email wali (bila notifikasi aktif)</span></label>',
      tombol: [{ teks: 'Batal' }, { teks: 'Reset PIN', kelas: 'oranye', ikon: 'password', aksi: async function (tutup, tirai) {
        const r = await A.tulis('siswa.resetPin', { ids: ids, kirimWali: $('#kirimWali', tirai).checked }, { diam: true });
        if (!r.success) return false;
        PC.toast('PIN baru dibuat untuk ' + r.data.kartu.length + ' siswa.', 'ok');
        setTimeout(function () { A.cetakKartu(r.data.kartu, 'Kartu Masuk (PIN baru)'); }, 200);
        if (selesai) selesai();
      } }] });
    void m;
  }

  function importSiswa(selesai) {
    let rows = null;
    PC.modal({ judul: 'Import Siswa dari CSV', ikon: 'upload_file', lebar: 'lebar', isi:
      '<ol class="kecil" style="margin:0;padding-left:20px;line-height:1.8"><li>Unduh template, isi di Excel/Google Sheets, simpan sebagai <b>CSV</b>.</li><li>Kolom: <code>nama</code>, <code>panggilan</code>, <code>kelas</code> (nama kelas, mis. 3A), <code>wali</code>, <code>wa</code>, <code>email</code>.</li><li>Periksa hasil <b>uji coba</b>, lalu jalankan. Siswa yang sudah ada (nama + kelas sama) hanya diperbarui kontak walinya.</li></ol>' +
      '<div class="flex g10 bungkus"><button class="btn putih kecil" id="tplSiswa">' + ik('download', 's18') + 'Unduh template</button><button class="btn biru kecil" id="pilihCsv">' + ik('attach_file', 's18') + 'Pilih berkas CSV</button><span class="kecil redup" id="namaCsv"></span></div>' +
      '<label class="saklar"><input type="checkbox" id="buatKelas"><i></i><span>Buat kelas baru otomatis bila belum ada</span></label><div id="hasilImport"></div>',
      tombol: [{ teks: 'Tutup' }, { teks: 'Jalankan Import', kelas: 'oranye', ikon: 'play_arrow', aksi: async function (tutup, tirai) {
        if (!rows) { PC.toast('Pilih berkas CSV dulu.', 'info'); return false; }
        const r = await A.tulis('siswa.import', { rows: rows, dryRun: false, buatKelas: $('#buatKelas', tirai).checked });
        if (!r.success) return false;
        if (selesai) selesai();
        A.segarkanBoot();
        if (r.data.kartu && r.data.kartu.length) setTimeout(function () { A.cetakKartu(r.data.kartu, 'Kartu Masuk Siswa Baru (' + r.data.kartu.length + ')'); }, 200);
      } }],
      saatBuka: function (t) {
        $('#tplSiswa', t).onclick = function () { A.unduhCsv('template-siswa.csv', [{ nama: 'Aisyah Putri', panggilan: 'Aisyah', kelas: '3A', wali: 'Ibu Rina', wa: '081234567890', email: '' }], ['nama', 'panggilan', 'kelas', 'wali', 'wa', 'email']); };
        const uji = async function () {
          if (!rows) return;
          $('#hasilImport', t).innerHTML = '<div class="memuat"><div class="putar"></div></div>';
          const r = await PC.api('siswa.import', { rows: rows, dryRun: true, buatKelas: $('#buatKelas', t).checked });
          $('#hasilImport', t).innerHTML = r.success ? laporanImport(r.data, 'Uji coba (belum disimpan)') : '<div class="catatan-info merah">' + ik('error', 'isi') + esc(r.message) + '</div>';
        };
        $('#buatKelas', t).onchange = uji;
        $('#pilihCsv', t).onclick = async function () {
          const f = await PC.pilihBerkas('.csv,text/csv');
          if (!f) return;
          $('#namaCsv', t).textContent = f.name;
          rows = PC.bacaCsv(await PC.bacaBerkas(f));
          if (!rows.length) { PC.toast('Berkas kosong atau format tidak dikenali.', 'galat'); rows = null; return; }
          uji();
        };
      } });
  }
  function laporanImport(d, judul) {
    return '<div class="kartu lav kolom g8"><b>' + esc(judul) + '</b><div class="flex g8 bungkus">' +
      '<span class="pil hijau">+' + (d.ditambah || 0) + ' ditambah</span><span class="pil biru">' + (d.diperbarui || 0) + ' diperbarui</span><span class="pil lav">' + (d.dilewati || 0) + ' dilewati</span>' +
      (d.kelasBaru && d.kelasBaru.length ? '<span class="pil kuning">Kelas baru: ' + esc(d.kelasBaru.join(', ')) + '</span>' : '') + '</div>' +
      (d.galat && d.galat.length ? '<details><summary class="kecil tebal">' + d.galat.length + ' catatan</summary><ul class="kecil">' + d.galat.slice(0, 50).map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul></details>' : '') + '</div>';
  }
  A.laporanImport = laporanImport;

  /* ---------- detail siswa (laci) ---------- */
  A.detailSiswa = function (id) {
    const l = A.laci({ judul: 'Rapor Petualang', ikon: 'assignment_ind' });
    PC.api('siswa.detail', { id: id }).then(function (r) {
      if (!l.el.isConnected) return;
      if (!r.success) { l.isi.innerHTML = '<div class="catatan-info merah">' + ik('error', 'isi') + esc(r.message) + '</div>'; return; }
      const d = r.data, p = d.profil, st = d.stat;
      const levelBar = function (w) { return w.levels.map(function (x) { return '<span class="pil ' + (x.terbuka ? 'putih' : 'lav') + '" title="' + esc(x.level) + (x.terbuka ? '' : ' (terkunci)') + '">' + esc(x.level) + ' ' + '★'.repeat(x.bintang) + '☆'.repeat(3 - x.bintang) + '</span>'; }).join(' '); };
      l.isi.innerHTML =
        '<div class="flex tengah g16"><span class="ava-siswa" style="width:64px;height:64px;font-size:34px">' + esc(p.karakter.emoji) + '</span><div class="isi1"><h2 class="t-md">' + esc(p.nama) + '</h2><div class="redup kecil">' + esc(p.panggilan) + ' · Kelas ' + esc(p.kelas) + ' · ' + esc(p.karakter.nama) + '</div>' +
        '<span class="pil biru" style="margin-top:6px">Level ' + st.level + ' · ' + esc(st.levelInfo.nama) + '</span></div></div>' +
        '<div class="flex g8 bungkus"><button class="btn kecil kuning" data-d="apresiasi">' + ik('star', 'isi s18') + 'Beri Bintang</button><button class="btn kecil biru" data-d="misi">' + ik('send_time_extension', 's18') + 'Kirim Misi</button><button class="btn kecil putih" data-d="pengingat">' + ik('notifications_active', 's18') + 'Pengingat</button>' +
        (A.bisa('ADM') || A.boot.setting.GURU_RESET_PIN === 'YA' ? '<button class="btn kecil hantu" data-d="pin">' + ik('password', 's18') + 'Reset PIN</button>' : '') + '</div>' +
        '<div class="ubin-adm"><div><span>XP</span><b>' + PC.angka(st.xp) + '</b></div><div><span>Bintang</span><b>' + PC.angka(st.bintang) + '</b></div><div><span>Kuis selesai</span><b>' + st.kuis + '</b></div><div><span>Rata-rata skor</span><b>' + st.rataSkor + '</b></div><div><span>Nilai sempurna</span><b>' + st.sempurna + '</b></div><div><span>Berturut-turut</span><b>' + st.streak + ' hari</b></div></div>' +
        '<section class="kolom g10"><h3 class="t-sm">Kemajuan per Pulau</h3>' + d.dunia.filter(function (w) { return w.status === 'aktif'; }).map(function (w) { return '<div class="kartu lav kolom g6" style="padding:14px"><div class="flex antara tengah"><b>' + esc(w.dunia) + ' <span class="redup kecil">· ' + esc(w.nama) + '</span></b><span class="tebal">' + w.bintang + '/9 ⭐</span></div><div class="flex g6 bungkus">' + levelBar(w) + '</div></div>'; }).join('') + '</section>' +
        '<section class="kolom g10"><h3 class="t-sm">Penguasaan Topik</h3>' + (d.topik.length ? d.topik.map(function (t) { return '<div class="topik-item"><div class="baris"><span>' + esc(t.topik) + ' <small>· ' + esc(t.mapel) + ' · ' + t.benar + '/' + t.total + '</small></span><span>' + t.persen + '% <small>' + A.labelTopik(t.persen) + '</small></span></div><div class="progres tipis ' + A.warnaTopik(t.persen) + '"><i style="width:' + t.persen + '%"></i></div></div>'; }).join('') : '<p class="redup kecil">Belum ada jawaban.</p>') + '</section>' +
        '<section class="kolom g10"><h3 class="t-sm">Riwayat Kuis</h3>' + (d.sesi.length ? '<div class="tabel-wadah"><table class="tabel"><thead><tr><th>Waktu</th><th>Pulau</th><th>Level</th><th class="kanan">Skor</th><th>Bintang</th><th class="kanan">Menit</th></tr></thead><tbody>' + d.sesi.map(function (s) {
          return '<tr><td class="kecil">' + esc(PC.tgl(s.waktu, true)) + '</td><td>' + esc(s.mapel) + '</td><td>' + esc(s.level) + '</td><td class="kanan"><b>' + s.skor + '</b></td><td>' + '★'.repeat(s.bintang) + '<span class="redup">' + '☆'.repeat(3 - s.bintang) + '</span>' + (s.status === 'gagal' ? ' <span class="pil oranye">nyawa habis</span>' : '') + '</td><td class="kanan">' + s.menit + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="redup kecil">Belum ada kuis.</p>') + '</section>' +
        '<section class="kolom g8"><h3 class="t-sm">Lencana (' + d.lencana.length + ')</h3><div>' + (d.lencana.length ? d.lencana.map(function (x) { const c = PC.warna(x.warna); return '<span class="lencana-mini"><span class="ik isi" style="background:' + c.s + ';color:' + c.i + '">' + esc(x.ikon) + '</span>' + esc(x.nama) + '</span>'; }).join('') : '<span class="redup kecil">Belum ada lencana.</span>') + '</div></section>' +
        '<section class="kolom g8"><h3 class="t-sm">Catatan Guru</h3>' + (d.catatan.length ? d.catatan.map(function (c) { return '<div class="garis-waktu"><div class="item">' + ik({ apresiasi: 'star', misi: 'flag', pengingat: 'alarm' }[c.jenis] || 'chat') + '<div class="isi1"><b>' + esc(c.dari) + '</b> <span class="redup kecil">· ' + esc(PC.relatif(c.tanggal)) + '</span><div>' + esc(c.pesan) + '</div><div class="kecil redup">' + (c.dibaca ? '✓ dibaca' : 'belum dibaca') + (c.disukai ? ' · ❤ disukai' : '') + (c.jenis === 'misi' ? (c.selesai ? ' · misi selesai' : ' · misi berjalan') : '') + '</div></div></div></div>'; }).join('') : '<p class="redup kecil">Belum ada catatan.</p>') + '</section>' +
        '<section class="kolom g6"><h3 class="t-sm">Kontak Wali</h3><dl class="kv"><dt>Nama</dt><dd>' + esc(d.wali.nama || '—') + '</dd><dt>WhatsApp</dt><dd>' + esc(d.wali.wa || '—') + '</dd><dt>Email</dt><dd>' + esc(d.wali.email || '—') + '</dd></dl></section>';
      A.animasi(l.isi);
      l.isi.onclick = function (e) {
        const b = e.target.closest('[data-d]'); if (!b) return;
        if (b.dataset.d === 'pin') { resetPin([id]); return; }
        A.kirimCatatan({ jenis: b.dataset.d, kelasId: (A.boot.kelas.filter(function (k) { return k.nama === p.kelas; })[0] || {}).id, siswaIds: [id], namaSiswa: p.nama });
      };
    });
  };

  /* =================================================================
   * KIRIM CATATAN / APRESIASI / MISI / PENGINGAT
   * ================================================================= */
  const JENIS = {
    apresiasi: ['Bintang Apresiasi', 'star', 'Pujian + bonus bintang untuk siswa. Wali ikut diberi kabar (bila aktif).', ['Hebat! Kamu rajin berlatih minggu ini! 🌟', 'Terima kasih sudah membantu teman belajar 🤝', 'Skormu naik pesat, pertahankan ya! 🚀']],
    misi: ['Misi Penguatan', 'send_time_extension', 'Tugaskan pulau & level tertentu. Tampil di beranda siswa dan otomatis tercentang saat siswa meraih bintang.', ['Ayo latihan lagi di pulau ini sampai dapat 2 bintang ya! 💪', 'Misi kelas pekan ini: taklukkan level Mudah! 🚀']],
    pengingat: ['Pengingat Ceria', 'notifications_active', 'Ajak siswa kembali bermain. Juga dikirim ke WhatsApp/email wali bila notifikasi aktif.', ['Kami rindu petualanganmu! Yuk main 10 menit hari ini 😊', 'Peti harta karun menunggumu, selesaikan misi harian ya! 🎁']],
    catatan: ['Catatan Guru', 'chat', 'Pesan singkat yang muncul di beranda siswa.', ['Semangat belajar ya! 🌈', 'Jangan lupa baca soal dengan teliti 📖']]
  };
  A.kirimCatatan = async function (o) {
    o = o || {};
    let jenis = o.jenis && JENIS[o.jenis] ? o.jenis : 'catatan';
    const kelasAwal = o.kelasId || A.kelas || ((A.boot.kelas.filter(function (k) { return k.status !== 'arsip'; })[0]) || {}).id || '';
    const pilihSiswa = new Set(o.siswaIds || []);
    const m = PC.modal({ judul: 'Kirim ke Siswa', ikon: 'edit_note', lebar: 'lebar', isi:
      '<div class="segmen" role="group" aria-label="Jenis pesan" id="cJenis">' + Object.keys(JENIS).map(function (k) { return '<button type="button" data-j="' + k + '" aria-pressed="' + (k === jenis) + '">' + ik(JENIS[k][1], 's18') + ' ' + esc(JENIS[k][0]) + '</button>'; }).join('') + '</div>' +
      '<div class="catatan-info" id="cKet"></div>' +
      '<div class="grid-form"><label class="medan"><span>Kelas</span><select class="isian" id="cKelas">' + A.opsiKelas(kelasAwal) + '</select></label>' +
      '<label class="medan"><span>Untuk</span><select class="isian" id="cTarget"><option value="kelas">Seluruh kelas</option><option value="siswa"' + (pilihSiswa.size ? ' selected' : '') + '>Siswa tertentu</option></select></label>' +
      '<div class="penuh" id="cDaftar"></div>' +
      '<label class="medan" id="cMapelW"><span>Pulau (mapel)</span><select class="isian" id="cMapel">' + A.opsiMapel(o.mapelId, { aktif: true }) + '</select></label>' +
      '<label class="medan" id="cLevelW"><span>Level</span><select class="isian" id="cLevel"><option value="">Level mana saja</option><option>Mudah</option><option>Sedang</option><option>Sulit</option></select></label>' +
      '<label class="medan penuh"><span>Pesan</span><textarea class="isian" id="cPesan" maxlength="300" rows="3" placeholder="Tulis pesan ceria untuk siswa…"></textarea><small id="cSaran"></small></label></div>',
      tombol: [{ teks: 'Batal' }, { teks: 'Kirim', kelas: 'oranye', ikon: 'send', aksi: async function (tutup, t) {
        const target = $('#cTarget', t).value;
        const ids = target === 'siswa' ? Array.from(pilihSiswa) : [];
        if ((jenis === 'apresiasi' || jenis === 'pengingat') && !ids.length) { PC.toast('Pilih siswa yang dituju.', 'info'); return false; }
        if (target === 'siswa' && !ids.length) { PC.toast('Pilih minimal satu siswa.', 'info'); return false; }
        const r = await A.tulis('catatan.kirim', { jenis: jenis, kelasId: $('#cKelas', t).value, siswaIds: ids, pesan: $('#cPesan', t).value.trim(), mapelId: jenis === 'misi' ? $('#cMapel', t).value : '', level: jenis === 'misi' ? $('#cLevel', t).value : '' });
        if (!r.success) return false;
        if (o.selesai) o.selesai();
        if (location.hash.indexOf('#/catatan') === 0) A.rute(true);
      } }] });
    const t = m.el;
    const atur = function () {
      $$('#cJenis button', t).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.j === jenis)); });
      $('#cKet', t).innerHTML = ik(JENIS[jenis][1], 'isi') + '<span>' + esc(JENIS[jenis][2]) + '</span>';
      $('#cMapelW', t).hidden = $('#cLevelW', t).hidden = jenis !== 'misi';
      if (jenis === 'apresiasi' || jenis === 'pengingat') $('#cTarget', t).value = 'siswa';
      $('#cTarget', t).querySelector('option[value="kelas"]').disabled = jenis === 'apresiasi' || jenis === 'pengingat';
      $('#cSaran', t).innerHTML = 'Ide: ' + JENIS[jenis][3].map(function (s) { return '<button type="button" class="var-chip" data-saran="' + esc(s) + '">' + esc(s) + '</button>'; }).join(' ');
      $('#cPesan', t).placeholder = jenis === 'misi' ? 'Opsional — kosong = pesan misi otomatis' : 'Tulis pesan ceria untuk siswa…';
      daftar();
    };
    let siswaKelas = [];
    const daftar = async function () {
      const w = $('#cDaftar', t);
      if ($('#cTarget', t).value !== 'siswa') { w.innerHTML = ''; return; }
      const kid = $('#cKelas', t).value;
      w.innerHTML = '<div class="memuat" style="padding:14px"><div class="putar"></div></div>';
      const k = 'siswa.list|' + JSON.stringify({ kelasId: kid });
      let rows = A.cache[k] && A.cache[k].rows;
      if (!rows) { const r = await PC.apiQ('siswa.list', { kelasId: kid }); if (!r.success) { w.innerHTML = '<p class="kecil" style="color:var(--err-ink)">' + esc(r.message) + '</p>'; return; } A.cache[k] = r.data; rows = r.data.rows; }
      siswaKelas = rows.filter(function (s) { return s.status === 'aktif'; });
      w.innerHTML = '<div class="flex antara tengah" style="margin-bottom:6px"><span class="medan"><span>Pilih siswa (<span id="cJml">' + pilihSiswa.size + '</span>)</span></span><span class="flex g6"><button type="button" class="btn teks kecil" data-semua="1">Pilih semua</button><button type="button" class="btn teks kecil" data-semua="0">Kosongkan</button></span></div>' +
        '<div class="daftar-cek">' + siswaKelas.map(function (s) { return '<label><input type="checkbox" value="' + esc(s.id) + '"' + (pilihSiswa.has(s.id) ? ' checked' : '') + '><span>' + esc(s.kar || '🙂') + ' ' + esc(s.nama) + '</span>' + (s.perhatian ? '<span class="pil oranye" style="margin-left:auto">' + esc(s.perhatian.judul) + '</span>' : '') + '</label>'; }).join('') + '</div>';
    };
    t.addEventListener('click', function (e) {
      const j = e.target.closest('[data-j]'); if (j) { jenis = j.dataset.j; atur(); return; }
      const sr = e.target.closest('[data-saran]'); if (sr) { $('#cPesan', t).value = sr.dataset.saran; return; }
      const sm = e.target.closest('[data-semua]');
      if (sm) { siswaKelas.forEach(function (s) { if (sm.dataset.semua === '1') pilihSiswa.add(s.id); else pilihSiswa.delete(s.id); }); $$('.daftar-cek input', t).forEach(function (c) { c.checked = sm.dataset.semua === '1'; }); $('#cJml', t).textContent = pilihSiswa.size; }
    });
    t.addEventListener('change', function (e) {
      if (e.target.closest('.daftar-cek')) { if (e.target.checked) pilihSiswa.add(e.target.value); else pilihSiswa.delete(e.target.value); $('#cJml', t).textContent = pilihSiswa.size; }
      else if (e.target.id === 'cKelas') { pilihSiswa.clear(); daftar(); }
      else if (e.target.id === 'cTarget') daftar();
    });
    atur();
  };

  /* =================================================================
   * KELOLA KELAS
   * ================================================================= */
  A.hal.kelas = { render: function (el) {
    el.innerHTML = '<div class="kepala-hal"><div><h1>Kelola Kelas</h1><p>Setiap kelas punya <b>kode masuk</b> sendiri untuk siswa. Tetapkan guru pengampu agar guru hanya melihat data kelasnya.</p></div><div class="aksi"><button class="btn oranye" data-k="tambah">' + ik('add') + 'Tambah Kelas</button></div></div>' +
      '<section class="kartu"><div id="kTabel">' + A.kerangka([60, 60, 60]) + '</div></section>';
    let data = null, tbl = null;
    const muat = function () {
      A.swr('kelas.list', {}, function (d) {
        data = d;
        if (!tbl) tbl = A.Tabel($('#kTabel', el), { rows: [], urut: 'tingkat', arah: 1, arahAwal: { tingkat: 1, nama: 1 }, kosong: 'Belum ada kelas. Tambahkan kelas pertama.', emojiKosong: '🏫',
          kolom: [
            { k: 'nama', judul: 'Kelas', html: function (k) { return '<b>' + esc(k.nama) + '</b>' + (k.julukan ? '<div class="kecil redup">' + esc(k.julukan) + '</div>' : ''); } },
            { k: 'tingkat', judul: 'Tingkat', html: function (k) { return 'Kelas ' + k.tingkat; } },
            { k: 'namaGuru', judul: 'Guru Pengampu', html: function (k) { return k.guru ? esc(k.namaGuru) + '<div class="kecil redup">' + esc(k.guru) + '</div>' : '<span class="pil oranye">Belum ada</span>'; } },
            { k: 'kode', judul: 'Kode Masuk', html: function (k) { return '<span class="kode-besar" style="font-size:16px;padding:4px 10px">' + esc(k.kode) + '</span>'; } },
            { k: 'jumlahSiswa', judul: 'Siswa Aktif', kelas: 'kanan' },
            { k: 'status', judul: 'Status', html: function (k) { return '<span class="pil ' + (k.status === 'aktif' ? 'hijau' : 'lav') + '">' + esc(k.status) + '</span>'; } },
            { judul: 'Aksi', kelas: 'kanan', html: function (k) { return '<div class="aksi-baris"><button class="btn hantu btn-ikon kecil" data-ubah="' + esc(k.id) + '" title="Ubah" aria-label="Ubah kelas ' + esc(k.nama) + '">' + ik('edit') + '</button><button class="btn hantu btn-ikon kecil" data-kode="' + esc(k.id) + '" title="Kode baru" aria-label="Buat kode baru">' + ik('autorenew') + '</button>' + (k.status === 'aktif' ? '<button class="btn hantu btn-ikon kecil" data-arsip="' + esc(k.id) + '" title="Arsipkan" aria-label="Arsipkan kelas">' + ik('inventory_2') + '</button>' : '') + '</div>'; } }
          ] });
        tbl.set(d.rows);
      }, { galat: function (r) { A.kartuGalat($('#kTabel', el), r, muat); } });
    };
    muat();
    el.onclick = async function (e) {
      const t = e.target.closest('[data-k],[data-ubah],[data-kode],[data-arsip]'); if (!t || !data) return;
      if (t.dataset.k === 'tambah' || t.dataset.ubah) {
        const k = t.dataset.ubah ? data.rows.filter(function (x) { return x.id === t.dataset.ubah; })[0] : null;
        A.modalForm({ judul: k ? 'Ubah Kelas ' + k.nama : 'Tambah Kelas', ikon: 'meeting_room',
          nilai: k ? { NamaKelas: k.nama, Tingkat: k.tingkat, Julukan: k.julukan, GuruEmail: k.guru, Status: k.status } : { Tingkat: 3, Status: 'aktif' },
          fields: [
            { k: 'NamaKelas', label: 'Nama kelas', wajib: true, maks: 20, ph: '3A' },
            { k: 'Tingkat', label: 'Tingkat (1–6)', jenis: 'pilih', opsi: [1, 2, 3, 4, 5, 6].map(function (n) { return [n, 'Kelas ' + n]; }), bantuan: 'Menentukan soal & pulau yang sesuai.' },
            { k: 'Julukan', label: 'Julukan kelas', maks: 40, ph: 'Bintang Gemintang', penuh: true },
            { k: 'GuruEmail', label: 'Guru pengampu', jenis: 'pilih', penuh: true, opsi: [['', '— Belum ditentukan —']].concat(data.guru.filter(function (g) { return g.peran === 'guru' || g.peran === 'admin'; }).map(function (g) { return [g.email, g.nama + ' (' + g.email + ')']; })) },
            { k: 'Status', label: 'Status', jenis: 'pilih', opsi: [['aktif', 'Aktif'], ['arsip', 'Arsip']] }
          ],
          simpan: async function (d) {
            const r = await A.tulis('kelas.simpan', { kelas: Object.assign({ KelasID: k ? k.id : '' }, d) });
            if (!r.success) return false;
            await A.segarkanBoot(); muat();
          } });
      } else if (t.dataset.kode) {
        const ya = await PC.konfirmasi('Kode lama tidak berlaku lagi untuk masuk.', { judul: 'Buat kode kelas baru?', ya: 'Buat kode baru', ikon: 'autorenew' });
        if (ya && (await A.tulis('kelas.kodeBaru', { id: t.dataset.kode })).success) { await A.segarkanBoot(); muat(); }
      } else if (t.dataset.arsip) {
        const ya = await PC.konfirmasi('Kelas yang diarsipkan tidak bisa dipakai masuk. Pastikan siswa sudah dipindah/dinonaktifkan.', { judul: 'Arsipkan kelas?', ya: 'Arsipkan', ikon: 'inventory_2', bahaya: true });
        if (ya && (await A.tulis('kelas.hapus', { id: t.dataset.arsip })).success) { await A.segarkanBoot(); muat(); }
      }
    };
  } };

  /* =================================================================
   * TINGKAT KESULITAN
   * ================================================================= */
  A.hal.tingkat = { render: function (el) {
    const kelasAktif = A.boot.kelas.filter(function (k) { return k.status !== 'arsip'; });
    let kid = A.kelas || (kelasAktif[0] || {}).id || '';
    const gambar = function () {
      const k = A.boot.kelas.filter(function (x) { return x.id === kid; })[0];
      if (!k) { el.innerHTML = '<div class="kartu kosong"><div class="emoji">🏫</div><p>Belum ada kelas.</p></div>'; return; }
      const aturan = JSON.parse(JSON.stringify(k.tb || {}));
      const s = A.boot.setting;
      const mapel = A.boot.mapel.filter(function (m) { return m.status === 'aktif' && cocokTingkat(m.kelas, k.tingkat); });
      el.innerHTML = '<div class="kepala-hal"><div><h1>Tingkat Kesulitan</h1><p>Atur level yang boleh dimainkan siswa per pulau. <b>Otomatis</b>: Sedang terbuka setelah ' + esc(s.BUKA_SEDANG_BINTANG || 2) + ' bintang di Mudah, Sulit setelah ' + esc(s.BUKA_SULIT_BINTANG || 2) + ' bintang di Sedang.</p></div>' +
        '<div class="aksi">' + (A.kelas ? '' : '<select class="isian kecil" id="tKelas" aria-label="Kelas">' + A.opsiKelas(kid) + '</select>') + '</div></div>' +
        '<section class="kartu"><div class="judul-kartu"><h2>' + ik('tune') + 'Kelas ' + esc(k.nama) + ' <span class="pil lav">Tingkat ' + k.tingkat + '</span></h2><div class="flex g8"><button class="btn hantu kecil" id="tReset">' + ik('restart_alt', 's18') + 'Semua otomatis</button><button class="btn biru" id="tSimpan">' + ik('save') + 'Simpan</button></div></div>' +
        (mapel.length ? '<div class="tabel-wadah"><table class="tabel matriks-tingkat"><thead><tr><th>Pulau</th><th>Mudah</th><th>Sedang</th><th>Sulit</th></tr></thead><tbody>' + mapel.map(function (m) {
          return '<tr><td><b>' + esc(m.dunia) + '</b><div class="kecil redup">' + esc(m.nama) + '</div></td>' + ['Mudah', 'Sedang', 'Sulit'].map(function (L) {
            const v = (aturan[m.id] && aturan[m.id][L]) || 'auto';
            return '<td><div class="pilih-3" role="group" aria-label="' + esc(m.nama + ' ' + L) + '" data-m="' + esc(m.id) + '" data-l="' + L + '">' +
              [['auto', 'Otomatis', 'auto_mode'], ['buka', 'Buka', 'lock_open'], ['kunci', 'Kunci', 'lock']].map(function (o) { return '<button type="button" data-v="' + o[0] + '" aria-pressed="' + (v === o[0]) + '">' + ik(o[2]) + o[1] + '</button>'; }).join('') + '</div></td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>' : '<div class="kosong"><p>Belum ada pulau aktif untuk tingkat kelas ini.</p></div>') +
        '<div class="catatan-info kuning" style="margin-top:16px">' + ik('lightbulb', 'isi') + '<span><b>Tips:</b> buka level Sedang untuk siswa yang sudah mahir agar tetap tertantang; kunci level Sulit sementara bila kelas masih belajar konsep dasar. Mengunci tidak membatalkan kuis yang sedang dimainkan.</span></div></section>';
      el.querySelectorAll('.pilih-3').forEach(function (g) {
        g.onclick = function (e) {
          const b = e.target.closest('button'); if (!b) return;
          $$('button', g).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          const m = g.dataset.m, L = g.dataset.l;
          aturan[m] = aturan[m] || {};
          if (b.dataset.v === 'auto') delete aturan[m][L]; else aturan[m][L] = b.dataset.v;
        };
      });
      const tk = $('#tKelas', el); if (tk) tk.onchange = function () { kid = tk.value; gambar(); };
      const rs = $('#tReset', el); if (rs) rs.onclick = function () { Object.keys(aturan).forEach(function (x) { delete aturan[x]; }); $$('.pilih-3 button', el).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === 'auto')); }); };
      $('#tSimpan', el).onclick = async function () {
        const r = await A.tulis('kelas.tingkat', { kelasId: kid, aturan: aturan }, { btn: this, memuat: 'Menyimpan…' });
        if (r.success) await A.segarkanBoot();
      };
    };
    gambar();
  } };
  function cocokTingkat(spek, t) {
    spek = String(spek || '').replace(/\s/g, '');
    if (!spek) return true;
    return spek.split(',').some(function (p) { const a = p.split('-').map(Number); return a.length === 2 ? t >= a[0] && t <= a[1] : t === a[0]; });
  }
  A.cocokTingkat = cocokTingkat;

  /* =================================================================
   * CATATAN & MISI
   * ================================================================= */
  A.hal.catatan = { render: function (el) {
    el.innerHTML = '<div class="kepala-hal"><div><h1>Catatan &amp; Misi</h1><p>Pesan guru tampil di beranda siswa. Lihat siapa yang sudah membaca, menyukai, dan menuntaskan misi.</p></div><div class="aksi"><button class="btn oranye" data-c="baru">' + ik('edit_note') + 'Kirim Catatan Baru</button></div></div>' +
      '<section class="kartu"><div class="judul-kartu"><div class="segmen" role="group" aria-label="Saring jenis" id="cSaring"><button data-f="" aria-pressed="true">Semua</button>' + Object.keys(JENIS).map(function (k) { return '<button data-f="' + k + '" aria-pressed="false">' + esc(JENIS[k][0]) + '</button>'; }).join('') + '</div></div><div id="cTabel">' + A.kerangka([60, 60, 60]) + '</div></section>';
    let data = null, tbl = null, f = '';
    const saring = function () { tbl.set(data.rows.filter(function (c) { return !f || c.jenis === f; })); };
    const muat = function () {
      A.swr('catatan.list', { kelasId: A.kelas }, function (d) {
        data = d;
        if (!tbl) tbl = A.Tabel($('#cTabel', el), { rows: [], per: 20, urut: 'tanggal', kosong: 'Belum ada catatan. Kirim apresiasi pertama untuk siswa!', emojiKosong: '💌',
          kolom: [
            { k: 'tanggal', judul: 'Tanggal', urut: function (c) { return new Date(c.tanggal).getTime() || 0; }, html: function (c) { return '<span class="kecil">' + esc(PC.tgl(c.tanggal, true)) + '</span>'; } },
            { k: 'jenis', judul: 'Jenis', html: function (c) { const j = JENIS[c.jenis] || JENIS.catatan; return '<span class="pil ' + ({ apresiasi: 'kuning', misi: 'biru', pengingat: 'oranye' }[c.jenis] || 'lav') + '">' + ik(j[1], 's16') + esc(j[0]) + '</span>' + (c.bonus ? ' <span class="kecil">+' + c.bonus + '⭐</span>' : ''); } },
            { k: 'siswa', judul: 'Untuk', html: function (c) { return '<b>' + esc(c.siswa) + '</b><div class="kecil redup">Kelas ' + esc(c.kelas) + '</div>'; } },
            { k: 'pesan', judul: 'Pesan', urut: false, html: function (c) { return '<div class="log-detail">' + esc(c.pesan) + '</div>'; } },
            { k: 'dibaca', judul: 'Respons', html: function (c) { return '<div class="kecil">👀 ' + c.dibaca + '/' + c.sasaran + ' · ❤ ' + c.disukai + (c.jenis === 'misi' ? ' · 🏁 ' + c.selesai + '/' + c.sasaran : '') + '</div>'; } },
            { k: 'dari', judul: 'Dari' },
            { judul: '', kelas: 'kanan', html: function (c) { return (c.milikSaya || A.bisa('ADM')) ? '<button class="btn hantu btn-ikon kecil" data-hapus="' + esc(c.id) + '" aria-label="Hapus catatan" title="Hapus">' + ik('delete') + '</button>' : ''; } }
          ] });
        saring();
      }, { galat: function (r) { A.kartuGalat($('#cTabel', el), r, muat); } });
    };
    muat();
    el.onclick = async function (e) {
      const t = e.target.closest('[data-c],[data-f],[data-hapus]'); if (!t) return;
      if (t.dataset.c === 'baru') A.kirimCatatan({ kelasId: A.kelas, selesai: muat });
      else if (t.dataset.f !== undefined && t.closest('#cSaring')) { f = t.dataset.f; $$('#cSaring button', el).forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); }); if (data) saring(); }
      else if (t.dataset.hapus) {
        const ya = await PC.konfirmasi('Catatan akan hilang dari beranda siswa.', { judul: 'Hapus catatan?', ya: 'Hapus', bahaya: true, ikon: 'delete' });
        if (ya && (await A.tulis('catatan.hapus', { id: t.dataset.hapus })).success) muat();
      }
    };
  } };
})();
