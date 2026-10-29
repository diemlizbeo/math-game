/*
 * Âm thanh tự tổng hợp bằng Web Audio (không dùng file âm thanh ngoài).
 * Nhạc nền dùng bộ lập lịch theo đồng hồ AudioContext để nhịp đều, có trống, bass, giai điệu;
 * hiệu ứng: đám đông cổ vũ, tiếng vút khi đổi người dẫn đầu, tích tắc cuối giờ, kèn chiến thắng, vỗ tay.
 * Âm lượng tổng được giữ vừa phải, tăng/giảm mềm để tránh giật mình.
 */
window.PS = window.PS || {};

PS.Sound = (function () {
  let ctx = null;
  let master = null;
  let musicBus = null;
  let noiseBuf = null;
  let enabled = true;

  // Bộ lập lịch nhạc
  let schedTimer = null;
  let nextTime = 0;
  let step = 0;
  let bpm = 132;
  let intense = false;

  function ensure() {
    if (!enabled) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 4;
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(comp);
      comp.connect(ctx.destination);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.55;
      musicBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  const midi = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };

  function tone(freq, when, dur, type, vol, dest, slideTo) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, when);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g);
    g.connect(dest || master);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  function noise(when, dur, vol, filterType, freq, q, dest, freqTo) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(freq, when);
    if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, when + dur);
    f.Q.value = q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + Math.min(0.02, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest || master);
    src.start(when, Math.random() * 1.5);
    src.stop(when + dur + 0.05);
  }

  // ---------------------------------------------------------------- nhạc nền
  // 4 ô nhịp × 16 bước; hợp âm C – Am – F – G
  const R = 0;
  const MELODY = [
    72, R, 72, 76, 79, R, 76, R, 81, R, 79, R, 76, R, 74, R,
    72, R, 72, 76, 81, R, 79, R, 76, R, 74, R, 72, R, R, R,
    77, R, 77, 81, 84, R, 81, R, 79, R, 77, R, 76, R, 74, R,
    74, R, 76, 77, 79, R, R, 79, 83, R, 81, R, 79, R, R, R
  ];
  const ROOTS = [48, 45, 41, 43];
  const CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];

  function kick(when) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, when);
    o.frequency.exponentialRampToValueAtTime(45, when + 0.12);
    g.gain.setValueAtTime(0.9, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
    o.connect(g);
    g.connect(musicBus);
    o.start(when);
    o.stop(when + 0.2);
  }

  function scheduleStep(s, when) {
    const stepDur = 60 / bpm / 4;
    const bar = Math.floor(s / 16) % 4;
    const i = s % 16;
    // Trống
    if (i % 8 === 0 || (intense && i % 4 === 0)) kick(when);
    if (i === 4 || i === 12) noise(when, 0.14, 0.35, 'highpass', 1500, 0.7, musicBus);
    if (intense && (i === 14 || i === 15)) noise(when, 0.08, 0.2, 'highpass', 1800, 0.7, musicBus);
    if (i % 2 === 0 || intense) noise(when, 0.04, i % 4 === 2 ? 0.16 : 0.08, 'highpass', 8000, 0.7, musicBus);
    // Bass nảy theo nốt móc đơn
    if (i % 2 === 0) {
      const root = ROOTS[bar] + (i % 4 === 2 ? 12 : 0);
      tone(midi(root), when, stepDur * 1.8, 'triangle', 0.32, musicBus);
    }
    // Hợp âm "chập" ở phách lệch
    if (i === 2 || i === 6 || i === 10 || i === 14) {
      CHORDS[bar].forEach(function (m) { tone(midi(m), when, stepDur * 0.9, 'square', 0.035, musicBus); });
    }
    // Giai điệu
    const m = MELODY[(s % 64)];
    if (m) {
      tone(midi(m), when, stepDur * 1.7, 'square', 0.07, musicBus);
      tone(midi(m + 12), when, stepDur * 1.2, 'sine', 0.04, musicBus);
    }
  }

  function scheduler() {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.12) {
      scheduleStep(step, nextTime);
      nextTime += 60 / bpm / 4;
      step++;
    }
  }

  function stopMusic() {
    if (schedTimer) clearInterval(schedTimer);
    schedTimer = null;
  }

  // ---------------------------------------------------------------- đám đông
  function crowd(dur, vol) {
    const t = ctx.currentTime;
    // nhiều dải nhiễu dao động nhẹ = tiếng hò reo
    [700, 1100, 1700, 2600].forEach(function (f, k) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol / (k + 1.5), t + 0.35);
      g.gain.setValueAtTime(vol / (k + 1.5), t + dur * 0.55);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 3 + k * 1.7;
      lg.gain.value = f * 0.15;
      lfo.connect(lg);
      lg.connect(bp.frequency);
      src.connect(bp);
      bp.connect(g);
      g.connect(master);
      src.start(t, Math.random());
      lfo.start(t);
      src.stop(t + dur + 0.1);
      lfo.stop(t + dur + 0.1);
    });
  }

  function applause(dur) {
    const t = ctx.currentTime;
    const claps = Math.round(dur * 45);
    for (let i = 0; i < claps; i++) {
      const when = t + Math.random() * dur;
      const fade = 1 - (when - t) / dur;
      noise(when, 0.05, 0.12 * fade + 0.02, 'bandpass', 1200 + Math.random() * 1800, 1.5);
    }
  }

  return {
    setEnabled: function (v) {
      enabled = !!v;
      if (!enabled) stopMusic();
      if (master && ctx) master.gain.setTargetAtTime(enabled ? 0.5 : 0, ctx.currentTime, 0.05);
    },
    isEnabled: function () { return enabled; },
    unlock: function () { ensure(); },

    beep: function () {
      if (!ensure()) return;
      const t = ctx.currentTime;
      tone(660, t, 0.25, 'square', 0.18);
      tone(1320, t, 0.12, 'sine', 0.08);
    },
    go: function () {
      if (!ensure()) return;
      const t = ctx.currentTime;
      // còi xuất phát hai nốt + đám đông reo
      tone(1046, t, 0.14, 'square', 0.18);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const vib = ctx.createOscillator();
      const vg = ctx.createGain();
      o.type = 'square';
      o.frequency.value = 1568;
      vib.frequency.value = 28;
      vg.gain.value = 40;
      vib.connect(vg);
      vg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t + 0.14);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.16);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g);
      g.connect(master);
      o.start(t + 0.14);
      vib.start(t + 0.14);
      o.stop(t + 0.75);
      vib.stop(t + 0.75);
      crowd(2.2, 0.35);
    },
    startMusic: function (fast) {
      if (!ensure()) return;
      intense = !!fast;
      bpm = fast ? 168 : 132;
      if (schedTimer) return; // đang chạy: chỉ đổi nhịp
      step = 0;
      nextTime = ctx.currentTime + 0.05;
      schedTimer = setInterval(scheduler, 25);
      scheduler();
    },
    stopMusic: stopMusic,
    /** Tiếng "vút" khi có người vượt lên dẫn đầu */
    whoosh: function () {
      if (!ensure()) return;
      noise(ctx.currentTime, 0.35, 0.25, 'bandpass', 500, 2, master, 3000);
    },
    /** Âm cao dần báo vào giai đoạn nước rút */
    riser: function () {
      if (!ensure()) return;
      const t = ctx.currentTime;
      tone(300, t, 0.9, 'sawtooth', 0.06, master, 1200);
      noise(t, 0.9, 0.12, 'bandpass', 400, 1.5, master, 4000);
    },
    tick: function () {
      if (!ensure()) return;
      const t = ctx.currentTime;
      tone(1760, t, 0.07, 'square', 0.12);
      tone(880, t, 0.1, 'sine', 0.1);
    },
    fanfare: function () {
      stopMusic();
      if (!ensure()) return;
      const t = ctx.currentTime + 0.05;
      const notes = [[67, 0], [72, 0.12], [76, 0.24], [79, 0.36], [76, 0.55], [79, 0.67]];
      notes.forEach(function (n) {
        tone(midi(n[0]), t + n[1], 0.28, 'square', 0.12);
        tone(midi(n[0] - 12), t + n[1], 0.28, 'triangle', 0.15);
      });
      [72, 76, 79, 84].forEach(function (m) {
        tone(midi(m), t + 0.85, 1.3, 'triangle', 0.14);
        tone(midi(m), t + 0.85, 1.3, 'square', 0.04);
      });
      kick(t + 0.85);
      noise(t + 0.85, 1.2, 0.18, 'highpass', 6000, 0.7); // chũm chọe
      crowd(3.2, 0.45);
      applause(3);
    },
    correct: function () {
      if (!ensure()) return;
      const t = ctx.currentTime;
      [76, 79, 84].forEach(function (m, i) { tone(midi(m), t + i * 0.09, 0.3, 'triangle', 0.2); });
      applause(1.2);
    },
    gentle: function () {
      if (!ensure()) return;
      const t = ctx.currentTime;
      tone(440, t, 0.25, 'sine', 0.15, master, 392);
      tone(392, t + 0.2, 0.35, 'sine', 0.12, master, 349);
    }
  };
})();
