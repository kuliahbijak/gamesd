/* =====================================================================
   admin-laporan.js — Laporan & Evaluasi: saring kelas/mapel/siswa/tanggal,
   grafik aktivitas & skor (tanpa sumbu ganda), distribusi skor, penguasaan
   topik, tabel siswa; unduh Excel (SheetJS) & PDF (jsPDF + autoTable).
   ===================================================================== */
(function () {
  'use strict';
  const A = window.A, $ = A.$, esc = PC.esc, ik = PC.ik;
  const F = { kelasId: null, mapelId: '', siswaId: '', dari: '', sampai: '' };

  A.hal.laporan = { render: function (el) {
    if (F.kelasId === null || (A.kelas && F.kelasId !== A.kelas)) F.kelasId = A.kelas || '';
    if (!F.sampai) { F.sampai = A.tglInput(0); F.dari = A.tglInput(-29); }
    el.innerHTML = '<div class="kepala-hal"><div><h1>Laporan &amp; Evaluasi</h1><p>Rekap hasil belajar untuk rapat guru, rapor, dan pendampingan. Data diambil dari sesi kuis yang sudah selesai.</p></div>' +
      '<div class="aksi"><button class="btn putih" data-l="excel">' + ik('table_view') + 'Unduh Excel</button><button class="btn biru" data-l="pdf">' + ik('picture_as_pdf') + 'Unduh PDF</button></div></div>' +
      '<section class="kartu"><div class="alat">' +
      '<label class="medan"><span>Kelas</span><select class="isian" id="lKelas">' + A.opsiKelas(F.kelasId, { semua: A.peran() === 'guru' ? 'Semua kelas saya' : 'Semua kelas' }) + '</select></label>' +
      '<label class="medan"><span>Pulau</span><select class="isian" id="lMapel">' + A.opsiMapel(F.mapelId, { semua: 'Semua pulau' }) + '</select></label>' +
      '<label class="medan"><span>Siswa</span><select class="isian" id="lSiswa"><option value="">Semua siswa</option></select></label>' +
      '<label class="medan"><span>Dari</span><input class="isian" type="date" id="lDari" value="' + esc(F.dari) + '"></label>' +
      '<label class="medan"><span>Sampai</span><input class="isian" type="date" id="lSampai" value="' + esc(F.sampai) + '"></label>' +
      '<div class="medan"><span>Cepat</span><div class="segmen" role="group" aria-label="Rentang cepat">' + [[7, '7 hr'], [30, '30 hr'], [90, '90 hr'], [180, 'Semester']].map(function (x) { return '<button type="button" data-cepat="' + x[0] + '" aria-pressed="false">' + x[1] + '</button>'; }).join('') + '</div></div>' +
      '</div></section><div id="lIsi">' + A.kerangka([110, 320, 360]) + '</div>';
    let data = null;
    const isiSiswa = async function () {
      const sel = $('#lSiswa', el);
      const r = await PC.apiQ('siswa.list', { kelasId: F.kelasId });
      if (!r.success || !sel.isConnected) return;
      sel.innerHTML = '<option value="">Semua siswa</option>' + r.data.rows.slice().sort(function (a, b) { return String(a.nama).localeCompare(String(b.nama)); }).map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === F.siswaId ? ' selected' : '') + '>' + esc(s.nama) + ' (' + esc(s.kelas) + ')</option>'; }).join('');
    };
    const muat = function () {
      $('#lIsi', el).innerHTML = A.kerangka([110, 320, 360]);
      A.swr('laporan.data', Object.assign({}, F), function (d) { data = d; gambar($('#lIsi', el), d); }, { galat: function (r) { A.kartuGalat($('#lIsi', el), r, muat); } });
    };
    const ubah = function () {
      const k = $('#lKelas', el).value;
      if (k !== F.kelasId) { F.kelasId = k; F.siswaId = ''; isiSiswa(); }
      F.mapelId = $('#lMapel', el).value; F.siswaId = $('#lSiswa', el).value; F.dari = $('#lDari', el).value; F.sampai = $('#lSampai', el).value;
      if (F.dari && F.sampai && F.dari > F.sampai) { PC.toast('Tanggal awal harus sebelum tanggal akhir.', 'galat'); return; }
      muat();
    };
    ['#lKelas', '#lMapel', '#lSiswa', '#lDari', '#lSampai'].forEach(function (s) { $(s, el).onchange = ubah; });
    isiSiswa();
    muat();
    el.onclick = function (e) {
      const t = e.target.closest('[data-l],[data-cepat]'); if (!t) return;
      if (t.dataset.cepat) { $('#lSampai', el).value = A.tglInput(0); $('#lDari', el).value = A.tglInput(-(Number(t.dataset.cepat) - 1)); A.$$('[data-cepat]', el).forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); }); ubah(); }
      else if (!data) PC.toast('Tunggu data selesai dimuat.', 'info');
      else if (t.dataset.l === 'excel') unduhExcel(data);
      else if (t.dataset.l === 'pdf') unduhPdf(data, t);
    };
  } };

  function judulFilter(d) {
    const f = d.filter;
    return [f.kelasId ? 'Kelas ' + A.namaKelas(f.kelasId) : (A.peran() === 'guru' ? 'Semua kelas saya' : 'Semua kelas'), f.mapelId ? A.namaMapel(f.mapelId) : 'Semua pulau',
      f.siswaId ? ((d.siswa[0] || {}).nama || 'Siswa') : '', PC.tgl(f.dari) + ' – ' + PC.tgl(f.sampai)].filter(Boolean).join(' · ');
  }
  function gambar(w, d) {
    const r = d.ringkasan;
    const ubin = function (label, nilai, ikon, warna) { return '<div class="kpi"><div class="atas"><div><span class="lbl-up">' + esc(label) + '</span><div class="angka">' + nilai + '</div></div><div class="blok-ikon ' + warna + '">' + ik(ikon, 'isi s28') + '</div></div></div>'; };
    w.innerHTML = (d.terpotong ? '<div class="catatan-info kuning">' + ik('warning', 'isi') + '<span>Data sesi sangat banyak; laporan memakai 40.000 sesi terbaru. Persempit rentang tanggal untuk hasil lengkap.</span></div>' : '') +
      '<p class="redup tebal" style="margin:4px 0 0">' + esc(judulFilter(d)) + '</p>' +
      '<section class="kpi-grid" style="margin-top:12px">' + ubin('Siswa Aktif', r.siswaAktif + ' <small>/ ' + r.siswa + '</small>', 'groups', 'biru') + ubin('Kuis Selesai', PC.angka(r.sesi), 'sports_esports', 'lav') +
      ubin('Rata-rata Skor', r.rataSkor + ' <small>/100</small>', 'insights', '') + ubin('Waktu Belajar', PC.angka(r.menit) + ' <small>menit</small>', 'timer', 'hijau') + '</section>' +
      '<section class="grid-2a" style="margin-top:18px"><div class="kartu"><div class="judul-kartu"><div><h2>Aktivitas Harian</h2><p>Jumlah kuis selesai per hari</p></div></div><div class="grafik-wadah"><canvas id="gAktif" role="img" aria-label="Grafik jumlah kuis per hari"></canvas></div></div>' +
      '<div class="kartu"><div class="judul-kartu"><div><h2>Rata-rata Skor Harian</h2><p>Hari tanpa kuis tidak digambar</p></div></div><div class="grafik-wadah"><canvas id="gSkor" role="img" aria-label="Grafik rata-rata skor per hari"></canvas></div></div></section>' +
      '<section class="grid-2a" style="margin-top:18px"><div class="kartu"><div class="judul-kartu"><div><h2>Sebaran Skor Kuis</h2><p>Banyak kuis per rentang skor</p></div></div><div class="grafik-wadah"><canvas id="gDist" role="img" aria-label="Grafik sebaran skor"></canvas></div>' +
      '<div class="tabel-wadah" style="margin-top:14px"><table class="tabel"><thead><tr><th>Pulau</th><th>Level</th><th class="kanan">Kuis</th><th class="kanan">Rata-rata</th><th class="kanan">Akurasi</th></tr></thead><tbody>' +
      (d.perMapel.length ? d.perMapel.map(function (m) { return '<tr><td>' + esc(m.mapel) + '</td><td>' + esc(m.level) + '</td><td class="kanan">' + m.sesi + '</td><td class="kanan"><b>' + m.rata + '</b></td><td class="kanan">' + m.akurasi + '%</td></tr>'; }).join('') : '<tr><td colspan="5" class="redup">Belum ada kuis pada rentang ini.</td></tr>') + '</tbody></table></div></div>' +
      '<div class="kartu"><div class="judul-kartu"><div><h2>Penguasaan Topik</h2><p>Diurutkan dari yang paling perlu penguatan</p></div></div>' +
      (d.topik.length ? '<div class="topik-list">' + d.topik.slice(0, 14).map(function (t) { return '<div class="topik-item"><div class="baris"><span>' + esc(t.topik) + ' <small>· ' + esc(t.mapel) + ' · ' + t.jawaban + ' jawaban</small></span><span>' + t.persen + '% <small>' + A.labelTopik(t.persen) + '</small></span></div><div class="progres tipis ' + A.warnaTopik(t.persen) + '"><i style="width:' + t.persen + '%"></i></div></div>'; }).join('') + '</div>' : '<div class="kosong"><p>Belum ada data penguasaan.</p></div>') + '</div></section>' +
      '<section class="kartu" style="margin-top:18px"><div class="judul-kartu"><div><h2>Rekap per Siswa</h2><p>Klik baris untuk melihat rapor lengkap</p></div><div class="cari"><span class="ik" aria-hidden="true">search</span><input class="isian kecil" id="lCari" type="search" placeholder="Cari siswa…" aria-label="Cari siswa"></div></div><div id="lTabel"></div></section>';
    A.animasi(w);
    const label = d.tren.map(function (x) { const p = x.tanggal.split('-'); return Number(p[2]) + '/' + Number(p[1]); });
    const biru = A.WARNA_GRAFIK.biru;
    A.grafik($('#gAktif', w), { type: 'bar', data: { labels: label, datasets: [{ label: 'Kuis selesai', data: d.tren.map(function (x) { return x.sesi; }), siswa: d.tren.map(function (x) { return x.siswa; }), backgroundColor: biru, borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'bottom', maxBarThickness: 22 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: Object.assign({}, A.tooltip, { callbacks: { label: function (c) { return ' ' + c.parsed.y + ' kuis · ' + c.dataset.siswa[c.dataIndex] + ' siswa'; } } }) }, scales: Object.assign(A.opsiSumbu(undefined, ''), { x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 10, font: { size: 11, weight: 800 } } } }) } });
    A.grafik($('#gSkor', w), { type: 'line', data: { labels: label, datasets: [{ label: 'Rata-rata skor', data: d.tren.map(function (x) { return x.sesi ? x.rata : null; }), borderColor: A.WARNA_GRAFIK.ungu, backgroundColor: A.WARNA_GRAFIK.ungu, borderWidth: 2, pointRadius: 4, pointHoverRadius: 6, pointBorderColor: '#fff', pointBorderWidth: 2, spanGaps: true, tension: .3 }] },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: Object.assign({}, A.tooltip, { callbacks: { label: function (c) { return ' Rata-rata ' + c.parsed.y; } } }) }, scales: Object.assign(A.opsiSumbu(100, ''), { x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 10, font: { size: 11, weight: 800 } } } }) } });
    A.grafik($('#gDist', w), { type: 'bar', data: { labels: d.distribusi.map(function (x) { return x.label; }), datasets: [{ label: 'Kuis', data: d.distribusi.map(function (x) { return x.n; }), backgroundColor: A.WARNA_GRAFIK.biru, borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'bottom', maxBarThickness: 48 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: Object.assign({}, A.tooltip, { callbacks: { label: function (c) { return ' ' + c.parsed.y + ' kuis'; } } }) }, scales: A.opsiSumbu(undefined, '') } });
    const tbl = A.Tabel($('#lTabel', w), { rows: d.siswa, per: 25, urut: 'rata', kosong: 'Tidak ada siswa.', klikBaris: function (id) { A.detailSiswa(id); },
      kolom: [
        { k: 'nama', judul: 'Siswa', html: function (s) { return '<b>' + esc(s.nama) + '</b><div class="kecil redup">Kelas ' + esc(s.kelas) + ' · Lv. ' + s.level + '</div>'; } },
        { k: 'kuis', judul: 'Kuis', kelas: 'kanan' },
        { k: 'rata', judul: 'Rata-rata', html: function (s) { return A.skorPil(s.rata, !s.kuis); } },
        { k: 'terbaik', judul: 'Terbaik', kelas: 'kanan', html: function (s) { return s.kuis ? s.terbaik : '—'; } },
        { k: 'terendah', judul: 'Terendah', kelas: 'kanan', html: function (s) { return s.kuis ? s.terendah : '—'; } },
        { k: 'akurasi', judul: 'Akurasi', kelas: 'kanan', html: function (s) { return s.kuis ? s.akurasi + '%' : '—'; } },
        { k: 'xp', judul: 'XP', kelas: 'kanan', html: function (s) { return PC.angka(s.xp); } },
        { k: 'menit', judul: 'Menit', kelas: 'kanan' },
        { k: 'persenPeta', judul: 'Peta', kelas: 'kanan', html: function (s) { return s.persenPeta + '%'; } },
        { k: 'perhatian', judul: 'Catatan', html: function (s) { return s.perhatian ? '<span class="pil oranye">' + esc(s.perhatian) + '</span>' : ''; } }
      ] });
    $('#lCari', w).oninput = PC.debounce(function () { const q = PC.norm($('#lCari', w).value); tbl.set(d.siswa.filter(function (s) { return !q || PC.norm(s.nama).indexOf(q) > -1; })); }, 150);
  }

  function baris(d) {
    return {
      ringkas: [{ Keterangan: 'Filter', Nilai: judulFilter(d) }, { Keterangan: 'Siswa', Nilai: d.ringkasan.siswa }, { Keterangan: 'Siswa aktif', Nilai: d.ringkasan.siswaAktif }, { Keterangan: 'Kuis selesai', Nilai: d.ringkasan.sesi },
        { Keterangan: 'Rata-rata skor', Nilai: d.ringkasan.rataSkor }, { Keterangan: 'XP diperoleh', Nilai: d.ringkasan.xp }, { Keterangan: 'Bintang diperoleh', Nilai: d.ringkasan.bintang }, { Keterangan: 'Total menit belajar', Nilai: d.ringkasan.menit },
        { Keterangan: 'Dibuat', Nilai: PC.tgl(new Date().toISOString(), true) + ' oleh ' + (A.boot.me.nama || A.boot.me.email) }],
      siswa: d.siswa.map(function (s) { return { Nama: s.nama, Kelas: s.kelas, Level: s.level + ' ' + s.namaLevel, 'Kuis': s.kuis, 'Rata-rata': s.rata, Terbaik: s.terbaik, Terendah: s.terendah, 'Nilai 100': s.sempurna, 'Akurasi (%)': s.akurasi, XP: s.xp, Bintang: s.bintang, Menit: s.menit, 'Progres Peta (%)': s.persenPeta, 'Total XP': s.xpTotal, 'Terakhir Main': s.terakhir ? PC.tgl(s.terakhir, true) : '', Catatan: s.perhatian }; }),
      mapel: d.perMapel.map(function (m) { return { Pulau: m.mapel, Level: m.level, Kuis: m.sesi, 'Rata-rata': m.rata, 'Akurasi (%)': m.akurasi }; }),
      topik: d.topik.map(function (t) { return { Pulau: t.mapel, Topik: t.topik, 'Penguasaan (%)': t.persen, Jawaban: t.jawaban, Kategori: A.labelTopik(t.persen) }; }),
      harian: d.tren.map(function (x) { return { Tanggal: x.tanggal, 'Kuis selesai': x.sesi, 'Siswa bermain': x.siswa, 'Rata-rata skor': x.sesi ? x.rata : '' }; })
    };
  }
  function namaBerkas(d, ext) { return ('laporan-' + (d.filter.kelasId ? A.namaKelas(d.filter.kelasId) : 'semua') + '-' + d.filter.dari + '_' + d.filter.sampai).replace(/[^\w.-]+/g, '-') + '.' + ext; }
  function unduhExcel(d) {
    const b = baris(d);
    A.unduhXlsx(namaBerkas(d, 'xlsx'), [{ nama: 'Ringkasan', rows: b.ringkas }, { nama: 'Per Siswa', rows: b.siswa }, { nama: 'Per Pulau & Level', rows: b.mapel }, { nama: 'Penguasaan Topik', rows: b.topik }, { nama: 'Harian', rows: b.harian }]);
  }
  async function unduhPdf(d, btn) {
    const selesai = PC.memuatTombol(btn, 'Menyusun PDF…');
    try {
      await PC.muatSkrip(PC.LIB.jspdf);
      await PC.muatSkrip(PC.LIB.autotable);
      const J = window.jspdf.jsPDF, doc = new J({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const set = A.boot.setting, b = baris(d);
      const W = doc.internal.pageSize.getWidth();
      doc.setFillColor(45, 182, 245); doc.rect(0, 0, W, 24, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
      doc.text('Laporan Hasil Belajar — ' + (set.NAMA_APP || 'Petualangan Cerdas'), 12, 11);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      doc.text((set.NAMA_SEKOLAH || '') + '   ·   ' + judulFilter(d), 12, 18);
      doc.setTextColor(34, 34, 58);
      const r = d.ringkasan;
      doc.autoTable({ startY: 30, theme: 'plain', styles: { fontSize: 10, cellPadding: 2 }, head: [['Siswa aktif', 'Kuis selesai', 'Rata-rata skor', 'XP diperoleh', 'Bintang', 'Menit belajar']],
        body: [[r.siswaAktif + ' / ' + r.siswa, r.sesi, r.rataSkor, r.xp, r.bintang, r.menit]], headStyles: { textColor: [108, 108, 138], fontStyle: 'bold' }, bodyStyles: { fontStyle: 'bold', fontSize: 13 } });
      doc.autoTable({ startY: doc.lastAutoTable.finalY + 4, head: [['Nama', 'Kelas', 'Kuis', 'Rata', 'Terbaik', 'Terendah', 'Akurasi', 'XP', 'Menit', 'Peta', 'Catatan']],
        body: b.siswa.map(function (s) { return [s.Nama, s.Kelas, s.Kuis, s['Rata-rata'], s.Terbaik, s.Terendah, s['Akurasi (%)'] + '%', s.XP, s.Menit, s['Progres Peta (%)'] + '%', s.Catatan || '']; }),
        styles: { fontSize: 8.5, cellPadding: 1.8 }, headStyles: { fillColor: [0, 101, 141] }, alternateRowStyles: { fillColor: [245, 242, 255] }, margin: { left: 12, right: 12 } });
      if (b.topik.length) {
        doc.autoTable({ startY: doc.lastAutoTable.finalY + 6, head: [['Pulau', 'Topik', 'Penguasaan', 'Jawaban', 'Kategori']], body: b.topik.map(function (t) { return [t.Pulau, t.Topik, t['Penguasaan (%)'] + '%', t.Jawaban, t.Kategori]; }),
          styles: { fontSize: 8.5, cellPadding: 1.8 }, headStyles: { fillColor: [167, 58, 5] }, margin: { left: 12, right: 12 } });
      }
      const n = doc.internal.getNumberOfPages();
      for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(108, 108, 138); doc.text('Dicetak ' + PC.tgl(new Date().toISOString(), true) + ' · halaman ' + i + '/' + n, 12, doc.internal.pageSize.getHeight() - 6); }
      doc.save(namaBerkas(d, 'pdf'));
    } catch (e) { PC.toast('PDF gagal dibuat: ' + e.message, 'galat'); } finally { selesai(); }
  }
})();
