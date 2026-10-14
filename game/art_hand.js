/* KASIN (hand-built code art) - ported from art/scene_pickup.html.
 * window.HandArt.render(name) returns a fresh canvas at the sprite's native pixel size (feet / base at the
 * bottom edge, centred horizontally), or null if the name is unknown. game.js scales every style set
 * through one STYLE_SCALE table, so these native sizes only need to look right relative to each other.
 */
(function () {
'use strict';
var C = { ink: '#1c1a2a', snow: '#eef3fa', snow2: '#d3deee', snow3: '#b4c3dc',
  g1: '#587238', g2: '#668440', g3: '#4b6330', gdry: '#7d8744',
  asph: '#4a4f60', curb: '#97a0b6', paveA: '#b3b9c8', paveB: '#a2a9ba',
  roof1: '#3a5788', roof2: '#2e4676', roof3: '#4a6aa0', roof4: '#233860',
  wall: '#d8dbe4', wall2: '#bdc3d1', wall3: '#eef0f5', stone: '#767180', stone2: '#5d596a',
  win1: '#ffe79a', win2: '#ffc65a', win3: '#e89a3a', frame: '#f5f6fa',
  door: '#7b4b2a', door2: '#5c3720', brick: '#8c4c3b', brick2: '#6c3427',
  leaf1: '#e5922d', leaf2: '#f6c140', leaf3: '#b3601c', leaf4: '#7e3f14', bark: '#e9e6da',
  pine1: '#245640', pine2: '#17402f', pine3: '#357a56', trunk: '#5b3b22',
  taxi: '#f4c32c', taxi2: '#c8921a', taxi3: '#fff08a', glass: '#8fb6d4', glass2: '#5f87aa', red: '#d6403a',
  skin: '#f2cfa9', skin2: '#d9a57a' };

function n2(x, y) { var h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vn(x, y, s) {
  var gx = Math.floor(x / s), gy = Math.floor(y / s), fx = x / s - gx, fy = y / s - gy;
  var a = n2(gx, gy), b = n2(gx + 1, gy), c = n2(gx, gy + 1), d = n2(gx + 1, gy + 1), u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d'); g.imageSmoothingEnabled = false; return c; }
function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x | 0, y | 0, w | 0, h | 0); }
function P(c, x, y, col) { R(c, x, y, 1, 1, col); }
function disc(c, cx, cy, r, col) { c.fillStyle = col; for (var y = -r; y <= r; y++) { var w = Math.floor(Math.sqrt(r * r - y * y + r * 0.6)); c.fillRect(cx - w, cy + y, 2 * w + 1, 1); } }

/* --- house (reference house(); fills x 38..154, y 3..140) --- */
function win(c, x, y, w, h) {
  R(c, x - 1, y - 1, w + 2, h + 2, C.frame);
  for (var r = 0; r < h; r++) R(c, x, y + r, w, 1, r < h * 0.45 ? C.win1 : (r < h * 0.8 ? C.win2 : C.win3));
  R(c, x + (w >> 1), y, 1, h, C.frame); R(c, x, y + (h >> 1), w, 1, C.frame);
  R(c, x, y, 2, h - 3, '#b24a63'); R(c, x + w - 2, y, 2, h - 3, '#b24a63');
  R(c, x - 2, y + h + 1, w + 4, 2, C.wall2); R(c, x - 2, y + h + 3, w + 4, 1, 'rgba(0,0,0,.18)');
}
function houseDraw(c) {
  var x, y;
  R(c, 118, 6, 12, 26, C.brick); for (y = 9; y < 32; y += 4) R(c, 118, y, 12, 1, C.brick2);
  R(c, 116, 4, 16, 3, '#4d4c58'); R(c, 116, 3, 16, 1, C.snow);
  for (y = 22; y < 58; y++) {
    var r = y - 22, lx = Math.round(48 - r * 0.28), rx = Math.round(144 + r * 0.28);
    for (x = lx; x <= rx; x++) {
      var row = (y - 22) >> 2, off = (row & 1) * 3, col = C.roof1, m = (y - 22) & 3;
      if (m === 0) col = C.roof3; else if (m === 3) col = C.roof4;
      if (((x + off) % 7) === 0 && m > 0) col = C.roof2;
      if (y < 26 && n2(x, y) > (y - 22) * 0.18 + 0.18) col = n2(x + 1, y) > 0.4 ? C.snow : C.snow2;
      P(c, x, y, col);
    }
  }
  R(c, 40, 56, 112, 2, '#2a2f4c'); R(c, 42, 58, 108, 2, 'rgba(30,36,70,.5)');
  R(c, 46, 58, 100, 76, C.wall);
  for (y = 60; y < 128; y += 4) { R(c, 46, y, 100, 1, C.wall2); R(c, 46, y + 1, 100, 1, C.wall3); }
  R(c, 46, 58, 2, 76, C.wall3); R(c, 144, 58, 2, 76, C.wall2);
  R(c, 46, 126, 100, 8, C.stone); for (x = 46; x < 146; x += 6) R(c, x + ((x >> 1) & 2), 126, 1, 8, C.stone2); R(c, 46, 126, 100, 1, C.stone2);
  win(c, 56, 64, 14, 18); win(c, 89, 64, 14, 18); win(c, 122, 64, 14, 18); win(c, 56, 96, 14, 20); win(c, 122, 96, 14, 20);
  R(c, 88, 102, 16, 32, C.frame); R(c, 89, 103, 14, 31, C.door); R(c, 91, 106, 4, 10, C.door2); R(c, 97, 106, 4, 10, C.door2); R(c, 91, 119, 10, 12, C.door2);
  R(c, 91, 106, 4, 1, '#9a6439'); R(c, 97, 106, 4, 1, '#9a6439'); P(c, 101, 119, C.win2); P(c, 101, 120, C.win2);
  R(c, 86, 134, 20, 4, '#8d8a98'); R(c, 86, 134, 20, 1, C.snow2); R(c, 84, 138, 24, 2, '#5f5b6c');
  R(c, 82, 108, 3, 5, '#2a2d3a'); R(c, 83, 109, 1, 3, C.win1);
  [54, 87, 120].forEach(function (sx) { R(c, sx, 83, 18, 1, C.snow2); });
}
function houseB(c) { // small red-roofed cottage (not used in the demo, kept for the full game)
  var x, y;
  for (y = 6; y < 30; y++) { var r = y - 6; for (x = 4 + Math.round(r * 0.3); x < 76 - Math.round(r * 0.3); x++) P(c, x, y, (y % 4 === 0) ? '#c8483c' : '#a8322c'); }
  R(c, 4, 6, 72, 2, C.snow);
  R(c, 10, 30, 60, 38, '#e8e0d0'); for (y = 32; y < 66; y += 4) R(c, 10, y, 60, 1, '#cfc6b2');
  win(c, 18, 38, 12, 14); win(c, 50, 38, 12, 14);
  R(c, 34, 44, 12, 24, C.frame); R(c, 35, 45, 10, 23, '#5a3a1e');
  R(c, 0, 68, 80, 6, '#9a958a');
}
/* --- trees --- */
function birch(c, x, base) {
  c.fillStyle = 'rgba(20,24,60,.28)'; c.fillRect(x - 6, base - 1, 26, 5);
  R(c, x, base - 52, 5, 54, C.bark); R(c, x + 4, base - 52, 1, 54, C.snow3);
  for (var y = base - 50; y < base; y += 5) { var k = n2(y, x) > 0.5; R(c, x + (k ? 0 : 2), y, k ? 3 : 2, 1, C.ink); }
  var blobs = [[x - 9, base - 60, 11, C.leaf3], [x + 14, base - 58, 11, C.leaf3], [x + 2, base - 72, 12, C.leaf3], [x - 6, base - 72, 9, C.leaf1],
    [x + 14, base - 70, 9, C.leaf1], [x + 4, base - 60, 10, C.leaf1], [x - 2, base - 78, 8, C.leaf2]];
  blobs.forEach(function (b) { disc(c, b[0], b[1], b[2], b[3]); });
  for (var i = 0; i < 110; i++) {
    var a = n2(i, 5) * 6.28, d = n2(i, 6) * 20;
    P(c, Math.round(x + 2 + Math.cos(a) * d * 0.9), Math.round(base - 66 + Math.sin(a) * d * 0.8), i % 4 ? C.leaf2 : C.leaf4);
  }
}
function pine(c, cx, base, sc) {
  var tiers = 4;
  R(c, cx - 2, base - 6, 4, 8, C.trunk);
  for (var t = 0; t < tiers; t++) {
    // lowest tier (t=0) is the widest so it reads as a proper fir
    var h = Math.round(15 * sc), y0 = base - 8 - (t + 1) * Math.round(11 * sc) + Math.round(8 * sc);
    var hw = Math.round((5 + (tiers - t) * 3.2) * sc);
    for (var r = 0; r < h; r++) {
      var w = Math.max(1, Math.round(hw * (r + 1) / h));
      for (var x = -w; x <= w; x++) {
        var col = x > w * 0.3 ? C.pine2 : (x < -w * 0.4 ? C.pine3 : C.pine1);
        if (n2(cx + x, y0 + r + t * 9) > 0.9) col = C.pine2;
        if (r < 3 && n2(cx + x, y0 + r) > 0.38 && Math.abs(x) < w - 1) col = (x > 0 ? C.snow2 : C.snow);
        P(c, cx + x, y0 + r, col);
      }
    }
  }
}
function palm(c) { // 32x44
  R(c, 15, 16, 3, 28, '#a07840'); for (var y = 18; y < 44; y += 4) R(c, 15, y, 3, 1, '#7a5a2c');
  var fr = [[-13, 4], [13, 4], [-10, -3], [10, -3], [-4, -7], [4, -7], [0, 8]];
  c.strokeStyle = '#1f6a2a'; c.lineWidth = 3;
  fr.forEach(function (d) { c.beginPath(); c.moveTo(16, 14); c.lineTo(16 + d[0], 14 + d[1]); c.stroke(); });
  c.strokeStyle = '#3fb34a'; c.lineWidth = 1;
  fr.forEach(function (d) { c.beginPath(); c.moveTo(16, 13); c.lineTo(16 + d[0], 13 + d[1]); c.stroke(); });
  disc(c, 16, 15, 2, '#6a4a22');
}
/* --- people (reference person(), standing pose, feet at y) --- */
var PEOPLE = {
  a_adult1: { kind: 'a', hair: '#e8c765', long: true, jacket: '#2fa39a', jdark: '#1f7a74', pants: '#33405e' },
  a_kid1: { kind: 'k', hair: '#f0d27a', hat: '#d6403a', pom: true, jacket: '#ee7fa8', jdark: '#c35582', pants: '#3a3a5a' },
  a_kid2: { kind: 'k', hair: '#d9732b', jacket: '#3a6fd0', jdark: '#264c9a', pants: '#4a4a62' },
  a_adult2: { kind: 'a', hair: '#8a6a45', beard: true, jacket: '#e2a823', jdark: '#b0801a', pants: '#2d3550' },
  b_adult1: { kind: 'a', hair: '#b5651d', long: true, jacket: '#9a4fb0', jdark: '#733a85', pants: '#2a3350' },
  b_adult2: { kind: 'a', hair: '#3a2a1a', glasses: true, jacket: '#3f9a55', jdark: '#2c7440', pants: '#2a2a2a' },
  b_kid1: { kind: 'k', hair: '#222222', hat: '#2aa8d6', jacket: '#f1c40f', jdark: '#b8960a', pants: '#445566' },
  b_kid2: { kind: 'k', hair: '#b5651d', pom: false, jacket: '#e84393', jdark: '#b02a70', pants: '#334' },
  driver: { kind: 'a', hair: '#8a8a95', cap: '#2a2d3a', jacket: '#4a4d60', jdark: '#33364a', pants: '#222233' },
  clerk: { kind: 'a', hair: '#5a3a1a', long: true, jacket: '#1e8bc3', jdark: '#15668f', pants: '#223355' },
  attendant: { kind: 'a', hair: '#7a4a1a', cap: '#c0392b', jacket: '#c0392b', jdark: '#8a2a20', pants: '#5a1f1f' }
};
function person(c, x, y, o) {
  var adult = o.kind === 'a', sh = [];
  function add(a, col) { sh.push([a, col]); }
  if (adult) {
    add([-4, -22, 8, 4], o.hair); add([-3, -19, 6, 5], C.skin);
    if (o.long) { add([-5, -21, 2, 9], o.hair); add([3, -21, 2, 9], o.hair); }
    if (o.cap) add([-5, -24, 10, 3], o.cap);
    add([-5, -14, 10, 9], o.jacket); add([-5, -6, 10, 1], o.jdark);
    add([-7, -13, 2, 8], o.jacket); add([5, -13, 2, 8], o.jacket); add([-7, -5, 2, 2], C.skin); add([5, -5, 2, 2], C.skin);
    add([-4, -5, 3, 4], o.pants); add([1, -5, 3, 4], o.pants);
    add([-4, -1, 3, 1], C.ink); add([1, -1, 3, 1], C.ink);
  } else {
    add([-4, -17, 8, 5], o.hat || o.hair); if (o.hat) add([-4, -13, 8, 1], o.hair);
    add([-3, -13, 6, 4], C.skin);
    add([-4, -9, 8, 6], o.jacket); add([-4, -4, 8, 1], o.jdark);
    add([-6, -8, 2, 5], o.jacket); add([4, -8, 2, 5], o.jacket);
    add([-3, -3, 3, 3], o.pants); add([0, -3, 3, 3], o.pants);
  }
  sh.forEach(function (s) { var a = s[0]; R(c, x + a[0] - 1, y + a[1] - 1, a[2] + 2, a[3] + 2, C.ink); });
  sh.forEach(function (s) { var a = s[0]; R(c, x + a[0], y + a[1], a[2], a[3], s[1]); });
  if (o.hol) { // bare legs below the shorts, flip-flops, shirt flowers, sunglasses
    R(c, x - 4, y - (adult ? 3 : 1), 3, adult ? 2 : 1, C.skin); R(c, x + 1, y - (adult ? 3 : 1), 3, adult ? 2 : 1, C.skin);
    P(c, x - 2, y - (adult ? 10 : 6), '#ffffff'); P(c, x + 2, y - (adult ? 8 : 5), '#ffffff');
    R(c, x - 3, y - (adult ? 18 : 12), 6, 2, '#111111');
  }
  if (adult) { P(c, x - 2, y - 17, C.ink); P(c, x + 1, y - 17, C.ink); if (o.glasses) R(c, x - 3, y - 18, 6, 1, '#3a3a4a'); if (o.beard) R(c, x - 2, y - 15, 4, 1, o.hair); }
  else { P(c, x - 2, y - 11, C.ink); P(c, x + 1, y - 11, C.ink); P(c, x - 2, y - 9, C.skin2); }
  if (o.pom) R(c, x - 1, y - 19, 3, 2, '#ffffff');
}
function suitcase(c) { R(c, 0, 3, 8, 10, C.ink); R(c, 1, 4, 6, 8, '#d6403a'); R(c, 1, 7, 6, 1, 'rgba(0,0,0,.25)'); R(c, 3, 0, 2, 3, C.ink); R(c, 1, 13, 2, 1, C.ink); R(c, 5, 13, 2, 1, C.ink); }
/* --- taxi (reference taxi(), side view facing right; 42x21) --- */
function taxi(c, x, y, body, roof) {
  R(c, x - 1, y - 10, 42, 10, C.ink); R(c, x + 2, y - 16, 28, 8, C.ink); R(c, x + 11, y - 19, 14, 4, C.ink);
  R(c, x, y - 9, 40, 8, body); R(c, x, y - 4, 40, 3, C.taxi2); R(c, x + 3, y - 15, 26, 7, body);
  R(c, x + 5, y - 14, 10, 6, C.glass); R(c, x + 17, y - 14, 10, 6, C.glass); R(c, x + 5, y - 14, 10, 1, C.glass2); R(c, x + 17, y - 14, 10, 1, C.glass2); R(c, x + 16, y - 15, 1, 7, C.taxi2);
  R(c, x + 12, y - 18, 12, 3, C.ink); R(c, x + 13, y - 17, 10, 2, roof);
  R(c, x, y - 9, 40, 1, C.taxi3);
  R(c, x + 36, y - 8, 3, 3, C.taxi3); R(c, x + 1, y - 7, 3, 2, C.red);
  R(c, x + 6, y - 6, 10, 1, C.taxi2); R(c, x + 28, y - 7, 1, 5, C.taxi2);
  [x + 7, x + 29].forEach(function (wx) { disc(c, wx + 3, y - 1, 4, C.ink); disc(c, wx + 3, y - 1, 3, '#2c2c3a'); P(c, wx + 3, y - 1, '#9aa0b4'); P(c, wx + 2, y - 1, '#9aa0b4'); });
}
function airport(c) { // 96x64
  var x;
  R(c, 0, 8, 96, 6, '#5a6074'); R(c, 0, 8, 96, 1, C.snow); R(c, 2, 14, 92, 46, '#b4bccb'); R(c, 2, 14, 92, 2, C.wall3);
  for (x = 2; x < 94; x += 6) R(c, x, 16, 1, 44, '#a2abbd');
  R(c, 8, 26, 80, 20, C.glass2); for (x = 8; x < 88; x += 10) { R(c, x, 26, 1, 20, '#b4bccb'); R(c, x + 1, 27, 4, 18, C.glass); }
  R(c, 8, 26, 80, 1, '#b4bccb'); R(c, 8, 46, 80, 1, '#b4bccb');
  R(c, 28, 2, 40, 12, '#c33a3a'); R(c, 29, 3, 38, 10, '#d6504a');
  c.fillStyle = '#ffffff'; c.font = '8px monospace'; c.textBaseline = 'top'; c.fillText('OULU', 38, 4);
  R(c, 40, 46, 16, 14, '#2a3550'); R(c, 41, 47, 6, 13, C.win1); R(c, 49, 47, 6, 13, C.win1);
  R(c, 0, 60, 96, 4, '#8d8a98'); R(c, 0, 60, 96, 1, C.snow2);
  for (x = 4; x < 92; x += 9) P(c, x, 8, C.snow2);
}
/* --- title backdrop 180x320: night village --- */
function titleBg(c) {
  var W = 180, H = 320, x, y, g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b1030'); g.addColorStop(0.5, '#262a66'); g.addColorStop(0.8, '#6a5f98'); g.addColorStop(1, '#9a86b0');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (var i = 0; i < 60; i++) P(c, Math.floor(n2(i, 3) * W), Math.floor(n2(i, 4) * 170), n2(i, 5) > 0.7 ? '#ffffff' : '#a8b0e0');
  disc(c, 144, 62, 11, '#f4f0d0'); disc(c, 149, 59, 9, '#262a66');
  for (y = 200; y < H; y++) for (x = 0; x < W; x++) {
    var n = n2(x, y), col = C.snow; if (n < 0.1) col = C.snow2; else if (n > 0.95) col = C.snow3; P(c, x, y, col);
  }
  for (x = 0; x < W; x++) { var h = Math.round(vn(x, 0, 24) * 14); R(c, x, 196 + h, 1, 4, C.snow); }
  [[10, 214, 0.8], [168, 212, 0.9], [150, 226, 0.7], [28, 232, 0.6]].forEach(function (p) { pine(c, p[0], p[1], p[2]); });
  c.save(); c.translate(32, 150 - 3 + 0); houseDraw2(c); c.restore();
  R(c, 0, 292, W, 28, C.asph); R(c, 0, 290, W, 2, C.curb);
  for (x = 6; x < W; x += 26) R(c, x, 308, 14, 2, '#d9d8c8');
}
function houseDraw2(c) { c.save(); c.translate(-36, -2); houseDraw(c); c.restore(); }

/* ---- additional fallbacks: every asset name the engine can ask for has a hand-drawn version ---- */
PEOPLE.rental_agent = { kind: 'a', hair: '#2a2018', jacket: '#e8a020', jdark: '#b07810', pants: '#2a2a3a', glasses: true };

function key(c) { disc(c, 3, 3, 3, '#ffd23a'); P(c, 3, 3, '#7a5a00'); R(c, 5, 2, 8, 2, '#ffd23a'); R(c, 10, 4, 2, 2, '#ffd23a'); R(c, 8, 4, 1, 2, '#ffd23a'); }
function rentalCar(c) { // top-down, white so the engine can tint it, facing up; 24x40
  R(c, 0, 7, 3, 9, '#111'); R(c, 21, 7, 3, 9, '#111'); R(c, 0, 26, 3, 9, '#111'); R(c, 21, 26, 3, 9, '#111');
  R(c, 2, 2, 20, 36, C.ink); R(c, 3, 3, 18, 34, '#f4f4f6'); R(c, 3, 33, 18, 4, '#d8d8de');
  R(c, 5, 9, 14, 7, '#6f90b4'); R(c, 5, 10, 14, 1, '#9fc0dc'); R(c, 5, 27, 14, 5, '#6f90b4'); R(c, 6, 17, 12, 9, '#e8e8ee');
  R(c, 4, 3, 4, 2, '#fff3a0'); R(c, 16, 3, 4, 2, '#fff3a0'); R(c, 4, 36, 3, 1, '#d6403a'); R(c, 17, 36, 3, 1, '#d6403a');
}
function tractor(c) { // 44x22
  R(c, 2, 8, 22, 10, C.ink); R(c, 3, 9, 20, 8, '#e8a020'); R(c, 6, 3, 10, 6, C.ink); R(c, 7, 4, 8, 4, '#8fb6d4');
  R(c, 26, 12, 16, 5, C.ink); R(c, 27, 13, 14, 3, '#9aa0b4');
  [8, 20, 34].forEach(function (x) { disc(c, x, 18, 3, C.ink); disc(c, x, 18, 2, '#444'); });
  R(c, 23, 14, 4, 1, C.ink);
}
function counter(c) { // 84x34
  R(c, 0, 10, 84, 24, C.ink); R(c, 1, 11, 82, 22, '#a07a4c'); R(c, 1, 11, 82, 4, '#c9a06a'); R(c, 1, 29, 82, 4, '#6a4a28');
  R(c, 6, 0, 18, 11, C.ink); R(c, 7, 1, 16, 8, '#2a3b66'); R(c, 8, 2, 14, 5, '#8fb6d4');
  R(c, 54, 4, 22, 7, C.ink); R(c, 55, 5, 20, 5, '#c33a3a');
  for (var x = 4; x < 80; x += 12) R(c, x, 18, 8, 8, '#8a6438');
}
function belt(c) { // 70x16
  R(c, 0, 4, 70, 12, C.ink); R(c, 1, 5, 68, 8, '#3a3d4a'); R(c, 1, 13, 68, 2, '#6a6e7e');
  for (var x = 4; x < 68; x += 8) R(c, x, 5, 2, 8, '#555a68');
  R(c, 0, 0, 3, 14, '#9aa0b4'); R(c, 67, 0, 3, 14, '#9aa0b4');
}
function cart(c) { // 26x22
  R(c, 2, 2, 2, 14, '#9aa0b4'); R(c, 2, 4, 20, 2, '#9aa0b4'); R(c, 4, 14, 20, 2, '#9aa0b4'); R(c, 22, 4, 2, 12, '#9aa0b4');
  R(c, 6, 6, 8, 8, '#7a3a1a'); R(c, 15, 8, 6, 6, '#3a6fd0'); disc(c, 7, 19, 2, C.ink); disc(c, 20, 19, 2, C.ink);
}
function bench(c) { R(c, 0, 4, 40, 4, C.ink); R(c, 1, 5, 38, 2, '#7a5a3a'); R(c, 2, 8, 3, 7, C.ink); R(c, 35, 8, 3, 7, C.ink); R(c, 0, 0, 40, 3, '#5a4028'); }
function depSign(c) { // 44x26
  R(c, 20, 0, 4, 26, '#4a4d60'); R(c, 0, 0, 44, 16, C.ink); R(c, 1, 1, 42, 14, '#1b2a5a');
  for (var r = 0; r < 3; r++) { R(c, 4, 3 + r * 4, 24, 2, '#ffd23a'); R(c, 32, 3 + r * 4, 8, 2, '#8fe0ff'); }
}
function gateDesk(c) { // 44x28
  R(c, 0, 8, 44, 20, C.ink); R(c, 1, 9, 42, 18, '#d8dbe4'); R(c, 1, 9, 42, 3, '#fff'); R(c, 1, 22, 42, 5, '#8a93a8');
  R(c, 6, 0, 14, 9, C.ink); R(c, 7, 1, 12, 6, '#2a3b66'); R(c, 28, 2, 10, 7, C.ink); R(c, 29, 3, 8, 5, '#c33a3a');
}
function jetBridge(c) { // 64x44
  R(c, 0, 14, 64, 20, C.ink); R(c, 1, 15, 62, 17, '#c9ced8'); R(c, 1, 15, 62, 3, '#eef0f5');
  for (var x = 6; x < 60; x += 10) R(c, x, 20, 6, 8, '#6f90b4');
  R(c, 48, 6, 14, 32, C.ink); R(c, 49, 7, 12, 30, '#e8a020'); R(c, 4, 34, 3, 10, '#555a68'); R(c, 40, 34, 3, 10, '#555a68');
}
function tower(c) { // 24x70
  R(c, 8, 20, 8, 50, C.ink); R(c, 9, 21, 6, 49, '#c9ced8'); R(c, 0, 4, 24, 16, C.ink); R(c, 1, 5, 22, 13, '#8fb6d4'); R(c, 1, 5, 22, 2, '#eef0f5');
  R(c, 10, 0, 4, 5, '#d6403a'); R(c, 4, 18, 16, 3, '#6a7084');
}
function plant(c) { R(c, 3, 16, 8, 8, C.ink); R(c, 4, 17, 6, 6, '#b3601c'); [[2, 6], [7, 2], [11, 7], [5, 10]].forEach(function (p) { disc(c, p[0] + 1, p[1] + 3, 4, '#2f9a4a'); }); }
function vending(c) { R(c, 0, 0, 16, 28, C.ink); R(c, 1, 1, 14, 26, '#d6403a'); R(c, 2, 3, 12, 14, '#8fb6d4'); R(c, 3, 5, 3, 3, '#ffd23a'); R(c, 8, 5, 3, 3, '#3fb34a'); R(c, 3, 11, 3, 3, '#4a69d8'); R(c, 4, 21, 8, 3, C.ink); }
function villa(c) { // 100x84, whitewashed, terracotta roof
  var x, y;
  R(c, 6, 36, 88, 46, C.ink); R(c, 7, 37, 86, 44, '#f6f2ea'); R(c, 7, 37, 86, 3, '#fff');
  for (y = 6; y < 36; y++) { var r = y - 6; R(c, 4 + Math.round(r * 0.35), y, 92 - Math.round(r * 0.7), 1, (y % 4 === 0) ? '#a8502a' : '#d4703f'); }
  R(c, 2, 34, 96, 3, '#a8502a'); R(c, 2, 34, 96, 1, '#e88a56');
  R(c, 14, 46, 14, 16, C.ink); R(c, 15, 47, 12, 14, '#3a6fd0'); R(c, 20, 47, 1, 14, '#f6f2ea');
  R(c, 72, 46, 14, 16, C.ink); R(c, 73, 47, 12, 14, '#3a6fd0'); R(c, 78, 47, 1, 14, '#f6f2ea');
  R(c, 40, 52, 20, 30, C.ink); R(c, 41, 53, 18, 29, '#8a5230'); R(c, 43, 51, 14, 4, '#8a5230'); R(c, 49, 60, 1, 22, '#5a3418'); P(c, 55, 68, '#ffd23a');
  R(c, 0, 62, 12, 20, '#2f9a4a'); disc(c, 6, 60, 7, '#e0407a'); disc(c, 90, 66, 8, '#e0407a'); R(c, 88, 70, 12, 12, '#2f9a4a');
  R(c, 2, 80, 96, 4, '#d8c9a0');
}
function lounger(c) { R(c, 0, 4, 34, 8, C.ink); R(c, 1, 5, 32, 6, '#f2f2f2'); for (var x = 2; x < 32; x += 6) R(c, x, 5, 3, 6, '#2fa3b8'); R(c, 24, 0, 8, 6, '#2fa3b8'); R(c, 2, 11, 3, 3, C.ink); R(c, 29, 11, 3, 3, C.ink); }
function poolFloat(c) { disc(c, 11, 11, 10, C.ink); disc(c, 11, 11, 9, '#ff6aa8'); disc(c, 11, 11, 4, '#3a9ad8'); R(c, 4, 8, 4, 3, '#fff'); R(c, 15, 12, 4, 3, '#fff'); }
function cactus(c) { R(c, 5, 4, 5, 20, C.ink); R(c, 6, 5, 3, 19, '#3a9a4a'); R(c, 0, 9, 3, 8, C.ink); R(c, 1, 10, 2, 6, '#3a9a4a'); R(c, 1, 15, 6, 3, '#3a9a4a'); R(c, 11, 6, 3, 9, C.ink); R(c, 11, 7, 2, 7, '#3a9a4a'); R(c, 8, 12, 5, 3, '#3a9a4a'); P(c, 7, 6, '#f4e8a0'); }
function whiteHouse(c) { // 44x36 cube house
  R(c, 2, 8, 40, 28, C.ink); R(c, 3, 9, 38, 26, '#f6f2ea'); R(c, 3, 9, 38, 3, '#fff'); R(c, 1, 6, 42, 4, '#d8d0c0');
  R(c, 8, 16, 8, 9, '#3a6fd0'); R(c, 28, 16, 8, 9, '#3a6fd0'); R(c, 18, 22, 8, 14, '#c9663c'); R(c, 34, 2, 7, 5, '#f6f2ea');
}
function teide(c) { // 180x64 volcano silhouette with snow cap
  var x; c.fillStyle = '#7a5a4a'; c.beginPath(); c.moveTo(0, 64); c.lineTo(50, 40); c.lineTo(78, 20); c.lineTo(90, 6); c.lineTo(104, 18); c.lineTo(130, 38); c.lineTo(180, 64); c.closePath(); c.fill();
  c.fillStyle = '#8f6c58'; c.beginPath(); c.moveTo(90, 6); c.lineTo(104, 18); c.lineTo(130, 38); c.lineTo(180, 64); c.lineTo(110, 64); c.closePath(); c.fill();
  c.fillStyle = '#f4f6fb'; c.beginPath(); c.moveTo(90, 6); c.lineTo(80, 19); c.lineTo(86, 17); c.lineTo(90, 24); c.lineTo(96, 17); c.lineTo(102, 18); c.closePath(); c.fill();
  for (x = 10; x < 170; x += 14) P(c, x, 58 - Math.round(vn(x, 3, 9) * 6), '#5a4034');
}
function goat(c) { // 18x14
  R(c, 3, 4, 10, 6, C.ink); R(c, 4, 5, 8, 4, '#f2f0e8'); R(c, 11, 1, 5, 5, C.ink); R(c, 12, 2, 3, 3, '#f2f0e8'); R(c, 12, 0, 1, 2, '#7a6a50'); R(c, 15, 0, 1, 2, '#7a6a50');
  R(c, 4, 10, 2, 4, C.ink); R(c, 10, 10, 2, 4, C.ink); R(c, 2, 5, 2, 2, '#f2f0e8'); P(c, 13, 3, C.ink);
}
function planeSide(c) { // 84x30
  disc(c, 40, 15, 14, C.ink);
  c.fillStyle = C.ink; c.fillRect(8, 10, 72, 10);
  R(c, 4, 11, 74, 8, '#f4f6fa'); disc(c, 70, 15, 5, '#f4f6fa'); R(c, 6, 17, 70, 2, '#c8cfdc');
  R(c, 4, 6, 8, 12, C.ink); R(c, 5, 2, 6, 14, '#c33a3a'); R(c, 8, 8, 6, 10, '#f4f6fa');
  for (var i = 0; i < 10; i++) R(c, 22 + i * 5, 12, 3, 3, '#5a87b4');
  R(c, 64, 12, 9, 4, '#3a6fd0'); c.fillStyle = C.ink; c.beginPath(); c.moveTo(34, 18); c.lineTo(52, 18); c.lineTo(40, 28); c.lineTo(32, 28); c.closePath(); c.fill();
  c.fillStyle = '#9aa0b4'; c.beginPath(); c.moveTo(36, 19); c.lineTo(50, 19); c.lineTo(41, 27); c.lineTo(35, 27); c.closePath(); c.fill();
}
/* backgrounds (180x320) */
function vgrad(c, w, h, stops, y0, y1) { var g = c.createLinearGradient(0, y0, 0, y1); stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); c.fillStyle = g; c.fillRect(0, y0, w, y1 - y0); }
function checker(c, y0, a, b, s) { for (var y = y0; y < 320; y += s) for (var x = 0; x < 180; x += s) R(c, x, y, s, s, ((x + y) / s) % 2 ? a : b); }
function bgCheckin(c) { R(c, 0, 0, 180, 130, '#cfd9e6'); R(c, 0, 0, 180, 6, '#8aa0bd'); for (var i = 0; i < 4; i++) R(c, 8 + i * 43, 20, 34, 40, '#9fc8ee'); checker(c, 130, '#aab4c4', '#c2cbd8', 20); }
function bgGate(c) { R(c, 0, 0, 180, 140, '#d6dce8'); vgrad(c, 180, 320, [[0, '#7fb8f0'], [1, '#d8ecff']], 14, 62); R(c, 6, 12, 168, 3, '#8aa0bd'); R(c, 6, 62, 168, 3, '#8aa0bd'); checker(c, 140, '#b4bccb', '#cdd4df', 20); }
function bgPlane(c) { R(c, 0, 0, 180, 320, '#d8dde6'); R(c, 80, 0, 20, 320, '#3a4a7a'); for (var y = 24; y < 260; y += 46) { R(c, 2, y, 6, 20, '#8fb8e8'); R(c, 172, y, 6, 20, '#8fb8e8'); } }
function bgArrival(c) {
  vgrad(c, 180, 320, [[0, '#4fb3f0'], [0.45, '#bfe6ff'], [0.62, '#ffe0a8']], 0, 200);
  c.fillStyle = '#8a6a4a'; c.beginPath(); c.moveTo(130, 140); c.lineTo(70, 200); c.lineTo(200, 200); c.fill();
  R(c, 0, 200, 180, 120, '#8d8a86'); for (var i = 0; i < 7; i++) R(c, 8 + i * 26, 280, 14, 3, '#e8e8e0');
}
function bgRental(c) { // bright arrivals hall with palms outside
  R(c, 0, 0, 180, 120, '#e8e2d2'); vgrad(c, 180, 320, [[0, '#6cc0f4'], [1, '#d8f0ff']], 14, 74);
  for (var i = 0; i < 3; i++) { R(c, 8 + i * 58, 14, 52, 60, '#ffffff'); R(c, 10 + i * 58, 16, 48, 56, '#9fd8ff'); R(c, 33 + i * 58, 40, 3, 34, '#7a5a3a'); disc(c, 34 + i * 58, 36, 9, '#2e9a3a'); }
  R(c, 0, 74, 180, 4, '#b8b0a0'); checker(c, 120, '#f0e6cc', '#e2d6b4', 20);
}
function bgAirbnb(c) { // sunny garden, sea on the horizon
  vgrad(c, 180, 320, [[0, '#4fb3f0'], [0.5, '#bfe6ff'], [1, '#ffe8b0']], 0, 120);
  R(c, 0, 96, 180, 24, '#2f9ad8'); for (var i = 0; i < 10; i++) R(c, (i * 37) % 170, 100 + (i * 7) % 18, 12, 1, '#8fd0f4');
  R(c, 0, 120, 180, 200, '#c8b878'); for (var y = 120; y < 320; y += 3) for (var x = 0; x < 180; x += 3) if (n2(x, y) > 0.8) P(c, x, y, '#d8c88a');
  R(c, 0, 196, 180, 124, '#d8c9a0'); R(c, 70, 196, 40, 124, '#e8dcc0');
}
function bgPool(c) { // sunset terrace; engine draws the water rectangle if no art is present
  vgrad(c, 180, 320, [[0, '#2a2a6a'], [0.35, '#d86a8a'], [0.7, '#ffb860']], 0, 110);
  R(c, 0, 90, 180, 30, '#c9663c'); R(c, 0, 110, 180, 6, '#f6f2ea');
  R(c, 0, 116, 180, 204, '#e6d8b8'); for (var y = 116; y < 320; y += 16) R(c, 0, y, 180, 1, '#cdbf9c');
}
function bgEnding(c) {
  vgrad(c, 180, 320, [[0, '#ff9a5a'], [0.45, '#ffd08a'], [0.6, '#ffe8b0']], 0, 190);
  R(c, 0, 190, 180, 60, '#2f9ad8'); for (var i = 0; i < 12; i++) R(c, ((i * 37) % 170) + 4, 196 + ((i * 13) % 50), 14, 1, '#8fd0f4');
  R(c, 0, 250, 180, 70, '#f0d8a0');
  for (var p = 0; p < 3; p++) { var px = 14 + p * 70; R(c, px, 160, 4, 90, '#7a5a2c'); c.strokeStyle = '#1f6a2a'; c.lineWidth = 3; for (var k = 0; k < 5; k++) { c.beginPath(); c.moveTo(px + 2, 160); c.lineTo(px + 2 + (k - 2) * 9, 168 + Math.abs(k - 2) * 3); c.stroke(); } }
}


function terminal(c) { // 134x58: modern glass terminal with flat roof, blue sign band and a control tower
  var x;
  R(c, 0, 14, 118, 40, C.ink); R(c, 1, 15, 116, 38, '#b4bccb'); R(c, 0, 10, 120, 6, '#6a7284'); R(c, 0, 10, 120, 1, C.snow);
  R(c, 4, 4, 112, 8, '#2a4aa8'); R(c, 4, 4, 112, 2, '#4a6ad0'); c.fillStyle = '#ffffff'; c.font = '7px monospace'; c.textBaseline = 'top'; c.fillText('OULU  LENTOKENTTA', 12, 5);
  R(c, 6, 22, 106, 26, '#5a87b4'); for (x = 6; x < 112; x += 12) { R(c, x, 22, 1, 26, '#b4bccb'); R(c, x + 2, 24, 4, 22, '#8fb6d4'); }
  R(c, 6, 22, 106, 1, '#e8ecf4'); R(c, 48, 32, 22, 22, '#2a3550'); R(c, 50, 34, 8, 20, '#ffe79a'); R(c, 60, 34, 8, 20, '#ffe79a');
  R(c, 0, 54, 120, 4, '#8d8a98');
  R(c, 120, 0, 12, 58, C.ink); R(c, 121, 1, 10, 57, '#c9ced8'); R(c, 118, 0, 16, 10, C.ink); R(c, 119, 1, 14, 7, '#8fb6d4'); R(c, 124, 0, 4, 2, '#d6403a');
}
function planeTop(c) { // 72x64 parked plane seen from above, nose up, blue tail
  R(c, 30, 6, 12, 54, C.ink); R(c, 31, 7, 10, 52, '#f4f6fa');
  R(c, 33, 2, 6, 6, C.ink); R(c, 34, 3, 4, 4, '#f4f6fa');
  c.fillStyle = C.ink; c.beginPath(); c.moveTo(30, 24); c.lineTo(2, 40); c.lineTo(2, 46); c.lineTo(30, 38); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(42, 24); c.lineTo(70, 40); c.lineTo(70, 46); c.lineTo(42, 38); c.closePath(); c.fill();
  c.fillStyle = '#e4e8f0'; c.beginPath(); c.moveTo(31, 26); c.lineTo(5, 40); c.lineTo(5, 44); c.lineTo(31, 37); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(41, 26); c.lineTo(67, 40); c.lineTo(67, 44); c.lineTo(41, 37); c.closePath(); c.fill();
  R(c, 24, 54, 24, 6, C.ink); R(c, 25, 55, 22, 4, '#f4f6fa'); R(c, 33, 48, 6, 14, '#3a6fd0');
  R(c, 14, 36, 6, 6, '#8a92a6'); R(c, 52, 36, 6, 6, '#8a92a6');
}
function planeFlyArt(c) { c.save(); c.scale(1.2, 1.2); planeSide(c); c.restore(); }
var HOL_SHIRTS = { a_adult1: '#ff6a9a', a_adult2: '#ffd23a', a_kid1: '#3ad0a8', a_kid2: '#ff8a3a', b_adult1: '#a45af0', b_adult2: '#3a9af0', b_kid1: '#ff4a4a', b_kid2: '#3acaf0',
                   driver: '#3a9af0', clerk: '#ff6a9a', attendant: '#ff8a3a', rental_agent: '#ffd23a' };
var NAMES = {};
function def(name, w, h, fn) { NAMES[name] = { w: w, h: h, fn: fn }; }
def('house_a', 120, 140, function (c) { c.translate(-36, -2); houseDraw(c); });
def('house_b', 80, 74, function (c) { houseB(c); });
def('tree_birch', 56, 96, function (c) { birch(c, 22, 88); });
def('tree_pine', 40, 52, function (c) { pine(c, 20, 46, 1); });
def('tree_palm', 32, 44, function (c) { palm(c); });
def('taxi_a', 44, 22, function (c) { taxi(c, 2, 20, C.taxi, C.taxi3); });
def('taxi_b', 44, 22, function (c) { taxi(c, 2, 20, '#e8ecf2', '#f08a20'); });
def('suitcase', 8, 14, function (c) { suitcase(c); });
def('airport_building', 96, 64, function (c) { airport(c); });
def('bg_title', 180, 320, function (c) { titleBg(c); });
def('rental_agent', 24, 30, function (c) { person(c, 12, 28, PEOPLE.rental_agent); });
def('key', 14, 8, function (c) { key(c); });
def('rental_car', 24, 40, function (c) { rentalCar(c); });
def('baggage_tractor', 44, 22, function (c) { tractor(c); });
def('checkin_counter', 84, 34, function (c) { counter(c); });
def('baggage_belt', 70, 16, function (c) { belt(c); });
def('luggage_cart', 26, 22, function (c) { cart(c); });
def('airport_bench', 40, 16, function (c) { bench(c); });
def('departure_sign', 44, 26, function (c) { depSign(c); });
def('gate_desk', 44, 28, function (c) { gateDesk(c); });
def('jet_bridge', 64, 44, function (c) { jetBridge(c); });
def('control_tower', 24, 70, function (c) { tower(c); });
def('airport_plant', 14, 26, function (c) { plant(c); });
def('vending_machine', 16, 28, function (c) { vending(c); });
def('airbnb_house', 100, 84, function (c) { villa(c); });
def('pool_lounger', 34, 14, function (c) { lounger(c); });
def('pool_float', 22, 22, function (c) { poolFloat(c); });
def('cactus', 14, 24, function (c) { cactus(c); });
def('white_house', 44, 36, function (c) { whiteHouse(c); });
def('teide', 180, 64, function (c) { teide(c); });
def('goat', 18, 14, function (c) { goat(c); });
def('plane_side', 84, 30, function (c) { planeSide(c); });
def('bg_checkin', 180, 320, function (c) { bgCheckin(c); });
def('bg_gate', 180, 320, function (c) { bgGate(c); });
def('bg_plane', 180, 320, function (c) { bgPlane(c); });
def('bg_arrival', 180, 320, function (c) { bgArrival(c); });
def('bg_rental', 180, 320, function (c) { bgRental(c); });
def('bg_airbnb', 180, 320, function (c) { bgAirbnb(c); });
def('bg_pool', 180, 320, function (c) { bgPool(c); });
def('bg_ending', 180, 320, function (c) { bgEnding(c); });
def('airport_terminal', 134, 58, function (c) { terminal(c); });
def('plane_apron', 72, 64, function (c) { planeTop(c); });
def('plane_fly', 101, 36, function (c) { planeFlyArt(c); });
Object.keys(PEOPLE).forEach(function (id) {
  var p = {}; for (var k in PEOPLE[id]) p[k] = PEOPLE[id][k];
  p.hol = true; p.jacket = HOL_SHIRTS[id] || '#ff8a3a'; p.jdark = '#c04a20'; p.pants = '#2fa3b8';
  def(id + '_hol', 24, 30, function (c) { person(c, 12, 28, p); });
});
Object.keys(PEOPLE).forEach(function (id) {
  def(id, 24, 30, function (c) { person(c, 12, 28, PEOPLE[id]); });
});

window.HandArt = {
  has: function (n) { return !!NAMES[n]; },
  names: function () { return Object.keys(NAMES); },
  render: function (n) {
    var d = NAMES[n]; if (!d) return null;
    var c = mk(d.w, d.h), g = c.getContext('2d');
    try { d.fn(g); } catch (e) { return null; }
    return c;
  },
  colors: C, n2: n2, vn: vn
};
})();
