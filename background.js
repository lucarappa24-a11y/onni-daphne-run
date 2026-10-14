// Ambientazione: centro storico di Foligno, a strati in parallasse.
// Le facciate sono disegnate una volta su canvas fuori schermo (alla risoluzione del telefono) e poi solo spostate.
const Foligno = (() => {
  const DH = 300;            // altezza di progetto della fila di palazzi
  const OUT = '#3a2c25';     // inchiostro dei contorni, come i cani
  let cache = null;

  // Rioni della Quintana: colori presi dagli stemmi ufficiali (quintana.it), stemmi in art/rioni
  const RIONI = [
    { name: 'Ammanniti', a: '#e9a7b4', b: '#d9a92e', img: 'ammanniti-1' },
    { name: 'Badia', a: '#f4f1ea', b: '#c62a2f', img: 'badia-1' },
    { name: 'Cassero', a: '#e2b23a', b: '#8e3b3b', img: 'cassero-1' },
    { name: 'Contrastanga', a: '#f2cf2e', b: '#1f3f95', img: 'contrastanga-1' },
    { name: 'Croce Bianca', a: '#d42a2a', b: '#f7f4ee', img: 'crocebianca-1' },
    { name: 'Giotti', a: '#7cc3ea', b: '#f7f4ee', img: 'giotti-1' },
    { name: 'La Mora', a: '#5f9a3c', b: '#7a5232', img: 'lamora-1' },
    { name: 'Morlupo', a: '#e48bc0', b: '#1b1b1b', img: 'Morlupo' },
    { name: 'Pugilli', a: '#f4f1ea', b: '#1b1b1b', img: 'pugilli-1' },
    { name: 'Spada', a: '#1b1b1b', b: '#d9a92e', img: 'spada-1' }
  ];
  for (const r of RIONI) { r.image = new Image(); r.image.src = `art/rioni/${r.img}.png`; }
  const emblemsReady = () => RIONI.filter(r => r.image.complete && r.image.naturalWidth).length;

  function rng(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const ink = (c, w = 2) => { c.strokeStyle = OUT; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; };
  function box(c, x, y, w, h, fill, lw = 2) { c.fillStyle = fill; c.fillRect(x, y, w, h); if (lw) { ink(c, lw); c.strokeRect(x, y, w, h); } }
  function poly(c, pts, fill, lw = 2) {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) c.lineTo(p[0], p[1]);
    c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { ink(c, lw); c.stroke(); }
  }
  function archPath(c, x, y, w, h) { c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + w / 2); c.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); c.lineTo(x + w, y + h); c.closePath(); }
  function gothicPath(c, x, y, w, h) {
    c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + w * 0.6);
    c.quadraticCurveTo(x, y, x + w / 2, y - w * 0.15); c.quadraticCurveTo(x + w, y, x + w, y + w * 0.6);
    c.lineTo(x + w, y + h); c.closePath();
  }
  const fillStroke = (c, fill, lw = 2) => { c.fillStyle = fill; c.fill(); if (lw) { ink(c, lw); c.stroke(); } };

  // ---------- materiali e luce ----------
  function plaster(c, x, y, w, h, base, r, strength = 1) {
    c.fillStyle = base; c.fillRect(x, y, w, h);
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    const n = Math.floor(w * h / 140);
    for (let i = 0; i < n; i++) {
      const rr = 2 + r() * 7;
      c.fillStyle = r() < 0.5 ? `rgba(255,248,230,${0.07 * strength})` : `rgba(90,55,35,${0.06 * strength})`;
      c.beginPath(); c.ellipse(x + r() * w, y + r() * h, rr * 1.7, rr, 0, 0, Math.PI * 2); c.fill();
    }
    // colature di pioggia sotto la gronda
    for (let i = 0; i < w / 18; i++) {
      const sx = x + r() * w, g = c.createLinearGradient(0, y, 0, y + 30 + r() * 50);
      g.addColorStop(0, `rgba(70,50,40,${0.12 * strength})`); g.addColorStop(1, 'rgba(70,50,40,0)');
      c.fillStyle = g; c.fillRect(sx, y, 3 + r() * 5, 80);
    }
    c.restore();
  }
  function stoneBlocks(c, x, y, w, h, base, r) {
    c.fillStyle = base; c.fillRect(x, y, w, h);
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    for (let yy = y, row = 0; yy < y + h; yy += 9, row++) {
      for (let xx = x - (row % 2) * 9; xx < x + w; xx += 14 + r() * 8) {
        const t = r();
        c.fillStyle = t < 0.33 ? 'rgba(255,245,225,0.12)' : t < 0.66 ? 'rgba(80,60,40,0.1)' : 'rgba(0,0,0,0)';
        c.fillRect(xx + 1, yy + 1, 13, 7);
        c.strokeStyle = 'rgba(70,50,35,0.22)'; c.lineWidth = 0.8; c.strokeRect(xx + 0.5, yy + 0.5, 14, 8);
      }
    }
    c.restore();
  }
  function lighting(c, x, y, w, h) {
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    let g = c.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, 'rgba(255,236,200,0.10)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(50,25,45,0.16)');
    c.fillStyle = g; c.fillRect(x, y, w, h);
    g = c.createLinearGradient(0, y + h - 60, 0, y + h);
    g.addColorStop(0, 'rgba(45,25,20,0)'); g.addColorStop(1, 'rgba(45,25,20,0.25)');
    c.fillStyle = g; c.fillRect(x, y + h - 60, w, 60);
    c.restore();
  }
  function castShadow(c, x, y, w, d = 10, a = 0.32) {
    const g = c.createLinearGradient(0, y, 0, y + d);
    g.addColorStop(0, `rgba(45,25,20,${a})`); g.addColorStop(1, 'rgba(45,25,20,0)');
    c.fillStyle = g; c.fillRect(x, y, w, d);
  }
  function ledge(c, x, y, w, h, col) {
    box(c, x, y, w, h, col, 1.6);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x + 1, y + 1, w - 2, 1.5);
    castShadow(c, x + 2, y + h + 1, w - 4, 7);
  }
  function glass(c, x, y, w, h) {
    const g = c.createLinearGradient(x, y, x + w * 0.6, y + h);
    g.addColorStop(0, '#6b8297'); g.addColorStop(1, '#2b3a49');
    c.fillStyle = g; c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(255,255,255,0.16)';
    c.beginPath(); c.moveTo(x + w * 0.1, y + h); c.lineTo(x + w * 0.55, y); c.lineTo(x + w * 0.78, y); c.lineTo(x + w * 0.33, y + h); c.fill();
    castShadow(c, x, y, w, 5, 0.35);
  }
  // finestra con cornice di pietra, vetri, davanzale; opzioni: persiane, arco, timpano
  function windowUnit(c, x, y, w, h, o = {}) {
    const frame = o.frame || '#efe5d2';
    if (o.arch) { archPath(c, x - 4, y - 4, w + 8, h + 8); fillStroke(c, frame, 1.6); }
    else box(c, x - 4, y - 4, w + 8, h + 8, frame, 1.6);
    c.save();
    if (o.arch) { archPath(c, x, y, w, h); c.clip(); } else { c.beginPath(); c.rect(x, y, w, h); c.clip(); }
    glass(c, x, y, w, h);
    c.strokeStyle = '#e9e0cc'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.moveTo(x, y + h * 0.42); c.lineTo(x + w, y + h * 0.42); c.stroke();
    c.restore();
    ink(c, 1.4); if (o.arch) { archPath(c, x, y, w, h); c.stroke(); } else c.strokeRect(x, y, w, h);
    if (o.shutters) {
      for (const [sx, dir] of [[x - 4 - w * 0.5, -1], [x + w + 4, 1]]) {
        const sw = w * 0.5;
        c.fillStyle = '#5f7f48'; c.fillRect(sx, y - 3, sw, h + 6);
        const g = c.createLinearGradient(sx, 0, sx + sw, 0);
        g.addColorStop(dir < 0 ? 1 : 0, 'rgba(0,0,0,0.22)'); g.addColorStop(dir < 0 ? 0 : 1, 'rgba(255,255,255,0.08)');
        c.fillStyle = g; c.fillRect(sx, y - 3, sw, h + 6);
        c.strokeStyle = 'rgba(30,45,20,0.55)'; c.lineWidth = 1;
        for (let ly = y + 1; ly < y + h + 2; ly += 3.5) { c.beginPath(); c.moveTo(sx + 1.5, ly); c.lineTo(sx + sw - 1.5, ly); c.stroke(); }
        ink(c, 1.3); c.strokeRect(sx, y - 3, sw, h + 6);
      }
    }
    if (o.pediment === 'tri') poly(c, [[x - 8, y - 6], [x + w / 2, y - 18], [x + w + 8, y - 6]], frame, 1.5);
    if (o.pediment === 'arc') { c.beginPath(); c.moveTo(x - 8, y - 6); c.quadraticCurveTo(x + w / 2, y - 24, x + w + 8, y - 6); c.closePath(); fillStroke(c, frame, 1.5); }
    if (o.pediment) castShadow(c, x - 4, y - 5, w + 8, 4, 0.25);
    ledge(c, x - 7, y + h + 4, w + 14, 4, frame);
    if (o.flowers) flowers(c, x - 3, y + h + 1, w + 6, o.r);
  }
  function flowers(c, x, y, w, r) {
    box(c, x, y - 4, w, 6, '#b8673e', 1.2);
    c.fillStyle = '#3f6e30';
    for (let i = 0; i < w / 4; i++) { c.beginPath(); c.arc(x + 2 + i * 4, y - 5 - r() * 2, 2.6, 0, Math.PI * 2); c.fill(); }
    for (let i = 0; i < w / 5; i++) {
      c.fillStyle = r() < 0.5 ? '#d8344a' : '#ef6b7d';
      c.beginPath(); c.arc(x + 3 + i * 5, y - 7 - r() * 3, 2.2, 0, Math.PI * 2); c.fill();
    }
  }
  function tiledRoof(c, x, y, w, col = '#b0583c') {
    // falda di coppi vista dal basso + gronda con mensole
    poly(c, [[x - 10, y - 4], [x + 6, y - 22], [x + w - 6, y - 22], [x + w + 10, y - 4]], col, 2);
    c.save(); c.beginPath(); c.moveTo(x - 10, y - 4); c.lineTo(x + 6, y - 22); c.lineTo(x + w - 6, y - 22); c.lineTo(x + w + 10, y - 4); c.closePath(); c.clip();
    for (let ty = y - 20; ty < y - 3; ty += 5) {
      c.strokeStyle = 'rgba(110,40,25,0.55)'; c.lineWidth = 1;
      for (let tx = x - 10 + ((ty / 5) % 2) * 3; tx < x + w + 10; tx += 6) { c.beginPath(); c.arc(tx, ty, 3, 0, Math.PI); c.stroke(); }
    }
    const g = c.createLinearGradient(0, y - 22, 0, y - 4); g.addColorStop(0, 'rgba(255,220,180,0.18)'); g.addColorStop(1, 'rgba(60,20,10,0.2)');
    c.fillStyle = g; c.fillRect(x - 10, y - 22, w + 20, 18);
    c.restore();
    box(c, x - 10, y - 5, w + 20, 5, '#8a4430', 1.6);
    for (let mx = x - 4; mx < x + w + 6; mx += 12) box(c, mx, y, 5, 5, '#7a5a42', 1);
    castShadow(c, x, y, w, 14, 0.38);
  }
  function merli(c, x, y, w, n, col) {           // merlatura guelfa (merli squadrati)
    const mw = w / (2 * n - 1);
    for (let i = 0; i < n; i++) { box(c, x + i * 2 * mw, y - 14, mw, 14, col, 1.8); c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x + i * 2 * mw + mw * 0.6, y - 13, mw * 0.4, 13); }
  }
  function door(c, x, y, w, h, col = '#6b4430', frame = '#e3d7c0') {
    archPath(c, x - 5, y - 5, w + 10, h + 5); fillStroke(c, frame, 1.6);
    archPath(c, x, y, w, h); fillStroke(c, col, 1.6);
    c.save(); archPath(c, x, y, w, h); c.clip();
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1;
    for (let px = x + 4; px < x + w; px += 5) { c.beginPath(); c.moveTo(px, y); c.lineTo(px, y + h); c.stroke(); }
    castShadow(c, x, y, w, 12, 0.4);
    c.restore();
    c.fillStyle = '#c9a36a'; c.beginPath(); c.arc(x + w * 0.72, y + h * 0.6, 1.8, 0, Math.PI * 2); c.fill();
    box(c, x - 8, y + h - 1, w + 16, 4, '#cfc2a8', 1.2);
  }
  function lantern(c, x, y) {                    // lanterna a muro in ferro battuto
    ink(c, 1.6); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 10, y); c.lineTo(x + 10, y + 4); c.stroke();
    poly(c, [[x + 6, y + 4], [x + 14, y + 4], [x + 13, y + 15], [x + 7, y + 15]], '#f6d98a', 1.4);
    poly(c, [[x + 5, y + 4], [x + 10, y - 1], [x + 15, y + 4]], '#2d2622', 1.2);
    const g = c.createRadialGradient(x + 10, y + 10, 1, x + 10, y + 10, 16); g.addColorStop(0, 'rgba(255,230,150,0.35)'); g.addColorStop(1, 'rgba(255,230,150,0)');
    c.fillStyle = g; c.fillRect(x - 6, y - 6, 32, 32);
  }
  function downpipe(c, x, top) {
    c.fillStyle = '#8d8a83'; c.fillRect(x, top, 4, DH - top); ink(c, 1); c.strokeRect(x, top, 4, DH - top);
    for (let y = top + 30; y < DH; y += 45) box(c, x - 1, y, 6, 3, '#6f6c66', 0.8);
  }
  function emblem(c, rione, cx, cy, size) {
    if (rione.image.complete && rione.image.naturalWidth) c.drawImage(rione.image, cx - size / 2, cy - size / 2, size, size);
    else { c.fillStyle = '#e2b23a'; c.beginPath(); c.arc(cx, cy, size * 0.35, 0, Math.PI * 2); c.fill(); }
  }
  function smallBanner(c, x, y, w, h, rione) {
    c.fillStyle = rione.a; c.fillRect(x, y, w / 2, h);
    c.fillStyle = rione.b; c.fillRect(x + w / 2, y, w / 2, h);
    poly(c, [[x, y + h], [x + w / 2, y + h + 10], [x + w, y + h]], rione.a, 0);
    c.fillStyle = rione.b; c.beginPath(); c.moveTo(x + w / 2, y + h); c.lineTo(x + w / 2, y + h + 10); c.lineTo(x + w, y + h); c.fill();
    const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.18)');
    c.fillStyle = g; c.fillRect(x, y, w, h);
    ink(c, 1.4); c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + h); c.lineTo(x + w / 2, y + h + 10); c.lineTo(x + w, y + h); c.lineTo(x + w, y); c.stroke();
    emblem(c, rione, x + w / 2, y + h * 0.5, w * 0.85);
    box(c, x - 3, y - 3, w + 6, 3, '#6b4b30', 1.2);
  }

  // ---------- i palazzi (x = sinistra, appoggiati a y = DH) ----------
  function house(c, x, w, h, color, r, opt = {}) {
    const top = DH - h;
    plaster(c, x, top, w, h, color, r);
    stoneBlocks(c, x, DH - 22, w, 22, '#cbbd9f', r);
    tiledRoof(c, x, top, w);
    lighting(c, x, top, w, h);
    ink(c, 2); c.strokeRect(x, top, w, h);
    const cols = Math.max(2, Math.floor(w / 48)), gap = w / cols;
    const floors = h > 185 ? 3 : 2;
    for (let row = 0; row < floors; row++) for (let i = 0; i < cols; i++) {
      const wx = x + gap * i + gap / 2 - 9, wy = top + 26 + row * 50;
      windowUnit(c, wx, wy, 18, 30, { shutters: true, flowers: row === 0 && r() < 0.55, r, arch: opt.archWin && row === 0 });
    }
    door(c, x + w / 2 - 14, DH - 50, 28, 50);
    if (w > 110) lantern(c, x + w / 2 + 20, DH - 70);
    downpipe(c, x + w - 7, top + 4);
    if (opt.banners) {
      for (let i = 0; i < cols; i++) smallBanner(c, x + gap * i + gap / 2 - 11, top + 60, 22, 40, RIONI[(i * 3 + opt.banners) % RIONI.length]);
    }
    return w;
  }

  function torreCivica(c, x, r) {
    const w = 52, h = 288, top = DH - h, col = '#d7c19a';
    stoneBlocks(c, x, top + 16, w, h - 16, col, r);
    lighting(c, x, top + 16, w, h - 16);
    ink(c, 2); c.strokeRect(x, top + 16, w, h - 16);
    box(c, x - 5, top + 16, w + 10, 11, '#cbb389', 1.8);
    for (let i = 0; i < 7; i++) { archPath(c, x - 3 + i * 8.6, top + 27, 7, 7); fillStroke(c, '#9c8564', 1.1); }
    castShadow(c, x, top + 34, w, 10, 0.35);
    merli(c, x - 5, top + 16, w + 10, 4, col);
    c.fillStyle = '#f6f1e4'; c.beginPath(); c.arc(x + w / 2, top + 66, 14, 0, Math.PI * 2); c.fill(); ink(c, 2.2); c.stroke();
    ink(c, 1); c.beginPath(); c.arc(x + w / 2, top + 66, 11, 0, Math.PI * 2); c.stroke();
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; c.fillStyle = OUT; c.fillRect(x + w / 2 + Math.cos(a) * 9.5 - 0.8, top + 66 + Math.sin(a) * 9.5 - 0.8, 1.6, 1.6); }
    ink(c, 2); c.beginPath(); c.moveTo(x + w / 2, top + 66); c.lineTo(x + w / 2, top + 57); c.moveTo(x + w / 2, top + 66); c.lineTo(x + w / 2 + 7, top + 69); c.stroke();
    for (const wy of [110, 165, 220]) windowUnit(c, x + w / 2 - 6, top + wy, 12, 24, { arch: true, frame: '#e2d3b4' });
    return w;
  }

  function palazzoComunale(c, x, r) {
    const w = 262, h = 218, top = DH - h, col = '#ece3cf';
    plaster(c, x, top, w, h, col, r, 0.6);
    lighting(c, x, top, w, h);
    ink(c, 2); c.strokeRect(x, top, w, h);
    ledge(c, x - 7, top, w + 14, 12, '#ddd1b6');
    box(c, x + 50, top - 24, w - 100, 24, '#e6dbc4', 2);
    c.fillStyle = OUT; c.font = 'bold 10px Georgia, serif'; c.textAlign = 'center';
    c.fillText('PALAZZO COMUNALE', x + w / 2, top - 8);
    for (const lx of [x + 6, x + w - 16]) { box(c, lx, top + 12, 10, h - 104, '#e4d8bf', 1.2); }
    for (let i = 0; i < 5; i++) {
      const wx = x + 30 + i * 47;
      windowUnit(c, wx, top + 30, 20, 24, {});
      windowUnit(c, wx, top + 76, 20, 34, { pediment: i % 2 ? 'arc' : 'tri' });
    }
    ledge(c, x + w / 2 - 34, top + 118, 68, 6, '#d6c8ab');
    for (const [fx, cols] of [[x + w / 2 - 24, ['#2e8b3e', '#f7f7f2', '#d1283a']], [x + w / 2 + 10, ['#1d3f94', '#1d3f94', '#1d3f94']]]) {
      ink(c, 1.6); c.beginPath(); c.moveTo(fx, top + 118); c.lineTo(fx - 6, top + 80); c.stroke();
      cols.forEach((fc, i) => { c.fillStyle = fc; c.fillRect(fx - 6 + i * 6, top + 80, 6, 17); });
      if (cols[0] === '#1d3f94') { c.fillStyle = '#f2c230'; for (let a = 0; a < 8; a++) c.fillRect(fx + 2.5 + Math.cos(a * 0.785) * 4.5, top + 87.5 + Math.sin(a * 0.785) * 4.5, 1.4, 1.4); }
      ink(c, 1.2); c.strokeRect(fx - 6, top + 80, 18, 17);
    }
    // portico a colonne ioniche
    ledge(c, x, DH - 90, w, 7, '#ddd0b5');
    const g = c.createLinearGradient(0, DH - 83, 0, DH); g.addColorStop(0, '#3e322c'); g.addColorStop(1, '#5b4a40');
    c.fillStyle = g; c.fillRect(x + 6, DH - 83, w - 12, 83);
    for (let i = 0; i < 4; i++) windowUnit(c, x + 34 + i * 62, DH - 64, 16, 30, { frame: '#cfc2a6' });
    for (let i = 0; i < 7; i++) {
      const cx = x + 12 + i * ((w - 24) / 6);
      const cg = c.createLinearGradient(cx - 8, 0, cx + 8, 0);
      cg.addColorStop(0, '#fbf6ea'); cg.addColorStop(0.55, '#ece2cd'); cg.addColorStop(1, '#c9bca0');
      c.fillStyle = cg; c.fillRect(cx - 8, DH - 80, 16, 76); ink(c, 1.6); c.strokeRect(cx - 8, DH - 80, 16, 76);
      c.strokeStyle = 'rgba(58,44,37,0.3)'; c.lineWidth = 1; for (const fl of [-4, 0, 4]) { c.beginPath(); c.moveTo(cx + fl, DH - 76); c.lineTo(cx + fl, DH - 6); c.stroke(); }
      ink(c, 1.6); c.beginPath(); c.arc(cx - 7, DH - 80, 3.5, 0, Math.PI * 2); c.arc(cx + 7, DH - 80, 3.5, 0, Math.PI * 2); c.stroke();
      box(c, cx - 10, DH - 6, 20, 6, '#e6dbc4', 1.4);
    }
    return w;
  }

  function barCentroDelMondo(c, x, r) {
    const w = 138, h = 196, top = DH - h;
    plaster(c, x, top, w, h, '#efd3a0', r);
    stoneBlocks(c, x, DH - 70, w, 70, '#cdbf9f', r);
    tiledRoof(c, x, top, w);
    lighting(c, x, top, w, h);
    ink(c, 2); c.strokeRect(x, top, w, h);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 2; i++) windowUnit(c, x + 32 + i * 56, top + 26 + row * 50, 18, 30, { shutters: true, flowers: row === 0, r });
    box(c, x + 10, DH - 100, w - 20, 26, '#2f4a3a', 2);
    c.fillStyle = '#f2d27a'; c.font = 'bold 10px Georgia, serif'; c.textAlign = 'center';
    c.fillText('LU CENTRU', x + w / 2, DH - 89);
    c.fillText('DE LU MUNNU', x + w / 2, DH - 78);
    for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? '#f6f1e6' : '#2f7d4a'; c.fillRect(x + 8 + i * 13.6, DH - 70, 13.6, 13); }
    ink(c, 1.8); c.strokeRect(x + 8, DH - 70, 122, 13);
    for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? '#f6f1e6' : '#2f7d4a'; c.beginPath(); c.arc(x + 14.8 + i * 13.6, DH - 57, 6.8, 0, Math.PI); c.fill(); }
    castShadow(c, x + 8, DH - 52, 122, 12, 0.4);
    box(c, x + 14, DH - 50, 74, 50, '#a9c3cd', 1.8);
    c.fillStyle = 'rgba(80,50,30,0.55)'; c.fillRect(x + 16, DH - 20, 70, 18);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.moveTo(x + 22, DH - 48); c.lineTo(x + 36, DH - 48); c.lineTo(x + 24, DH - 2); c.lineTo(x + 18, DH - 2); c.fill();
    door(c, x + 98, DH - 48, 26, 48);
    return w;
  }

  function duomo(c, x, r) {
    // fianco della Cattedrale di San Feliciano su Piazza della Repubblica: fasce bianche e rosa, portale romanico
    const w = 252, h = 250, top = DH - h, gableH = 52;
    c.save();
    c.beginPath(); c.rect(x, top + gableH, w, h - gableH); c.clip();
    for (let y = top + gableH, i = 0; y < DH; y += 12, i++) {
      c.fillStyle = i % 2 ? '#e7b6a3' : '#f3eee2'; c.fillRect(x, y, w, 12);
      c.strokeStyle = 'rgba(90,60,50,0.15)'; c.lineWidth = 0.8;
      for (let bx = x + (i % 2) * 11; bx < x + w; bx += 22) { c.beginPath(); c.moveTo(bx, y); c.lineTo(bx, y + 12); c.stroke(); }
    }
    c.restore();
    lighting(c, x, top + gableH, w, h - gableH);
    poly(c, [[x - 4, top + gableH], [x + w / 2, top], [x + w + 4, top + gableH]], '#f3eee2', 2);
    castShadow(c, x, top + gableH, w, 8, 0.3);
    for (let i = 0; i < 12; i++) { archPath(c, x + 5 + i * 20.5, top + gableH + 2, 16, 10); fillStroke(c, '#e4d6c0', 1.1); }
    const rx = x + w / 2, ry = top + 30;
    c.fillStyle = '#d6c7ae'; c.beginPath(); c.arc(rx, ry, 15, 0, Math.PI * 2); c.fill(); ink(c, 2); c.stroke();
    c.fillStyle = '#3d4b5c'; c.beginPath(); c.arc(rx, ry, 11, 0, Math.PI * 2); c.fill();
    for (let a = 0; a < 12; a++) { ink(c, 1.2); c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx + Math.cos(a * Math.PI / 6) * 11, ry + Math.sin(a * Math.PI / 6) * 11); c.stroke(); }
    c.fillStyle = '#d6c7ae'; c.beginPath(); c.arc(rx, ry, 3, 0, Math.PI * 2); c.fill();
    ink(c, 2); c.strokeRect(x, top + gableH, w, h - gableH);
    for (const wx of [x + 40, x + w - 56]) windowUnit(c, wx, top + 82, 16, 40, { arch: true, frame: '#efe6d6' });
    const px = x + w / 2, pw = 100, ph = 136;
    for (let k = 0; k < 5; k++) { archPath(c, px - pw / 2 + k * 7, DH - ph + k * 7, pw - k * 14, ph - k * 7); fillStroke(c, k % 2 ? '#e7b6a3' : '#efe6d6', 1.5); }
    archPath(c, px - 32, DH - 100, 64, 100); fillStroke(c, '#d8b35a', 1.8);
    c.save(); archPath(c, px - 32, DH - 100, 64, 100); c.clip();
    for (let i = 0; i < 40; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,240,180,0.5)' : 'rgba(150,110,30,0.35)'; c.fillRect(px - 32 + r() * 64, DH - 100 + r() * 38, 2.5, 2.5); }
    c.restore();
    c.fillStyle = '#2f5d9c'; c.beginPath(); c.arc(px, DH - 72, 11, 0, Math.PI * 2); c.fill(); ink(c, 1.2); c.stroke();
    c.fillStyle = '#f4e7c2'; c.beginPath(); c.arc(px, DH - 76, 4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c0392b'; c.fillRect(px - 4, DH - 72, 8, 8);
    box(c, px - 32, DH - 62, 64, 62, '#6a3f2a', 1.8);
    castShadow(c, px - 32, DH - 62, 64, 10, 0.45);
    ink(c, 1.4); c.beginPath(); c.moveTo(px, DH - 62); c.lineTo(px, DH); c.stroke();
    for (const dy of [-50, -28]) for (const dx of [-25, 7]) { ink(c, 1.1); c.strokeRect(px + dx, DH + dy, 18, 16); }
    for (const lx of [px - pw / 2 - 22, px + pw / 2 + 4]) {
      box(c, lx, DH - 18, 18, 18, '#e8dfcf', 1.4);
      c.fillStyle = '#ddd0b6'; c.beginPath(); c.ellipse(lx + 9, DH - 26, 10, 8, 0, 0, Math.PI * 2); c.fill(); ink(c, 1.4); c.stroke();
      c.fillStyle = '#c9b996'; c.beginPath(); c.arc(lx + (lx < px ? 15 : 3), DH - 30, 5, 0, Math.PI * 2); c.fill(); ink(c, 1.2); c.stroke();
    }
    return w;
  }

  function palazzoTrinci(c, x, r) {
    const w = 250, h = 226, top = DH - h, col = '#e6af95';
    plaster(c, x, top, w, h, col, r, 0.8);
    c.fillStyle = '#d9997c'; c.fillRect(x, DH - 72, w, 72);
    for (let y = DH - 72, row = 0; y < DH; y += 12, row++) {
      for (let bx = x - (row % 2) * 16; bx < x + w; bx += 32) {
        const g = c.createLinearGradient(0, y, 0, y + 12); g.addColorStop(0, 'rgba(255,230,210,0.25)'); g.addColorStop(1, 'rgba(90,40,30,0.25)');
        c.fillStyle = g; c.fillRect(bx + 1, y + 1, 30, 10);
      }
    }
    lighting(c, x, top, w, h);
    ink(c, 2); c.strokeRect(x, top, w, h); c.strokeRect(x, DH - 72, w, 72);
    ledge(c, x - 7, top, w + 14, 12, '#ecc6b0');
    c.fillStyle = OUT; c.font = 'bold 8px Georgia, serif'; c.textAlign = 'center';
    c.fillText('PALAZZO TRINCI', x + w / 2, top + 9);
    ledge(c, x - 4, DH - 77, w + 8, 6, '#ecc6b0');
    for (let i = 0; i < 6; i++) {
      const wx = x + 18 + i * 38;
      windowUnit(c, wx, top + 40, 18, 36, { pediment: i % 2 ? 'tri' : 'arc', frame: '#f0d0be' });
      windowUnit(c, wx, top + 104, 18, 22, { frame: '#f0d0be' });
    }
    ledge(c, x + w / 2 - 38, top + 84, 76, 5, '#ecc6b0');
    ink(c, 1.1); for (let bx = x + w / 2 - 36; bx < x + w / 2 + 38; bx += 4) { c.beginPath(); c.moveTo(bx, top + 89); c.lineTo(bx, top + 98); c.stroke(); }
    c.beginPath(); c.moveTo(x + w / 2 - 38, top + 98); c.lineTo(x + w / 2 + 38, top + 98); c.stroke();
    door(c, x + w / 2 - 20, DH - 60, 40, 60, '#5e3a28', '#efcdb9');
    poly(c, [[x + w / 2 - 7, DH - 76], [x + w / 2 + 7, DH - 76], [x + w / 2 + 7, DH - 67], [x + w / 2, DH - 62], [x + w / 2 - 7, DH - 67]], '#c94a3a', 1.2);
    for (const wx of [x + 22, x + 66, x + w - 82, x + w - 38]) windowUnit(c, wx, DH - 50, 14, 20, { frame: '#e7b9a2' });
    return w;
  }

  function canoniche(c, x, r) {
    const w = 172, h = 220, top = DH - h, col = '#d2c2a1';
    stoneBlocks(c, x, top + 16, w, h - 16, col, r);
    lighting(c, x, top + 16, w, h - 16);
    ink(c, 2); c.strokeRect(x, top + 16, w, h - 16);
    box(c, x - 3, top + 16, w + 6, 8, '#c8b791', 1.6);
    castShadow(c, x, top + 24, w, 8, 0.3);
    merli(c, x - 3, top + 16, w + 6, 9, col);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 2; i++) {
      const bx = x + 28 + i * 72, by = top + 52 + row * 62;
      gothicPath(c, bx - 6, by - 6, 56, 44); fillStroke(c, '#e7dcc6', 1.4);
      for (const ox of [0, 24]) { c.save(); gothicPath(c, bx + ox, by, 20, 36); c.clip(); glass(c, bx + ox, by - 4, 20, 40); c.restore(); gothicPath(c, bx + ox, by, 20, 36); ink(c, 1.4); c.stroke(); }
      box(c, bx + 20, by + 8, 4, 28, '#efe6d2', 1);
      ledge(c, bx - 8, by + 37, 60, 4, '#e7dcc6');
    }
    c.save(); gothicPath(c, x + w / 2 - 18, DH - 56, 36, 56); c.clip(); c.fillStyle = '#5e3a28'; c.fillRect(x, DH - 70, w, 70); castShadow(c, x, DH - 62, w, 14, 0.4); c.restore();
    gothicPath(c, x + w / 2 - 18, DH - 56, 36, 56); ink(c, 2); c.stroke();
    lantern(c, x + w / 2 + 26, DH - 76);
    return w;
  }

  function calamitaCosmica(c, x, r) {
    // ex chiesa della SS. Trinità in Annunziata, che ospita la Calamita Cosmica di Gino De Dominicis
    const w = 180, h = 226, top = DH - h, gable = 48, col = '#d8a684';
    plaster(c, x, top + gable, w, h - gable, col, r);
    lighting(c, x, top + gable, w, h - gable);
    ink(c, 2); c.strokeRect(x, top + gable, w, h - gable);
    poly(c, [[x - 8, top + gable + 2], [x + w / 2, top], [x + w + 8, top + gable + 2]], '#e3b896', 2);
    castShadow(c, x, top + gable + 2, w, 10, 0.32);
    for (const lx of [x + 4, x + w - 14]) box(c, lx, top + gable, 10, h - gable, '#e0b392', 1.2);
    c.fillStyle = '#ead1bc'; c.beginPath(); c.arc(x + w / 2, top + 88, 22, 0, Math.PI * 2); c.fill(); ink(c, 2); c.stroke();
    c.save(); c.beginPath(); c.arc(x + w / 2, top + 88, 16, 0, Math.PI * 2); c.clip(); glass(c, x + w / 2 - 16, top + 72, 32, 32); c.restore();
    ink(c, 1.6); c.beginPath(); c.arc(x + w / 2, top + 88, 16, 0, Math.PI * 2); c.stroke();
    box(c, x + 20, top + 120, w - 40, 22, '#1f2533', 1.6);
    c.fillStyle = '#e9e4d6'; c.font = 'bold 10px Georgia, serif'; c.textAlign = 'center';
    c.fillText('CALAMITA COSMICA', x + w / 2, top + 135);
    const dx = x + w / 2 - 24, dw = 48, dh = 68;
    archPath(c, dx - 6, DH - dh - 6, dw + 12, dh + 6); fillStroke(c, '#ecd2bd', 1.6);
    c.save(); archPath(c, dx, DH - dh, dw, dh); c.clip();
    const g = c.createLinearGradient(0, DH - dh, 0, DH); g.addColorStop(0, '#15120f'); g.addColorStop(1, '#3a302a'); c.fillStyle = g; c.fillRect(dx, DH - dh, dw, dh);
    c.fillStyle = '#efe9da';
    c.beginPath(); c.ellipse(dx + 26, DH - 34, 13, 11, -0.2, 0, Math.PI * 2); c.fill();
    c.fillRect(dx + 20, DH - 26, 12, 6);
    c.fillStyle = '#15120f'; c.beginPath(); c.arc(dx + 21, DH - 35, 3, 0, Math.PI * 2); c.arc(dx + 30, DH - 36, 3, 0, Math.PI * 2); c.fill();
    c.fillRect(dx + 22, DH - 25, 1.2, 5); c.fillRect(dx + 25, DH - 25, 1.2, 5); c.fillRect(dx + 28, DH - 25, 1.2, 5);
    c.fillStyle = '#efe9da'; for (let i = 0; i < 4; i++) c.fillRect(dx + 6 + i * 2, DH - 14 + i * 4, 36, 2);
    c.restore();
    archPath(c, dx, DH - dh, dw, dh); ink(c, 2); c.stroke();
    box(c, dx - 10, DH - 3, dw + 20, 3, '#cfc2a8', 1.2);
    return w;
  }

  function canaleMolini(c, x, r) {
    const w = 166, h = 168, top = DH - h;
    stoneBlocks(c, x + 10, top, w - 20, h, '#cdb68f', r);
    tiledRoof(c, x + 10, top, w - 20, '#9c4a35');
    lighting(c, x + 10, top, w - 20, h);
    ink(c, 2); c.strokeRect(x + 10, top, w - 20, h);
    for (let row = 0; row < 2; row++) for (const wx of [x + 42, x + 104]) windowUnit(c, wx, top + 24 + row * 46, 18, 28, { shutters: true, flowers: row === 0, r });
    stoneBlocks(c, x, DH - 30, w, 30, '#b9a684', r); ink(c, 2); c.strokeRect(x, DH - 30, w, 30);
    const wg = c.createLinearGradient(0, DH - 25, 0, DH - 8); wg.addColorStop(0, '#6fb0cf'); wg.addColorStop(1, '#2f6f92');
    c.fillStyle = wg; c.fillRect(x + 4, DH - 25, w - 8, 17);
    c.strokeStyle = '#d4eef9'; c.lineWidth = 1.4;
    for (let wx = x + 10; wx < x + w - 10; wx += 15) { c.beginPath(); c.moveTo(wx, DH - 17); c.quadraticCurveTo(wx + 4, DH - 20, wx + 8, DH - 17); c.stroke(); }
    const cx = x + w / 2, cy = DH - 46, R = 36;
    c.fillStyle = '#7d5232'; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill(); ink(c, 2.2); c.stroke();
    c.fillStyle = 'rgba(205,182,143,0.85)'; c.beginPath(); c.arc(cx, cy, R - 8, 0, Math.PI * 2); c.fill(); ink(c, 1.6); c.stroke();
    for (let a = 0; a < 12; a++) { const ang = a * Math.PI / 6; ink(c, 2.4); c.beginPath(); c.moveTo(cx + Math.cos(ang) * 6, cy + Math.sin(ang) * 6); c.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R); c.stroke(); box(c, cx + Math.cos(ang) * (R - 2) - 3, cy + Math.sin(ang) * (R - 2) - 3, 6, 6, '#6b4428', 1); }
    c.fillStyle = '#4a2f1c'; c.beginPath(); c.arc(cx, cy, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(220,240,250,0.6)'; for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(cx - R + 6 + r() * 20, DH - 12 - r() * 8, 1.5 + r() * 2, 0, Math.PI * 2); c.fill(); }
    return w;
  }

  function buildStrip(scale) {
    const parts = [
      [130, (c, x, r) => house(c, x, 130, 196, '#e6b876', r)],
      [52, torreCivica], [262, palazzoComunale],
      [100, (c, x, r) => house(c, x, 100, 184, '#ead0b4', r)],
      [138, barCentroDelMondo], [252, duomo],
      [112, (c, x, r) => house(c, x, 112, 204, '#dfa27a', r, { archWin: true })],
      [250, palazzoTrinci], [172, canoniche],
      [150, (c, x, r) => house(c, x, 150, 198, '#d9a06b', r, { banners: 1 })],
      [180, calamitaCosmica], [166, canaleMolini],
      [120, (c, x, r) => house(c, x, 120, 188, '#e9c3a6', r, { banners: 2 })]
    ];
    const GAP = 8, stripW = parts.reduce((s, [w]) => s + w + GAP, 0);
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(stripW * scale); cv.height = Math.ceil((DH + 4) * scale);
    const c = cv.getContext('2d');
    c.scale(scale, scale);
    const r = rng(7);
    let x = GAP / 2;
    for (const [w, draw] of parts) {
      const g = c.createLinearGradient(0, DH - 160, 0, DH); g.addColorStop(0, '#9b8574'); g.addColorStop(1, '#5e4d42');
      c.fillStyle = g; c.fillRect(x - GAP, DH - 160, GAP, 160);
      draw(c, x, r);
      x += w + GAP;
    }
    return { canvas: cv, w: stripW };
  }

  function buildSkyline(scale) {
    const SW = 900, SH = 240;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(SW * scale); cv.height = Math.ceil(SH * scale);
    const c = cv.getContext('2d');
    c.scale(scale, scale);
    const col = '#c6b7c2', dark = '#b4a4b3', r = rng(3);
    c.fillStyle = col;
    let x = 0;
    while (x < SW) { const w = 40 + r() * 60, h = 50 + r() * 50; c.fillRect(x, SH - h, w + 1, h); poly(c, [[x - 3, SH - h], [x + w / 2, SH - h - 12], [x + w + 3, SH - h]], col, 0); x += w; }
    c.fillStyle = dark;
    c.fillRect(250, SH - 140, 90, 50);
    c.beginPath(); c.ellipse(295, SH - 140, 46, 54, 0, Math.PI, 0); c.fill();
    c.fillStyle = col; for (let k = -3; k <= 3; k++) c.fillRect(295 + k * 12 - 0.8, SH - 186 + Math.abs(k) * 6, 1.6, 40);
    c.fillStyle = dark;
    c.fillRect(287, SH - 214, 16, 22); c.beginPath(); c.arc(295, SH - 214, 8, Math.PI, 0); c.fill();
    c.fillRect(293, SH - 232, 4, 12);
    c.fillRect(380, SH - 196, 30, 196); poly(c, [[376, SH - 196], [395, SH - 230], [414, SH - 196]], dark, 0);
    c.fillStyle = col; for (const y of [SH - 184, SH - 156]) { c.fillRect(386, y, 7, 15); c.fillRect(397, y, 7, 15); }
    c.fillStyle = dark; c.fillRect(620, SH - 180, 34, 180);
    for (let i = 0; i < 4; i++) c.fillRect(618 + i * 10, SH - 192, 6, 12);
    c.fillStyle = '#9fae9c';
    for (const cx of [90, 170, 520, 760, 830]) { c.beginPath(); c.ellipse(cx, SH - 80, 8, 38, 0, 0, Math.PI * 2); c.fill(); }
    return { canvas: cv, w: SW, h: SH };
  }

  function buildCobbles(scale) {
    const TW = 48, TH = 24;
    const cv = document.createElement('canvas');
    cv.width = Math.round(TW * scale); cv.height = Math.round(TH * scale);
    const c = cv.getContext('2d'); c.scale(scale, scale);
    c.fillStyle = '#978a7e'; c.fillRect(0, 0, TW, TH);
    for (let row = 0; row < 2; row++) for (let i = -1; i < 3; i++) {
      const cx = i * 24 + (row ? 12 : 0), cy = row * 12 + 14;
      for (const rr of [5, 10, 15]) {
        c.strokeStyle = '#776a5f'; c.lineWidth = 1.4; c.beginPath(); c.arc(cx, cy, rr, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
        c.strokeStyle = 'rgba(255,245,230,0.18)'; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, rr - 1.6, Math.PI * 1.2, Math.PI * 1.5); c.stroke();
      }
    }
    return cv;
  }

  function ensure(ctx, W, H, groundY) {
    const dpr = ctx.getTransform().a || 1;
    const scale = Math.max(0.7, Math.min(1.25, (groundY * 0.5) / DH));
    const key = `${dpr}|${scale.toFixed(3)}|${emblemsReady()}`;
    if (cache && cache.key === key) return cache;
    const strip = buildStrip(scale * dpr), sky = buildSkyline(dpr * scale * 0.8);
    const cobble = ctx.createPattern(buildCobbles(dpr), 'repeat');
    cobble.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0]));
    cache = { key, dpr, scale, strip, sky, cobble };
    return cache;
  }

  function tile(ctx, img, drawW, drawH, y, offset, W) {
    let x = -((offset % drawW) + drawW) % drawW;
    for (; x < W; x += drawW) ctx.drawImage(img, x, y, drawW, drawH);
  }

  function draw(ctx, W, H, groundY, scroll) {
    const C = ensure(ctx, W, H, groundY);
    const g = ctx.createLinearGradient(0, 0, 0, groundY);
    g.addColorStop(0, '#7fc1e8'); g.addColorStop(0.7, '#cfe8f3'); g.addColorStop(1, '#f6e9d2');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, groundY);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [cx, cy, s] of [[0.15, 0.12, 1], [0.6, 0.08, 1.3], [0.9, 0.18, 0.8]]) {
      const x = ((cx * W - scroll * 0.03) % (W + 200) + W + 200) % (W + 200) - 100, y = cy * groundY;
      for (const [dx, dy, rr] of [[0, 0, 18], [20, -8, 22], [42, 0, 17], [20, 6, 18]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, rr * s, 0, Math.PI * 2); ctx.fill(); }
    }
    const hill = (par, base, amp, f, col) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, groundY);
      for (let x = 0; x <= W + 10; x += 10) { const wx = x + scroll * par; ctx.lineTo(x, base - amp * (0.6 * Math.sin(wx * f) + 0.4 * Math.sin(wx * f * 2.7 + 1.3))); }
      ctx.lineTo(W, groundY); ctx.fill();
    };
    hill(0.05, groundY * 0.52, groundY * 0.08, 0.004, '#a9bfb6');
    hill(0.1, groundY * 0.6, groundY * 0.06, 0.007, '#9cb58f');
    const skyH = C.sky.h * C.scale * 0.8, skyW = C.sky.w * C.scale * 0.8;
    tile(ctx, C.sky.canvas, skyW, skyH, groundY - skyH - 150 * C.scale, scroll * 0.25, W);
    const sw = C.strip.w * C.scale, shh = (DH + 4) * C.scale;
    tile(ctx, C.strip.canvas, sw, shh, groundY - 10 * C.scale - DH * C.scale, scroll * 0.55, W);
    ctx.fillStyle = '#cdc1b0'; ctx.fillRect(0, groundY - 10 * C.scale, W, 10 * C.scale);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, groundY - 10 * C.scale, W, 1.5);
    ctx.fillStyle = '#a69886'; ctx.fillRect(0, groundY - 2, W, 4);
    ctx.save();
    ctx.translate(-(scroll % 48), groundY + 2);
    ctx.fillStyle = C.cobble; ctx.fillRect(0, 0, W + 96, H - groundY);
    ctx.restore();
    const shade = ctx.createLinearGradient(0, groundY, 0, H);
    shade.addColorStop(0, 'rgba(0,0,0,0.16)'); shade.addColorStop(0.3, 'rgba(0,0,0,0.02)'); shade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shade; ctx.fillRect(0, groundY, W, H - groundY);
  }

  return { draw, RIONI, emblem };
})();
