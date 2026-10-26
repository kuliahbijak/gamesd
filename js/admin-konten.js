/* =====================================================================
   admin-konten.js — Bank Kuis (editor + pratinjau + import CSV) ·
   Pulau & Mapel · Lencana · Karakter · unggah gambar ke Drive
   ===================================================================== */
(function () {
  'use strict';
  const A = window.A, $ = A.$, $$ = A.$$, esc = PC.esc, ik = PC.ik;
  const JENIS = { PG: 'Pilihan ganda', GAMBAR: 'Tebak gambar', PASANGAN: 'Mencocokkan pasangan' };
  const LEVEL = ['Mudah', 'Sedang', 'Sulit'];

  /* ---------- ilustrasi pulau (SVG orisinal, sama dengan aplikasi siswa) ---------- */
  let nIl = 0;
  A.ilus = function (w) {
    if (w.gambar && /^https:\/\//.test(w.gambar)) return '<img src="' + esc(w.gambar) + '" alt="" loading="lazy">';
    const c = PC.warna(w.warna), id = 'ia' + (++nIl);
    return '<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c.b + '"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>' +
      '<rect width="320" height="180" fill="url(#' + id + ')"/><g fill="#fff" opacity=".9"><ellipse cx="60" cy="38" rx="30" ry="10"/><ellipse cx="258" cy="50" rx="26" ry="9"/></g>' +
      '<path d="M70 118 Q160 205 250 118 Z" fill="#9c6a43"/><ellipse cx="160" cy="117" rx="96" ry="25" fill="' + c.a + '"/>' +
      '<circle cx="160" cy="78" r="36" fill="#fff" stroke="' + c.a + '" stroke-width="5"/><text x="160" y="96" text-anchor="middle" font-family="Material Symbols Outlined" font-size="46" fill="' + c.d + '">' + esc(w.ikon || 'explore') + '</text></svg>';
  };

  /** Medan unggah gambar: tombol pilih → kecilkan di browser → gambar.unggah → isi input URL. */
  A.pasangUnggah = function (wadah, namaInput, opsi) {
    opsi = opsi || {};
    const inp = wadah.querySelector('[name="' + namaInput + '"]');
    if (!inp) return;
    const kotak = document.createElement('div');
    kotak.className = 'unggah-gbr';
    kotak.innerHTML = '<span class="mini-gbr"></span><button type="button" class="btn putih kecil">' + ik('upload', 's18') + 'Unggah gambar</button><small class="redup">PNG/JPG/WEBP, otomatis dikecilkan. Tersimpan di folder Drive aplikasi.</small>';
    inp.closest('.medan').appendChild(kotak);
    const mini = kotak.querySelector('.mini-gbr');
    const pratinjau = function () { const v = inp.value.trim(); mini.innerHTML = /^https:\/\//.test(v) ? '<img src="' + esc(v) + '" alt="">' : esc(v || '—'); if (opsi.ubah) opsi.ubah(); };
    inp.addEventListener('input', pratinjau);
    pratinjau();
    kotak.querySelector('button').onclick = async function () {
      const f = await PC.pilihBerkas('image/png,image/jpeg,image/webp,image/gif');
      if (!f) return;
      const btn = this, selesai = PC.memuatTombol(btn, 'Mengunggah…');
      try {
        const g = await PC.kecilkanGambar(f, opsi.maks || 900);
        const r = await PC.api('gambar.unggah', { mime: g.mime, data: g.data, nama: f.name });
        if (!r.success) { PC.toast(r.message, 'galat'); return; }
        inp.value = r.data.url; pratinjau();
        PC.toast(r.message, r.data.publik ? 'ok' : 'info', r.data.publik ? 3000 : 8000);
      } catch (e) { PC.toast(e.message, 'galat'); } finally { selesai(); }
    };
  };

  /* =================================================================
   * BANK KUIS
   * ================================================================= */
  A.hal.soal = { render: function (el) {
    const adm = A.bisa('ADM');
    const F = { mapelId: '', level: '', jenis: '', tingkat: '', status: '', cari: '', hal: 1, per: 50 };
    if (A.kelas) { const k = A.boot.kelas.filter(function (x) { return x.id === A.kelas; })[0]; if (k) F.tingkat = String(k.tingkat); }
    el.innerHTML = '<div class="kepala-hal"><div><h1>Bank Kuis</h1><p>Soal pilihan ganda, tebak gambar, dan mencocokkan pasangan per pulau, level, dan tingkat kelas. Kunci jawaban tidak pernah dikirim ke HP siswa dalam bentuk asli.</p></div>' +
      '<div class="aksi">' + (adm ? '<button class="btn oranye" data-q="tambah">' + ik('add') + 'Tambah Soal</button><button class="btn putih" data-q="import">' + ik('upload_file') + 'Import CSV</button>' : '') + '<button class="btn putih" data-q="unduh">' + ik('download') + 'Unduh Excel</button></div></div>' +
      '<section class="kartu"><div class="alat" style="margin-bottom:14px"><div class="cari"><span class="ik" aria-hidden="true">search</span><input class="isian" id="qCari" type="search" placeholder="Cari pertanyaan/topik…" aria-label="Cari soal"></div>' +
      '<select class="isian" id="qMapel" aria-label="Pulau">' + A.opsiMapel('', { semua: 'Semua pulau' }) + '</select>' +
      '<select class="isian" id="qLevel" aria-label="Level"><option value="">Semua level</option>' + LEVEL.map(function (l) { return '<option>' + l + '</option>'; }).join('') + '</select>' +
      '<select class="isian" id="qJenis" aria-label="Jenis"><option value="">Semua jenis</option>' + Object.keys(JENIS).map(function (j) { return '<option value="' + j + '">' + JENIS[j] + '</option>'; }).join('') + '</select>' +
      '<select class="isian" id="qTingkat" aria-label="Kelas"><option value="">Semua kelas</option>' + [1, 2, 3, 4, 5, 6].map(function (n) { return '<option value="' + n + '"' + (String(n) === F.tingkat ? ' selected' : '') + '>Kelas ' + n + '</option>'; }).join('') + '</select>' +
      '<select class="isian" id="qStatus" aria-label="Status"><option value="">Semua status</option><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select></div>' +
      '<div class="ringkas-pil" id="qRingkas" style="margin-bottom:12px"></div><div id="qTabel">' + A.kerangka([60, 60, 60, 60]) + '</div><div id="qPaging"></div></section>';
    let data = null, tbl = null;
    const muat = function () {
      A.swr('soal.list', Object.assign({}, F), function (d) {
        data = d;
        const r = d.ringkas;
        $('#qRingkas', el).innerHTML = '<span class="pil biru">' + PC.angka(r.total) + ' soal</span>' + LEVEL.map(function (l) { return '<span class="pil lav">' + l + ': ' + (r[l] || 0) + '</span>'; }).join('') + Object.keys(JENIS).map(function (j) { return '<span class="pil putih">' + JENIS[j] + ': ' + (r[j] || 0) + '</span>'; }).join('');
        if (!tbl) tbl = A.Tabel($('#qTabel', el), { rows: [], per: 500, tampilJumlah: false, id: 'SoalID', pilih: adm, kosong: 'Tidak ada soal yang cocok dengan saringan.', emojiKosong: '❓',
          klikBaris: function (id) { const s = tbl.cari(id); if (s) (adm ? editorSoal(s, muat) : pratinjauSoal(s)); },
          kolom: [
            { k: 'Pertanyaan', judul: 'Pertanyaan', html: function (s) { return '<div class="teks-soal"><b>' + (s.Jenis === 'GAMBAR' && s.URLGambar && !/^https/.test(s.URLGambar) ? esc(s.URLGambar) + ' ' : '') + esc(s.Pertanyaan) + '</b><small>' + esc(s.Topik) + ' · ' + esc(s.SoalID) + (s.contoh ? ' · <span class="pil lav" style="padding:1px 6px">contoh</span>' : '') + '</small></div>'; } },
            { k: 'MapelID', judul: 'Pulau', html: function (s) { return esc(A.namaMapel(s.MapelID)); } },
            { k: 'Level', judul: 'Level', html: function (s) { return '<span class="pil ' + ({ Mudah: 'hijau', Sedang: 'kuning', Sulit: 'oranye' }[s.Level] || 'lav') + '">' + esc(s.Level) + '</span>'; } },
            { k: 'Jenis', judul: 'Jenis', html: function (s) { return '<span class="kecil">' + esc(JENIS[s.Jenis] || s.Jenis) + '</span>'; } },
            { k: 'Tingkat', judul: 'Kelas', html: function (s) { return s.Tingkat ? esc(s.Tingkat) : '<span class="redup">Semua</span>'; } },
            { k: 'Poin', judul: 'Poin', kelas: 'kanan', html: function (s) { return s.Poin ? s.Poin : '<span class="redup">auto</span>'; } },
            { k: 'Status', judul: 'Status', html: function (s) { return '<span class="pil ' + (s.Status === 'aktif' ? 'hijau' : 'lav') + '">' + esc(s.Status) + '</span>'; } },
            { judul: '', kelas: 'kanan', html: function (s) { return '<div class="aksi-baris"><button class="btn hantu btn-ikon kecil" data-lihat="' + esc(s.SoalID) + '" title="Pratinjau" aria-label="Pratinjau soal">' + ik('visibility') + '</button>' + (adm ? '<button class="btn hantu btn-ikon kecil" data-ubah="' + esc(s.SoalID) + '" title="Ubah" aria-label="Ubah soal">' + ik('edit') + '</button>' : '') + '</div>'; } }
          ],
          bilah: adm ? [
            { teks: 'Nonaktifkan', ikon: 'visibility_off', aksi: function (ids) { massal(ids, {}); } },
            { teks: 'Aktifkan', ikon: 'visibility', aksi: function (ids) { massal(ids, { aktifkan: true }); } },
            { teks: 'Hapus permanen', ikon: 'delete_forever', kelas: 'merah', aksi: async function (ids) {
              const ya = await PC.konfirmasi(ids.length + ' soal dihapus permanen dari bank soal. Riwayat jawaban siswa tetap tersimpan.', { judul: 'Hapus soal?', ya: 'Hapus permanen', bahaya: true, ikon: 'delete_forever' });
              if (ya) massal(ids, { permanen: true });
            } }
          ] : null });
        tbl.set(d.rows);
        const maks = Math.max(1, Math.ceil(d.total / d.per));
        $('#qPaging', el).innerHTML = '<div class="paging"><span>Halaman ' + d.hal + ' dari ' + maks + ' · ' + PC.angka(d.total) + ' soal</span><div class="tombol"><button class="btn hantu kecil" data-hal="' + (d.hal - 1) + '"' + (d.hal <= 1 ? ' disabled' : '') + '>' + ik('chevron_left') + 'Sebelumnya</button><button class="btn hantu kecil" data-hal="' + (d.hal + 1) + '"' + (d.hal >= maks ? ' disabled' : '') + '>Berikutnya' + ik('chevron_right') + '</button></div></div>';
        A.topikSoal = d.topik;
      }, { galat: function (r) { A.kartuGalat($('#qTabel', el), r, muat); } });
    };
    const massal = async function (ids, o) { const r = await A.tulis('soal.hapus', Object.assign({ ids: ids }, o)); if (r.success) { tbl.kosongkan(); muat(); } };
    const ubahF = function () { F.cari = $('#qCari', el).value.trim(); F.mapelId = $('#qMapel', el).value; F.level = $('#qLevel', el).value; F.jenis = $('#qJenis', el).value; F.tingkat = $('#qTingkat', el).value; F.status = $('#qStatus', el).value; F.hal = 1; muat(); };
    $('#qCari', el).oninput = PC.debounce(ubahF, 350);
    ['#qMapel', '#qLevel', '#qJenis', '#qTingkat', '#qStatus'].forEach(function (s) { $(s, el).onchange = ubahF; });
    muat();
    el.onclick = async function (e) {
      const t = e.target.closest('[data-q],[data-lihat],[data-ubah],#qPaging [data-hal]'); if (!t) return;
      if (t.dataset.hal) { F.hal = Number(t.dataset.hal); muat(); el.scrollIntoView({ block: 'start' }); }
      else if (t.dataset.lihat) pratinjauSoal(tbl.cari(t.dataset.lihat));
      else if (t.dataset.ubah) editorSoal(tbl.cari(t.dataset.ubah), muat);
      else if (t.dataset.q === 'tambah') editorSoal({ MapelID: F.mapelId || ((A.boot.mapel.filter(function (m) { return m.status === 'aktif'; })[0]) || {}).id, Level: F.level || 'Mudah', Jenis: 'PG', Tingkat: F.tingkat, Status: 'aktif' }, muat);
      else if (t.dataset.q === 'import') importSoal(muat);
      else if (t.dataset.q === 'unduh') {
        const selesai = PC.memuatTombol(t, 'Menyiapkan…');
        const semua = [];
        for (let h = 1; h < 100; h++) {
          const r = await PC.api('soal.list', Object.assign({}, F, { hal: h, per: 200 }));
          if (!r.success) { PC.toast(r.message, 'galat'); break; }
          semua.push.apply(semua, r.data.rows);
          if (semua.length >= r.data.total) break;
        }
        selesai();
        A.unduhXlsx('bank-soal-' + PC.hariIni() + '.xlsx', [{ nama: 'Soal', rows: semua.map(function (s) {
          return { mapel: A.namaMapel(s.MapelID), tingkat: s.Tingkat, topik: s.Topik, level: s.Level, jenis: s.Jenis, pertanyaan: s.Pertanyaan, pilihan: s.Pilihan, kunci: s.Kunci, penjelasan: s.Penjelasan, gambar: s.URLGambar, poin: s.Poin || '', status: s.Status, id: s.SoalID };
        }) }]);
      }
    };
  } };

  function pilihanDari(s) { return String(s.Pilihan || '').split(/\s*\|\s*|\n/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function pasanganDari(s) {
    return pilihanDari(s).map(function (x) { const i = x.indexOf('::') > -1 ? x.indexOf('::') : x.indexOf('='); return i < 0 ? null : { l: x.slice(0, i).trim(), r: x.slice(i + (x.indexOf('::') > -1 ? 2 : 1)).trim() }; }).filter(Boolean);
  }
  function kunciTeks(s) {
    const p = pilihanDari(s), k = String(s.Kunci || '').trim();
    if (/^[A-Fa-f]$/.test(k) && p.map(PC.norm).indexOf(PC.norm(k)) === -1) return p['abcdef'.indexOf(k.toLowerCase())] || k;
    return k;
  }
  function htmlPratinjau(s) {
    const gbr = s.URLGambar ? '<div class="gbr">' + (/^https:\/\//.test(s.URLGambar) ? '<img src="' + esc(s.URLGambar) + '" alt="">' : esc(s.URLGambar)) + '</div>' : '';
    let opsi = '';
    if (s.Jenis === 'PASANGAN') opsi = pasanganDari(s).map(function (p) { return '<div class="opsi kunci">' + esc(p.l) + ' <span class="redup">⟷</span> ' + esc(p.r) + '</div>'; }).join('');
    else { const k = PC.norm(kunciTeks(s)); opsi = pilihanDari(s).map(function (p, i) { return '<div class="opsi' + (PC.norm(p) === k ? ' kunci' : '') + '"><i>' + 'ABCDEF'.charAt(i) + '</i>' + esc(p) + (PC.norm(p) === k ? ' <span style="margin-left:auto">' + ik('check_circle', 'isi s18') + '</span>' : '') + '</div>'; }).join(''); }
    return '<div class="pratinjau"><div class="flex g6 bungkus"><span class="pil biru">' + esc(A.namaMapel(s.MapelID)) + '</span><span class="pil lav">' + esc(s.Topik || 'Umum') + '</span><span class="pil kuning">' + esc(s.Level) + '</span></div>' + gbr +
      '<div class="soal">' + esc(s.Pertanyaan || 'Tulis pertanyaan…') + '</div>' + (opsi || '<p class="kecil redup">Pilihan jawaban akan tampil di sini.</p>') +
      (s.Penjelasan ? '<div class="catatan-info hijau">' + ik('lightbulb', 'isi') + '<span>' + esc(s.Penjelasan) + '</span></div>' : '') + '</div>';
  }
  function pratinjauSoal(s) { if (s) PC.modal({ judul: 'Pratinjau Soal', ikon: 'visibility', isi: htmlPratinjau(s) + '<p class="kecil redup">Urutan pilihan diacak saat dimainkan siswa.</p>', tombol: [{ teks: 'Tutup', kelas: 'biru' }] }); }

  function editorSoal(s, selesai) {
    const baru = !s.SoalID;
    let jenis = s.Jenis || 'PG';
    const opsiAwal = pilihanDari(s), kAwal = PC.norm(kunciTeks(s)), pasAwal = pasanganDari(s);
    const m = PC.modal({ judul: baru ? 'Tambah Soal' : 'Ubah Soal ' + s.SoalID, ikon: 'quiz', lebar: 'sangat-lebar', isi:
      '<div class="editor-soal"><div class="kolom g12"><div class="grid-form">' +
      '<label class="medan"><span>Pulau (mapel) *</span><select class="isian" name="MapelID">' + A.opsiMapel(s.MapelID) + '</select></label>' +
      '<label class="medan"><span>Level *</span><select class="isian" name="Level">' + LEVEL.map(function (l) { return '<option' + (l === s.Level ? ' selected' : '') + '>' + l + '</option>'; }).join('') + '</select></label>' +
      '<label class="medan"><span>Jenis soal</span><select class="isian" name="Jenis">' + Object.keys(JENIS).map(function (j) { return '<option value="' + j + '"' + (j === jenis ? ' selected' : '') + '>' + JENIS[j] + '</option>'; }).join('') + '</select></label>' +
      '<label class="medan"><span>Kelas</span><input class="isian" name="Tingkat" value="' + esc(s.Tingkat || '') + '" placeholder="3 · 1-3 · 2,4"><small>Kosong = semua kelas.</small></label>' +
      '<label class="medan penuh"><span>Topik</span><input class="isian" name="Topik" list="dlTopik" maxlength="60" value="' + esc(s.Topik || '') + '" placeholder="Perkalian, Pecahan, Kosakata…"><datalist id="dlTopik">' + (A.topikSoal || []).map(function (t) { return '<option value="' + esc(t) + '">'; }).join('') + '</datalist></label>' +
      '<label class="medan penuh"><span>Pertanyaan *</span><textarea class="isian" name="Pertanyaan" rows="3" maxlength="600">' + esc(s.Pertanyaan || '') + '</textarea></label>' +
      '<label class="medan penuh" id="eGbr"><span>Gambar (emoji atau URL https)</span><input class="isian" name="URLGambar" value="' + esc(s.URLGambar || '') + '" placeholder="🍎 atau https://…"></label>' +
      '<div class="penuh" id="eOpsi"></div>' +
      '<label class="medan penuh"><span>Penjelasan (tampil setelah menjawab)</span><textarea class="isian" name="Penjelasan" rows="2" maxlength="600">' + esc(s.Penjelasan || '') + '</textarea></label>' +
      '<label class="medan"><span>Poin XP</span><input class="isian" name="Poin" type="number" min="1" max="100" value="' + esc(s.Poin || '') + '" placeholder="Otomatis sesuai level"></label>' +
      '<label class="medan"><span>Status</span><select class="isian" name="Status"><option value="aktif">Aktif</option><option value="nonaktif"' + (s.Status === 'nonaktif' ? ' selected' : '') + '>Nonaktif</option></select></label>' +
      '</div></div><div><div class="lbl redup" style="margin-bottom:8px">PRATINJAU DI HP SISWA</div><div id="ePrev"></div></div></div>',
      tombol: [{ teks: 'Batal' }].concat(baru ? [{ teks: 'Simpan & Tambah Lagi', kelas: 'putih', ikon: 'add', aksi: function (tutup, t) { return simpan(t, true); } }] : []).concat([{ teks: 'Simpan Soal', kelas: 'biru', ikon: 'check', aksi: function (tutup, t) { return simpan(t, false); } }]) });
    const t = m.el;
    const gambarOpsi = function (opsi, kunciIdx, pasangan) {
      const w = $('#eOpsi', t);
      if (jenis === 'PASANGAN') {
        const l = pasangan && pasangan.length ? pasangan : [{ l: '', r: '' }, { l: '', r: '' }, { l: '', r: '' }];
        w.innerHTML = '<div class="medan"><span>Pasangan (kiri ⟷ kanan), 2–6 baris *</span></div><div class="kolom g8" id="ePas">' + l.map(barisPas).join('') + '</div><button type="button" class="btn teks kecil" id="eTambahPas">' + ik('add', 's18') + 'Tambah pasangan</button>';
      } else {
        const l = opsi && opsi.length ? opsi : ['', '', '', ''];
        w.innerHTML = '<div class="medan"><span>Pilihan jawaban — tandai jawaban benar *</span></div><div class="kolom g8" id="ePil">' + l.map(function (p, i) { return barisPil(p, i === kunciIdx); }).join('') + '</div><button type="button" class="btn teks kecil" id="eTambahPil">' + ik('add', 's18') + 'Tambah pilihan</button>';
      }
      $('#eGbr', t).hidden = jenis !== 'GAMBAR' && !$('[name="URLGambar"]', t).value;
      prev();
    };
    const barisPil = function (p, benar) { return '<div class="flex tengah g8 baris-pil"><label class="flex tengah g6 kecil tebal" title="Jawaban benar"><input type="radio" name="_kunci"' + (benar ? ' checked' : '') + ' style="width:20px;height:20px;accent-color:var(--ok)"></label><input class="isian kecil isi1 inp-pil" style="border-radius:14px" maxlength="120" value="' + esc(p) + '" placeholder="Pilihan jawaban"><button type="button" class="btn hantu btn-ikon kecil" data-hapus-baris aria-label="Hapus pilihan">' + ik('close') + '</button></div>'; };
    const barisPas = function (p) { return '<div class="flex tengah g8 baris-pas"><input class="isian kecil isi1 inp-l" style="border-radius:14px" maxlength="60" value="' + esc(p.l) + '" placeholder="Kiri (mis. 3 × 4)"><span class="redup">⟷</span><input class="isian kecil isi1 inp-r" style="border-radius:14px" maxlength="60" value="' + esc(p.r) + '" placeholder="Kanan (mis. 12)"><button type="button" class="btn hantu btn-ikon kecil" data-hapus-baris aria-label="Hapus pasangan">' + ik('close') + '</button></div>'; };
    const kumpul = function () {
      const d = A.bacaForm(t);
      delete d._kunci;
      if (jenis === 'PASANGAN') {
        const ps = $$('.baris-pas', t).map(function (b) { return { l: $('.inp-l', b).value.replace(/[|=:]/g, ' ').trim(), r: $('.inp-r', b).value.replace(/[|=:]/g, ' ').trim() }; }).filter(function (p) { return p.l && p.r; });
        d.Pilihan = ps.map(function (p) { return p.l + ' = ' + p.r; }).join(' | ');
        d.Kunci = '';
      } else {
        const bs = $$('.baris-pil', t);
        const ps = bs.map(function (b) { return $('.inp-pil', b).value.replace(/\|/g, '/').trim(); });
        const ki = bs.map(function (b) { return b.querySelector('[name="_kunci"]').checked; }).indexOf(true);
        d.Kunci = ki > -1 ? ps[ki] : '';
        d.Pilihan = ps.filter(Boolean).join(' | ');
      }
      d.Jenis = jenis;
      return d;
    };
    const prev = function () { $('#ePrev', t).innerHTML = htmlPratinjau(kumpul()); };
    const simpan = async function (tr, lagi) {
      const d = kumpul();
      if (!d.Pertanyaan) { PC.toast('Pertanyaan wajib diisi.', 'galat'); return false; }
      const r = await A.tulis('soal.simpan', { soal: Object.assign({ SoalID: baru ? '' : s.SoalID }, d) });
      if (!r.success) return false;
      if (selesai) selesai();
      if (lagi) { setTimeout(function () { editorSoal({ MapelID: d.MapelID, Level: d.Level, Jenis: d.Jenis, Tingkat: d.Tingkat, Topik: d.Topik, Status: 'aktif' }, selesai); }, 150); }
      void tr;
    };
    t.addEventListener('input', prev);
    t.addEventListener('change', function (e) {
      if (e.target.name === 'Jenis') {
        const lama = jenis; jenis = e.target.value;
        if ((lama === 'PASANGAN') !== (jenis === 'PASANGAN')) gambarOpsi(); else { $('#eGbr', t).hidden = jenis !== 'GAMBAR' && !$('[name="URLGambar"]', t).value; prev(); }
      } else prev();
    });
    t.addEventListener('click', function (e) {
      if (e.target.closest('#eTambahPil')) { if ($$('.baris-pil', t).length >= 6) return PC.toast('Maksimal 6 pilihan.', 'info'); $('#ePil', t).insertAdjacentHTML('beforeend', barisPil('', false)); }
      else if (e.target.closest('#eTambahPas')) { if ($$('.baris-pas', t).length >= 6) return PC.toast('Maksimal 6 pasangan.', 'info'); $('#ePas', t).insertAdjacentHTML('beforeend', barisPas({ l: '', r: '' })); }
      else if (e.target.closest('[data-hapus-baris]')) { const b = e.target.closest('.baris-pil,.baris-pas'); if (b && b.parentElement.children.length > 2) { b.remove(); prev(); } else PC.toast('Minimal 2 baris.', 'info'); }
    });
    gambarOpsi(opsiAwal, opsiAwal.map(PC.norm).indexOf(kAwal), pasAwal);
    A.pasangUnggah(t, 'URLGambar', { maks: 700, ubah: prev });
  }

  function importSoal(selesai) {
    let rows = null;
    PC.modal({ judul: 'Import Soal dari CSV', ikon: 'upload_file', lebar: 'lebar', isi:
      '<ol class="kecil" style="margin:0;padding-left:20px;line-height:1.8"><li>Kolom: <code>mapel</code> (nama mapel/pulau), <code>tingkat</code> (3, 1-3, kosong = semua), <code>topik</code>, <code>level</code> (Mudah/Sedang/Sulit), <code>jenis</code> (PG/GAMBAR/PASANGAN), <code>pertanyaan</code>, <code>pilihan</code> (dipisah <b>|</b>), <code>kunci</code> (teks jawaban atau huruf A–F), <code>penjelasan</code>, <code>gambar</code>, <code>poin</code>.</li>' +
      '<li>Pasangan: <code>pilihan</code> berisi <code>3 × 4 = 12 | 5 × 2 = 10</code>, kolom kunci dikosongkan.</li><li>Soal yang sama persis (mapel + level + pertanyaan) dilewati, jadi aman diulang.</li></ol>' +
      '<div class="flex g10 bungkus"><button class="btn putih kecil" id="tplSoal">' + ik('download', 's18') + 'Unduh template</button><button class="btn biru kecil" id="pilihSoalCsv">' + ik('attach_file', 's18') + 'Pilih berkas CSV</button><span class="kecil redup" id="namaSoalCsv"></span></div><div id="hasilSoal"></div>',
      tombol: [{ teks: 'Tutup' }, { teks: 'Jalankan Import', kelas: 'oranye', ikon: 'play_arrow', aksi: async function () {
        if (!rows) { PC.toast('Pilih berkas CSV dulu.', 'info'); return false; }
        const r = await A.tulis('soal.import', { rows: rows, dryRun: false });
        if (!r.success) return false;
        if (selesai) selesai();
      } }],
      saatBuka: function (t) {
        $('#tplSoal', t).onclick = function () {
          const m = (A.boot.mapel[0] || {}).nama || 'Matematika';
          A.unduhCsv('template-soal.csv', [
            { mapel: m, tingkat: '3', topik: 'Perkalian', level: 'Mudah', jenis: 'PG', pertanyaan: '4 × 3 = ?', pilihan: '10 | 12 | 14 | 7', kunci: '12', penjelasan: '4 + 4 + 4 = 12', gambar: '', poin: '' },
            { mapel: m, tingkat: '3', topik: 'Perkalian', level: 'Sedang', jenis: 'PASANGAN', pertanyaan: 'Cocokkan hasil perkalian', pilihan: '2 × 5 = 10 | 3 × 3 = 9 | 4 × 2 = 8', kunci: '', penjelasan: '', gambar: '', poin: '' },
            { mapel: m, tingkat: '1-3', topik: 'Bilangan', level: 'Mudah', jenis: 'GAMBAR', pertanyaan: 'Ada berapa apel?', pilihan: '2 | 3 | 4', kunci: 'B', penjelasan: '', gambar: '🍎🍎🍎', poin: '' }
          ], ['mapel', 'tingkat', 'topik', 'level', 'jenis', 'pertanyaan', 'pilihan', 'kunci', 'penjelasan', 'gambar', 'poin']);
        };
        $('#pilihSoalCsv', t).onclick = async function () {
          const f = await PC.pilihBerkas('.csv,text/csv');
          if (!f) return;
          $('#namaSoalCsv', t).textContent = f.name;
          rows = PC.bacaCsv(await PC.bacaBerkas(f));
          if (!rows.length) { PC.toast('Berkas kosong atau format tidak dikenali.', 'galat'); rows = null; return; }
          $('#hasilSoal', t).innerHTML = '<div class="memuat"><div class="putar"></div></div>';
          const r = await PC.api('soal.import', { rows: rows, dryRun: true });
          $('#hasilSoal', t).innerHTML = r.success ? A.laporanImport(r.data, 'Uji coba (belum disimpan) — ' + rows.length + ' baris') : '<div class="catatan-info merah">' + ik('error', 'isi') + esc(r.message) + '</div>';
        };
      } });
  }

  /* =================================================================
   * PULAU & MAPEL
   * ================================================================= */
  A.hal.mapel = { render: function (el) {
    el.innerHTML = '<div class="kepala-hal"><div><h1>Pulau &amp; Mata Pelajaran</h1><p>Setiap mata pelajaran tampil sebagai pulau di peta siswa. Status <b>Segera</b> menampilkan pulau terkunci "dalam pembangunan".</p></div><div class="aksi"><button class="btn oranye" data-m="tambah">' + ik('add') + 'Tambah Pulau</button></div></div><div id="mGrid" class="grid-konten">' + A.kerangka([260, 260, 260]) + '</div>';
    let data = null;
    const muat = function () {
      A.swr('mapel.list', {}, function (d) {
        data = d;
        $('#mGrid', el).innerHTML = d.rows.map(function (m) {
          const st = { aktif: ['hijau', 'Aktif'], segera: ['kuning', 'Segera hadir'], nonaktif: ['lav', 'Nonaktif'] }[m.status] || ['lav', m.status];
          return '<article class="kartu-konten' + (m.status === 'nonaktif' ? ' mati' : '') + '"><div class="gbr">' + A.ilus({ gambar: m.Gambar, warna: m.Warna, ikon: m.Ikon }) + '</div>' +
            '<div class="flex antara tengah g6"><span class="lbl-up" style="color:' + PC.warna(m.Warna).i + '">' + esc(m.NamaMapel) + '</span><span class="pil ' + st[0] + '">' + st[1] + '</span></div><h3>' + esc(m.NamaDunia) + '</h3><p>' + esc(m.Deskripsi) + '</p>' +
            '<div class="flex g6 bungkus"><span class="pil lav">' + ik('quiz', 's16') + m.jumlahSoal + ' soal</span><span class="pil lav">Kelas ' + esc(m.KelasTarget || 'semua') + '</span><span class="pil lav">Buka Lv. ' + m.LevelBuka + '</span></div>' +
            '<div class="aksi-kartu"><button class="btn hantu kecil isi1" data-ubah="' + esc(m.MapelID) + '">' + ik('edit', 's18') + 'Ubah</button><a class="btn putih kecil" href="#/soal" data-saring="' + esc(m.MapelID) + '">' + ik('quiz', 's18') + 'Soal</a></div></article>';
        }).join('') || '<div class="kartu kosong"><p>Belum ada mata pelajaran.</p></div>';
      }, { galat: function (r) { A.kartuGalat($('#mGrid', el), r, muat); } });
    };
    muat();
    el.onclick = function (e) {
      const t = e.target.closest('[data-m],[data-ubah]'); if (!t) return;
      const m = t.dataset.ubah ? data.rows.filter(function (x) { return x.MapelID === t.dataset.ubah; })[0] : null;
      const f = A.modalForm({ judul: m ? 'Ubah ' + m.NamaDunia : 'Tambah Pulau', ikon: 'public', lebar: 'lebar',
        nilai: m ? Object.assign({}, m, { StatusAktif: m.status === 'aktif' ? 'Ya' : m.status === 'segera' ? 'Segera' : 'Tidak' }) : { Warna: 'biru', Ikon: 'explore', LevelBuka: 1, Urutan: (data.rows.length + 1), StatusAktif: 'Ya' },
        fields: [
          { k: 'NamaMapel', label: 'Nama mata pelajaran', wajib: true, maks: 60, ph: 'Matematika' },
          { k: 'NamaDunia', label: 'Nama pulau/dunia', maks: 60, ph: 'Pulau Angka' },
          { k: 'Deskripsi', label: 'Deskripsi singkat', jenis: 'area', baris: 2, maks: 200 },
          { k: 'Ikon', label: 'Ikon (Material Symbols)', maks: 40, ph: 'calculate', bantuan: 'Contoh: calculate, menu_book, science, diversity_3, mosque. Cari nama di fonts.google.com/icons.' },
          { k: 'Warna', label: 'Warna tema', jenis: 'warna' },
          { k: 'Gambar', label: 'Gambar pulau (opsional)', penuh: true, ph: 'https://…', bantuan: 'Kosong = ilustrasi pulau otomatis.' },
          { k: 'KelasTarget', label: 'Untuk kelas', maks: 20, ph: '1-6', bantuan: 'Mis. 1-3 atau 4,5,6. Kosong = semua.' },
          { k: 'LevelBuka', label: 'Terbuka di level petualang', jenis: 'number', min: 1, max: 20 },
          { k: 'Urutan', label: 'Urutan tampil', jenis: 'number', min: 1, max: 999 },
          { k: 'StatusAktif', label: 'Status', jenis: 'pilih', opsi: [['Ya', 'Aktif'], ['Segera', 'Segera hadir'], ['Tidak', 'Nonaktif']] }
        ],
        simpan: async function (d) {
          const r = await A.tulis('mapel.simpan', { mapel: Object.assign({ MapelID: m ? m.MapelID : '' }, d) });
          if (!r.success) return false;
          await A.segarkanBoot(); muat();
        } });
      A.pasangUnggah(f.el, 'Gambar', { maks: 1000 });
    };
    el.addEventListener('click', function (e) { const s = e.target.closest('[data-saring]'); if (s) { setTimeout(function () { const q = document.getElementById('qMapel'); if (q) { q.value = s.dataset.saring; q.dispatchEvent(new Event('change')); } }, 60); } });
  } };

  /* =================================================================
   * LENCANA
   * ================================================================= */
  const SYARAT = { XP: 'Total XP mencapai', BINTANG: 'Total bintang mencapai', KUIS: 'Jumlah kuis selesai', SEMPURNA: 'Jumlah nilai sempurna (100)', STREAK: 'Hari bermain berturut-turut', LEVEL: 'Level petualang mencapai',
    BERUNTUN: 'Jawaban benar beruntun', SKOR: 'Skor satu kuis minimal', MAPEL_BINTANG: 'Bintang di satu pulau', MAPEL_TUNTAS: 'Jumlah pulau tuntas (9 bintang)' };
  A.hal.lencana = { render: function (el) {
    el.innerHTML = '<div class="kepala-hal"><div><h1>Lencana</h1><p>Lencana diberikan otomatis saat siswa menyelesaikan kuis dan memenuhi syarat. Lencana yang dinonaktifkan tetap tersimpan pada siswa yang sudah meraihnya.</p></div><div class="aksi"><button class="btn oranye" data-l="tambah">' + ik('add') + 'Tambah Lencana</button></div></div><div class="grid-konten" id="lGrid">' + A.kerangka([200, 200, 200]) + '</div>';
    let data = null;
    const muat = function () {
      A.swr('lencana.list', {}, function (d) {
        data = d;
        $('#lGrid', el).innerHTML = d.rows.map(function (l) {
          const c = PC.warna(l.Warna);
          return '<article class="kartu-konten' + (l.Status !== 'aktif' ? ' mati' : '') + '" style="text-align:center"><span class="medali-adm" style="background:' + c.s + ';color:' + c.i + ';box-shadow:0 5px 0 ' + c.b + '">' + ik(l.Ikon, 'isi') + '</span><h3>' + esc(l.Nama) + '</h3><p>' + esc(l.Deskripsi) + '</p>' +
            '<div class="kecil"><b>' + esc(SYARAT[l.Syarat] || l.Syarat) + ' ' + l.Nilai + '</b>' + (l.MapelID ? ' · ' + esc(A.namaMapel(l.MapelID)) : '') + '</div><span class="pil lav" style="align-self:center">' + ik('groups', 's16') + l.pemilik + ' siswa meraih</span>' +
            '<div class="aksi-kartu"><button class="btn hantu kecil penuh" data-ubah="' + esc(l.LencanaID) + '">' + ik('edit', 's18') + 'Ubah</button></div></article>';
        }).join('') || '<div class="kartu kosong"><p>Belum ada lencana.</p></div>';
      }, { galat: function (r) { A.kartuGalat($('#lGrid', el), r, muat); } });
    };
    muat();
    el.onclick = function (e) {
      const t = e.target.closest('[data-l],[data-ubah]'); if (!t || !data) return;
      const l = t.dataset.ubah ? data.rows.filter(function (x) { return x.LencanaID === t.dataset.ubah; })[0] : null;
      const f = A.modalForm({ judul: l ? 'Ubah Lencana' : 'Tambah Lencana', ikon: 'military_tech', lebar: 'lebar',
        nilai: l || { Ikon: 'military_tech', Warna: 'kuning', Syarat: 'KUIS', Nilai: 10, Urutan: data.rows.length + 1, Status: 'aktif' },
        fields: [
          { k: 'Nama', label: 'Nama lencana', wajib: true, maks: 60 },
          { k: 'Ikon', label: 'Ikon (Material Symbols)', maks: 40, ph: 'military_tech' },
          { k: 'Deskripsi', label: 'Deskripsi', jenis: 'area', baris: 2, maks: 160 },
          { k: 'Warna', label: 'Warna', jenis: 'warna' },
          { k: 'Syarat', label: 'Syarat', jenis: 'pilih', opsi: Object.keys(SYARAT).map(function (s) { return [s, SYARAT[s]]; }) },
          { k: 'Nilai', label: 'Nilai syarat', jenis: 'number', min: 1 },
          { k: 'MapelID', label: 'Pulau (untuk syarat bintang pulau)', jenis: 'pilih', opsiHtml: '<option value="">—</option>' + A.opsiMapel(l && l.MapelID) },
          { k: 'Urutan', label: 'Urutan', jenis: 'number', min: 1 },
          { k: 'Status', label: 'Status', jenis: 'pilih', opsi: [['aktif', 'Aktif'], ['nonaktif', 'Nonaktif']] }
        ],
        simpan: async function (d) {
          const r = await A.tulis('lencana.simpan', { lencana: Object.assign({ LencanaID: l ? l.LencanaID : '' }, d) });
          if (!r.success) return false;
          muat();
        } });
      const sy = f.el.querySelector('[name="Syarat"]'), mp = f.el.querySelector('[name="MapelID"]').closest('.medan');
      const atur = function () { mp.hidden = sy.value !== 'MAPEL_BINTANG'; };
      sy.addEventListener('change', atur); atur();
    };
  } };

  /* =================================================================
   * KARAKTER
   * ================================================================= */
  A.hal.karakter = { render: function (el) {
    el.innerHTML = '<div class="kepala-hal"><div><h1>Karakter Petualang</h1><p>Teman petualangan yang dipilih siswa. Karakter terbuka sesuai level. Pakai emoji atau unggah gambar orisinal milik sekolah.</p></div><div class="aksi"><button class="btn oranye" data-c="tambah">' + ik('add') + 'Tambah Karakter</button></div></div><div class="grid-konten" id="kGrid">' + A.kerangka([200, 200, 200]) + '</div>';
    let data = null;
    const muat = function () {
      A.swr('karakter.list', {}, function (d) {
        data = d;
        $('#kGrid', el).innerHTML = d.rows.map(function (k) {
          return '<article class="kartu-konten' + (k.Status !== 'aktif' ? ' mati' : '') + '" style="text-align:center"><div class="emoji-besar" style="background:' + PC.warna(k.Warna).s + ';border-radius:22px;padding:12px">' + (k.Gambar ? '<img src="' + esc(k.Gambar) + '" alt="" style="height:64px;margin:0 auto;object-fit:contain">' : esc(k.Emoji)) + '</div>' +
            '<h3>' + esc(k.Nama) + '</h3><p>Terbuka di Level ' + k.LevelBuka + '</p><div class="aksi-kartu"><button class="btn hantu kecil penuh" data-ubah="' + esc(k.KarakterID) + '">' + ik('edit', 's18') + 'Ubah</button></div></article>';
        }).join('') || '<div class="kartu kosong"><p>Belum ada karakter.</p></div>';
      }, { galat: function (r) { A.kartuGalat($('#kGrid', el), r, muat); } });
    };
    muat();
    el.onclick = function (e) {
      const t = e.target.closest('[data-c],[data-ubah]'); if (!t || !data) return;
      const k = t.dataset.ubah ? data.rows.filter(function (x) { return x.KarakterID === t.dataset.ubah; })[0] : null;
      const f = A.modalForm({ judul: k ? 'Ubah Karakter' : 'Tambah Karakter', ikon: 'pets',
        nilai: k || { Warna: 'biru', LevelBuka: 1, Urutan: data.rows.length + 1, Status: 'aktif' },
        fields: [
          { k: 'Nama', label: 'Nama karakter', wajib: true, maks: 40, ph: 'Kancil Pintar' },
          { k: 'Emoji', label: 'Emoji', maks: 8, ph: '🦌' },
          { k: 'Gambar', label: 'Gambar (opsional)', penuh: true, ph: 'https://…' },
          { k: 'Warna', label: 'Warna latar', jenis: 'warna' },
          { k: 'LevelBuka', label: 'Terbuka di level', jenis: 'number', min: 1, max: 20 },
          { k: 'Urutan', label: 'Urutan', jenis: 'number', min: 1 },
          { k: 'Status', label: 'Status', jenis: 'pilih', opsi: [['aktif', 'Aktif'], ['nonaktif', 'Nonaktif']] }
        ],
        simpan: async function (d) {
          const r = await A.tulis('karakter.simpan', { karakter: Object.assign({ KarakterID: k ? k.KarakterID : '' }, d) });
          if (!r.success) return false;
          muat();
        } });
      A.pasangUnggah(f.el, 'Gambar', { maks: 400 });
    };
  } };
})();
