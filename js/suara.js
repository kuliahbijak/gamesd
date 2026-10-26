/* =====================================================================
   suara.js — efek suara sederhana (WebAudio, tanpa berkas audio)
   Benar · salah · klik · bintang · naik level · peti. Bisa dimatikan.
   ===================================================================== */
(function () {
  'use strict';
  const PC = window.PC = window.PC || {};
  let ctx = null;
  function c() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function nada(f, mulai, durasi, jenis, vol, f2) {
    const a = c(); if (!a) return;
    const t = a.currentTime + (mulai || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = jenis || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + durasi);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durasi);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + durasi + 0.05);
  }
  PC.Suara = {
    aktif: true,
    set: function (v) { this.aktif = !!v; PC.simpan && PC.simpan.set('pc_suara', this.aktif); },
    klik: function () { if (this.aktif) nada(660, 0, 0.06, 'triangle', 0.08); },
    benar: function () { if (!this.aktif) return; nada(660, 0, 0.12, 'triangle', 0.2); nada(880, 0.1, 0.12, 'triangle', 0.2); nada(1175, 0.2, 0.22, 'triangle', 0.18); },
    salah: function () { if (!this.aktif) return; nada(330, 0, 0.18, 'sine', 0.16, 260); nada(262, 0.16, 0.28, 'sine', 0.14, 200); },
    bintang: function (i) { if (this.aktif) nada(880 + (i || 0) * 220, 0, 0.18, 'sine', 0.2, 1320 + (i || 0) * 220); },
    naikLevel: function () { if (!this.aktif) return; [523, 659, 784, 1047].forEach(function (f, i) { nada(f, i * 0.12, 0.25, 'triangle', 0.2); }); nada(1319, 0.5, 0.5, 'triangle', 0.18); },
    peti: function () { if (!this.aktif) return; [784, 988, 1175, 1568].forEach(function (f, i) { nada(f, i * 0.08, 0.18, 'square', 0.07); }); },
    pin: function () { if (this.aktif) nada(520, 0, 0.05, 'sine', 0.08); }
  };
})();
