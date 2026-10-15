// Illustrazioni "acquerello" generative, coerenti per vita/luogo/momento (placeholder artistici consistenti, sez. 3.5)
function rng(seed) { let s = 0; for (const ch of String(seed)) s = (Math.imul(s ^ ch.charCodeAt(0), 2654435761) + 0x9e3779b9) | 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(r) { return (r() + r() + r() - 1.5) / 1.5; }
function deform(pts, depth, r, amt) {
  for (let d = 0; d < depth; d++) { const out = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; out.push(a);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]); out.push([(a[0] + b[0]) / 2 + gauss(r) * len * amt, (a[1] + b[1]) / 2 + gauss(r) * len * amt]); }
    pts = out; }
  return pts;
}
function blob(ctx, base, color, r, layers = 22, alpha = 0.035, amt = 0.38) {
  const b = deform(base, 3, r, amt); ctx.fillStyle = color;
  for (let l = 0; l < layers; l++) { const p = deform(b, 2, r, amt * 0.9); ctx.globalAlpha = alpha; ctx.beginPath(); p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); }
  ctx.globalAlpha = 1;
}
const poly = (cx, cy, rx, ry, n = 10) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const band = (y0, y1, w) => [[-20, y0], [w * 0.33, y0 - 4], [w * 0.66, y0 + 4], [w + 20, y0], [w + 20, y1], [-20, y1]];

export function paint(canvas, { seed, palette, kind, part, w, h, dpr: fixedDpr }) {
  const dpr = fixedDpr || Math.min(window.devicePixelRatio || 1, 2); const W = w || canvas.clientWidth || 600, H = h || canvas.clientHeight || 360;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const r = rng(seed);
  const [c1, c2, c3, c4] = palette.wash; const night = part === 'notte' || kind === 'night', evening = part === 'sera';
  ctx.fillStyle = night ? '#2b2f45' : palette.bg; ctx.fillRect(0, 0, W, H);
  // cielo
  blob(ctx, band(-10, H * 0.62, W), night ? '#3d4466' : evening ? c2 : c3, r, 18, 0.05, 0.25);
  if (evening) blob(ctx, band(H * 0.25, H * 0.55, W), c1, r, 16, 0.04, 0.3);
  // astro
  const sx = W * (0.2 + r() * 0.6), sy = H * (0.18 + r() * 0.18);
  blob(ctx, poly(sx, sy, H * 0.09, H * 0.09), night ? '#f4ecd2' : c4 === palette.accent ? c1 : c4, r, 14, night ? 0.09 : 0.06, 0.12);
  if (night) { ctx.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { ctx.globalAlpha = 0.25 + r() * 0.5; ctx.beginPath(); ctx.arc(r() * W, r() * H * 0.5, r() * 1.2 + 0.2, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
  const hz = H * (0.55 + r() * 0.08);
  const ground = night ? '#4a4f72' : c2, deep = night ? '#262a40' : c4;
  if (kind === 'sea') {
    blob(ctx, band(hz, H + 20, W), night ? '#3b5070' : '#7fb3cf', r, 20, 0.05, 0.12);
    for (let i = 0; i < 4; i++) blob(ctx, band(hz + 10 + i * 18, hz + 14 + i * 18, W), '#ffffff', r, 6, 0.05, 0.06);
    blob(ctx, [[-20, hz + 20], [W * 0.3, hz - H * 0.12], [W * 0.45, hz + 10], [W * 0.5, H + 20], [-20, H + 20]], deep, r, 22, 0.04, 0.2);
  } else if (kind === 'city') {
    for (let i = 0; i < 9; i++) { const x = (i / 9) * W + gauss(r) * 20, w = W / 9 * (0.7 + r() * 0.6), h = H * (0.15 + r() * 0.3);
      blob(ctx, [[x, hz], [x, hz - h], [x + w, hz - h], [x + w, hz]], i % 2 ? ground : deep, r, 10, 0.05, 0.05); }
    blob(ctx, band(hz, H + 20, W), deep, r, 18, 0.05, 0.1);
    if (night) { ctx.fillStyle = '#ffd98a'; for (let i = 0; i < 30; i++) { ctx.globalAlpha = 0.5; ctx.fillRect(r() * W, hz - r() * H * 0.35, 2, 3); } ctx.globalAlpha = 1; }
  } else if (kind === 'snow') {
    for (let i = 0; i < 3; i++) { const x = W * (0.1 + i * 0.35 + gauss(r) * 0.1), h = H * (0.25 + r() * 0.2);
      blob(ctx, [[x - W * 0.3, hz + 10], [x, hz - h], [x + W * 0.3, hz + 10]], i === 1 ? '#ffffff' : ground, r, 18, 0.05, 0.12); }
    blob(ctx, band(hz, H + 20, W), night ? '#2c3048' : '#1f2d38', r, 18, 0.05, 0.1);
  } else if (kind === 'countryside') {
    for (let i = 0; i < 3; i++) blob(ctx, [[-30, hz + i * 30], [W * (0.3 + r() * 0.3), hz - 30 + i * 25], [W + 30, hz + i * 28], [W + 30, H + 20], [-30, H + 20]], [c3, ground, deep][i], r, 18, 0.045, 0.14);
    for (let i = 0; i < 5; i++) { const x = r() * W, y = hz + 10 + r() * 40; blob(ctx, poly(x, y - 14, 10, 16, 8), deep, r, 10, 0.06, 0.2); }
  } else { // night / dusk / interno
    blob(ctx, band(hz, H + 20, W), deep, r, 20, 0.05, 0.12);
    const lx = W * (0.6 + r() * 0.25); blob(ctx, [[lx - 10, hz], [lx - 6, hz - H * 0.4], [lx + 6, hz - H * 0.4], [lx + 10, hz]], night ? '#d9d6e8' : c4, r, 10, 0.07, 0.04);
    blob(ctx, poly(lx, hz - H * 0.42, 30, 22), '#ffe9a8', r, 10, 0.06, 0.2);
  }
  // macchie e granulazione della carta
  for (let i = 0; i < 6; i++) blob(ctx, poly(r() * W, r() * H, 20 + r() * 50, 15 + r() * 40, 8), [c1, c2, c3][i % 3], r, 6, 0.03, 0.3);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height); const d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  ctx.putImageData(img, 0, 0);
  // vignettatura morbida verso il foglio
  const g = ctx.createLinearGradient(0, H * 0.7, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, palette.bg); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
