/* =====================================================================
   admin-notif.js — WhatsApp & Notifikasi (Blast per batch 10/20/50,
   Antrean, Konfigurasi + matriks event) · CRM Kontak (sinkron, tag,
   opt-out, cek WA, duplikat & gabung, import/ekspor, riwayat interaksi)
   ===================================================================== */
(function () {
  'use strict';
  const A = window.A, $ = A.$, $$ = A.$$, esc = PC.esc, ik = PC.ik;
  const VAR_BLAST = ['nama', 'anak', 'kelas', 'app', 'institusi', 'link'];

  /* =================================================================
   * WHATSAPP & NOTIFIKASI
   * ================================================================= */
  let tabWa = 'blast', saringAntrean = { status: '', kanal: '', blastId: '' };
  A.hal.wa = { render: function (el) {
    const sa = A.bisa('SA');
    if (A.blastPenerima) tabWa = 'blast';
    el.innerHTML = '<div class="kepala-hal"><div><h1>WhatsApp &amp; Notifikasi</h1><p>Kirim kabar ke orang tua/wali lewat WhatsApp (Fonnte) dan email. Semua pesan masuk antrean dan dikirim bertahap agar nomor aman dari blokir.</p></div></div>' +
      '<div class="tab-hal" role="tablist">' + [['blast', 'campaign', 'Blast WA'], ['antrean', 'outbox', 'Antrean Kirim']].concat(sa ? [['konfig', 'settings', 'Konfigurasi']] : []).map(function (t) {
        return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (tabWa === t[0]) + '">' + ik(t[1], 's20') + t[2] + '</button>';
      }).join('') + '</div><div id="waIsi"></div>';
    const isi = $('#waIsi', el);
    const buka = function () {
      $$('[data-tab]', el).forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === tabWa)); });
      A.rendNo++;
      if (tabWa === 'antrean') tabAntrean(isi); else if (tabWa === 'konfig' && sa) tabKonfig(isi); else tabBlast(isi, el);
    };
    $$('[data-tab]', el).forEach(function (b) { b.onclick = function () { tabWa = b.dataset.tab; buka(); }; });
    A.keTabAntrean = function (blastId) { tabWa = 'antrean'; saringAntrean = { status: '', kanal: '', blastId: blastId || '' }; buka(); };
    buka();
  } };

  /* ---------- Blast ---------- */
  function tabBlast(w) {
    const cfg = A.cache['notif.config|{}'] || {};
    const B = { sumber: A.blastPenerima ? 'pilihan' : 'kelas', penerima: A.blastPenerima || null, ringkas: null, ukuran: cfg.batchDefault || 20 };
    A.blastPenerima = null;
    w.innerHTML = '<div class="grid-2a" style="margin-top:6px"><section class="kartu kolom g16"><div class="judul-kartu" style="margin:0"><h2>' + ik('campaign') + 'Buat Blast Baru</h2></div>' +
      '<label class="medan"><span>Judul blast (untuk arsip)</span><input class="isian" id="bJudul" maxlength="80" placeholder="Undangan rapat orang tua, info libur…"></label>' +
      '<div class="medan"><span>Penerima</span><div class="segmen" role="group" aria-label="Sumber penerima" id="bSumber">' + [['kelas', 'Wali per kelas'], ['crm', 'Kontak CRM'], ['manual', 'Nomor manual']].concat(B.sumber === 'pilihan' ? [['pilihan', 'Pilihan dari CRM']] : []).map(function (s) {
        return '<button type="button" data-sumber="' + s[0] + '" aria-pressed="' + (B.sumber === s[0]) + '">' + s[1] + '</button>';
      }).join('') + '</div></div><div id="bOpsi"></div>' +
      '<div class="flex g8 bungkus"><button class="btn biru kecil" id="bMuat">' + ik('group_add', 's18') + 'Muat penerima</button><button class="btn putih kecil" id="bCek" hidden>' + ik('verified', 's18') + 'Cek nomor terdaftar WA</button></div>' +
      '<div id="bRingkas"></div>' +
      '<label class="medan"><span>Isi pesan</span><textarea class="isian" id="bPesan" rows="7" maxlength="2000" placeholder="Assalamu\'alaikum Bapak/Ibu {nama}, …"></textarea><small>Variabel: ' + VAR_BLAST.map(function (v) { return '<button type="button" class="var-chip" data-var="' + v + '">{' + v + '}</button>'; }).join('') + ' · {anak} & {kelas} terisi untuk wali siswa.</small></label>' +
      '<div class="grid-form"><div class="medan"><span>Ukuran batch (pesan per batch)</span><div class="segmen" role="group" aria-label="Ukuran batch" id="bUkuran">' + [10, 20, 50].map(function (n) { return '<button type="button" data-ukuran="' + n + '" aria-pressed="' + (B.ukuran === n) + '">' + n + '</button>'; }).join('') + '</div><small>1 batch dikirim tiap ±1 menit oleh pemicu otomatis.</small></div>' +
      '<label class="medan"><span>Jeda antarpesan (detik)</span><input class="isian" id="bJeda" value="' + esc(cfg.jeda || '5') + '" placeholder="5 atau 3-8"><small>Rentang acak (mis. 3-8) lebih alami.</small></label></div>' +
      '<label class="saklar"><input type="checkbox" id="bHanyaWA" checked><i></i><span>Lewati nomor yang tercatat tidak terdaftar WhatsApp</span></label>' +
      '<div class="catatan-info kuning">' + ik('shield', 'isi') + '<span>Nomor tidak valid, ganda, dan yang memilih <b>berhenti berlangganan (opt-out)</b> otomatis dibuang. Hindari blast promosi berulang — kirim informasi yang memang dibutuhkan wali.</span></div>' +
      '<button class="btn oranye besar" id="bKirim">' + ik('send', 'isi') + 'Mulai Blast</button></section>' +
      '<section class="kolom g16"><div class="kartu"><div class="judul-kartu"><h2>' + ik('smartphone') + 'Pratinjau</h2></div><div class="pratinjau-wa"><div class="gelembung-wa" id="bPrev">Tulis pesan untuk melihat pratinjau…</div></div></div>' +
      '<div class="kartu"><div class="judul-kartu"><h2>' + ik('history') + 'Riwayat Blast</h2><button class="btn hantu kecil" id="bSegar">' + ik('refresh', 's18') + 'Segarkan</button></div><div id="bDaftar">' + A.kerangka([70, 70]) + '</div></div></section></div>';
    const opsiSumber = function () {
      const o = $('#bOpsi', w);
      if (B.sumber === 'kelas') o.innerHTML = '<div class="daftar-cek" id="bKelas">' + A.boot.kelas.filter(function (k) { return k.status !== 'arsip'; }).map(function (k) { return '<label><input type="checkbox" value="' + esc(k.id) + '"' + (!A.kelas || A.kelas === k.id ? ' checked' : '') + '><span>Kelas ' + esc(k.nama) + '</span><span class="redup kecil" style="margin-left:auto">' + k.jumlahSiswa + ' siswa</span></label>'; }).join('') + '</div>';
      else if (B.sumber === 'crm') o.innerHTML = '<div class="grid-form"><label class="medan"><span>Segmen</span><select class="isian" id="bSegmen"><option value="">Semua segmen</option><option>Orang Tua/Wali</option><option>Guru</option><option>Admin &amp; Staf</option><option>Lainnya</option></select></label><label class="medan"><span>Tag (opsional)</span><input class="isian" id="bTag" placeholder="mis. komite"></label></div>';
      else if (B.sumber === 'manual') o.innerHTML = '<label class="medan"><span>Satu nomor per baris (boleh: nomor | nama)</span><textarea class="isian" id="bManual" rows="4" placeholder="081234567890 | Ibu Rina&#10;6281298765432"></textarea></label>';
      else o.innerHTML = '<div class="catatan-info">' + ik('contacts', 'isi') + '<span>' + B.penerima.length + ' kontak dipilih dari CRM.</span></div>';
      if (B.sumber === 'pilihan' && B.penerima) gambarRingkas(ringkasLokal(B.penerima));
    };
    const ringkasLokal = function (rows) { const r = { total: rows.length, valid: 0, tidakValid: 0, ganda: 0, terdaftarWA: 0, tidakTerdaftarWA: 0, optOut: 0 }; rows.forEach(function (x) { if (x.valid) r.valid++; else r.tidakValid++; if (x.statusWA === 'Terdaftar') r.terdaftarWA++; if (x.statusWA === 'Tidak Terdaftar') r.tidakTerdaftarWA++; if (x.optOut) r.optOut++; }); return r; };
    const gambarRingkas = function (r) {
      B.ringkas = r;
      const kirim = penerimaKirim();
      $('#bRingkas', w).innerHTML = '<div class="kartu lav kolom g8" style="padding:14px"><div class="ringkas-pil"><span class="pil biru">' + r.total + ' total</span><span class="pil hijau">' + r.valid + ' nomor valid</span><span class="pil lav">' + r.tidakValid + ' tidak valid</span><span class="pil lav">' + r.ganda + ' ganda</span><span class="pil hijau">' + r.terdaftarWA + ' terdaftar WA</span><span class="pil oranye">' + r.tidakTerdaftarWA + ' tidak terdaftar</span><span class="pil merah">' + r.optOut + ' opt-out</span></div>' +
        '<b>' + kirim.length + ' pesan akan dikirim</b><span class="kecil redup">≈ ' + Math.ceil(kirim.length / B.ukuran) + ' batch × ' + B.ukuran + ' · perkiraan selesai ±' + Math.max(1, Math.ceil(kirim.length / B.ukuran)) + ' menit</span></div>';
      $('#bCek', w).hidden = !(r.valid - r.terdaftarWA - r.tidakTerdaftarWA > 0);
      pratinjau();
    };
    const penerimaKirim = function () {
      if (!B.penerima) return [];
      const lihat = {};
      return B.penerima.filter(function (p) {
        if (!p.valid || p.optOut || lihat[p.hp]) return false;
        if ($('#bHanyaWA', w).checked && p.statusWA === 'Tidak Terdaftar') return false;
        lihat[p.hp] = 1; return true;
      });
    };
    const pratinjau = function () {
      const t = $('#bPesan', w).value, p = (penerimaKirim()[0] || {});
      const v = Object.assign({ nama: 'Bapak/Ibu Rina', anak: 'Aisyah', kelas: '3A', app: A.boot.setting.NAMA_APP || 'Petualangan Cerdas', institusi: A.boot.setting.NAMA_SEKOLAH || '', link: A.urlSiswa() }, p.vars || {});
      $('#bPrev', w).textContent = t ? t.replace(/\{(\w+)\}/g, function (m, k) { return v[k] === undefined ? m : v[k]; }) : 'Tulis pesan untuk melihat pratinjau…';
    };
    const muatPenerima = async function (btn) {
      const d = { sumber: B.sumber };
      if (B.sumber === 'kelas') { d.kelasIds = $$('#bKelas input:checked', w).map(function (c) { return c.value; }); if (!d.kelasIds.length) { PC.toast('Pilih minimal satu kelas.', 'info'); return; } }
      else if (B.sumber === 'crm') { d.segmen = $('#bSegmen', w).value; d.tag = $('#bTag', w).value.trim(); }
      else if (B.sumber === 'manual') d.manual = $('#bManual', w).value;
      else return;
      const selesai = btn ? PC.memuatTombol(btn, 'Memuat…') : function () {};
      const r = await PC.api('wa.audience', d);
      selesai();
      if (!r.success) { PC.toast(r.message, 'galat'); return; }
      B.penerima = r.data.rows;
      gambarRingkas(r.data.ringkas);
    };
    const daftarBlast = function () {
      A.swr('wa.blastList', {}, function (d) {
        const box = $('#bDaftar', w); if (!box) return;
        box.innerHTML = d.rows.length ? '<div class="kolom g10">' + d.rows.slice(0, 15).map(function (b) {
          const warna = { Berjalan: 'biru', Selesai: 'hijau', Dihentikan: 'lav' }[b.status] || 'lav';
          return '<div class="kartu lav" style="padding:14px"><div class="flex antara tengah g8 bungkus"><b>' + esc(b.judul) + '</b><span class="pil ' + warna + '">' + esc(b.status) + '</span></div><div class="kecil redup">' + esc(PC.tgl(b.tanggal, true)) + ' · ' + esc(b.sasaran) + ' · batch ' + b.batch + '</div>' +
            '<div class="flex tengah g10" style="margin-top:8px"><div class="bar-kemajuan isi1"><i style="width:' + b.persen + '%"></i></div><span class="kecil tebal">' + b.persen + '%</span></div><div class="kecil">' + b.terkirim + ' terkirim · ' + b.gagal + ' gagal · ' + b.sisa + ' sisa</div>' +
            '<div class="flex g6 bungkus" style="margin-top:8px">' + (b.status === 'Berjalan' ? '<button class="btn biru kecil" data-proses="' + esc(b.id) + '">' + ik('bolt', 's18') + 'Kirim batch berikutnya</button><button class="btn hantu kecil" data-stop="' + esc(b.id) + '">' + ik('stop_circle', 's18') + 'Hentikan</button>' : '') + '<button class="btn teks kecil" data-lihat="' + esc(b.id) + '">Lihat antrean →</button></div></div>';
        }).join('') + '</div>' : '<div class="kosong"><div class="emoji">📣</div><p>Belum ada blast.</p></div>';
        if (d.rows.some(function (b) { return b.status === 'Berjalan'; })) setTimeout(function () { if ($('#bDaftar', w) && PC.Aktivitas.due('blast', 15000, 60000)) { delete A.cache['wa.blastList|{}']; daftarBlast(); } }, 15500);
      }, { tetap: false });
    };
    w.onclick = async function (e) {
      const t = e.target.closest('[data-sumber],[data-ukuran],[data-var],#bMuat,#bCek,#bKirim,#bSegar,[data-proses],[data-stop],[data-lihat]'); if (!t) return;
      if (t.dataset.sumber) { B.sumber = t.dataset.sumber; if (B.sumber !== 'pilihan') { B.penerima = null; $('#bRingkas', w).innerHTML = ''; } $$('[data-sumber]', w).forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); }); opsiSumber(); }
      else if (t.dataset.ukuran) { B.ukuran = Number(t.dataset.ukuran); $$('[data-ukuran]', w).forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); }); if (B.ringkas) gambarRingkas(B.ringkas); }
      else if (t.dataset.var) { const ta = $('#bPesan', w), s = ta.selectionStart || ta.value.length; ta.value = ta.value.slice(0, s) + '{' + t.dataset.var + '}' + ta.value.slice(ta.selectionEnd || s); ta.focus(); pratinjau(); }
      else if (t.id === 'bMuat') muatPenerima(t);
      else if (t.id === 'bCek') {
        const belum = B.penerima.filter(function (p) { return p.valid && !p.statusWA; }).map(function (p) { return p.hp; });
        const selesai = PC.memuatTombol(t, 'Mengecek…');
        let dicek = 0;
        for (let i = 0; i < belum.length && i < 500; i += 50) {
          const r = await PC.api('wa.validate', { nomor: belum.slice(i, i + 50) });
          if (!r.success) { PC.toast(r.message, 'galat'); break; }
          dicek += r.data.dicek;
          Object.keys(r.data.hasil).forEach(function (hp) { B.penerima.forEach(function (p) { if (p.hp === hp) p.statusWA = r.data.hasil[hp]; }); });
        }
        selesai();
        PC.toast(dicek + ' nomor dicek.', 'ok');
        gambarRingkas(ringkasLokal(B.penerima));
      } else if (t.id === 'bKirim') {
        const kirim = penerimaKirim(), pesan = $('#bPesan', w).value.trim();
        if (!kirim.length) { PC.toast('Muat penerima dulu.', 'info'); return; }
        if (pesan.length < 3) { PC.toast('Isi pesan dulu.', 'info'); return; }
        const ya = await PC.konfirmasi('Kirim ke ' + kirim.length + ' nomor dalam ' + Math.ceil(kirim.length / B.ukuran) + ' batch (' + B.ukuran + ' per batch)?', { judul: 'Mulai blast?', ya: 'Mulai kirim', ikon: 'send' });
        if (!ya) return;
        const r = await A.tulis('wa.blastCreate', { judul: $('#bJudul', w).value.trim(), pesan: pesan, ukuranBatch: B.ukuran, jeda: $('#bJeda', w).value.trim(), sasaran: (B.sumber === 'kelas' ? 'Wali ' : B.sumber === 'manual' ? 'Manual ' : 'CRM ') + kirim.length + ' nomor',
          penerima: kirim.map(function (p) { return { hp: p.hp, nama: p.nama, vars: p.vars }; }) }, { btn: t, memuat: 'Membuat antrean…' });
        if (r.success) { daftarBlast(); $('#bPesan', w).value = ''; pratinjau(); }
      } else if (t.id === 'bSegar') { delete A.cache['wa.blastList|{}']; daftarBlast(); }
      else if (t.dataset.proses) { const selesai = PC.memuatTombol(t, 'Mengirim…'); const r = await PC.api('wa.blastProcess', { blastId: t.dataset.proses }); selesai(); if (r.success) PC.toast(r.data.terkirim + ' terkirim · ' + r.data.sisa + ' sisa', 'ok'); else PC.toast(r.message, 'galat'); delete A.cache['wa.blastList|{}']; daftarBlast(); }
      else if (t.dataset.stop) { const ya = await PC.konfirmasi('Pesan yang belum terkirim dibatalkan.', { judul: 'Hentikan blast?', ya: 'Hentikan', bahaya: true, ikon: 'stop_circle' }); if (ya && (await A.tulis('wa.blastStop', { blastId: t.dataset.stop })).success) daftarBlast(); }
      else if (t.dataset.lihat) A.keTabAntrean(t.dataset.lihat);
    };
    w.oninput = function (e) { if (e.target.id === 'bPesan') pratinjau(); };
    w.onchange = function (e) { if (e.target.id === 'bHanyaWA' && B.ringkas) gambarRingkas(B.ringkas); };
    opsiSumber();
    daftarBlast();
    if (!cfg.batchDefault && A.bisa('SA')) PC.apiQ('notif.config', {}).then(function (r) { if (r.success) A.cache['notif.config|{}'] = r.data; });
  }

  /* ---------- Antrean ---------- */
  function tabAntrean(w) {
    const sa = A.bisa('SA');
    w.innerHTML = '<section class="kartu" style="margin-top:6px"><div class="judul-kartu"><div class="ringkas-pil" id="aRingkas"></div><div class="flex g8 bungkus"><select class="isian kecil" id="aKanal" aria-label="Kanal"><option value="">Semua kanal</option><option value="WA">WhatsApp</option><option value="EMAIL">Email</option></select>' +
      '<button class="btn biru kecil" id="aProses">' + ik('bolt', 's18') + 'Proses antrean sekarang</button>' + (sa ? '<button class="btn putih kecil" id="aUlang">' + ik('replay', 's18') + 'Kirim ulang yang gagal</button>' : '') + '</div></div>' +
      (saringAntrean.blastId ? '<div class="catatan-info" style="margin-bottom:12px">' + ik('filter_alt', 'isi') + '<span>Menampilkan blast <b>' + esc(saringAntrean.blastId) + '</b>. <a href="#" id="aSemua">Tampilkan semua</a></span></div>' : '') +
      '<div id="aTabel">' + A.kerangka([60, 60, 60]) + '</div></section>';
    $('#aKanal', w).value = saringAntrean.kanal;
    let tbl = null;
    const muat = function () {
      A.swr('notif.queue', Object.assign({}, saringAntrean), function (d) {
        const r = d.ringkas;
        $('#aRingkas', w).innerHTML = [['', 'Semua', 'lav'], ['Antri', 'Antri', 'biru'], ['Proses', 'Proses', 'kuning'], ['Terkirim', 'Terkirim', 'hijau'], ['Gagal', 'Gagal', 'merah'], ['Batal', 'Batal', 'lav']].map(function (x) {
          return '<button class="pil ' + x[2] + '" data-st="' + x[0] + '" aria-pressed="' + (saringAntrean.status === x[0]) + '">' + x[1] + (x[0] ? ' · ' + (r[x[0]] || 0) : '') + '</button>';
        }).join('');
        if (!tbl) tbl = A.Tabel($('#aTabel', w), { rows: [], per: 30, urut: 'dibuat', kosong: 'Antrean kosong.', emojiKosong: '📭',
          kolom: [
            { k: 'dibuat', judul: 'Dibuat', urut: function (x) { return new Date(x.dibuat).getTime() || 0; }, html: function (x) { return '<span class="kecil">' + esc(PC.tgl(x.dibuat, true)) + '</span>'; } },
            { k: 'kanal', judul: 'Kanal', html: function (x) { return '<span class="pil ' + (x.kanal === 'WA' ? 'hijau' : 'biru') + '">' + ik(x.kanal === 'WA' ? 'chat' : 'mail', 's16') + esc(x.kanal) + '</span>'; } },
            { k: 'nama', judul: 'Penerima', html: function (x) { return '<b>' + esc(x.nama || '—') + '</b><div class="kecil redup">' + esc(x.tujuan) + '</div>'; } },
            { k: 'event', judul: 'Jenis', html: function (x) { return '<span class="kecil">' + esc(x.event || '') + '</span>'; } },
            { k: 'pesan', judul: 'Pesan', urut: false, html: function (x) { return '<div class="log-detail">' + esc(x.pesan) + '</div>'; } },
            { k: 'status', judul: 'Status', html: function (x) { const w2 = { Antri: 'biru', Proses: 'kuning', Terkirim: 'hijau', Gagal: 'merah', Batal: 'lav' }[x.status] || 'lav'; return '<span class="pil ' + w2 + '">' + esc(x.status) + '</span>' + (x.percobaan > 1 ? ' <span class="kecil redup">×' + x.percobaan + '</span>' : ''); } },
            { k: 'respon', judul: 'Respons', urut: false, html: function (x) { return '<span class="kecil redup">' + esc(String(x.respon || '').slice(0, 80)) + '</span>'; } }
          ] });
        tbl.set(d.rows);
      }, { galat: function (r) { A.kartuGalat($('#aTabel', w), r, muat); } });
    };
    muat();
    w.onclick = async function (e) {
      const t = e.target.closest('[data-st],#aProses,#aUlang,#aSemua'); if (!t) return;
      if (t.dataset.st !== undefined) { saringAntrean.status = t.dataset.st; muat(); }
      else if (t.id === 'aSemua') { e.preventDefault(); saringAntrean.blastId = ''; tabAntrean(w); }
      else if (t.id === 'aProses') { const r = await A.tulis('notif.processNow', {}, { btn: t, memuat: 'Memproses…' }); if (r.success) muat(); }
      else if (t.id === 'aUlang') { const r = await A.tulis('notif.retry', {}, { btn: t }); if (r.success) muat(); }
    };
    $('#aKanal', w).onchange = function () { saringAntrean.kanal = this.value; muat(); };
  }

  /* ---------- Konfigurasi ---------- */
  function tabKonfig(w) {
    w.innerHTML = A.kerangka([200, 300]);
    A.swr('notif.config', {}, function (c) {
      const matriks = JSON.parse(JSON.stringify(c.matriks));
      w.innerHTML = '<div class="grid-2a" style="margin-top:6px"><section class="kartu kolom" style="gap:14px"><div class="judul-kartu" style="margin:0"><h2>' + ik('chat') + 'WhatsApp (Fonnte)</h2><span class="pil ' + (c.tokenAda ? 'hijau' : 'oranye') + '">' + (c.tokenAda ? 'Token tersimpan ' + esc(c.token) : 'Token belum diisi') + '</span></div>' +
        '<label class="medan"><span>Token Fonnte</span><input class="isian" id="kToken" type="password" autocomplete="off" placeholder="' + (c.tokenAda ? 'Kosongkan bila tidak diganti' : 'Tempel token dari md.fonnte.com → Device') + '"><small>Disimpan di Script Properties (FONNTE_TOKEN), tidak pernah di Sheets atau dikirim balik ke browser.</small></label>' +
        '<label class="saklar"><input type="checkbox" id="kWa"' + (c.waAktif ? ' checked' : '') + '><i></i><span>Aktifkan notifikasi WhatsApp</span></label>' +
        '<div class="grid-form"><div class="medan"><span>Batch bawaan</span><div class="segmen" id="kBatch" role="group" aria-label="Batch bawaan">' + [10, 20, 50].map(function (n) { return '<button type="button" data-b="' + n + '" aria-pressed="' + (c.batchDefault === n) + '">' + n + '</button>'; }).join('') + '</div></div>' +
        '<label class="medan"><span>Jeda (detik)</span><input class="isian" id="kJeda" value="' + esc(c.jeda) + '"></label></div>' +
        '<label class="saklar"><input type="checkbox" id="kDeteksi"' + (c.deteksiOtomatis ? ' checked' : '') + '><i></i><span>Cek otomatis nomor terdaftar WA (saat sinkron)</span></label>' +
        '<div class="flex g8 bungkus"><button class="btn putih kecil" id="kDevice">' + ik('devices', 's18') + 'Cek perangkat</button><input class="isian kecil" id="kTesNo" placeholder="08… untuk tes" style="max-width:170px"><button class="btn putih kecil" id="kTesWa">' + ik('send', 's18') + 'Kirim tes WA</button></div><div id="kDevInfo"></div></section>' +
        '<section class="kartu kolom" style="gap:14px"><div class="judul-kartu" style="margin:0"><h2>' + ik('mail') + 'Email &amp; Umum</h2><span class="pil lav">Sisa kuota email hari ini: ' + (c.sisaKuotaEmail === null ? '?' : c.sisaKuotaEmail) + '</span></div>' +
        '<label class="saklar"><input type="checkbox" id="kEmail"' + (c.emailAktif ? ' checked' : '') + '><i></i><span>Aktifkan notifikasi email (MailApp)</span></label>' +
        '<label class="medan"><span>Nama pengirim email</span><input class="isian" id="kNama" maxlength="60" value="' + esc(c.namaPengirim) + '"></label>' +
        '<label class="medan"><span>URL aplikasi siswa (untuk tautan di pesan)</span><input class="isian" id="kUrl" value="' + esc(c.appUrl) + '" placeholder="https://nama.github.io/petualangan-cerdas/"><small>Terisi otomatis saat Superadmin masuk dari GitHub Pages.</small></label>' +
        '<div class="flex g8 bungkus"><input class="isian kecil" id="kTesEmail" placeholder="email untuk tes" value="' + esc(A.boot.me.email.indexOf('@') > -1 ? A.boot.me.email : '') + '" style="max-width:240px"><button class="btn putih kecil" id="kTesMail">' + ik('send', 's18') + 'Kirim tes email</button></div>' +
        '<div class="catatan-info' + (c.trigger ? ' hijau' : ' kuning') + '">' + ik(c.trigger ? 'schedule' : 'warning', 'isi') + '<span>' + (c.trigger ? 'Pemicu tiap menit aktif: antrean, rapor mingguan (hari ke-' + c.raporHari + ' pukul ' + c.raporJam + ':00) & pengingat pasif (' + c.pasifHari + ' hari) berjalan otomatis.' : 'Pemicu otomatis belum terpasang. Simpan konfigurasi ini atau jalankan pasangTrigger() di editor Apps Script.') + '</span></div></section></div>' +
        '<section class="kartu" style="margin-top:18px"><div class="judul-kartu"><div><h2>' + ik('table_chart') + 'Matriks Notifikasi</h2><p>Pilih kanal untuk tiap kejadian dan sesuaikan isi pesannya.</p></div></div><div class="tabel-wadah"><table class="tabel matriks"><thead><tr><th>Kejadian</th><th>Penerima</th><th>WhatsApp</th><th>Email</th><th>Template</th></tr></thead><tbody>' +
        matriks.map(function (m, i) {
          return '<tr><td><b>' + esc(m.label) + '</b><div class="kecil redup mono">' + esc(m.kode) + '</div></td><td class="kecil">' + esc(m.penerima) + '</td>' +
            '<td><label class="saklar"><input type="checkbox" data-mx="' + i + '" data-k="wa"' + (m.wa ? ' checked' : '') + ' aria-label="WhatsApp ' + esc(m.label) + '"><i></i></label></td>' +
            '<td><label class="saklar"><input type="checkbox" data-mx="' + i + '" data-k="email"' + (m.email ? ' checked' : '') + ' aria-label="Email ' + esc(m.label) + '"><i></i></label></td>' +
            '<td><button class="btn hantu kecil" data-tpl="' + i + '">' + ik('edit_note', 's18') + 'Ubah' + (m.pesan !== m.pesanDefault || m.subjek !== m.subjekDefault ? ' <span class="pil kuning" style="padding:1px 6px">diubah</span>' : '') + '</button></td></tr>';
        }).join('') + '</tbody></table></div><div class="flex g10" style="justify-content:flex-end;margin-top:16px"><button class="btn biru besar" id="kSimpan">' + ik('save') + 'Simpan Konfigurasi</button></div></section>';
      let batch = c.batchDefault;
      w.onclick = async function (e) {
        const t = e.target.closest('[data-b],[data-tpl],#kDevice,#kTesWa,#kTesMail,#kSimpan'); if (!t) return;
        if (t.dataset.b) { batch = Number(t.dataset.b); $$('#kBatch button', w).forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); }); }
        else if (t.dataset.tpl) editTemplate(matriks[Number(t.dataset.tpl)]);
        else if (t.id === 'kDevice') { const s = PC.memuatTombol(t, 'Mengecek…'); const r = await PC.api('wa.device', {}); s(); $('#kDevInfo', w).innerHTML = r.success ? '<dl class="kv"><dt>Nomor</dt><dd>' + esc(r.data.nomor) + '</dd><dt>Status</dt><dd>' + esc(r.data.status) + '</dd><dt>Paket</dt><dd>' + esc(r.data.paket) + '</dd><dt>Kuota</dt><dd>' + esc(r.data.kuota) + '</dd><dt>Kedaluwarsa</dt><dd>' + esc(r.data.kedaluwarsa) + '</dd></dl>' : '<div class="catatan-info merah">' + ik('error', 'isi') + esc(r.message) + '</div>'; }
        else if (t.id === 'kTesWa') { const r = await A.tulis('wa.test', { nomor: $('#kTesNo', w).value.trim() }, { btn: t }); void r; }
        else if (t.id === 'kTesMail') { await A.tulis('email.test', { email: $('#kTesEmail', w).value.trim() }, { btn: t }); }
        else if (t.id === 'kSimpan') {
          const m = {};
          matriks.forEach(function (x) { m[x.kode] = { wa: x.wa, email: x.email, pesan: x.pesan, subjek: x.subjek }; });
          const d = { waAktif: $('#kWa', w).checked, emailAktif: $('#kEmail', w).checked, batchDefault: batch, jeda: $('#kJeda', w).value.trim(), deteksiOtomatis: $('#kDeteksi', w).checked, namaPengirim: $('#kNama', w).value.trim(), appUrl: $('#kUrl', w).value.trim(), matriks: m };
          const tk = $('#kToken', w).value.trim();
          if (tk) d.token = tk;
          const r = await A.tulis('notif.configSave', d, { btn: t, memuat: 'Menyimpan…' });
          if (r.success) { A.cache['notif.config|{}'] = r.data; tabKonfig(w); }
        }
      };
      w.onchange = function (e) { const c2 = e.target; if (c2.dataset.mx !== undefined) matriks[Number(c2.dataset.mx)][c2.dataset.k] = c2.checked; };
      function editTemplate(m) {
        PC.modal({ judul: 'Template: ' + m.label, ikon: 'edit_note', lebar: 'lebar', isi:
          '<label class="medan"><span>Subjek email</span><input class="isian" id="tSubjek" maxlength="150" value="' + esc(m.subjek) + '"></label>' +
          '<label class="medan"><span>Isi pesan (WhatsApp & email)</span><textarea class="isian" id="tPesan" rows="9" maxlength="1500">' + esc(m.pesan) + '</textarea><small>Variabel: ' + m.vars.map(function (v) { return '<button type="button" class="var-chip" data-v="' + v + '">{' + v + '}</button>'; }).join('') + ' · *tebal* untuk huruf tebal di WhatsApp.</small></label>' +
          '<div class="pratinjau-wa"><div class="gelembung-wa" id="tPrev"></div></div>',
          tombol: [{ teks: 'Kembalikan bawaan', kelas: 'hantu', aksi: function (tutup, t) { $('#tSubjek', t).value = m.subjekDefault; $('#tPesan', t).value = m.pesanDefault; prev(t); return false; } }, { teks: 'Batal' }, { teks: 'Pakai template', kelas: 'biru', ikon: 'check', aksi: function (tutup, t) { m.subjek = $('#tSubjek', t).value.trim() || m.subjekDefault; m.pesan = $('#tPesan', t).value.trim() || m.pesanDefault; PC.toast('Template diperbarui. Klik "Simpan Konfigurasi" untuk menyimpan.', 'info'); } }],
          saatBuka: function (t) {
            t.addEventListener('input', function () { prev(t); });
            t.addEventListener('click', function (e) { const v = e.target.closest('[data-v]'); if (!v) return; const ta = $('#tPesan', t), s = ta.selectionStart; ta.value = ta.value.slice(0, s) + '{' + v.dataset.v + '}' + ta.value.slice(ta.selectionEnd); prev(t); });
            prev(t);
          } });
        function prev(t) {
          const contoh = { wali: 'Ibu Rina', nama: 'Aisyah', namaLengkap: 'Aisyah Putri', kelas: '3A', kode: 'CERIA3', pin: '4821', link: A.urlSiswa(), app: A.boot.setting.NAMA_APP || 'Petualangan Cerdas', institusi: A.boot.setting.NAMA_SEKOLAH || 'SD', level: 4, namaLevel: 'Penjaga Hutan', lencana: 'Bintang Kecil', guru: 'Ibu Dewi', pesan: 'Ayo latihan pecahan ya!', bintang: 1, kuis: 6, xp: 240, streak: 4, kuat: 'Perkalian', latih: 'Pecahan', hari: 4, peran: 'guru' };
          $('#tPrev', t).textContent = $('#tPesan', t).value.replace(/\{(\w+)\}/g, function (x, k) { return contoh[k] === undefined ? x : contoh[k]; });
        }
      }
    }, { galat: function (r) { A.kartuGalat(w, r, function () { tabKonfig(w); }); } });
  }

  /* =================================================================
   * CRM KONTAK
   * ================================================================= */
  const FC = { cari: '', segmen: '', kelas: '', tag: '', statusWA: '', duplikat: false, masalah: false, optOut: false, hal: 1, per: 50 };
  A.hal.crm = { render: function (el) {
    const sa = A.bisa('SA');
    el.innerHTML = '<div class="kepala-hal"><div><h1>CRM Kontak</h1><p>Buku kontak orang tua/wali dan staf yang tersinkron otomatis dari data siswa & pengguna. Satu sumber kebenaran: perubahan nomor ditulis balik ke data asal.</p></div>' +
      '<div class="aksi"><button class="btn putih" data-c="sync">' + ik('sync') + 'Sinkronkan</button><button class="btn putih" data-c="dupe">' + ik('call_merge') + 'Duplikat</button><button class="btn putih" data-c="import">' + ik('upload_file') + 'Import</button>' + (sa ? '<button class="btn putih" data-c="ekspor">' + ik('download') + 'Ekspor</button>' : '') + '</div></div>' +
      '<section class="kpi-grid" id="cStat">' + A.kerangka([100, 100, 100, 100]) + '</section>' +
      '<section class="kartu"><div class="alat" style="margin-bottom:14px"><div class="cari"><span class="ik" aria-hidden="true">search</span><input class="isian" id="cCari" type="search" placeholder="Cari nama, nomor, email, siswa…" aria-label="Cari kontak" value="' + esc(FC.cari) + '"></div>' +
      '<select class="isian" id="cSegmen" aria-label="Segmen"></select><select class="isian" id="cKelasF" aria-label="Kelas"></select><select class="isian" id="cTag" aria-label="Tag"></select><select class="isian" id="cWA" aria-label="Status WA"></select>' +
      '<label class="saklar kecil"><input type="checkbox" id="cDupe"' + (FC.duplikat ? ' checked' : '') + '><i></i><span>Duplikat</span></label><label class="saklar kecil"><input type="checkbox" id="cMasalah"' + (FC.masalah ? ' checked' : '') + '><i></i><span>Bermasalah</span></label><label class="saklar kecil"><input type="checkbox" id="cOpt"' + (FC.optOut ? ' checked' : '') + '><i></i><span>Opt-out</span></label></div>' +
      '<div id="cTabel">' + A.kerangka([60, 60, 60, 60]) + '</div><div id="cPaging"></div></section>';
    let data = null, tbl = null;
    const statKpi = function () {
      A.swr('crm.stats', {}, function (s) {
        const kp = function (l, n, ik2, w2, ket) { return '<div class="kpi"><div class="atas"><div><span class="lbl-up">' + l + '</span><div class="angka">' + PC.angka(n) + '</div></div><div class="blok-ikon ' + w2 + '">' + ik(ik2, 'isi s28') + '</div></div><div class="bawah">' + ket + '</div></div>'; };
        $('#cStat', el).innerHTML = kp('Total Kontak', s.total, 'contacts', 'biru', '<span>+' + s.baru7 + ' baru 7 hari</span><span class="pil lav">' + s.dihubungi30 + ' dihubungi 30 hr</span>') +
          kp('WhatsApp Valid', s.waValid, 'chat', 'hijau', '<span>' + s.terdaftarWA + ' terdaftar WA</span><span class="pil kuning">' + s.belumCek + ' belum dicek</span>') +
          kp('Email Valid', s.emailValid, 'mail', 'lav', '<span>' + s.optOut + ' opt-out</span>') +
          kp('Perlu Dirapikan', s.duplikat + s.tidakBisa, 'cleaning_services', 'oranye', '<span>' + s.duplikat + ' duplikat · ' + s.tidakBisa + ' tanpa kontak</span>') +
          (s.syncTerakhir ? '' : '');
      });
    };
    const opsi = function (sel, nama, facet, pilih) { $(sel, el).innerHTML = '<option value="">' + nama + '</option>' + Object.keys(facet || {}).sort().map(function (k) { return '<option value="' + esc(k) + '"' + (k === pilih ? ' selected' : '') + '>' + esc(k) + ' (' + facet[k] + ')</option>'; }).join(''); };
    const muat = function () {
      A.swr('crm.list', Object.assign({}, FC), function (d) {
        data = d;
        opsi('#cSegmen', 'Semua segmen', d.facet.segmen, FC.segmen); opsi('#cKelasF', 'Semua kelas', d.facet.kelas, FC.kelas); opsi('#cTag', 'Semua tag', d.facet.tag, FC.tag); opsi('#cWA', 'Semua status WA', d.facet.statusWA, FC.statusWA);
        if (!tbl) tbl = A.Tabel($('#cTabel', el), { rows: [], per: 500, tampilJumlah: false, pilih: true, kosong: d.total === 0 && !FC.cari ? 'Belum ada kontak. Klik "Sinkronkan" untuk menarik kontak wali & staf.' : 'Tidak ada kontak yang cocok.', emojiKosong: '📇',
          klikBaris: function (id) { detailKontak(id, muat); },
          kolom: [
            { k: 'nama', judul: 'Nama', html: function (k) { return '<b>' + esc(k.nama) + '</b><div class="kecil"><span class="pil lav" style="padding:1px 8px">' + esc(k.segmen) + '</span>' + (k.duplikat ? ' <span class="pil kuning" style="padding:1px 8px">duplikat</span>' : '') + (k.optOut ? ' <span class="pil merah" style="padding:1px 8px">opt-out</span>' : '') + '</div>'; } },
            { k: 'wa', judul: 'WhatsApp', html: function (k) { return k.wa ? '<span class="mono">' + esc(k.wa) + '</span> ' + (k.statusWA === 'Terdaftar' ? '<span class="pil hijau" style="padding:1px 7px">WA ✓</span>' : k.statusWA === 'Tidak Terdaftar' ? '<span class="pil merah" style="padding:1px 7px">bukan WA</span>' : '<span class="pil lav" style="padding:1px 7px">belum dicek</span>') : '<span class="redup">—</span>'; } },
            { k: 'email', judul: 'Email', html: function (k) { return k.email ? esc(k.email) : '<span class="redup">—</span>'; } },
            { k: 'info', judul: 'Keterangan', urut: false, html: function (k) { return k.info.Siswa ? '<span class="kecil">Wali <b>' + esc(k.info.SiswaLengkap || k.info.Siswa) + '</b> · ' + esc(k.info.Kelas || '') + '</span>' : k.info.Peran ? '<span class="kecil">' + esc(A.PERAN[k.info.Peran] || k.info.Peran) + '</span>' : '<span class="kecil redup">' + esc(k.sumber) + '</span>'; } },
            { k: 'tag', judul: 'Tag', urut: false, html: function (k) { return k.tag.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join(''); } },
            { k: 'jumlahPesan', judul: 'Pesan', kelas: 'kanan' },
            { k: 'terakhir', judul: 'Dihubungi', html: function (k) { return k.terakhir ? '<span class="kecil">' + esc(PC.relatif(k.terakhir)) + '</span>' : '<span class="redup kecil">—</span>'; } }
          ],
          bilah: [
            { teks: 'Kirim blast WA', ikon: 'campaign', kelas: 'kuning', aksi: function (ids) {
              const pilih = data.rows.filter(function (k) { return ids.indexOf(k.id) > -1; });
              A.blastPenerima = pilih.map(function (k) { return { id: k.id, nama: k.nama, hp: k.wa, valid: /^08\d{8,12}$/.test(k.wa || ''), statusWA: k.statusWA, optOut: k.optOut, vars: { nama: k.nama, anak: k.info.Siswa || '', kelas: k.info.Kelas || '' } }; });
              A.ke('wa');
            } },
            { teks: 'Cek WA', ikon: 'verified', aksi: async function (ids, btn) {
              const nomor = data.rows.filter(function (k) { return ids.indexOf(k.id) > -1 && k.wa; }).map(function (k) { return k.wa; });
              const s = PC.memuatTombol(btn, '…'); let n = 0;
              for (let i = 0; i < nomor.length; i += 50) { const r = await PC.api('wa.validate', { nomor: nomor.slice(i, i + 50) }); if (!r.success) { PC.toast(r.message, 'galat'); break; } n += r.data.dicek; }
              s(); A.cache = {}; PC.toast(n + ' nomor dicek.', 'ok'); muat(); statKpi();
            } },
            { teks: 'Tambah tag', ikon: 'sell', aksi: function (ids) { tagMassal(ids, 'tag'); } },
            { teks: 'Hapus tag', ikon: 'label_off', aksi: function (ids) { tagMassal(ids, 'untag'); } },
            { teks: 'Opt-out', ikon: 'unsubscribe', aksi: function (ids) { bulk(ids, 'optout'); } },
            { teks: 'Opt-in', ikon: 'mark_email_read', aksi: function (ids) { bulk(ids, 'optin'); } },
            { teks: 'Hapus (manual)', ikon: 'delete', kelas: 'merah', aksi: async function (ids) { const ya = await PC.konfirmasi('Hanya kontak hasil import manual yang dihapus. Kontak wali/staf mengikuti data asal.', { judul: 'Hapus kontak manual?', ya: 'Hapus', bahaya: true, ikon: 'delete' }); if (ya) bulk(ids, 'hapusManual'); } }
          ] });
        tbl.set(d.rows);
        const maks = Math.max(1, Math.ceil(d.total / d.per));
        $('#cPaging', el).innerHTML = '<div class="paging"><span>' + PC.angka(d.total) + ' kontak · halaman ' + d.hal + '/' + maks + (d.syncTerakhir ? ' · sinkron terakhir ' + esc(PC.relatif(new Date(d.syncTerakhir).toISOString())) : '') + '</span><div class="tombol"><button class="btn hantu kecil" data-hal="' + (d.hal - 1) + '"' + (d.hal <= 1 ? ' disabled' : '') + '>' + ik('chevron_left') + '</button><button class="btn hantu kecil" data-hal="' + (d.hal + 1) + '"' + (d.hal >= maks ? ' disabled' : '') + '>' + ik('chevron_right') + '</button></div></div>';
      }, { galat: function (r) { A.kartuGalat($('#cTabel', el), r, muat); } });
    };
    const bulk = async function (ids, aksi, nilai) { const r = await A.tulis('crm.bulk', { ids: ids, aksi: aksi, nilai: nilai || '' }); if (r.success) { tbl.kosongkan(); muat(); statKpi(); } };
    const tagMassal = function (ids, aksi) {
      A.modalForm({ judul: aksi === 'tag' ? 'Tambah tag' : 'Hapus tag', ikon: 'sell', fields: [{ k: 'tag', label: 'Nama tag', wajib: true, maks: 30, ph: 'komite, alumni, …', penuh: true }], simpan: async function (d) { await bulk(ids, aksi, d.tag); } });
    };
    const ubahF = function () {
      FC.cari = $('#cCari', el).value.trim(); FC.segmen = $('#cSegmen', el).value; FC.kelas = $('#cKelasF', el).value; FC.tag = $('#cTag', el).value; FC.statusWA = $('#cWA', el).value;
      FC.duplikat = $('#cDupe', el).checked; FC.masalah = $('#cMasalah', el).checked; FC.optOut = $('#cOpt', el).checked; FC.hal = 1; muat();
    };
    $('#cCari', el).oninput = PC.debounce(ubahF, 350);
    ['#cSegmen', '#cKelasF', '#cTag', '#cWA', '#cDupe', '#cMasalah', '#cOpt'].forEach(function (s) { $(s, el).onchange = ubahF; });
    statKpi(); muat();
    el.onclick = async function (e) {
      const t = e.target.closest('[data-c],#cPaging [data-hal]'); if (!t) return;
      if (t.dataset.hal) { FC.hal = Number(t.dataset.hal); muat(); }
      else if (t.dataset.c === 'sync') { const r = await A.tulis('crm.sync', {}, { btn: t, memuat: 'Sinkron…' }); if (r.success) { muat(); statKpi(); } }
      else if (t.dataset.c === 'dupe') duplikat(function () { muat(); statKpi(); });
      else if (t.dataset.c === 'import') importKontak(function () { muat(); statKpi(); });
      else if (t.dataset.c === 'ekspor') { const s = PC.memuatTombol(t, 'Menyiapkan…'); const r = await PC.api('crm.export', {}); s(); if (r.success) A.unduhXlsx('kontak-crm-' + PC.hariIni() + '.xlsx', [{ nama: 'Kontak', rows: r.data.rows }]); else PC.toast(r.message, 'galat'); }
    };
  } };

  function detailKontak(id, selesai) {
    const l = A.laci({ judul: 'Detail Kontak', ikon: 'contact_page' });
    PC.api('crm.detail', { kontakId: id }).then(function (r) {
      if (!l.el.isConnected) return;
      if (!r.success) { l.isi.innerHTML = '<div class="catatan-info merah">' + esc(r.message) + '</div>'; return; }
      const k = r.data.kontak;
      const wa62 = k.wa ? k.wa.replace(/^0/, '62') : '';
      l.isi.innerHTML = '<div class="flex tengah g12"><span class="ava-siswa">' + esc((k.nama || '?').charAt(0).toUpperCase()) + '</span><div class="isi1"><h2 class="t-md">' + esc(k.nama) + '</h2><div class="kecil redup">' + esc(k.segmen) + ' · sumber: ' + esc(k.sumber) + (k.info.Siswa ? ' · wali ' + esc(k.info.SiswaLengkap || k.info.Siswa) + ' (' + esc(k.info.Kelas) + ')' : '') + '</div></div>' +
        (wa62 ? '<a class="btn hijau kecil" href="https://wa.me/' + esc(wa62) + '" target="_blank" rel="noopener">' + ik('chat', 's18') + 'Chat</a>' : '') + '</div>' +
        '<form id="kForm" class="kolom g12">' + A.form([
          { k: 'nama', label: 'Nama', maks: 80 }, { k: 'wa', label: 'WhatsApp', jenis: 'tel' }, { k: 'email', label: 'Email', jenis: 'email', penuh: true, ro: k.sumber === 'staf', bantuan: k.sumber === 'staf' ? 'Email staf = akun login, ubah di menu Pengguna.' : '' },
          { k: 'tag', label: 'Tag (pisahkan koma)', penuh: true }, { k: 'catatan', label: 'Catatan', jenis: 'area', baris: 2, maks: 500 }, { k: 'optOut', label: 'Berhenti berlangganan blast (opt-out)', jenis: 'saklar' }
        ], { nama: k.nama, wa: k.wa, email: k.email, tag: k.tag.join(', '), catatan: k.catatan, optOut: k.optOut }) + '<div class="flex g8"><button class="btn biru" type="submit">' + ik('save') + 'Simpan</button></div></form>' +
        '<section class="kolom g10"><h3 class="t-sm">Catat Interaksi</h3><div class="flex g8 bungkus"><select class="isian kecil" id="iKanal" aria-label="Kanal"><option>Telepon</option><option>WA Manual</option><option>Kunjungan</option><option>Catatan</option><option>Email Manual</option></select><input class="isian kecil isi1" id="iRingkas" placeholder="Ringkasan (mis. konfirmasi hadir rapat)" maxlength="500" aria-label="Ringkasan"><button class="btn putih kecil" id="iSimpan">' + ik('add', 's18') + 'Catat</button></div></section>' +
        '<section class="kolom g10"><h3 class="t-sm">Riwayat</h3><div class="garis-waktu">' + (r.data.timeline.length ? r.data.timeline.map(function (x) {
          return '<div class="item">' + ik(x.jenis === 'notif' ? (x.kanal === 'WA' ? 'chat' : 'mail') : 'history_edu') + '<div class="isi1"><div class="kecil redup">' + esc(PC.tgl(x.tanggal, true)) + ' · ' + esc(x.kanal) + ' · ' + esc(x.status) + (x.oleh ? ' · ' + esc(x.oleh) : '') + '</div><div>' + esc(x.ringkasan) + '</div></div></div>';
        }).join('') : '<p class="redup kecil">Belum ada riwayat.</p>') + '</div></section>';
      $('#kForm', l.isi).onsubmit = async function (e) {
        e.preventDefault();
        const d = A.bacaForm(this);
        const rr = await A.tulis('crm.save', { kontak: Object.assign({ id: id }, d, { tag: d.tag.split(',').map(function (x) { return x.trim(); }).filter(Boolean) }) }, { btn: this.querySelector('button[type=submit]') });
        if (rr.success && selesai) selesai();
      };
      $('#iSimpan', l.isi).onclick = async function () {
        const rr = await A.tulis('crm.interaksi', { kontakId: id, kanal: $('#iKanal', l.isi).value, ringkasan: $('#iRingkas', l.isi).value.trim() }, { btn: this });
        if (rr.success) detailKontak(id, selesai);
      };
    });
  }
  function duplikat(selesai) {
    const m = PC.modal({ judul: 'Kontak Duplikat', ikon: 'call_merge', lebar: 'lebar', isi: '<div class="memuat"><div class="putar"></div></div>', tombol: [{ teks: 'Tutup' }] });
    PC.api('crm.duplikat', {}).then(function (r) {
      const w = $('.modal-isi', m.el);
      if (!r.success) { w.innerHTML = '<div class="catatan-info merah">' + esc(r.message) + '</div>'; return; }
      if (!r.data.grup.length) { w.innerHTML = '<div class="kosong"><div class="emoji">✨</div><p>Tidak ada kontak duplikat.</p></div>'; return; }
      w.innerHTML = '<p class="kecil redup">Pilih kontak utama untuk tiap grup. Tag, catatan, dan jumlah pesan digabung ke kontak utama; kontak lain ditandai "merged".</p>' + r.data.grup.map(function (g, gi) {
        return '<div class="kartu lav kolom g8" style="padding:14px"><b>' + esc(g.kunci) + '</b>' + g.kontak.map(function (k, i) { return '<label class="flex tengah g8"><input type="radio" name="g' + gi + '" value="' + esc(k.id) + '"' + (i === 0 ? ' checked' : '') + '><span><b>' + esc(k.nama) + '</b> · ' + esc(k.segmen) + ' · ' + esc(k.sumber) + (k.info.Siswa ? ' · ' + esc(k.info.Siswa) : '') + '</span></label>'; }).join('') +
          '<button class="btn biru kecil" style="align-self:flex-start" data-gabung="' + gi + '">' + ik('call_merge', 's18') + 'Gabungkan</button></div>';
      }).join('');
      w.onclick = async function (e) {
        const b = e.target.closest('[data-gabung]'); if (!b) return;
        const gi = Number(b.dataset.gabung), g = r.data.grup[gi], utama = w.querySelector('input[name="g' + gi + '"]:checked').value;
        const rr = await A.tulis('crm.merge', { utama: utama, gabung: g.kontak.map(function (k) { return k.id; }).filter(function (x) { return x !== utama; }) }, { btn: b });
        if (rr.success) { b.closest('.kartu').remove(); if (selesai) selesai(); }
      };
    });
  }
  function importKontak(selesai) {
    let rows = null;
    PC.modal({ judul: 'Import Kontak CSV', ikon: 'upload_file', isi: '<p class="kecil">Kolom: <code>nama</code>, <code>wa</code>, <code>email</code>, <code>segmen</code>, <code>tag</code>. Kontak hasil import bersumber "manual" dan aman diulang (nomor/email sama diperbarui).</p>' +
      '<div class="flex g10 bungkus"><button class="btn putih kecil" id="tplK">' + ik('download', 's18') + 'Template</button><button class="btn biru kecil" id="pilihK">' + ik('attach_file', 's18') + 'Pilih CSV</button></div><div id="hasilK"></div>',
      tombol: [{ teks: 'Tutup' }, { teks: 'Jalankan Import', kelas: 'oranye', ikon: 'play_arrow', aksi: async function () { if (!rows) { PC.toast('Pilih berkas CSV dulu.', 'info'); return false; } const r = await A.tulis('crm.import', { rows: rows, dryRun: false }); if (!r.success) return false; if (selesai) selesai(); } }],
      saatBuka: function (t) {
        $('#tplK', t).onclick = function () { A.unduhCsv('template-kontak.csv', [{ nama: 'Bapak Komite', wa: '081234567890', email: '', segmen: 'Komite', tag: 'komite' }], ['nama', 'wa', 'email', 'segmen', 'tag']); };
        $('#pilihK', t).onclick = async function () {
          const f = await PC.pilihBerkas('.csv,text/csv'); if (!f) return;
          rows = PC.bacaCsv(await PC.bacaBerkas(f));
          const r = await PC.api('crm.import', { rows: rows, dryRun: true });
          $('#hasilK', t).innerHTML = r.success ? A.laporanImport(r.data, 'Uji coba — ' + rows.length + ' baris') : '<div class="catatan-info merah">' + esc(r.message) + '</div>';
        };
      } });
  }
})();
