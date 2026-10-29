/*
 * Hoạt ảnh cuộc đua trên Canvas: một đường đua dài chung, tất cả xuất phát cùng một vạch,
 * camera bám theo nhóm dẫn đầu, bản đồ nhỏ (minimap) hiển thị toàn bộ đường đua.
 * Lớp đông: 2–3 bạn dùng chung một làn rộng để tên và nhân vật đủ to trên máy chiếu;
 * nhãn tên của các bạn cùng làn tự xếp nối đuôi nhau nên không đè chữ lên nhau.
 *
 * Người thắng (winnerId) đã được chọn ngẫu nhiên TRƯỚC khi tạo cuộc đua (xem picker.js).
 * Cuộc đua chỉ là phần trình diễn:
 *  - Giai đoạn chính: mọi nhân vật dùng quỹ đạo ngẫu nhiên cùng một phân phối,
 *    không phụ thuộc người thắng ⇒ thứ hạng thay đổi liên tục, không lộ kết quả.
 *  - Giai đoạn nước rút (vài giây cuối): quỹ đạo hội tụ về vị trí cuối, người được chọn về đích.
 * Thời gian đo bằng performance.now(), không phụ thuộc số khung hình.
 */
window.PS = window.PS || {};

(function () {
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function hash(k) { const x = Math.sin(k * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }

  const MEDALS = ['#ffc107', '#b0bec5', '#d7894a'];
  const FONT = '"Segoe UI", system-ui, sans-serif';

  // Tổng biên độ vận tốc < 1 ⇒ vận tốc luôn dương. Một sóng chậm tạo khoảng cách lớn
  // (bứt lên / tụt lại), hai sóng nhanh tạo nhiều lần vượt nhau (tăng theo thời lượng).
  function makeMotion(freqScale) {
    return [
      { a: rand(0.25, 0.4), f: rand(0.6, 1.5), ph: rand(0, Math.PI * 2) },
      { a: rand(0.1, 0.2), f: rand(1, 3) * freqScale, ph: rand(0, Math.PI * 2) },
      { a: rand(0.1, 0.2), f: rand(1, 3) * freqScale, ph: rand(0, Math.PI * 2) }
    ];
  }

  // Vị trí "thô" = tích phân của vận tốc 1 + Σ a·sin(2πft + φ) (luôn dương ⇒ không đi lùi)
  function rawPos(comps, t) {
    let p = t;
    for (let k = 0; k < comps.length; k++) {
      const c = comps[k];
      const w = 2 * Math.PI * c.f;
      p += (c.a / w) * (Math.cos(c.ph) - Math.cos(w * t + c.ph));
    }
    return p;
  }

  /** Cắt bớt chữ cho vừa ô; luôn giữ lại số phân biệt tên trùng ở cuối (" #2"). */
  function fitText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    const m = text.match(/ #\d+$/);
    const tail = m ? m[0] : '';
    let s = text.slice(0, text.length - tail.length);
    while (s.length > 1 && ctx.measureText(s + '…' + tail).width > maxW) s = s.slice(0, -1);
    return s + '…' + tail;
  }

  /** Pha màu hex với trắng (k = tỉ lệ trắng) ⇒ nền nhạt cùng tông với mũ/khăn của chim. */
  function tint(hex, k) {
    const v = parseInt(hex.slice(1), 16);
    const mix = function (c) { return Math.round(c + (255 - c) * k); };
    return 'rgb(' + mix(v >> 16) + ',' + mix((v >> 8) & 255) + ',' + mix(v & 255) + ')';
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Hoa văn mặt băng (vết lưỡi trượt + hạt lấp lánh), tạo một lần rồi lát lặp lại
  let iceTile = null;
  function getIceTile() {
    if (iceTile) return iceTile;
    const S = 512;
    iceTile = document.createElement('canvas');
    iceTile.width = S;
    iceTile.height = S;
    const g = iceTile.getContext('2d');
    g.lineCap = 'round';
    for (let k = 0; k < 90; k++) {
      const x = Math.random() * S;
      const y = Math.random() * S;
      const len = rand(40, 260);
      const dy = len * rand(-0.12, 0.12);
      const bow = len * rand(-0.06, 0.06);
      g.strokeStyle = k % 3 === 0 ? 'rgba(120, 175, 230, 0.28)' : 'rgba(255, 255, 255, ' + rand(0.35, 0.75).toFixed(2) + ')';
      g.lineWidth = rand(0.6, 1.8);
      for (let ox = -S; ox <= S; ox += S) {
        for (let oy = -S; oy <= S; oy += S) {
          g.beginPath();
          g.moveTo(x + ox, y + oy);
          g.quadraticCurveTo(x + ox + len / 2, y + oy + dy / 2 + bow, x + ox + len, y + oy + dy);
          g.stroke();
        }
      }
    }
    for (let k = 0; k < 160; k++) {
      g.fillStyle = 'rgba(255, 255, 255, ' + rand(0.3, 0.9).toFixed(2) + ')';
      g.fillRect(Math.random() * S, Math.random() * S, rand(1, 2.4), rand(1, 2.4));
    }
    return iceTile;
  }

  function sizeCanvas(canvas) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: w, h: h };
  }

  const Race = function (canvas, roster, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mini = opts.minimap || null;
    this.roster = roster;
    this.winnerId = opts.winnerId;
    this.duration = opts.durationMs;
    this.reduced = !!opts.reducedMotion;
    this.onTick = opts.onTick || function () {};
    this.onFinish = opts.onFinish || function () {};
    this.phase = 'idle'; // idle → running → finishing → done
    this.startTime = 0;
    this.particles = [];
    this.flakes = [];
    this.streaks = [];
    this.cam = 0;
    this.lblOff = null;
    this.destroyed = false;
    this.icePat = this.ctx.createPattern(getIceTile(), 'repeat');

    this._plan();
    this._onResize = this.resize.bind(this);
    window.addEventListener('resize', this._onResize);
    this.resize();
    this._loop = this._loop.bind(this);
    this.raf = requestAnimationFrame(this._loop);
  };

  Race.prototype._plan = function () {
    const n = this.roster.length;
    const D = this.duration / 1000;
    this.sprintStart = 1 - clamp(3.2 / D, 0.12, 0.3);
    const freqScale = Math.max(1, D / 20);
    const target = n < 2 ? 0 : Math.min(16, Math.max(n < 4 ? 3 : 5, Math.round((D * this.sprintStart) / 1.8)));
    const self = this;

    let best = null;
    let bestChanges = -1;
    for (let attempt = 0; attempt < 40; attempt++) {
      const motions = this.roster.map(function () { return makeMotion(freqScale); });
      const raw1 = motions.map(function (m) { return rawPos(m, 1); });
      const mean = raw1.reduce(function (a, b) { return a + b; }, 0) / n;
      const max = Math.max.apply(null, raw1);
      const k = Math.min(0.84 / mean, 0.91 / max);
      const changes = countLeadChanges(motions, k, self.sprintStart);
      if (changes > bestChanges) {
        best = { motions: motions, k: k };
        bestChanges = changes;
      }
      if (changes >= target) break;
    }
    this.leadChanges = bestChanges;
    this.motions = best.motions;
    this.k = best.k;
    this.finals = this.roster.map(function (r, i) {
      if (r.id === self.winnerId) return 1;
      return Math.min(0.955, best.k * rawPos(best.motions[i], 1) + rand(0.015, 0.05));
    });
  };

  function countLeadChanges(motions, k, ts) {
    let leader = -1;
    let changes = 0;
    for (let s = 1; s <= 160; s++) {
      const t = (ts * s) / 160;
      let bi = 0;
      let bp = -1;
      for (let i = 0; i < motions.length; i++) {
        const p = k * rawPos(motions[i], t);
        if (p > bp) { bp = p; bi = i; }
      }
      if (t > 0.06 && leader !== -1 && bi !== leader) changes++;
      leader = bi;
    }
    return changes;
  }

  /** Tiến độ (0 = xuất phát, 1 = vạch đích) của nhân vật i tại thời điểm chuẩn hóa t ∈ [0, 1]. */
  Race.prototype.progress = function (i, t) {
    const pre = this.k * rawPos(this.motions[i], t);
    if (t <= this.sprintStart) return pre;
    const u = (t - this.sprintStart) / (1 - this.sprintStart);
    const e = u * u;
    return (1 - e) * pre + e * this.finals[i];
  };

  Race.prototype.resize = function () {
    if (!this.canvas.clientWidth || !this.canvas.clientHeight) return;
    const sz = sizeCanvas(this.canvas);
    this.W = sz.w;
    this.H = sz.h;
    if (this.mini && this.mini.clientWidth) {
      const m = sizeCanvas(this.mini);
      this.MW = m.w;
      this.MH = m.h;
    }
    this._layout();
    if (this.phase === 'done') this._draw(performance.now());
  };

  Race.prototype._layout = function () {
    const ctx = this.ctx;
    const n = this.roster.length;
    const W = this.W;
    const H = this.H;
    const top = clamp(Math.round(H * 0.055), 30, 44); // tường bao sân phía xa: nhãn khoảng cách / ĐÍCH
    const bottom = 10;
    const avail = H - top - bottom;
    // Lớp đông: ghép 2–3 bạn chung một làn rộng thay vì mỗi bạn một làn mỏng
    let per = 1;
    while (per < 3 && n > per && avail / Math.ceil(n / per) < 40) per++;
    const lanes = Math.ceil(n / per);
    const laneH = avail / (lanes + 0.2); // chừa chỗ cho chân chim ở làn cuối
    // Tâm thân chim nằm đúng giữa làn, ngang với nhãn tên ⇒ nhìn là biết tên nào của chim nào
    const s = clamp(laneH * 1.4, 30, 120);
    let font = clamp(Math.round(laneH * 0.52), 12, 28);
    const pillH = Math.min(laneH * 0.8, font * 1.42);
    if (pillH < font * 1.2) font = Math.max(10, Math.floor(pillH / 1.2));

    // Mỗi nhãn rộng vừa đúng tên của bạn đó (tên quá dài mới bị cắt bớt)
    ctx.font = '700 ' + font + 'px ' + FONT;
    const dot = pillH * 0.9;
    const pad = dot + font * 0.9;
    const maxPill = W * [0.28, 0.23, 0.215][per - 1];
    const labels = this.roster.map(function (r) { return fitText(ctx, r.label, maxPill - pad); });
    const pillWs = labels.map(function (t) { return Math.max(pillH * 2, ctx.measureText(t).width + pad); });
    const pillW = Math.max.apply(null, pillWs);
    const gap = Math.round(font * 0.4);
    const tail = pillH * 0.35; // đuôi bong bóng tên trỏ vào chim
    const tagWs = pillWs.map(function (w) { return w + tail; });

    // Lưới xuất phát: các bạn cùng làn đứng nối đuôi theo đúng độ rộng nhãn thật
    // (mỗi nhãn liền với chim của mình), vạch xuất phát đủ xa mép trái để cả hàng vừa màn hình
    const D = this.duration / 1000;
    const screens = clamp(2 + D / 6, 3, 10);
    const stagger = lanes > 1 ? s * 0.35 : 0; // làn lẻ lùi lại một chút cho đỡ xếp thẳng cột
    const gridOff = new Array(n);
    let reach = 0; // khoảng lùi xa nhất tính từ vạch xuất phát tới mép trái nhãn
    for (let i = 0; i < n; i++) {
      gridOff[i] = i % per === 0 ? 0 : gridOff[i - 1] + tagWs[i - 1] + gap + s * 0.6;
      reach = Math.max(reach, gridOff[i] + tagWs[i]);
    }
    const startX = s * 0.22 + reach + 12 + stagger;
    const finishX = startX + W * (screens - 1);
    const worldW = finishX + W * 0.28;

    this.layout = {
      top: top, bottom: bottom, avail: avail, per: per, lanes: lanes, laneH: laneH, s: s,
      font: font, pillH: pillH, pillW: pillW, dot: dot, gap: gap, tail: tail, stagger: stagger,
      worldW: worldW, startX: startX, finishX: finishX,
      strides: Math.max(8, Math.round(D * 1.25)) // số nhịp sải chân trên cả đường đua
    };
    this.labels = labels;
    this.pillWs = pillWs;
    this.tagWs = tagWs;
    this.gridOff = gridOff;
    this.tints = this.roster.map(function (r) { return tint(r.color, 0.8); });
    this.lblOff = null;
    this.lblOrder = null;

    if (!this.reduced && this.flakes.length === 0) {
      for (let i = 0; i < 35; i++) {
        this.flakes.push({ x: Math.random(), y: Math.random(), r: rand(1, 3), v: rand(0.02, 0.06), d: rand(0, 6) });
      }
    }
  };

  Race.prototype._xOf = function (p) {
    const L = this.layout;
    return L.startX + p * (L.finishX - L.startX);
  };

  /** Vị trí ngang của bạn i: lưới xuất phát (hàng sau, làn so le) dồn về một hàng trong ~12% quãng đầu. */
  Race.prototype._xOfI = function (i, p) {
    const L = this.layout;
    const off = this.gridOff[i] + (Math.floor(i / L.per) % 2) * L.stagger;
    if (!off || p >= 0.12) return this._xOf(p);
    const u = p / 0.12;
    return this._xOf(p) - off * (1 - u * u * (3 - 2 * u));
  };

  Race.prototype.start = function () {
    if (this.phase !== 'idle') return;
    this.phase = 'running';
    this.startTime = performance.now();
  };

  Race.prototype.currentT = function (now) {
    if (this.phase === 'idle') return 0;
    if (this.phase !== 'running') return 1;
    return clamp((now - this.startTime) / this.duration, 0, 1);
  };

  Race.prototype._loop = function (now) {
    if (this.destroyed) return;
    if (this.phase === 'running' && now - this.startTime >= this.duration) {
      this.phase = 'finishing';
      this.finishAt = now;
      this._burst();
    }
    const info = this._draw(now);

    if (this.phase === 'running') {
      this.onTick({
        remainingMs: clamp(this.duration - (now - this.startTime), 0, this.duration),
        ranking: info.order.slice(0, 5).map(function (i) { return this.roster[i].id; }, this),
        sprint: info.t >= this.sprintStart
      });
    }
    if (this.phase === 'finishing' && now - this.finishAt > 1200) {
      this.phase = 'done';
      this._draw(now);
      this.onFinish();
      return; // dừng vòng lặp, không rò rỉ tài nguyên
    }
    this.raf = requestAnimationFrame(this._loop);
  };

  Race.prototype._winnerIndex = function () {
    for (let i = 0; i < this.roster.length; i++) if (this.roster[i].id === this.winnerId) return i;
    return 0;
  };

  /** Tâm dọc của làn chứa bạn i (nơi đặt nhãn tên). */
  Race.prototype._labelY = function (i) {
    const L = this.layout;
    return L.top + (Math.floor(i / L.per) + 0.5) * L.laneH;
  };

  /** Đường lưỡi trượt của bạn i: đặt sao cho tâm thân chim ngang với nhãn tên. */
  Race.prototype._footY = function (i) {
    return this._labelY(i) + this.layout.s * 0.47;
  };

  /** Pha sải chân theo quãng đường đã trượt ⇒ ai nhanh hơn thì đạp chân nhanh hơn. */
  Race.prototype._phase = function (i, p) {
    return p * this.layout.strides * Math.PI * 2 + i * 1.7;
  };

  Race.prototype._burst = function () {
    if (this.reduced) return;
    const i = this._winnerIndex();
    const x = this._xOf(1);
    const y = this._footY(i) - this.layout.s * 0.5;
    const colors = ['#ffd54f', '#ff7043', '#4fc3f7', '#ab47bc', '#66bb6a', '#ec407a'];
    for (let k = 0; k < 70; k++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(80, 300);
      this.particles.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100,
        life: rand(0.7, 1.2), age: 0, size: rand(3, 7), color: colors[k % colors.length], g: 300
      });
    }
  };

  Race.prototype._draw = function (now) {
    const ctx = this.ctx;
    const L = this.layout;
    const n = this.roster.length;
    const t = this.currentT(now);
    if (!L) return { order: [], t: t };
    const W = this.W;
    const H = this.H;
    const time = now / 1000;
    const dt = this._lastNow ? Math.min(0.05, (now - this._lastNow) / 1000) : 0.016;
    this._lastNow = now;
    const moving = this.phase === 'running';
    const finished = this.phase === 'finishing' || this.phase === 'done';
    const sprint = moving && t >= this.sprintStart;
    const winnerIdx = this._winnerIndex();

    // ---- Vị trí + thứ hạng ----
    const tPrev = Math.max(0, t - 0.01);
    const P = new Array(n);
    const X = new Array(n);
    const V = new Array(n);
    for (let i = 0; i < n; i++) {
      P[i] = this.progress(i, t);
      X[i] = this._xOfI(i, P[i]);
      V[i] = moving ? (P[i] - this.progress(i, tPrev)) / Math.max(1e-6, t - tPrev) : 0;
    }
    const order = [];
    for (let i = 0; i < n; i++) order.push(i);
    order.sort(function (a, b) { return P[b] - P[a]; });
    const rank = new Array(n);
    order.forEach(function (idx, r) { rank[idx] = r; });

    // ---- Camera bám theo nhóm dẫn đầu ----
    const maxCam = Math.max(0, L.worldW - W);
    let target = this.phase === 'idle' ? 0 : X[order[0]] - W * 0.68;
    if (finished) target = X[winnerIdx] - W * 0.68;
    target = clamp(target, 0, maxCam);
    this.cam = this.phase === 'idle' ? 0 : this.cam + (target - this.cam) * (1 - Math.exp(-dt * 5));
    const cam = this.cam;

    // ---- Mặt băng (cố định theo màn hình) ----
    const iceTop = L.top;
    const iceBot = H - L.bottom;
    const g = ctx.createLinearGradient(0, iceTop, 0, iceBot);
    g.addColorStop(0, '#eef9ff');
    g.addColorStop(0.55, '#dcf0fd');
    g.addColorStop(1, '#c4e3f8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Ánh đèn sân phản chiếu trên băng (trôi chậm hơn camera ⇒ cảm giác chiều sâu)
    const lsp = 420;
    const loff = cam * 0.5;
    const lr = L.avail * 0.6;
    for (let k = Math.floor(loff / lsp) - 1; k <= Math.floor((loff + W) / lsp) + 1; k++) {
      ctx.save();
      ctx.translate(k * lsp - loff + hash(k + 11) * 140, iceTop + L.avail * 0.42);
      ctx.scale(0.22, 1);
      const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, lr);
      rg.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
      rg.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = rg;
      ctx.fillRect(-lr, -lr, lr * 2, lr * 2);
      ctx.restore();
    }

    // Dải làn xen kẽ rất nhạt
    ctx.fillStyle = 'rgba(110, 180, 240, 0.09)';
    for (let l = 1; l < L.lanes; l += 2) ctx.fillRect(0, iceTop + l * L.laneH, W, L.laneH);

    // Tường bao sân phía xa (dải xanh ghi khoảng cách) + mép sân phía gần
    const bandH = L.top - 9;
    const bg = ctx.createLinearGradient(0, 0, 0, bandH);
    bg.addColorStop(0, '#1f74dc');
    bg.addColorStop(1, '#0d47a1');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, bandH);
    ctx.fillStyle = '#f7fbff';
    ctx.fillRect(0, bandH, W, 6);
    ctx.fillStyle = '#e53935';
    ctx.fillRect(0, bandH + 6, W, 3);
    const sh = ctx.createLinearGradient(0, iceTop, 0, iceTop + 16);
    sh.addColorStop(0, 'rgba(13, 71, 161, 0.18)');
    sh.addColorStop(1, 'rgba(13, 71, 161, 0)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, iceTop, W, 16);
    ctx.fillStyle = '#1e88e5';
    ctx.fillRect(0, iceBot, W, 3);
    ctx.fillStyle = '#f7fbff';
    ctx.fillRect(0, iceBot + 3, W, L.bottom - 3);

    // ---- Thế giới (cuộn theo camera) ----
    ctx.save();
    ctx.translate(-cam, 0);

    // Vết lưỡi trượt cũ trên băng: cuộn theo camera ⇒ cảm giác tốc độ
    ctx.fillStyle = this.icePat;
    ctx.fillRect(cam, iceTop, W, L.avail);

    // Khe nối giữa các tấm tường bao
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    for (let k = Math.floor(cam / 240); k <= Math.floor((cam + W) / 240); k++) ctx.fillRect(k * 240, 0, 2, bandH);

    // Vạch chia làn sơn dưới lớp băng (nét đứt neo theo thế giới)
    ctx.strokeStyle = 'rgba(70, 140, 215, 0.32)';
    ctx.lineWidth = 2;
    ctx.setLineDash([28, 18]);
    ctx.beginPath();
    for (let l = 1; l < L.lanes; l++) {
      const y = Math.round(iceTop + l * L.laneH) + 0.5;
      ctx.moveTo(Math.floor(cam / 46) * 46, y);
      ctx.lineTo(cam + W, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Mốc khoảng cách: vạch sơn xanh dưới băng, vạch giữa sân màu đỏ kèm vòng tròn
    // Chữ trên tường bao được gom lại, vẽ sau cùng để đầu chim ở làn trên không che mất
    const lineOff = L.s * 0.24;
    const boards = [];
    for (let m = 1; m < 10; m++) {
      const x = this._xOf(m / 10) + lineOff;
      if (x < cam - L.avail * 0.4 || x > cam + W + L.avail * 0.4) continue;
      const mid = m === 5;
      ctx.fillStyle = mid ? 'rgba(229, 57, 53, 0.3)' : 'rgba(30, 120, 220, 0.26)';
      ctx.fillRect(x - 5, iceTop, 10, L.avail);
      if (mid) {
        ctx.strokeStyle = 'rgba(229, 57, 53, 0.25)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, iceTop + L.avail / 2, L.avail * 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
      boards.push([x, m * 10 + ' m', 'rgba(13, 71, 161, 0.92)', '#ffffff']);
    }

    // Vạch xuất phát
    const sx = this._xOf(0) + lineOff;
    ctx.fillStyle = 'rgba(229, 57, 53, 0.85)';
    ctx.fillRect(sx - 4, iceTop, 8, L.avail);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(sx - 7, iceTop, 2, L.avail);
    ctx.fillRect(sx + 5, iceTop, 2, L.avail);
    boards.push([sx, 'XUẤT PHÁT', '#e53935', '#ffffff']);

    // Vạch đích ca-rô
    const fx = this._xOf(1) + lineOff;
    const sq = clamp(Math.round(L.avail / 45), 8, 14);
    const fg = ctx.createLinearGradient(fx - 60, 0, fx + sq * 3 + 60, 0);
    fg.addColorStop(0, 'rgba(255, 213, 79, 0)');
    fg.addColorStop(0.5, 'rgba(255, 213, 79, 0.35)');
    fg.addColorStop(1, 'rgba(255, 213, 79, 0)');
    ctx.fillStyle = fg;
    ctx.fillRect(fx - 60, iceTop, sq * 3 + 120, L.avail);
    for (let yy = iceTop, k = 0; yy < iceBot; yy += sq, k++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = (k + c) % 2 === 0 ? '#1b2850' : '#ffffff';
        ctx.fillRect(fx + c * sq, yy, sq, Math.min(sq, iceBot - yy));
      }
    }
    boards.push([fx + sq * 1.5, '🏁 ĐÍCH', '#ffd54f', '#12224a']);

    // ---- Nhân vật: theo chiều sâu (làn trên trước), top 3 vẽ sau cùng (nổi bật) ----
    const visible = function (i) { return X[i] > cam - L.s && X[i] < cam + W + L.s; };
    const drawList = [];
    for (let i = 0; i < n; i++) if (visible(i) && (rank[i] > 2 || this.phase === 'idle')) drawList.push(i);
    if (this.phase !== 'idle') {
      for (let r = 2; r >= 0; r--) if (order[r] !== undefined && visible(order[r])) drawList.push(order[r]);
    }

    // Tư thế trượt: mỗi nhịp đạp chân hạ trọng tâm, nghiêng người, vung tay; thân lượn nhẹ theo nhịp
    const sway = this.reduced ? 0 : L.laneH * 0.05;
    const pose = new Array(n);
    for (let d = 0; d < drawList.length; d++) {
      const i = drawList[d];
      const isWinner = finished && i === winnerIdx;
      const top3 = this.phase !== 'idle' && rank[i] < 3;
      const s = L.s * (isWinner ? 1.3 : top3 ? 1.1 : 1);
      const ph = this._phase(i, P[i]);
      const fy = this._footY(i) + (moving ? Math.sin(ph) * sway : 0);
      const q = { s: s, fy: fy, isWinner: isWinner, top3: top3, stride: 0, bob: 0, lean: 0, flap: 0.3 };
      if (moving && !this.reduced) {
        const st = Math.sin(ph);
        q.stride = st;
        q.bob = -Math.abs(st) * s * 0.03;
        q.lean = 0.2 + clamp((V[i] - 0.8) * 0.12, -0.06, 0.1) + Math.abs(st) * 0.05;
        q.flap = 0.2 + 0.4 * (st + 1) / 2;
      } else if (moving) {
        q.lean = 0.2;
      } else if (!this.reduced) {
        q.bob = Math.sin(time * 3 + i * 1.7) * s * 0.012;
        q.flap = (Math.sin(time * (isWinner ? 9 : 4) + i) + 1) / (isWinner ? 2 : 4);
      }
      q.cy = fy - s * 0.47 + q.bob;
      pose[i] = q;
    }
    const self = this;
    const penguinOpts = function (i, q) {
      return { lean: q.lean, flap: q.flap, stride: q.stride, scarfWave: time * (moving ? 10 : 3) + i, happy: q.isWinner };
    };

    // Vệt lưỡi trượt phía sau mỗi bạn (tính lại từ quỹ đạo ⇒ khớp hoàn toàn với chuyển động)
    const trailFade = this.phase === 'idle' ? 0 : finished ? clamp(1 - (now - this.finishAt) / 900, 0, 1) : 1;
    if (trailFade > 0) {
      const step = 0.05 / (this.duration / 1000);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let d = 0; d < drawList.length; d++) {
        const i = drawList[d];
        const base = this._footY(i);
        ctx.beginPath();
        let x0 = 0;
        let xn = 0;
        for (let j = 0; j <= 12; j++) {
          const p = this.progress(i, Math.max(0, t - j * step));
          const x = this._xOfI(i, p) - L.s * 0.1;
          const y = base + Math.sin(this._phase(i, p)) * sway;
          if (j === 0) { ctx.moveTo(x, y); x0 = x; } else ctx.lineTo(x, y);
          xn = x;
        }
        if (x0 - xn < 4) continue;
        const tg = ctx.createLinearGradient(x0, 0, xn, 0);
        tg.addColorStop(0, 'rgba(60, 135, 210, ' + (0.6 * trailFade).toFixed(3) + ')');
        tg.addColorStop(1, 'rgba(60, 135, 210, 0)');
        ctx.strokeStyle = tg;
        ctx.lineWidth = Math.max(2.5, L.s * 0.06);
        ctx.stroke();
        const tw = ctx.createLinearGradient(x0, 0, xn, 0);
        tw.addColorStop(0, 'rgba(255, 255, 255, ' + (0.95 * trailFade).toFixed(3) + ')');
        tw.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.strokeStyle = tw;
        ctx.lineWidth = Math.max(1, L.s * 0.018);
        ctx.stroke();
      }
    }

    // Bóng phản chiếu trên mặt băng (lật ngược, ép dẹt, mờ)
    ctx.save();
    ctx.globalAlpha = 0.1;
    for (let d = 0; d < drawList.length; d++) {
      const i = drawList[d];
      const q = pose[i];
      ctx.save();
      ctx.translate(0, q.fy);
      ctx.scale(1, -0.5);
      ctx.translate(0, -q.fy);
      PS.drawPenguin(ctx, X[i], q.cy, q.s, this.roster[i].color, penguinOpts(i, q));
      ctx.restore();
    }
    ctx.restore();

    // Vị trí nhãn tên. Các bạn cùng làn xếp nối đuôi theo thứ tự trên đường đua:
    // nhãn của người phía sau lùi ra sau nhãn người phía trước ⇒ chữ không bao giờ đè nhau.
    // Thứ tự nhãn trong làn có "độ trễ": chỉ đổi chỗ khi một bạn vượt hẳn lên (hơn nửa thân chim),
    // tránh hai nhãn đổi chỗ qua lại liên tục khi hai bạn chạy sát nút.
    if (!this.lblOrder || this.phase === 'idle') {
      this.lblOrder = [];
      for (let l = 0; l < L.lanes; l++) {
        const mem = [];
        for (let i = l * L.per; i < Math.min(n, (l + 1) * L.per); i++) mem.push(i);
        this.lblOrder.push(mem);
      }
    }
    const hyst = L.s * 0.6;
    const lblTarget = new Array(n);
    for (let l = 0; l < L.lanes; l++) {
      const mem = this.lblOrder[l];
      for (let k = 1; k < mem.length; k++) {
        if (X[mem[k]] > X[mem[k - 1]] + hyst) {
          const tmp = mem[k]; mem[k] = mem[k - 1]; mem[k - 1] = tmp;
        }
      }
      let limit = Infinity;
      mem.forEach(function (i) {
        const want = X[i] - L.s * 0.22;
        const tip = Math.min(want, limit);
        lblTarget[i] = want - tip;
        limit = tip - self.tagWs[i] - L.gap;
      });
    }
    if (!this.lblOff || this.phase === 'idle') {
      this.lblOff = lblTarget;
    } else {
      // Lùi nhãn ra nhanh (tránh đè chữ), trả nhãn về sát chim chậm hơn (mượt khi vượt nhau)
      const eOut = 1 - Math.exp(-dt * 30);
      const eIn = 1 - Math.exp(-dt * 18);
      for (let i = 0; i < n; i++) {
        const diff = lblTarget[i] - this.lblOff[i];
        this.lblOff[i] += diff * (diff > 0 ? eOut : eIn);
      }
    }
    const tagTip = function (i) { return X[i] - L.s * 0.22 - self.lblOff[i]; };
    const tagVisible = function (i) { const tp = tagTip(i); return tp > cam && tp - self.tagWs[i] < cam + W; };

    // Thứ tự vẽ: theo chiều sâu (làn trên trước, trong làn từ sau ra trước), top 3 sau cùng.
    // Vẽ hết chim trước, rồi mới vẽ toàn bộ nhãn tên lên trên ⇒ chữ không bao giờ bị chim che.
    const items = [];
    for (let i = 0; i < n; i++) {
      if ((pose[i] || tagVisible(i)) && (rank[i] > 2 || this.phase === 'idle')) items.push(i);
    }
    items.sort(function (a, b) { return Math.floor(a / L.per) - Math.floor(b / L.per) || X[a] - X[b] || a - b; });
    if (this.phase !== 'idle') {
      for (let r = 2; r >= 0; r--) {
        const o = order[r];
        if (o !== undefined && (pose[o] || tagVisible(o))) items.push(o);
      }
    }

    for (let d = 0; d < items.length; d++) {
      const i = items[d];
      const q = pose[i];
      const cx = X[i];

      if (q && (q.isWinner || (q.top3 && moving))) {
        const rg = ctx.createRadialGradient(cx, q.cy, 2, cx, q.cy, q.s * 0.8);
        rg.addColorStop(0, q.isWinner ? 'rgba(255, 220, 80, 0.9)' : 'rgba(255, 255, 255, 0.7)');
        rg.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(cx, q.cy, q.s * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!q) continue;

      const s = q.s;
      const cy = q.cy;

      // Bụi băng bắn ra từ lưỡi trượt ở mỗi cú đạp chân
      if (moving && !this.reduced && this.particles.length < 500 && Math.abs(q.stride) > 0.85 && Math.random() < 0.45 * V[i]) {
        for (let k = 0; k < 2; k++) {
          this.particles.push({
            x: cx - s * rand(0.15, 0.3), y: q.fy - s * 0.02,
            vx: -rand(60, 160), vy: -rand(30, 90), life: rand(0.3, 0.55), age: 0,
            size: Math.max(1.2, s * rand(0.02, 0.045)), color: k ? 'rgba(200, 235, 255, 0.95)' : 'rgba(255, 255, 255, 0.95)', g: 260
          });
        }
      }

      PS.drawPenguin(ctx, cx, cy, s, this.roster[i].color, penguinOpts(i, q));
    }

    for (let d = 0; d < items.length; d++) {
      const i = items[d];
      if (tagVisible(i)) this._drawTag(i, tagTip(i), X[i] - L.s * 0.22, finished && i === winnerIdx,
        this.phase !== 'idle' && rank[i] < 3 ? rank[i] : -1);
    }

    // Chữ trên tường bao: mốc khoảng cách, XUẤT PHÁT, ĐÍCH
    const boardY = bandH / 2 + 1;
    ctx.font = '800 ' + clamp(Math.round(bandH * 0.55), 12, 18) + 'px ' + FONT;
    ctx.textAlign = 'center';
    boards.forEach(function (b) {
      if (b[2]) {
        const bw = ctx.measureText(b[1]).width + 24;
        ctx.fillStyle = b[2];
        roundRect(ctx, b[0] - bw / 2, 3, bw, bandH - 6, 8);
        ctx.fill();
      }
      ctx.fillStyle = b[3];
      ctx.fillText(b[1], b[0], boardY);
    });

    // ---- Hạt hiệu ứng (toạ độ thế giới) ----
    for (let k = this.particles.length - 1; k >= 0; k--) {
      const q = this.particles[k];
      q.age += dt;
      if (q.age >= q.life) { this.particles.splice(k, 1); continue; }
      q.vy += q.g * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      ctx.globalAlpha = 1 - q.age / q.life;
      ctx.fillStyle = q.color;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // ---- Vệt gió khi nước rút + tuyết rơi (toạ độ màn hình) ----
    if (!this.reduced) {
      if (sprint && this.streaks.length < 40 && Math.random() < 0.8) {
        this.streaks.push({ x: W + 20, y: rand(L.top, H), len: rand(60, 180), v: rand(900, 1600) });
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      for (let k = this.streaks.length - 1; k >= 0; k--) {
        const st = this.streaks[k];
        st.x -= st.v * dt;
        if (st.x + st.len < 0) { this.streaks.splice(k, 1); continue; }
        ctx.beginPath();
        ctx.moveTo(st.x, st.y);
        ctx.lineTo(st.x + st.len, st.y);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      this.flakes.forEach(function (f) {
        f.y += f.v * dt;
        if (f.y > 1.02) { f.y = -0.02; f.x = Math.random(); }
        ctx.beginPath();
        ctx.arc((f.x + Math.sin(time * 0.6 + f.d) * 0.01) * W, f.y * H, f.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    this._drawMinimap(X, rank, finished ? winnerIdx : -1);
    return { order: order, t: t };
  };

  /**
   * Nhãn tên dạng bong bóng: nền nhạt cùng màu mũ/khăn của chim, đuôi trỏ thẳng vào chim.
   * tip: mũi đuôi; anchor: lưng chim. Khi nhãn phải lùi ra sau (cùng làn có bạn sát nút)
   * thì vẽ dây nối nét đứt cùng màu từ nhãn tới chim.
   */
  Race.prototype._drawTag = function (i, tip, anchor, isWinner, medal) {
    const ctx = this.ctx;
    const L = this.layout;
    const color = this.roster[i].color;
    const cy = this._labelY(i);
    const h = L.pillH;
    const r = h / 2;
    const right = tip - L.tail;
    const pw = this.pillWs[i];
    const x = right - pw;
    const ccx = right - r;
    const a = 0.6;

    if (anchor - tip > 4) {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, h * 0.1);
      ctx.setLineDash([h * 0.25, h * 0.2]);
      ctx.beginPath();
      ctx.moveTo(tip, cy);
      ctx.lineTo(anchor, cy);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.moveTo(x + r, cy - r);
    ctx.lineTo(ccx, cy - r);
    ctx.arc(ccx, cy, r, -Math.PI / 2, -a);
    ctx.lineTo(tip, cy);
    ctx.lineTo(ccx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.arc(ccx, cy, r, a, Math.PI / 2);
    ctx.lineTo(x + r, cy + r);
    ctx.arc(x + r, cy, r, Math.PI / 2, Math.PI * 1.5);
    ctx.closePath();
    ctx.fillStyle = isWinner ? '#fff3b0' : this.tints[i];
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.lineWidth = medal >= 0 || isWinner ? 3 : 2;
    ctx.strokeStyle = medal >= 0 ? MEDALS[medal] : color;
    ctx.stroke();

    // Huy hiệu thứ hạng (top 3) hoặc chấm màu nhân vật
    const bx = x + L.dot / 2 + 1;
    ctx.textBaseline = 'middle';
    if (medal >= 0) {
      ctx.fillStyle = MEDALS[medal];
      ctx.beginPath();
      ctx.arc(bx, cy, h * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3b2600';
      ctx.textAlign = 'center';
      ctx.font = '900 ' + Math.max(9, Math.round(h * 0.6)) + 'px ' + FONT;
      ctx.fillText(String(medal + 1), bx, cy + 1);
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(bx, cy, h * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }
    ctx.textAlign = 'left';
    ctx.font = '700 ' + L.font + 'px ' + FONT;
    ctx.fillStyle = '#12224a';
    ctx.fillText(this.labels[i], x + L.dot + 2, cy + 1);
  };

  /** Bản đồ nhỏ: toàn bộ đường đua, mỗi bạn là một chấm màu, khung = vùng camera đang xem. */
  Race.prototype._drawMinimap = function (X, rank, winnerIdx) {
    if (!this.mini || !this.MW) return;
    const ctx = this.mini.getContext('2d');
    const L = this.layout;
    const w = this.MW;
    const h = this.MH;
    const n = this.roster.length;
    const x0 = 14;
    const x1 = w - 14;
    const y0 = 5;
    const y1 = h - 5;
    const map = function (x) { return x0 + (x / L.worldW) * (x1 - x0); };

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    roundRect(ctx, x0 - 8, y0 - 2, x1 - x0 + 16, y1 - y0 + 4, 10);
    ctx.fill();

    // vùng camera
    const cx0 = map(this.cam);
    const cx1 = map(this.cam + this.W);
    ctx.fillStyle = 'rgba(30, 136, 229, 0.16)';
    ctx.fillRect(cx0, y0, cx1 - cx0, y1 - y0);
    ctx.strokeStyle = '#1e88e5';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx0, y0 + 1, cx1 - cx0, y1 - y0 - 2);

    // xuất phát + đích
    ctx.fillStyle = '#1e88e5';
    ctx.fillRect(map(this._xOf(0)) - 1.5, y0, 3, y1 - y0);
    const fx = map(this._xOf(1));
    for (let yy = y0, k = 0; yy < y1; yy += 4, k++) {
      ctx.fillStyle = k % 2 ? '#ffffff' : '#1b2850';
      ctx.fillRect(fx, yy, 4, Math.min(4, y1 - yy));
    }

    const dotY = function (i) { return y0 + 4 + (n > 1 ? (i / (n - 1)) * (y1 - y0 - 8) : (y1 - y0 - 8) / 2); };
    const self = this;
    function dot(i, r, stroke) {
      ctx.fillStyle = self.roster[i].color;
      ctx.beginPath();
      ctx.arc(map(X[i]), dotY(i), r, 0, Math.PI * 2);
      ctx.fill();
      if (stroke) { ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke(); }
    }
    for (let i = 0; i < n; i++) if (rank[i] > 2 || this.phase === 'idle') dot(i, 3.2);
    if (this.phase !== 'idle') {
      for (let i = 0; i < n; i++) if (rank[i] <= 2) dot(i, 5, MEDALS[rank[i]]);
    }
    if (winnerIdx >= 0) dot(winnerIdx, 7, '#ffd54f');
  };

  Race.prototype.destroy = function () {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._onResize);
    this.particles = [];
    this.streaks = [];
  };

  PS.Race = Race;
})();
