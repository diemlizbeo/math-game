/* Vẽ chim cánh cụt hoạt hình bằng Canvas 2D (không dùng ảnh ngoài). */
window.PS = window.PS || {};

PS.COLORS = [
  '#2f80ed', '#e53935', '#f5a800', '#2eae4f', '#8e44ec',
  '#ec4f9c', '#f57c1f', '#14aebf', '#3949ab', '#7cb342',
  '#d81b60', '#0091ea', '#6d4c41', '#00897b', '#c0ca33'
];

PS.colorFor = function (index) {
  return PS.COLORS[index % PS.COLORS.length];
};

function ellipse(ctx, x, y, rx, ry, rot) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
}

/**
 * Vẽ một chú chim cánh cụt đội mũ bảo hiểm + khăn quàng, nhìn sang phải.
 * (cx, cy): tâm thân; s: chiều cao tổng thể (px).
 * opts: { lean: góc nghiêng (rad), flap: 0..1, scarfWave: rad, happy: bool }
 */
PS.drawPenguin = function (ctx, cx, cy, s, color, opts) {
  opts = opts || {};
  const u = s / 100;
  const flap = opts.flap || 0;
  const wave = opts.scarfWave || 0;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(opts.lean || 0);

  // Bóng dưới chân
  ctx.fillStyle = 'rgba(30, 80, 140, 0.18)';
  ellipse(ctx, 0, 48 * u, 30 * u, 6 * u);
  ctx.fill();

  // Đuôi khăn bay phía sau
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-14 * u, 2 * u);
  ctx.quadraticCurveTo(-34 * u, (2 + Math.sin(wave) * 6) * u, -46 * u, (8 + Math.sin(wave + 1) * 8) * u);
  ctx.lineTo(-42 * u, (16 + Math.sin(wave + 1) * 8) * u);
  ctx.quadraticCurveTo(-30 * u, (12 + Math.sin(wave) * 5) * u, -12 * u, 10 * u);
  ctx.closePath();
  ctx.fill();

  // Giày trượt: stride ∈ [-1, 1] — chân sau đẩy ra sau và nhấc lên, chân trước lướt tới
  const st = opts.stride || 0;
  const feet = [
    [-12 - st * 10, 42 - Math.max(0, st) * 6, -Math.max(0, st) * 0.25],
    [15 + st * 6, 42 - Math.max(0, -st) * 6, Math.max(0, -st) * 0.25]
  ];
  ctx.strokeStyle = '#9aa7b8';
  ctx.lineWidth = Math.max(1, 2.5 * u);
  ctx.lineCap = 'round';
  feet.forEach(function (f) {
    ctx.save();
    ctx.translate(f[0] * u, f[1] * u);
    ctx.rotate(f[2]);
    ctx.beginPath();
    ctx.moveTo(-12 * u, 5 * u); ctx.lineTo(11 * u, 5 * u);
    ctx.stroke();
    ctx.fillStyle = '#ff9f1c';
    ellipse(ctx, 0, 0, 11 * u, 5 * u); ctx.fill();
    ctx.restore();
  });

  // Cánh sau
  ctx.fillStyle = '#16213f';
  ellipse(ctx, -26 * u, 10 * u, 8 * u, 20 * u, 0.5 + flap * 0.6);
  ctx.fill();

  // Thân
  const body = ctx.createLinearGradient(-30 * u, 0, 30 * u, 0);
  body.addColorStop(0, '#16213f');
  body.addColorStop(1, '#2c3e70');
  ctx.fillStyle = body;
  ellipse(ctx, 0, 10 * u, 30 * u, 36 * u);
  ctx.fill();

  // Bụng trắng
  ctx.fillStyle = '#ffffff';
  ellipse(ctx, 5 * u, 16 * u, 20 * u, 27 * u);
  ctx.fill();

  // Đầu
  ctx.fillStyle = '#1b2850';
  ellipse(ctx, 2 * u, -22 * u, 27 * u, 25 * u);
  ctx.fill();

  // Mặt trắng
  ctx.fillStyle = '#ffffff';
  ellipse(ctx, 8 * u, -16 * u, 19 * u, 15 * u);
  ctx.fill();

  // Mũ bảo hiểm
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(2 * u, -24 * u, 28 * u, 25 * u, 0, Math.PI * 1.02, Math.PI * 1.98);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ellipse(ctx, -6 * u, -40 * u, 9 * u, 4 * u, -0.3);
  ctx.fill();

  // Kính trượt tuyết trên mũ
  ctx.fillStyle = '#1b2850';
  ctx.fillRect(-18 * u, -33 * u, 44 * u, 6 * u);
  [[6, -34], [20, -34]].forEach(function (p) {
    ctx.fillStyle = '#1b2850';
    ellipse(ctx, p[0] * u, p[1] * u, 8 * u, 7 * u); ctx.fill();
    ctx.fillStyle = '#8fd8ff';
    ellipse(ctx, p[0] * u, p[1] * u, 6 * u, 5 * u); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ellipse(ctx, (p[0] - 2) * u, (p[1] - 2) * u, 2 * u, 1.5 * u); ctx.fill();
  });

  // Mắt
  [[3, -18], [17, -18]].forEach(function (p) {
    ctx.fillStyle = '#111827';
    if (opts.happy) {
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = Math.max(1, 2.4 * u);
      ctx.beginPath();
      ctx.arc(p[0] * u, (p[1] + 1) * u, 3.5 * u, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ellipse(ctx, p[0] * u, p[1] * u, 3.6 * u, 4.4 * u); ctx.fill();
      ctx.fillStyle = '#fff';
      ellipse(ctx, (p[0] + 1.2) * u, (p[1] - 1.6) * u, 1.3 * u, 1.3 * u); ctx.fill();
    }
  });

  // Má hồng
  ctx.fillStyle = 'rgba(255, 120, 150, 0.45)';
  ellipse(ctx, -2 * u, -10 * u, 3.5 * u, 2.4 * u); ctx.fill();
  ellipse(ctx, 23 * u, -10 * u, 3.5 * u, 2.4 * u); ctx.fill();

  // Mỏ
  ctx.fillStyle = '#ff9f1c';
  ctx.beginPath();
  ctx.moveTo(6 * u, -12 * u);
  ctx.quadraticCurveTo(14 * u, -15 * u, 22 * u, -10 * u);
  ctx.quadraticCurveTo(14 * u, -5 * u, 6 * u, -9 * u);
  ctx.closePath();
  ctx.fill();

  // Khăn quàng
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(2 * u, 0, 26 * u, 7 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(-14 * u, -2 * u, 30 * u, 2 * u);

  // Cánh trước
  ctx.fillStyle = '#22305c';
  ellipse(ctx, 24 * u, 12 * u, 7 * u, 18 * u, -0.5 - flap * 0.7);
  ctx.fill();

  ctx.restore();
};

/** Vẽ chân dung chim cánh cụt vào một canvas nhỏ (avatar). */
PS.drawAvatar = function (canvas, color, opts) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (!color) {
    ctx.fillStyle = '#dbeefe';
    ellipse(ctx, w / 2, h / 2, w * 0.42, h * 0.42);
    ctx.fill();
    ctx.fillStyle = '#7aa7d9';
    ctx.font = 'bold ' + Math.round(w * 0.4) + 'px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', w / 2, h / 2 + 2);
    return;
  }
  PS.drawPenguin(ctx, w / 2 - w * 0.03, h / 2 + h * 0.02, h * 0.82, color, opts || { happy: true });
};
