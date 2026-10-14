/* Trip to Tenerife - neon palm tree synthwave title backdrop + neon button.
 * window.TitleNeon = { draw(ctx,W,H,t), button(ctx,x,y,w,h,label,pressed,t) }
 * Logical canvas 180x320. Pixel-crisp: integer fillRect only, cached layers.
 */
(function () {
  'use strict';

  var C = {
    indigo: '#1b1040', purple: '#3a1370', magenta: '#ff3ea5', pink: '#ff7ac8',
    cyan: '#38e8ff', orange: '#ff9a3c', yellow: '#ffd84a', mint: '#7dffd6',
    dark: '#0a0318', lightCyan: '#b8f6ff'
  };
  var FONT = '"Press Start 2P", monospace';
  var HZ = 196;          // horizon y
  var FH = 124;          // floor height (320 - 196)
  var SUN_X = 90, SUN_Y = 150, SUN_R = 44;
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  var ready = false, failed = false;
  var sky = null, sunA = null, sunB = null, floor = null;
  var palms = null;            // [type][mirror][frame]
  var logos = [null, null];    // normal, letter-off
  var logoDirty = true, fontState = false, fontTick = 0;
  var starX = [], starY = [], starP = [];
  var NSTARS = 26;
  var PULSE_A = [0, 0.35, 0.7];

  function mk(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function hex(r, g, b) {
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  function hexRGB(s) {
    var n = parseInt(s.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, f) {
    var A = hexRGB(a), B = hexRGB(b);
    return hex(Math.round(A[0] + (B[0] - A[0]) * f), Math.round(A[1] + (B[1] - A[1]) * f),
               Math.round(A[2] + (B[2] - A[2]) * f));
  }

  function fontOK() {
    try {
      return !!(document.fonts && document.fonts.check('8px "Press Start 2P"'));
    } catch (e) { return false; }
  }

  /* ---------- sky ---------- */
  function skyColor(f) {
    if (f < 0.55) return mix(C.indigo, C.purple, f / 0.55);
    if (f < 0.85) return mix(C.purple, '#8e2a8c', (f - 0.55) / 0.30);
    return mix('#8e2a8c', C.magenta, (f - 0.85) / 0.15);
  }
  function buildSky() {
    var c = mk(180, 320), g = c.getContext('2d');
    var BH = 7, nb = Math.ceil(HZ / BH) + 1, cols = [], i, y, x;
    for (i = 0; i <= nb; i++) cols.push(skyColor(Math.min(1, (i * BH + BH / 2) / HZ)));
    g.fillStyle = C.dark; g.fillRect(0, 0, 180, 320);
    for (y = 0; y < HZ; y++) {
      var b = (y / BH) | 0, r = y % BH;
      g.fillStyle = cols[b]; g.fillRect(0, y, 180, 1);
      if (r >= BH - 2) {
        g.fillStyle = cols[b + 1];
        for (x = (y & 1); x < 180; x += 2) g.fillRect(x, y, 1, 1);
      }
    }
    // dithered halo around the sun
    var rings = [C.magenta, C.pink, '#a82a80', '#7a1f78'];
    for (y = SUN_Y - SUN_R - 18; y < HZ; y++) {
      for (x = SUN_X - SUN_R - 18; x <= SUN_X + SUN_R + 18; x++) {
        var dx = x - SUN_X, dy = y - SUN_Y, d = Math.sqrt(dx * dx + dy * dy);
        if (d <= SUN_R || d > SUN_R + 16) continue;
        var ri = ((d - SUN_R) / 4) | 0;           // 0..3
        var on;
        if (ri === 0) on = ((x + y) & 1) === 0;
        else if (ri === 1) on = ((x + y) & 1) === 0 && (y & 1) === 0;
        else on = (x & 1) === 0 && (y & 1) === 0 && ((x >> 1) + (y >> 1)) % 2 === 0;
        if (on) { g.fillStyle = ri === 0 ? C.pink : ri === 1 ? C.magenta : C.purple; g.fillRect(x, y, 1, 1); }
      }
    }
    // far mountains-ish city glow strip right above horizon
    g.fillStyle = '#ff7ac8'; g.fillRect(0, HZ - 1, 180, 1);
    return c;
  }

  /* ---------- sun ---------- */
  function buildSun(bright) {
    var c = mk(180, 320), g = c.getContext('2d');
    var y, dy;
    for (y = SUN_Y - SUN_R; y < SUN_Y + SUN_R && y < HZ; y++) {
      dy = y - SUN_Y + 0.5;
      var hw = Math.round(Math.sqrt(SUN_R * SUN_R - dy * dy));
      var t = ((y - (SUN_Y - SUN_R)) / (2 * SUN_R));
      if (bright) t = Math.max(0, t - 0.16);
      t = Math.floor(t * 12) / 12;
      var col;
      if (t < 0.25) col = C.yellow;
      else if (t < 0.45) col = C.orange;
      else if (t < 0.62) col = C.pink;
      else if (t < 0.74) col = C.magenta;
      else if (t < 0.83) col = C.cyan;
      else col = C.magenta;
      g.fillStyle = col;
      g.fillRect(SUN_X - hw, y, hw * 2, 1);
    }
    return c;
  }

  /* ---------- floor ---------- */
  function buildFloor() {
    var c = mk(180, FH), g = c.getContext('2d');
    var y, x, j;
    for (y = 0; y < FH; y++) {
      g.fillStyle = mix('#1b1040', '#0d0622', Math.floor(y / 8) / 16);
      g.fillRect(0, y, 180, 1);
    }
    for (y = 1; y < FH; y++) {
      var f = y / FH;
      for (j = -12; j <= 12; j++) {
        x = Math.round(90 + j * 30 * f);
        if (x < 0 || x > 179) continue;
        g.fillStyle = C.purple; g.fillRect(x - 1, y, 3, 1);
      }
    }
    for (y = 1; y < FH; y++) {
      var f2 = y / FH;
      for (j = -12; j <= 12; j++) {
        x = Math.round(90 + j * 30 * f2);
        if (x < 0 || x > 179) continue;
        g.fillStyle = f2 < 0.3 ? '#a82a80' : (f2 < 0.6 ? C.magenta : '#c0307f');
        g.fillRect(x, y, 1, 1);
      }
    }
    // horizon glow
    g.fillStyle = C.cyan; g.fillRect(0, 0, 180, 1);
    g.fillStyle = C.magenta; g.fillRect(0, 1, 180, 1);
    g.fillStyle = '#7a1f78'; g.fillRect(0, 2, 180, 1);
    // calm/dark dithered fade for the menu area (below y = 196+14)
    g.fillStyle = C.dark;
    for (y = 14; y < FH; y++) {
      var d = Math.min(0.9, 0.15 + (y - 14) / (FH - 14) * 0.9);
      var th = d * 16;
      for (x = 0; x < 180; x++) {
        if (BAYER[((y & 3) << 2) | (x & 3)] < th) g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  /* ---------- palms ---------- */
  function buildPalm(p, frame, mirror) {
    var c = mk(p.w, p.h), g = c.getContext('2d');
    var sway = (frame - 1.5) * 0.06;
    var pts = [], i, n = p.trunkN;
    function blk(x, y, s, col) {
      g.fillStyle = col;
      x = Math.round(x); y = Math.round(y);
      g.fillRect(mirror ? p.w - x - s : x, y, s, s);
    }
    // trunk points
    var topX = p.cx + Math.round(sway * 40), topY = p.cy;
    for (i = 0; i <= n; i++) {
      var tt = i / n;
      var x = p.bx + (topX - p.bx) * tt + Math.sin(tt * Math.PI) * -p.bend;
      var y = (p.h - 3) + (topY - (p.h - 3)) * tt;
      pts.push(x, y);
    }
    var fr = [-3.0, -2.55, -2.0, -1.4, -0.85, -0.3, 0.25, 2.75, 3.0];
    var lens = [p.L * 0.9, p.L, p.L * 0.95, p.L * 0.85, p.L * 0.95, p.L, p.L * 0.9, p.L * 0.8, p.L * 0.7];
    var k, s, ptsF = [], a, tw = p.tw;
    for (k = 0; k < fr.length; k++) {
      a = fr[k] + sway * (k < 4 ? 1 : -1) * 0.9;
      for (s = 2; s <= lens[k]; s += 2) {
        ptsF.push(topX + Math.cos(a) * s, topY + Math.sin(a) * s + 0.022 * s * s * (p.L / 24));
      }
    }
    // passes: magenta (bottom-right), cyan (top-left), dark body
    var pass, q;
    for (pass = 0; pass < 3; pass++) {
      var col = pass === 0 ? C.magenta : pass === 1 ? C.cyan : C.dark;
      var off = pass === 0 ? 1 : pass === 1 ? -1 : 0;
      for (q = 0; q < pts.length; q += 2) blk(pts[q] + off - 1, pts[q + 1] + off, tw, col);
      for (q = 0; q < ptsF.length; q += 2) blk(ptsF[q] + off - 1, ptsF[q + 1] + off - 1, 3, col);
    }
    // coconuts
    blk(topX - 2, topY + 2, 3, C.dark);
    blk(topX + 1, topY + 3, 3, C.dark);
    return c;
  }
  function buildPalms() {
    var big = { w: 70, h: 128, bx: 14, cx: 40, cy: 24, L: 28, tw: 4, trunkN: 52, bend: 6 };
    var small = { w: 44, h: 84, bx: 8, cx: 24, cy: 18, L: 18, tw: 3, trunkN: 34, bend: 4 };
    var out = [], ti, m, f, specs = [big, small];
    for (ti = 0; ti < 2; ti++) {
      out[ti] = [];
      for (m = 0; m < 2; m++) {
        out[ti][m] = [];
        for (f = 0; f < 4; f++) out[ti][m][f] = buildPalm(specs[ti], f, m === 1);
      }
    }
    return out;
  }

  /* ---------- logo ---------- */
  var OFFS = {};
  function offsets(r) {
    if (OFFS[r]) return OFFS[r];
    var a = [], dx, dy;
    for (dy = -r; dy <= r; dy++) for (dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r + 1) a.push(dx, dy);
    }
    OFFS[r] = a; return a;
  }
  function glowText(g, str, x, y, layers) {
    var li, o, q;
    for (li = 0; li < layers.length; li++) {
      g.fillStyle = layers[li][1];
      o = offsets(layers[li][0]);
      for (q = 0; q < o.length; q += 2) g.fillText(str, x + o[q], y + o[q + 1]);
    }
  }
  function buildLogo(letterOff) {
    var c = mk(180, 80), g = c.getContext('2d');
    g.textBaseline = 'top'; g.textAlign = 'left';
    try { g.imageSmoothingEnabled = false; } catch (e) {}
    // TRIP TO
    g.font = '8px ' + FONT;
    var s1 = 'TRIP TO', x1 = 90 - 28, y1 = 12;
    glowText(g, s1, x1, y1 + 1, [[3, '#241058'], [2, '#1a5a9a'], [1, '#1fa0c8']]);
    g.fillStyle = C.cyan; g.fillText(s1, x1, y1);
    // TENERIFE
    var s2 = 'TENERIFE', size = 16, x0 = 90 - (s2.length * size) / 2, y2 = 26, i;
    g.font = size + 'px ' + FONT;
    for (i = 0; i < s2.length; i++) {
      var ch = s2.charAt(i), lx = x0 + i * size, dim = letterOff && i === 4;
      if (dim) {
        glowText(g, ch, lx, y2 + 2, [[2, '#241058']]);
        g.fillStyle = '#7a3a90'; g.fillText(ch, lx, y2);
      } else {
        glowText(g, ch, lx, y2 + 2, [[3, '#241058'], [2, '#7a1f78'], [1, C.magenta]]);
        g.save();
        g.beginPath(); g.rect(lx - 2, y2 - 2, size + 4, 9); g.clip();
        g.fillStyle = C.orange; g.fillText(ch, lx, y2);
        g.restore();
        g.save();
        g.beginPath(); g.rect(lx - 2, y2 + 7, size + 4, 12); g.clip();
        g.fillStyle = C.yellow; g.fillText(ch, lx, y2);
        g.restore();
      }
    }
    // subtitle
    g.font = '8px ' + FONT;
    var s3 = 'OULUSTA AURINKOON!', x3 = 90 - s3.length * 4, y3 = 52;
    g.fillStyle = C.indigo; g.fillText(s3, x3 + 1, y3 + 1);
    g.fillStyle = C.purple; g.fillText(s3, x3, y3 + 1);
    g.fillStyle = C.lightCyan; g.fillText(s3, x3, y3);
    return c;
  }

  /* ---------- init ---------- */
  function init() {
    if (ready || failed) return;
    try {
      sky = buildSky(); sunA = buildSun(false); sunB = buildSun(true);
      floor = buildFloor(); palms = buildPalms();
      var seed = 12345, i;
      for (i = 0; i < NSTARS; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff; starX.push(seed % 180);
        seed = (seed * 1103515245 + 12345) & 0x7fffffff; starY.push(8 + (seed % 120));
        seed = (seed * 1103515245 + 12345) & 0x7fffffff; starP.push((seed % 628) / 100);
      }
      fontState = fontOK();
      try {
        if (document.fonts && document.fonts.load) {
          document.fonts.load('8px "Press Start 2P"').then(function () { logoDirty = true; }, function () {});
        }
      } catch (e) {}
      ready = true;
    } catch (e) { failed = true; }
  }

  /* ---------- draw ---------- */
  function draw(ctx, W, H, t) {
    try {
      init();
      if (!ready || !ctx) { if (ctx) { ctx.fillStyle = C.indigo; ctx.fillRect(0, 0, W, H); } return; }
      try { ctx.imageSmoothingEnabled = false; } catch (e) {}
      var i, y, s;

      if (++fontTick >= 30) {
        fontTick = 0;
        var fo = fontOK();
        if (fo !== fontState) { fontState = fo; logoDirty = true; }
      }
      if (logoDirty) { logos[0] = buildLogo(false); logos[1] = buildLogo(true); logoDirty = false; }

      // sky + sun
      ctx.drawImage(sky, 0, 0);
      // stars
      for (i = 0; i < NSTARS; i++) {
        var v = Math.sin(t * 2.2 + starP[i]), sx = starX[i], sy = starY[i];
        if (v > 0.7) {
          ctx.fillStyle = C.lightCyan;
          ctx.fillRect(sx, sy, 1, 1);
          ctx.fillStyle = C.pink;
          ctx.fillRect(sx - 1, sy, 1, 1); ctx.fillRect(sx + 1, sy, 1, 1);
          ctx.fillRect(sx, sy - 1, 1, 1); ctx.fillRect(sx, sy + 1, 1, 1);
        } else if (v > -0.3) {
          ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, sy, 1, 1);
        } else {
          ctx.fillStyle = '#8a7ac8'; ctx.fillRect(sx, sy, 1, 1);
        }
      }
      ctx.drawImage(sunA, 0, 0);
      var ps = Math.floor((Math.sin(t * 1.6) * 0.5 + 0.5) * 2.99);
      if (ps > 0) {
        ctx.globalAlpha = PULSE_A[ps];
        ctx.drawImage(sunB, 0, 0);
        ctx.globalAlpha = 1;
      }
      // moving band cut-outs (copy sky back over sun)
      var bx = SUN_X - SUN_R, bw = SUN_R * 2;
      for (i = 0; i < 6; i++) {
        var pos = (i * 8 + t * 4) % 48;
        y = SUN_Y + 6 + Math.floor(pos);
        var th = 1 + Math.floor(pos / 10);
        if (y + th > HZ) th = HZ - y;
        if (th > 0) ctx.drawImage(sky, bx, y, bw, th, bx, y, bw, th);
      }

      // floor
      ctx.drawImage(floor, 0, HZ);
      var ph = (t * 0.45) % 1;
      for (i = 0; i < 12; i++) {
        var p = (i + ph) / 12, q = p * p;
        y = HZ + 3 + Math.floor(q * (FH - 4));
        var dy = y - HZ;
        ctx.fillStyle = dy < 20 ? '#7a1f78' : dy < 60 ? C.magenta : dy < 85 ? '#a82a80' : dy < 105 ? '#4a1a78' : '#2a1255';
        ctx.fillRect(0, y, 180, dy > 50 ? 2 : 1);
      }

      // palms
      s = Math.sin(t * 1.1);
      var f0 = s > 0.5 ? 3 : s > 0 ? 2 : s > -0.5 ? 1 : 0;
      s = Math.sin(t * 1.1 + 1.7);
      var f1 = s > 0.5 ? 3 : s > 0 ? 2 : s > -0.5 ? 1 : 0;
      s = Math.sin(t * 0.9 + 3.1);
      var f2 = s > 0.5 ? 3 : s > 0 ? 2 : s > -0.5 ? 1 : 0;
      ctx.drawImage(palms[1][0][f2], 32, 126);      // small, left-mid (behind)
      ctx.drawImage(palms[0][0][f0], 0, 100);       // big left
      ctx.drawImage(palms[0][1][f1], 110, 104);     // big right (mirrored)

      // logo (flicker on letter R)
      var fl = Math.sin(t * 23) + Math.sin(t * 7.3 + 1);
      var off = (Math.floor(t * 0.7) % 4 === 3 && fl > 0.9) || (Math.sin(t * 0.35) > 0.985);
      ctx.drawImage(logos[off ? 1 : 0], 0, 0);
    } catch (e) { /* never throw */ }
  }

  /* ---------- button ---------- */
  function button(ctx, x, y, w, h, label, pressed, t) {
    try {
      x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
      if (pressed) { x += 1; y += 1; }
      var pulse = ((Math.sin((t || 0) * 3) + 1) * 0.5) > 0.5;
      var edge = pressed ? C.pink : C.magenta;
      var glow1 = pressed ? C.magenta : '#7a1f78';
      var glow2 = pressed ? '#7a1f78' : C.purple;
      // stepped glow (outside)
      ctx.fillStyle = glow2; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
      ctx.fillStyle = glow1; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      // 2px outline
      ctx.fillStyle = edge; ctx.fillRect(x, y, w, h);
      // fill
      ctx.fillStyle = pressed ? '#2a0f55' : '#12082a';
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      // inner cyan highlight lines
      ctx.fillStyle = pressed ? C.mint : (pulse ? C.cyan : '#1fa0c8');
      ctx.fillRect(x + 3, y + 3, w - 6, 1);
      ctx.fillStyle = C.purple;
      ctx.fillRect(x + 3, y + h - 4, w - 6, 1);
      // corner notches
      ctx.fillStyle = C.dark;
      ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + w - 1, y, 1, 1);
      ctx.fillRect(x, y + h - 1, 1, 1); ctx.fillRect(x + w - 1, y + h - 1, 1, 1);
      // label
      ctx.font = '8px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var cx = x + (w >> 1), cy = y + (h >> 1) + 1;
      ctx.fillStyle = C.magenta; ctx.fillText(label, cx + 1, cy + 1);
      ctx.fillStyle = pressed ? '#ffffff' : C.lightCyan; ctx.fillText(label, cx, cy);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    } catch (e) { /* never throw */ }
  }

  window.TitleNeon = { draw: draw, button: button };
})();
