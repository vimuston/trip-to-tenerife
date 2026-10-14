/* Tenerife Taxi Quest - engine.
 * Plain script, no modules. 180x320 logical canvas, integer-scaled.
 * Sections: utils, settings/audio shims, art (images + placeholders), text/dialogue/choice UI,
 * input, async helpers, scene manager, scenes, main loop.
 */
(function () {
'use strict';

var W = 180, H = 320, TS = 16;
var CFG = window.GAME_CONFIG || {};
var ST = window.STORY || {};
var NAMES = CFG.names || {};
var DEFNAMES = { a_adult1: 'Nelli', a_adult2: 'Mikko', a_kid1: 'Aatos', a_kid2: 'Oiva',
                 b_adult1: 'Kaisa', b_adult2: 'Ville', b_kid1: 'Oskari', b_kid2: 'Joonas' };
var DEV = /[?&]dev=1/.test(window.location.search);   // style / grade switchers are dev-only
var VOICES = { narrator: 1, driver: 1, clerk: 1, attendant: 1, a_adult1: 1, a_adult2: 1, a_kid1: 1, a_kid2: 1, b_adult1: 1, b_adult2: 1, b_kid1: 1, b_kid2: 1 };
function voiceFor(who) { return VOICES[who] ? who : 'clerk'; }
var MUSIC_ID = { rentalDesk: 'rental', driveRental: 'rental', airbnb: 'airbnb', pool: 'pool' };
var UI = ST.ui || {};
function styleName(id) { return ((UI.styleNames || {})[id]) || id.toUpperCase(); }
function gradeName(id) { return ((UI.gradeNames || {})[id]) || id.toUpperCase(); }
function ui(k, d) { return UI[k] !== undefined ? UI[k] : (d || ''); }
var ALL = ['a_adult1', 'a_adult2', 'a_kid1', 'a_kid2', 'b_adult1', 'b_adult2', 'b_kid1', 'b_kid2'];
var A_IDS = ALL.slice(0, 4), B_IDS = ALL.slice(4);
var KIDS = ['a_kid1', 'a_kid2', 'b_kid1', 'b_kid2'];
var FONT = '"Press Start 2P", "Courier New", monospace';

/* ---------- utils ---------- */
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(ax, ay, bx, by) { return Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by)); }
function angDiff(a, b) { var d = (a - b + Math.PI) % (Math.PI * 2); if (d < 0) d += Math.PI * 2; return d - Math.PI; }
function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash2(x, y, s) { var n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); }
function vnoise(x, y, s) {
  var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  var a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function n2(x, y) { return hash2(x, y, 3.7); }
function nm(id) { return NAMES[id] || DEFNAMES[id] || id; }
function tpl(s) {
  return String(s).replace(/\{(\w+)\}/g, function (m, k) {
    if (k === 'gate') return String(CFG.gateNumber || '7');
    return NAMES[k] || DEFNAMES[k] || m;
  });
}
function hexRgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }

/* ---------- art styles + colour grades (one config table) ---------- */
var STYLE_ORDER = ['stardew', 'snes', 'ff', 'kasin'];
var GRADES = ['normaali', 'fosfori', 'gameboy', 'neon'];
var GRADE_CSS = {
  normaali: 'saturate(1.12) contrast(1.05)',
  fosfori: 'grayscale(1) sepia(1) hue-rotate(72deg) saturate(3.2) brightness(1.05) contrast(1.15)',
  gameboy: 'url(#gbFilter)',
  neon: 'saturate(2.3) contrast(1.35) hue-rotate(-28deg) brightness(1.05)'
};
/* Ground / dusk palette per style so the procedural map matches the sprites */
var STYLES = {
  stardew: { pal: { snowA: '#eef3fa', snowB: '#d3deee', snowC: '#b4c3dc', grassA: '#587238', grassB: '#668440', grassC: '#4b6330', grassD: '#7d8744',
    roadA: '#4a4f60', roadB: '#434858', roadC: '#555b6d', paveA: '#b3b9c8', paveB: '#a2a9ba', kerb: '#97a0b6', pathA: '#c9b996', pathB: '#b3a37e',
    line: 'rgba(230,215,120,.75)', flake: '#ffffff', dusk: 'rgba(18,20,64,.46)', glow: '255,170,60' } },
  snes: { pal: { snowA: '#f4f8ff', snowB: '#cfe0f4', snowC: '#a9c3e6', grassA: '#3f8a3a', grassB: '#4fa045', grassC: '#2f6e30', grassD: '#6ab04c',
    roadA: '#5a5a6a', roadB: '#50505f', roadC: '#66667a', paveA: '#c8c0b0', paveB: '#b3ab9a', kerb: '#8a8394', pathA: '#d8c89a', pathB: '#c3b283',
    line: 'rgba(250,230,130,.8)', flake: '#ffffff', dusk: 'rgba(40,24,80,.38)', glow: '255,190,90' } },
  ff: { pal: { snowA: '#e6ecff', snowB: '#c4d0f4', snowC: '#9fb2e4', grassA: '#2f6a5a', grassB: '#3a7d68', grassC: '#255447', grassD: '#4d8f6a',
    roadA: '#3a3f66', roadB: '#33375a', roadC: '#474d7a', paveA: '#9aa4d0', paveB: '#8892c0', kerb: '#6a74b0', pathA: '#a9a0d0', pathB: '#9890c0',
    line: 'rgba(190,200,255,.8)', flake: '#f4f6ff', dusk: 'rgba(20,10,70,.5)', glow: '255,210,120' } },
  kasin: { pal: { snowA: '#eef3fa', snowB: '#d3deee', snowC: '#b4c3dc', grassA: '#587238', grassB: '#668440', grassC: '#4b6330', grassD: '#7d8744',
    roadA: '#4a4f60', roadB: '#434858', roadC: '#555b6d', paveA: '#b3b9c8', paveB: '#a2a9ba', kerb: '#97a0b6', pathA: '#c9b996', pathB: '#b3a37e',
    line: 'rgba(230,215,120,.75)', flake: '#ffffff', dusk: 'rgba(18,20,64,.46)', glow: '255,170,60' } }
};
/* Target on-map height (px) per sprite name, shared by every style set. Unlisted props keep their size. */
var STYLE_SCALE = { house_a: 60, house_b: 54, taxi_a: 18, taxi_b: 18, rental_car: 18, tree_pine: 34, tree_birch: 40, tree_palm: 34, airport_building: 52, suitcase: 10,
  key: 8, baggage_tractor: 20, checkin_counter: 30, baggage_belt: 14, luggage_cart: 20, airport_bench: 16, departure_sign: 26, gate_desk: 28,
  jet_bridge: 44, control_tower: 70, airport_plant: 26, vending_machine: 28, airbnb_house: 78, pool_lounger: 16, pool_float: 20,
  cactus: 22, white_house: 36, teide: 70, goat: 14, sun: 28, juice: 12 };
/* names scaled by target WIDTH instead of height */
var STYLE_SCALE_W = { plane_side: 80, airport_terminal: 120, plane_apron: 80, plane_fly: 150 };
/* ONE prop scale table: an adult is ~22-26 px, counters ~0.7x, benches/seats ~0.5x, doors ~1.5x */
STYLE_SCALE.checkin_counter = 18; STYLE_SCALE.baggage_belt = 9; STYLE_SCALE.airport_bench = 12; STYLE_SCALE.departure_sign = 30;
STYLE_SCALE.gate_desk = 18; STYLE_SCALE.jet_bridge = 40; STYLE_SCALE.airport_plant = 22; STYLE_SCALE.vending_machine = 30;
STYLE_SCALE.luggage_cart = 14; STYLE_SCALE.control_tower = 60; STYLE_SCALE.airbnb_house = 116; STYLE_SCALE.pool_lounger = 14;
var PAL_SUNNY = { snowA: '#e8d29a', snowB: '#d9c183', snowC: '#f2e2b4', grassA: '#8a9a4a', grassB: '#9aab55', grassC: '#6f7f38', grassD: '#b2b866',
  roadA: '#6b6b73', roadB: '#62626a', roadC: '#77777f', paveA: '#e6dccb', paveB: '#d3c8b4', kerb: '#bfb49e', pathA: '#e0b48a', pathB: '#c9996f',
  line: 'rgba(255,255,255,.75)', flake: '#ffffff', dusk: 'rgba(255,190,90,.10)', glow: '255,200,100' };
function mergePal(a, b) { var r = {}, k; for (k in a) r[k] = a[k]; for (k in b) r[k] = b[k]; return r; }

/* ---------- settings ---------- */
var Opt = { sound: true, crt: CFG.crtDefault !== false, mode: 'joy', style: 'stardew', grade: 'normaali' };
try { var saved = JSON.parse(localStorage.getItem('ttq_opts') || 'null'); if (saved) { Opt.sound = saved.sound !== false; Opt.crt = saved.crt !== false; Opt.mode = saved.mode === 'tap' ? 'tap' : 'joy'; if (DEV && STYLES[saved.style]) Opt.style = saved.style; if (DEV && GRADES.indexOf(saved.grade) >= 0) Opt.grade = saved.grade; } } catch (e) {}
try { var qs = new URLSearchParams(window.location.search); if (STYLES[qs.get('style')]) Opt.style = qs.get('style'); if (GRADES.indexOf(qs.get('grade')) >= 0) Opt.grade = qs.get('grade'); } catch (e) {}
function saveOpt() { try { localStorage.setItem('ttq_opts', JSON.stringify(Opt)); } catch (e) {} }

/* ---------- audio shim: game must run without audio.js ---------- */
var GA = {
  sfx: function (n) { try { window.GameAudio && window.GameAudio.sfx && window.GameAudio.sfx(n); } catch (e) {} },
  music: function (id) { try { window.GameAudio && window.GameAudio.music && window.GameAudio.music(id); } catch (e) {} },
  unlock: function () { try { window.GameAudio && window.GameAudio.unlock && window.GameAudio.unlock(); } catch (e) {} },
  mute: function (m) { try { window.GameAudio && window.GameAudio.setMuted && window.GameAudio.setMuted(m); } catch (e) {} },
  speak: function (who, text) {
    try {
      if (window.GameAudio && window.GameAudio.speak) {
        var d = window.GameAudio.speak(who, text);
        if (typeof d === 'number' && d > 0) return d;
      }
    } catch (e) {}
    return text.length * 42;
  }
};
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

/* ---------- canvas ---------- */
var cv = document.getElementById('game');
var stage = document.getElementById('stage');
cv.width = W; cv.height = H;
var ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

/* Fill the whole screen: fit 9:16 to the viewport with a non-integer scale (nearest-neighbour keeps it crisp).
   If there is room below the picture the settings bar sits there, otherwise it floats over the corner. */
function resize() {
  var vv = window.visualViewport, vw = Math.round((vv && vv.width) || window.innerWidth), vh = Math.round((vv && vv.height) || window.innerHeight);
  var barH = 52, s = Math.min(vw / W, vh / H);
  var bar = document.getElementById('bar'), floating = (vh - H * s) < barH;
  if (!floating) s = Math.min(vw / W, (vh - barH) / H);
  stage.style.width = Math.floor(W * s) + 'px';
  stage.style.height = Math.floor(H * s) + 'px';
  if (bar) bar.classList.toggle('floating', floating);
  document.body.classList.toggle('landscape', vw > vh * 1.15);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
document.addEventListener('fullscreenchange', resize);
resize();

/* =====================================================================
 * ART: images with code-drawn placeholders of the same size
 * ===================================================================== */
var IMG = {}, SZ = {}, tintCache = {};
function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function R(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(x, y, w, h); }
function reg(name, w, h, painter) {
  var c = mk(w, h); var g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  try { painter(g, w, h); } catch (e) {}
  IMG[name] = c; SZ[name] = [w, h];
}
function gradV(g, w, h, stops, y0, y1) {
  y0 = y0 || 0; y1 = y1 === undefined ? h : y1;
  var gr = g.createLinearGradient(0, y0, 0, y1);
  stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
  g.fillStyle = gr; g.fillRect(0, y0, w, y1 - y0);
}
function tri(g, col, x1, y1, x2, y2, x3, y3) { g.fillStyle = col; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.closePath(); g.fill(); }
function disc(g, col, x, y, r) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }

/* character palettes for the placeholder sprites */
var CH = {
  a_adult1: { skin: '#f1c9a0', hair: '#6b3d1e', top: '#c0392b', pants: '#2c3e70', adult: 1, long: 1 },
  a_adult2: { skin: '#e8b88a', hair: '#222222', top: '#2e6da4', pants: '#333344', adult: 1 },
  a_kid1: { skin: '#f6d3b0', hair: '#e0a030', top: '#27ae60', pants: '#445566', adult: 0 },
  a_kid2: { skin: '#f1c9a0', hair: '#8a4b2a', top: '#e67e22', pants: '#3a3a5a', adult: 0, long: 1 },
  b_adult1: { skin: '#f6d3b0', hair: '#c9a24a', top: '#8e44ad', pants: '#30304a', adult: 1, long: 1 },
  b_adult2: { skin: '#e0ac80', hair: '#3a2a1a', top: '#16a085', pants: '#2a2a2a', adult: 1 },
  b_kid1: { skin: '#f6d3b0', hair: '#1a1a1a', top: '#f1c40f', pants: '#445', adult: 0 },
  b_kid2: { skin: '#f1c9a0', hair: '#b5651d', top: '#e84393', pants: '#334', adult: 0, long: 1 },
  driver: { skin: '#e8b88a', hair: '#999999', top: '#444455', pants: '#222222', adult: 1, cap: '#222222' },
  clerk: { skin: '#f1c9a0', hair: '#5a3a1a', top: '#1e8bc3', pants: '#223355', adult: 1, long: 1 },
  attendant: { skin: '#f6d3b0', hair: '#7a4a1a', top: '#c0392b', pants: '#7a1f1f', adult: 1, cap: '#c0392b' },
  rental_agent: { skin: '#e8b88a', hair: '#2a2018', top: '#e8a020', pants: '#2a2a3a', adult: 1 }
};
var CHAR_IDS = Object.keys(CH);

function paintChar(g, p) {
  var oy = p.adult ? 0 : 7;
  R(g, p.pants, 8, 23 + oy, 3, 11 - oy); R(g, p.pants, 13, 23 + oy, 3, 11 - oy);
  R(g, '#1a1a22', 7, 34, 4, 2); R(g, '#1a1a22', 13, 34, 4, 2);
  R(g, p.top, 6, 10 + oy, 12, 13); R(g, p.top, 4, 11 + oy, 2, 10); R(g, p.top, 18, 11 + oy, 2, 10);
  R(g, p.skin, 4, 21 + oy, 2, 2); R(g, p.skin, 18, 21 + oy, 2, 2);
  R(g, p.skin, 8, 2 + oy, 8, 8);
  R(g, p.hair, 7, 1 + oy, 10, 4);
  if (p.long) { R(g, p.hair, 7, 5 + oy, 2, 8); R(g, p.hair, 15, 5 + oy, 2, 8); }
  if (p.cap) R(g, p.cap, 6, 0 + oy, 12, 3);
  R(g, '#222', 10, 5 + oy, 1, 2); R(g, '#222', 13, 5 + oy, 1, 2);
  R(g, '#c0504d', 11, 8 + oy, 2, 1);
}
function paintPortrait(g, p, id) {
  gradV(g, 48, 48, [[0, '#4a64d8'], [1, '#1a2480']]);
  R(g, p.top, 8, 36, 32, 12);
  R(g, p.skin, 14, 10, 20, 22);
  R(g, p.hair, 12, 6, 24, 9);
  if (p.long) { R(g, p.hair, 11, 12, 4, 20); R(g, p.hair, 33, 12, 4, 20); }
  if (p.cap) R(g, p.cap, 10, 4, 28, 6);
  R(g, '#1a1a22', 19, 20, 3, 4); R(g, '#1a1a22', 28, 20, 3, 4);
  R(g, '#d8665a', 21, 28, 7, 2);
  R(g, 'rgba(255,120,120,.35)', 15, 25, 4, 3); R(g, 'rgba(255,120,120,.35)', 30, 25, 4, 3);
}
function paintTile(g, base, alts, seed) {
  R(g, base, 0, 0, 16, 16);
  var r = rng(seed);
  for (var i = 0; i < 30; i++) { g.fillStyle = alts[(r() * alts.length) | 0]; g.fillRect((r() * 16) | 0, (r() * 16) | 0, 1 + ((r() * 2) | 0), 1); }
}
function paintTaxi(g, body, roof) {
  R(g, '#111', 0, 6, 3, 9); R(g, '#111', 21, 6, 3, 9); R(g, '#111', 0, 27, 3, 9); R(g, '#111', 21, 27, 3, 9);
  R(g, body, 2, 2, 20, 36); R(g, 'rgba(0,0,0,.18)', 2, 34, 20, 4);
  R(g, '#2a3b66', 5, 9, 14, 7); R(g, roof, 5, 17, 14, 9); R(g, '#2a3b66', 5, 27, 14, 5);
  R(g, '#fff7c0', 4, 2, 4, 2); R(g, '#fff7c0', 16, 2, 4, 2);
  R(g, '#d33', 4, 36, 3, 2); R(g, '#d33', 17, 36, 3, 2);
  R(g, '#fff', 8, 19, 8, 4); R(g, '#222', 10, 20, 4, 2);
}
function paintBlob(g, cx, cy, rx, ry, col) { g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill(); }

function buildPlaceholders() {
  reg('snow_tile', 16, 16, function (g) { paintTile(g, '#dde5f0', ['#c9d5e6', '#ffffff', '#b9c6dc'], 1); });
  reg('grass_tile', 16, 16, function (g) { paintTile(g, '#5a6a35', ['#6f7a3a', '#4b5a2c', '#8a7a38', '#a0642a'], 2); });
  reg('road_tile', 16, 16, function (g) { paintTile(g, '#3d414d', ['#474b58', '#34373f', '#555a66'], 3); });
  reg('tree_pine', 16, 24, function (g) {
    R(g, '#5a3a1e', 7, 19, 2, 5);
    tri(g, '#1f4d2e', 8, 0, 1, 12, 15, 12); tri(g, '#2a6a3a', 8, 5, 0, 18, 16, 18);
    tri(g, '#e8eef8', 8, 0, 5, 5, 11, 5);
  });
  reg('tree_birch', 16, 24, function (g) {
    R(g, '#e8e8e0', 7, 12, 2, 11); R(g, '#333', 7, 15, 1, 1); R(g, '#333', 8, 19, 1, 1);
    paintBlob(g, 8, 8, 7, 7, '#d98a2b'); paintBlob(g, 6, 6, 4, 4, '#e8b23a'); paintBlob(g, 11, 9, 3, 3, '#b8641c');
  });
  reg('tree_palm', 16, 24, function (g) {
    R(g, '#a07840', 7, 9, 2, 14); R(g, '#7a5a2c', 7, 14, 2, 1);
    g.strokeStyle = '#2e9a3a'; g.lineWidth = 2;
    [[-6, 4], [6, 4], [-5, 0], [5, 0], [0, -2]].forEach(function (d) { g.beginPath(); g.moveTo(8, 9); g.lineTo(8 + d[0], 9 + d[1]); g.stroke(); });
  });
  reg('taxi_a', 24, 40, function (g) { paintTaxi(g, '#f2c230', '#f7d86a'); });
  reg('taxi_b', 24, 40, function (g) { paintTaxi(g, '#e8ecf2', '#ffffff'); R(g, '#f08a20', 2, 30, 20, 2); });
  reg('house_a', 64, 64, function (g) {
    R(g, '#c9ccd2', 8, 32, 48, 30); for (var i = 0; i < 6; i++) R(g, '#b2b6bd', 8, 36 + i * 5, 48, 1);
    R(g, '#1f2f5a', 3, 6, 58, 28); R(g, '#33477f', 3, 6, 58, 4); R(g, '#e8eef8', 3, 6, 58, 2);
    R(g, '#2a3f6e', 14, 38, 10, 10); R(g, '#ffd86a', 15, 39, 8, 8); R(g, '#2a3f6e', 40, 38, 10, 10); R(g, '#ffd86a', 41, 39, 8, 8);
    R(g, '#6a4528', 28, 46, 9, 16);
  });
  reg('house_b', 64, 64, function (g) {
    R(g, '#9a958a', 0, 56, 64, 8);
    R(g, '#e8e0d0', 10, 34, 44, 24); R(g, '#a8322c', 4, 10, 56, 26); R(g, '#c8483c', 4, 10, 56, 4);
    R(g, '#e8eef8', 4, 10, 56, 2);
    R(g, '#2a3f6e', 16, 40, 9, 9); R(g, '#ffd86a', 17, 41, 7, 7); R(g, '#2a3f6e', 40, 40, 9, 9); R(g, '#ffd86a', 41, 41, 7, 7);
    R(g, '#5a3a1e', 29, 46, 8, 12);
  });
  reg('airport_building', 96, 64, function (g) {
    R(g, '#aab4c4', 4, 16, 88, 46); R(g, '#6a7284', 0, 10, 96, 9);
    R(g, '#5a8fc8', 10, 28, 76, 20); for (var i = 0; i < 8; i++) R(g, '#aab4c4', 10 + i * 10, 28, 1, 20);
    R(g, '#c33', 28, 2, 40, 10); g.font = '7px monospace'; g.fillStyle = '#fff'; g.fillText('OULU', 38, 10);
    R(g, '#2a3b66', 42, 48, 12, 14);
  });
  reg('suitcase', 16, 16, function (g) { R(g, '#7a3a1a', 2, 4, 12, 11); R(g, '#a85a2a', 3, 5, 10, 3); R(g, '#222', 6, 2, 4, 2); R(g, '#e8c24a', 4, 4, 1, 11); R(g, '#e8c24a', 11, 4, 1, 11); });
  reg('boarding_pass', 28, 14, function (g) { R(g, '#fff', 0, 0, 28, 14); R(g, '#2a49a8', 0, 0, 28, 4); R(g, '#999', 4, 7, 14, 1); R(g, '#999', 4, 10, 10, 1); });
  reg('juice', 16, 16, function (g) { R(g, '#ddd', 4, 3, 8, 12); R(g, '#4a2f8a', 5, 6, 6, 8); R(g, '#7a5ac8', 5, 6, 2, 8); R(g, '#e44', 9, 0, 1, 7); });
  reg('plane_side', 64, 24, function (g) {
    paintBlob(g, 32, 13, 28, 7, '#f4f6fa'); R(g, '#c33', 52, 2, 8, 10); tri(g, '#c33', 50, 12, 62, 2, 62, 12);
    R(g, '#2a49a8', 10, 12, 44, 1); for (var i = 0; i < 8; i++) R(g, '#3a6ac8', 14 + i * 5, 9, 3, 2);
    tri(g, '#aab', 26, 14, 40, 14, 34, 22);
  });
  reg('sun', 32, 32, function (g) {
    g.strokeStyle = '#ffd23a'; g.lineWidth = 2;
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; g.beginPath(); g.moveTo(16 + Math.cos(a) * 10, 16 + Math.sin(a) * 10); g.lineTo(16 + Math.cos(a) * 15, 16 + Math.sin(a) * 15); g.stroke(); }
    disc(g, '#ffe066', 16, 16, 9); disc(g, '#fff2a8', 14, 14, 4);
  });
  CHAR_IDS.forEach(function (id) {
    reg(id, 24, 36, function (g) { paintChar(g, CH[id]); });
    reg('portrait_' + id, 48, 48, function (g) { paintPortrait(g, CH[id], id); });
  });
  buildBackgrounds();
}

function buildBackgrounds() {
  var r = rng(77);
  reg('bg_title', W, H, function (g) {
    gradV(g, W, H, [[0, '#0b1030'], [0.55, '#2b2f6b'], [1, '#8a7aa8']]);
    for (var i = 0; i < 50; i++) R(g, '#fff', (r() * W) | 0, (r() * 150) | 0, 1, 1);
    disc(g, '#f4f0d0', 140, 50, 12); disc(g, '#0b1030', 145, 47, 10);
    R(g, '#dfe6f2', 0, 230, W, 90);
    for (var k = 0; k < 9; k++) { var x = k * 22 - 4; tri(g, '#173a2a', x + 10, 170, x, 235, x + 20, 235); }
    R(g, '#6a4a2a', 30, 215, 40, 25); R(g, '#8a2a2a', 26, 200, 48, 18); R(g, '#ffd86a', 38, 222, 8, 8); R(g, '#ffd86a', 54, 222, 8, 8);
  });
  reg('bg_checkin', W, H, function (g) {
    R(g, '#cfd9e6', 0, 0, W, 130); R(g, '#8aa0bd', 0, 0, W, 6);
    for (var i = 0; i < 4; i++) R(g, '#9fc8ee', 8 + i * 43, 20, 34, 40);
    R(g, '#2a49a8', 50, 8, 80, 10);
    for (var y = 130; y < H; y += 20) for (var x = 0; x < W; x += 20) R(g, ((x + y) / 20) % 2 ? '#aab4c4' : '#c2cbd8', x, y, 20, 20);
  });
  reg('bg_gate', W, H, function (g) {
    R(g, '#d6dce8', 0, 0, W, 140);
    gradV(g, W, H, [[0, '#7fb8f0'], [1, '#d8ecff']], 14, 62);
    R(g, '#8aa0bd', 6, 12, 168, 3); R(g, '#8aa0bd', 6, 62, 168, 3);
    R(g, '#9aa', 0, 62, W, 3);
    for (var y = 140; y < H; y += 20) for (var x = 0; x < W; x += 20) R(g, ((x + y) / 20) % 2 ? '#b4bccb' : '#cdd4df', x, y, 20, 20);
    for (var i = 0; i < 5; i++) { R(g, '#2a49a8', 8 + i * 34, 288, 26, 14); R(g, '#3a5ac8', 8 + i * 34, 282, 26, 8); }
  });
  reg('bg_plane', W, H, function (g) {
    R(g, '#d8dde6', 0, 0, W, H);
    R(g, '#3a4a7a', 80, 0, 20, H);
    for (var y = 24; y < H - 60; y += 46) { R(g, '#8fb8e8', 2, y, 6, 20); R(g, '#8fb8e8', 172, y, 6, 20); }
    R(g, '#b0b8c8', 0, 0, W, 6);
  });
  reg('bg_arrival', W, H, function (g) {
    gradV(g, W, H, [[0, '#4fb3f0'], [0.45, '#bfe6ff'], [0.62, '#ffe0a8']], 0, 200);
    tri(g, '#8a6a4a', 130, 140, 70, 200, 200, 200); tri(g, '#a88a5a', 60, 160, 10, 200, 110, 200);
    R(g, '#8d8a86', 0, 200, W, 120);
    for (var i = 0; i < 7; i++) R(g, '#e8e8e0', 8 + i * 26, 280, 14, 3);
    R(g, '#6a6a68', 0, 200, W, 3);
  });
  reg('bg_ending', W, H, function (g) {
    gradV(g, W, H, [[0, '#ff9a5a'], [0.45, '#ffd08a'], [0.6, '#ffe8b0']], 0, 190);
    R(g, '#2f9ad8', 0, 190, W, 60); for (var i = 0; i < 12; i++) R(g, '#8fd0f4', ((i * 37) % 170) + 4, 196 + ((i * 13) % 50), 14, 1);
    R(g, '#f0d8a0', 0, 250, W, 70);
    for (var p = 0; p < 3; p++) { var px = 14 + p * 70; R(g, '#7a5a2c', px, 160, 4, 90); for (var k = 0; k < 5; k++) { g.strokeStyle = '#1f6a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(px + 2, 160); g.lineTo(px + 2 + (k - 2) * 9, 168 + Math.abs(k - 2) * 3); g.stroke(); } }
  });
}

/* =====================================================================
 * STYLE SETS: stardew / snes / ff (PNG folders) + kasin (code art, art_hand.js).
 * Every drawable name resolves as: PNG of the current set -> hand-built kasin art -> engine placeholder.
 * Everything is trimmed to its alpha bounding box and scaled to STYLE_SCALE[name] (bottom-centre anchored)
 * so all sets render at the same game size.
 * ===================================================================== */
var BASE = {}, handCache = {}, loadedPng = {}, finalCache = {}, loadStarted = {}, curStyleId = null, ART_NAMES = [], TILES = {};

function initArt() {
  CHAR_IDS.forEach(function (id) { STYLE_SCALE[id] = id.indexOf('kid') >= 0 ? 18 : 22; STYLE_SCALE[id + '_hol'] = STYLE_SCALE[id]; });
  Object.keys(IMG).forEach(function (n) { BASE[n] = IMG[n]; });
  var seen = {}; ART_NAMES = [];
  Object.keys(BASE).concat(window.HandArt ? window.HandArt.names() : []).forEach(function (n) { if (!seen[n]) { seen[n] = 1; ART_NAMES.push(n); } });
}

function trimBox(src) {
  if (src.__tb) return src.__tb;
  var w = src.width, h = src.height, box = { sx: 0, sy: 0, sw: w, sh: h };
  try {
    var t = mk(w, h), g = t.getContext('2d'); g.drawImage(src, 0, 0);
    var d = g.getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 >= 0) box = { sx: x0, sy: y0, sw: x1 - x0 + 1, sh: y1 - y0 + 1 };
  } catch (e) {}
  try { src.__tb = box; } catch (e2) {}
  return box;
}
function srcFor(n, id) {
  var L = loadedPng[id];
  if (L && L[n]) return L[n];
  if (/_hol$/.test(n) && L && L[n.slice(0, -4)]) return L[n.slice(0, -4)];     // holiday art missing: plain clothes
  if (window.HandArt && window.HandArt.has(n)) {
    if (handCache[n] === undefined) handCache[n] = window.HandArt.render(n);
    if (handCache[n]) return handCache[n];
  }
  return BASE[n] || null;
}
function scaledCopy(src, tr, th) {
  var s = th / tr.sh, tw = Math.max(1, Math.round(tr.sw * s)), c = mk(tw, th), g = c.getContext('2d');
  g.imageSmoothingEnabled = s < 0.5;                       // nearest unless heavily downscaled
  if (s < 0.5) g.imageSmoothingQuality = 'high';
  g.drawImage(src, tr.sx, tr.sy, tr.sw, tr.sh, 0, 0, tw, th);
  return c;
}
function coverFit(src) {
  var c = mk(W, H), g = c.getContext('2d'), s = Math.max(W / src.width, H / src.height);
  g.imageSmoothingEnabled = s < 1;
  var dw = src.width * s, dh = src.height * s;
  g.drawImage(src, Math.round((W - dw) / 2), Math.round((H - dh) / 2), Math.round(dw), Math.round(dh));
  return c;
}
function makePortrait(cid, src) {
  var tr = trimBox(src), c = mk(48, 48), g = c.getContext('2d');
  var gr = g.createLinearGradient(0, 0, 0, 48); gr.addColorStop(0, '#4a64d8'); gr.addColorStop(1, '#1a2480');
  g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
  var kid = cid.indexOf('kid') >= 0;
  var ch = Math.max(2, Math.round(tr.sh * (kid ? 0.52 : 0.42))), cw = Math.min(tr.sw, Math.round(ch * 1.15));
  var sx = tr.sx + Math.round((tr.sw - cw) / 2), m = Math.max(cw, ch), k = m > 44 ? 44 / m : Math.floor(44 / m);
  g.imageSmoothingEnabled = k < 1;
  var dw = Math.round(cw * k), dh = Math.round(ch * k);
  g.drawImage(src, sx, tr.sy, cw, ch, Math.round((48 - dw) / 2), Math.round((48 - dh) / 2) + 2, dw, dh);
  return c;
}
function buildArt(n, id) {
  var L = loadedPng[id], src;
  if (n.indexOf('portrait_') === 0) {
    if (L && L[n]) { var pc = mk(48, 48), pg = pc.getContext('2d'); pg.imageSmoothingEnabled = L[n].width < 48 || L[n].width % 48 === 0 ? false : true; pg.drawImage(L[n], 0, 0, 48, 48); return pc; }
    var cs = srcFor(n.substr(9), id);
    return cs && CH[n.substr(9)] ? makePortrait(n.substr(9), cs) : (BASE[n] || null);
  }
  src = srcFor(n, id);
  if (!src) return null;
  if (n.indexOf('bg_') === 0) return coverFit(src);
  var th = STYLE_SCALE[n];
  if (STYLE_SCALE_W[n]) { var tbw = trimBox(src); th = Math.max(1, Math.round(tbw.sh * STYLE_SCALE_W[n] / tbw.sw)); }
  if (/^(taxi_|rental_car)/.test(n)) { var tbx = trimBox(src); if (tbx.sh > tbx.sw * 1.1) th = 34; }   // top-down taxi art keeps its long axis
  if (!th) { var cc = mk(src.width, src.height); cc.getContext('2d').drawImage(src, 0, 0); return cc; }
  return scaledCopy(src, trimBox(src), th);
}
function setArt(n) {
  var id = curStyleId, fc = finalCache[id] || (finalCache[id] = {});
  if (!fc[n]) { try { fc[n] = buildArt(n, id); } catch (e) { fc[n] = BASE[n] || null; } }
  if (fc[n]) { IMG[n] = fc[n]; SZ[n] = [fc[n].width, fc[n].height]; }
}

/* procedural ground tiles in the palette of the current style */
function buildTiles(id) { TILES = buildTilesPal(STYLES[id].pal); }
function buildTilesPal(p) {
  function tile(base, alts, seed, extra) {
    var c = mk(16, 16), g = c.getContext('2d'), r = rng(seed), i;
    g.fillStyle = base; g.fillRect(0, 0, 16, 16);
    for (i = 0; i < 30; i++) { g.fillStyle = alts[(r() * alts.length) | 0]; g.fillRect((r() * 16) | 0, (r() * 16) | 0, 1 + ((r() * 2) | 0), 1); }
    if (extra) extra(g, r);
    return c;
  }
  function three(fn) { return [1, 2, 3].map(fn); }
  return {
    snow: three(function (k) { return tile(p.snowA, [p.snowB, p.snowC, '#ffffff'], 10 + k); }),
    grass: three(function (k) {
      return tile(p.grassA, [p.grassB, p.grassC, p.grassD], 20 + k, function (g, r) {
        for (var i = 0; i < 3; i++) { var x = (r() * 14) | 0, y = (r() * 13) | 0; g.fillStyle = p.grassC; g.fillRect(x, y, 1, 2); g.fillStyle = p.grassD; g.fillRect(x + 1, y + 1, 1, 1); }
      });
    }),
    road: three(function (k) { return tile(p.roadA, [p.roadB, p.roadC], 30 + k); }),
    pave: three(function (k) {
      return tile(p.paveA, [p.paveB], 40 + k, function (g) {
        g.fillStyle = p.paveB; g.fillRect(0, 0, 16, 1); g.fillRect(0, 8, 16, 1); g.fillRect(k % 2 ? 4 : 11, 0, 1, 8); g.fillRect(k % 2 ? 11 : 4, 8, 1, 8);
      });
    }),
    path: three(function (k) {
      return tile(p.pathA, [p.pathB], 50 + k, function (g) {
        g.fillStyle = p.pathB; g.fillRect(0, 0, 16, 1); g.fillRect(0, 7, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(8, 0, 1, 8); g.fillRect(4, 8, 1, 8);
      });
    })
  };
}

function setStyle(id, quiet) {
  if (!STYLES[id]) id = 'stardew';
  Opt.style = id; curStyleId = id; tintCache = {};
  buildTiles(id);
  ART_NAMES.forEach(setArt);
  if (!quiet) applyOpt();
}
function cycleStyle() { var i = STYLE_ORDER.indexOf(Opt.style); setStyle(STYLE_ORDER[(i + 1) % STYLE_ORDER.length]); GA.sfx('select'); }
function cycleGrade() { var i = GRADES.indexOf(Opt.grade); Opt.grade = GRADES[(i + 1) % GRADES.length]; applyOpt(); GA.sfx('select'); }
function applyGrade() {
  var el = document.getElementById('screen');
  if (el) el.style.filter = GRADE_CSS[Opt.grade] || 'none';
}

/* load the manifest of a PNG set (assets/styles/<id>/manifest.js), then only the listed images */
function loadStyleAssets(id) {
  if (id === 'kasin' || loadStarted[id]) return;
  loadStarted[id] = true;
  var sc = document.createElement('script');
  sc.src = 'assets/styles/' + id + '/manifest.js';
  sc.onload = function () {
    var list = (window.ART_MANIFEST && window.ART_MANIFEST[id]) || [];
    list.forEach(function (n) {
      var im = new Image();
      im.onload = function () {
        (loadedPng[id] = loadedPng[id] || {})[n] = im;
        var fc = finalCache[id] || {};
        delete fc[n]; delete fc['portrait_' + n]; delete fc[n + '_hol'];
        if (id === curStyleId) { tintCache = {}; setArt(n); if (CH[n]) { setArt('portrait_' + n); setArt(n + '_hol'); } }
      };
      im.onerror = function () {};
      im.src = 'assets/styles/' + id + '/' + n + '.png';
    });
  };
  sc.onerror = function () {};
  document.head.appendChild(sc);
}

function img(n) { return IMG[n]; }
function sz(n) { return SZ[n] || [16, 16]; }
/* sprite with bottom-centre at cx,by (optionally scaled) */
function prop(n, cx, by, sc) { var s = sz(n); sc = sc || 1; spr(n, cx - s[0] * sc / 2, by - s[1] * sc, false, sc); }
/* draw image with its top-left at x,y (rounded) */
function spr(n, x, y, flip, scale) {
  var im = IMG[n]; if (!im) return;
  var s = sz(n), w = s[0] * (scale || 1), h = s[1] * (scale || 1);
  x = Math.round(x); y = Math.round(y);
  if (flip) { ctx.save(); ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, w, h); ctx.restore(); }
  else ctx.drawImage(im, x, y, w, h);
}
/* cold / jacket tinted version of a sprite (cached) */
function tinted(n) {
  var k = 'c_' + n; if (tintCache[k]) return tintCache[k];
  var s = sz(n), c = mk(s[0], s[1]), g = c.getContext('2d');
  g.drawImage(IMG[n], 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(70,90,150,0.38)'; g.fillRect(0, 0, s[0], s[1]);
  g.fillStyle = 'rgba(235,240,250,0.9)'; g.fillRect(Math.round(s[0] * 0.3), Math.round(s[1] * 0.28), Math.round(s[0] * 0.4), 2); // scarf-ish collar
  tintCache[k] = c; return c;
}
/* a character standing at feet position fx,fy */
function drawChar(id, fx, fy, flip, bob, cold, scale) {
  if (G.hol && CH[id] && IMG[id + '_hol']) { id = id + '_hol'; cold = false; }   // holiday clothes after the landing
  var s = sz(id), sc = scale || 1;
  var im = cold ? tinted(id) : IMG[id];
  var w = s[0] * sc, h = s[1] * sc;
  var x = Math.round(fx - w / 2), y = Math.round(fy - h - (bob || 0));
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(Math.round(fx - w / 2 + 3), Math.round(fy - 1), Math.round(w - 6), 2);
  if (flip) { ctx.save(); ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, w, h); ctx.restore(); }
  else ctx.drawImage(im, x, y, w, h);
}

/* =====================================================================
 * TEXT + FF style boxes
 * ===================================================================== */
function font(sz) { ctx.font = sz + 'px ' + FONT; }
function txt(s, x, y, col, al, size, noShadow) {
  font(size || 8); ctx.textAlign = al || 'left'; ctx.textBaseline = 'top';
  x = Math.round(x); y = Math.round(y);
  if (!noShadow) { ctx.fillStyle = '#000'; ctx.fillText(s, x + 1, y + 1); }
  ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y);
}
function wrap(text, maxW, size) {
  font(size || 8);
  var words = String(text).split(' '), lines = [], cur = '';
  words.forEach(function (w) {
    var t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; }
  });
  if (cur) lines.push(cur);
  return lines;
}
function box(x, y, w, h, border) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = border || '#ffffff';
  ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2);
  var gr = ctx.createLinearGradient(0, y + 2, 0, y + h - 2);
  gr.addColorStop(0, '#4b63ff'); gr.addColorStop(1, '#0a0a60');
  ctx.fillStyle = gr; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = 'rgba(143,166,255,.55)'; ctx.fillRect(x + 2, y + 2, w - 4, 1);
}
var HAND = [
  'kkkkkk........', 'kwwwwwkkkkkkk.', 'kwwwwwwwwwwwwk', 'kwwwwwkkkkkkk.',
  'kwwwwwwwwwwk..', 'kwwwwwwwwwwk..', 'kwwwwwwwwwk...', 'kkkkkkkkkkk...'];
function hand(x, y) {
  x = Math.round(x); y = Math.round(y);
  for (var j = 0; j < HAND.length; j++) for (var i = 0; i < 14; i++) {
    var c = HAND[j].charAt(i); if (c === '.') continue;
    ctx.fillStyle = c === 'k' ? '#000' : '#fff'; ctx.fillRect(x + i, y + j, 1, 1);
  }
}

/* =====================================================================
 * Async helpers (cleared on scene change)
 * ===================================================================== */
var timers = [], waiters = [], T = 0;
function wait(ms) { return new Promise(function (res) { timers.push({ t: ms / 1000, res: res }); }); }
function until(fn) { return new Promise(function (res) { waiters.push({ fn: fn, res: res }); }); }
function tickAsync(dt) {
  var i, a = timers; timers = [];
  for (i = 0; i < a.length; i++) { a[i].t -= dt; if (a[i].t <= 0) a[i].res(); else timers.push(a[i]); }
  var w = waiters; waiters = [];
  for (i = 0; i < w.length; i++) { if (w[i].fn()) w[i].res(); else waiters.push(w[i]); }
}
function clearAsync() { timers = []; waiters = []; Dlg.active = false; Dlg.queue = []; Dlg.cb = null; Choice.active = false; Choice.res = null; }
function say(lines) { return new Promise(function (res) { Dlg.run(lines, res); }); }
function choose(opts, title, def) { return new Promise(function (res) { Choice.open(opts, title, def, res); }); }

/* =====================================================================
 * Dialogue box (typewriter synced to GameAudio.speak duration)
 * ===================================================================== */
var Dlg = {
  active: false, queue: [], cb: null, who: null, name: '', lines: [], page: 0, shown: 0, rate: 0.03, cool: 0, opened: false,
  run: function (lines, cb) {
    this.queue = lines.slice(); this.cb = cb; this.active = true; this.opened = false; this.next();
  },
  next: function () {
    if (!this.queue.length) {
      this.active = false; var cb = this.cb; this.cb = null; if (cb) cb(); return;
    }
    var l = this.queue.shift();
    var text = tpl(l.t);
    this.who = l.who || 'narrator';
    var sp = ST.speakers || {};
    this.name = this.who === 'narrator' ? '' : (sp[this.who] !== undefined && sp[this.who] !== '' ? sp[this.who] : nm(this.who));
    this.lines = wrap(text, 160, 8);
    this.page = 0; this.shown = 0; this.cool = 0.12;
    var dur = Math.max(300, GA.speak(voiceFor(this.who), text));
    this.total = this.lines.join('').length;
    this.rate = this.total / dur * 1000; // chars per second
    if (!this.opened) { GA.sfx('dialog_open'); this.opened = true; }
  },
  pageEnd: function () {
    var n = 0, e = Math.min(this.lines.length, (this.page + 1) * 3);
    for (var i = 0; i < e; i++) n += this.lines[i].length;
    return n;
  },
  pageStart: function () { var n = 0; for (var i = 0; i < this.page * 3; i++) n += this.lines[i].length; return n; },
  hasMore: function () { return (this.page + 1) * 3 < this.lines.length; },
  tap: function () {
    if (!this.active || this.cool > 0) return;
    if (this.shown < this.pageEnd()) { this.shown = this.pageEnd(); return; }
    GA.sfx('tap');
    if (this.hasMore()) { this.page++; this.cool = 0.1; }
    else this.next();
  },
  update: function (dt) {
    if (!this.active) return;
    if (this.cool > 0) this.cool -= dt;
    this.shown = Math.min(this.pageEnd(), this.shown + this.rate * dt);
  },
  draw: function () {
    if (!this.active) return;
    var bx = 4, by = 238, bw = 172, bh = 78;
    if (this.who !== 'narrator') {
      var pimg = 'portrait_' + this.who;
      if (IMG[pimg]) { box(5, 186, 52, 52); ctx.drawImage(IMG[pimg], 7, 188, 48, 48); }
    }
    box(bx, by, bw, bh);
    if (this.name) txt(this.name, bx + 8, by + 6, '#ffe27a', 'left', 8);
    var ty = by + (this.name ? 19 : 10);
    var start = this.pageStart(), left = Math.floor(this.shown) - start;
    for (var i = this.page * 3; i < Math.min(this.lines.length, this.page * 3 + 3); i++) {
      var L = this.lines[i], part = L.substr(0, Math.max(0, left));
      if (part) txt(part, bx + 8, ty, '#fff', 'left', 8);
      left -= L.length;
      ty += 14;
    }
    if (this.shown >= this.pageEnd() && Math.floor(T * 3) % 2 === 0) {
      tri(ctx, '#fff', bx + bw - 16, by + bh - 14, bx + bw - 8, by + bh - 14, bx + bw - 12, by + bh - 8);
    }
  }
};

/* =====================================================================
 * Choice menu with pointing hand
 * ===================================================================== */
var Choice = {
  active: false, opts: [], sel: 0, res: null, title: '', locked: false,
  open: function (opts, title, def, res) {
    this.opts = opts; this.title = title || ''; this.sel = def || 0; this.res = res; this.active = true; this.locked = false;
    GA.sfx('dialog_open');
  },
  rowY: function (i) { var n = this.opts.length; return 316 - n * 30 + i * 30 - 4; },
  pick: function (i) {
    if (this.locked) return;
    this.sel = i; this.locked = true; GA.sfx('confirm'); buzz(15);
    var self = this;
    wait(260).then(function () { if (!self.active) return; self.active = false; var r = self.res; self.res = null; if (r) r(i); });
  },
  down: function (x, y) {
    for (var i = 0; i < this.opts.length; i++) {
      var ry = this.rowY(i);
      if (y >= ry - 2 && y <= ry + 28 && x >= 4 && x <= 176) { this.pick(i); return; }
    }
  },
  key: function (k) {
    if (!this.active || this.locked) return;
    if (k === 'up') { this.sel = (this.sel + this.opts.length - 1) % this.opts.length; GA.sfx('select'); }
    else if (k === 'down') { this.sel = (this.sel + 1) % this.opts.length; GA.sfx('select'); }
    else if (k === 'ok') this.pick(this.sel);
  },
  draw: function () {
    if (!this.active) return;
    if (this.title) {
      var tl = wrap(this.title, 150, 8);
      var th = tl.length * 12 + 10, ty = this.rowY(0) - th - 4;
      box(8, ty, 164, th);
      tl.forEach(function (l, i) { txt(l, 14, ty + 6 + i * 12, '#fff', 'left', 8); });
    }
    for (var i = 0; i < this.opts.length; i++) {
      var o = this.opts[i], y = this.rowY(i), fav = o.fav;
      var blink = fav && Math.floor(T * 4) % 2 === 0;
      box(6, y, 168, 26, fav ? (blink ? '#ffe27a' : '#ffb32a') : '#ffffff');
      var tx = 28;
      if (o.color) { ctx.fillStyle = '#fff'; ctx.fillRect(10, y + 7, 12, 12); ctx.fillStyle = o.color; ctx.fillRect(11, y + 8, 10, 10); }
      if (i === this.sel) hand(10 + Math.round(Math.sin(T * 8) * 2), y + 9);
      if (i === this.sel && o.color) { ctx.fillStyle = o.color; ctx.fillRect(26, y + 8, 4, 10); tx = 34; }
      txt(o.label, tx + (i === this.sel ? 0 : 0), y + (o.sub ? 4 : 9), fav ? '#ffe27a' : '#fff', 'left', 8);
      if (o.sub) txt(o.sub, tx, y + 16, '#bcd0ff', 'left', 6);
      if (fav) txt('*' + (o.tag || ''), 170, y + 17, '#ffe27a', 'right', 6);
    }
  }
};

/* =====================================================================
 * Input: pointer events, floating joystick, tap-to-go, keyboard
 * ===================================================================== */
var Ctl = { id: null, active: false, ox: 0, oy: 0, x: 0, y: 0, sx: 0, sy: 0, keys: {}, goal: null, R: 20 };
var BTN = { x: 146, y: 284, r: 20 };      // big context button (bottom-right), r=20 logical => 80 css px at scale 2
function btnHit(x, y) { return dist(x, y, BTN.x, BTN.y) <= BTN.r + 6; }
function toLogical(e) {
  var r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}
function rawVec() {
  var k = Ctl.keys;
  var kx = (k.ArrowRight || k.d || k.D ? 1 : 0) - (k.ArrowLeft || k.a || k.A ? 1 : 0);
  var ky = (k.ArrowDown || k.s || k.S ? 1 : 0) - (k.ArrowUp || k.w || k.W ? 1 : 0);
  if (kx || ky) { var m = Math.sqrt(kx * kx + ky * ky); return { x: kx / m, y: ky / m }; }
  if (Ctl.active && Opt.mode === 'joy') {
    var dx = Ctl.x - Ctl.ox, dy = Ctl.y - Ctl.oy, d = Math.sqrt(dx * dx + dy * dy);
    // floating origin follows the thumb so the stick never saturates far away
    if (d > Ctl.R * 1.4) { var f = (d - Ctl.R * 1.4) / d; Ctl.ox += dx * f; Ctl.oy += dy * f; dx = Ctl.x - Ctl.ox; dy = Ctl.y - Ctl.oy; d = Math.sqrt(dx * dx + dy * dy); }
    var mag = Math.min(1, d / Ctl.R), dz = 0.2;
    if (mag < dz) return { x: 0, y: 0 };
    var s = (mag - dz) / (1 - dz);
    return { x: dx / d * s, y: dy / d * s };
  }
  return { x: 0, y: 0 };
}
/* smoothed steering vector (so a 6 year old gets gentle motion) */
function steer(dt) {
  var r = rawVec(), a = Math.min(1, dt * 9);
  Ctl.sx += (r.x - Ctl.sx) * a; Ctl.sy += (r.y - Ctl.sy) * a;
  if (Math.abs(Ctl.sx) < 0.01) Ctl.sx = 0; if (Math.abs(Ctl.sy) < 0.01) Ctl.sy = 0;
  return { x: Ctl.sx, y: Ctl.sy };
}
var gestureDone = false, fsTried = false;
function lockOrientation() { try { if (screen.orientation && screen.orientation.lock) { var p = screen.orientation.lock('portrait'); if (p && p.catch) p.catch(function () {}); } } catch (e) {} }
function firstGesture() {
  if (!gestureDone) { gestureDone = true; GA.unlock(); }
  if (!fsTried) {
    fsTried = true;
    try {
      var el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen;
      if (rq && !document.fullscreenElement) {
        var p = rq.call(el);
        if (p && p.then) p.then(lockOrientation, function () {}); else lockOrientation();
      } else lockOrientation();
    } catch (e) {}
  }
}
function canAct() { return !(fade.state === 1) && !Dlg.active && !Choice.active; }

stage.addEventListener('pointerdown', function (e) {
  e.preventDefault();
  firstGesture();
  try { stage.setPointerCapture(e.pointerId); } catch (er) {}
  var p = toLogical(e);
  if (fade.state === 1) return;
  if (Choice.active) { Choice.down(p.x, p.y); return; }
  if (Dlg.active) { Dlg.tap(); return; }
  if (!cur) return;
  if (cur.ctxLabel && btnHit(p.x, p.y)) { BTN.press = 0.15; if (cur.onAction) cur.onAction(); return; }
  if (Ctl.id === null) {
    Ctl.id = e.pointerId; Ctl.active = true; Ctl.ox = Ctl.x = p.x; Ctl.oy = Ctl.y = p.y;
  }
  if (cur.onDown) cur.onDown(p.x, p.y, e.pointerId === Ctl.id);
}, { passive: false });
stage.addEventListener('pointermove', function (e) {
  e.preventDefault();
  if (e.pointerId !== Ctl.id) return;
  var p = toLogical(e); Ctl.x = p.x; Ctl.y = p.y;
  if (cur && cur.onMove) cur.onMove(p.x, p.y);
}, { passive: false });
function pUp(e) {
  if (e.pointerId !== Ctl.id) return;
  Ctl.id = null; Ctl.active = false;
  if (cur && cur.onUp) cur.onUp();
}
stage.addEventListener('pointerup', pUp);
stage.addEventListener('pointercancel', pUp);
['gesturestart', 'contextmenu', 'dblclick'].forEach(function (n) { stage.addEventListener(n, function (e) { e.preventDefault(); }); });
document.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

window.addEventListener('keydown', function (e) {
  firstGesture();
  var k = e.key;
  if (k.indexOf('Arrow') === 0 || k === ' ') e.preventDefault();
  if (Choice.active) {
    if (k === 'ArrowUp' || k === 'w') Choice.key('up'); else if (k === 'ArrowDown' || k === 's') Choice.key('down');
    else if (k === ' ' || k === 'Enter') Choice.key('ok');
    return;
  }
  if (k === ' ' || k === 'Enter' || k === 'Tab') {
    if (k === 'Tab') e.preventDefault();
    if (Dlg.active) Dlg.tap(); else if (cur && canAct() && cur.onAction) cur.onAction();
    return;
  }
  Ctl.keys[k] = true;
});
window.addEventListener('keyup', function (e) { Ctl.keys[e.key] = false; });

/* settings UI */
function $(id) { return document.getElementById(id); }
function applyOpt() {
  stage.classList.toggle('crt-off', !Opt.crt);
  applyGrade();
  GA.mute(!Opt.sound);
  if ($('optStyle')) $('optStyle').textContent = ui('optStyle', 'TYYLI: ') + styleName(Opt.style);
  if ($('optGrade')) $('optGrade').textContent = ui('optGrade', 'VÄRIT: ') + gradeName(Opt.grade);
  if ($('optSound')) $('optSound').textContent = Opt.sound ? ui('soundOn') : ui('soundOff');
  if ($('optCrt')) $('optCrt').textContent = Opt.crt ? ui('crtOn') : ui('crtOff');
  if ($('optCtl')) $('optCtl').textContent = Opt.mode === 'joy' ? ui('ctlJoy') : ui('ctlTap');
  if ($('btnGear') && UI.gear) $('btnGear').textContent = UI.gear;
  if ($('settingsTitle') && UI.settings) $('settingsTitle').textContent = UI.settings;
  if ($('optClose') && UI.close) $('optClose').textContent = UI.close;
  saveOpt();
}
function bindUI() {
  var set = $('settings');
  $('btnGear').addEventListener('click', function () { firstGesture(); set.hidden = false; });
  $('optClose').addEventListener('click', function () { set.hidden = true; });
  $('optSound').addEventListener('click', function () { Opt.sound = !Opt.sound; GA.unlock(); applyOpt(); });
  $('optCrt').addEventListener('click', function () { Opt.crt = !Opt.crt; applyOpt(); });
  $('optStyle').addEventListener('click', function () { cycleStyle(); });
  $('optGrade').addEventListener('click', function () { cycleGrade(); });
  if (!DEV) { $('optStyle').hidden = true; $('optGrade').hidden = true; }
  $('optCtl').addEventListener('click', function () { Opt.mode = Opt.mode === 'joy' ? 'tap' : 'joy'; Ctl.goal = null; applyOpt(); });
  applyOpt();
}

/* =====================================================================
 * Scene manager
 * ===================================================================== */
var scenes = {}, cur = null, curId = null;
var fade = { a: 1, state: 2, next: null };
function go(id) { if (fade.state === 1) return; fade.state = 1; fade.next = id; }
function switchTo(id) {
  if (cur && cur.leave) cur.leave();
  clearAsync(); Ctl.goal = null; Ctl.sx = Ctl.sy = 0;
  cur = scenes[id]; curId = id;
  GA.music(MUSIC_ID[id] || id);
  cur.enter();
}

/* =====================================================================
 * Shared pieces: follow-the-leader train, particles
 * ===================================================================== */
function Train(ids, x, y, gap) {
  this.ids = ids; this.gap = gap || 14; this.x = x; this.y = y; this.trail = []; this.face = 1; this.moving = false; this.traveled = 0;
  for (var k = 0; k < ids.length * this.gap + 30; k++) this.trail.push({ x: x, y: y + k });
  this.hidden = {};
}
Train.prototype.move = function (dx, dy) {
  this.x += dx; this.y += dy; this.traveled += Math.sqrt(dx * dx + dy * dy);
  if (dx > 0.05) this.face = 1; else if (dx < -0.05) this.face = -1;
  var t = this.trail[0];
  if (dist(this.x, this.y, t.x, t.y) >= 1) {
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > this.ids.length * this.gap + 40) this.trail.pop();
  }
};
Train.prototype.step = function (tx, ty, sp, dt) {
  var dx = tx - this.x, dy = ty - this.y, d = Math.sqrt(dx * dx + dy * dy);
  this.moving = d > 1.5;
  if (!this.moving) return true;
  var m = Math.min(d, sp * dt); this.move(dx / d * m, dy / d * m); return false;
};
Train.prototype.pos = function (i) {
  if (i === 0) return { x: this.x, y: this.y };
  var t = this.trail[Math.min(this.trail.length - 1, Math.round(i * this.gap))];
  return t;
};
Train.prototype.draw = function (cold, jackets) {
  var list = [], self = this;
  this.ids.forEach(function (id, i) {
    if (self.hidden[id]) return;
    if (self.reveal && self.traveled < i * self.gap) return;
    var p = self.pos(i);
    list.push({ id: id, x: p.x, y: p.y });
  });
  list.sort(function (a, b) { return a.y - b.y; });
  var moving = this.moving;
  list.forEach(function (o) {
    var bob = moving ? Math.abs(Math.sin(T * 10 + o.x * 0.2)) * 2 : 0;
    drawChar(o.id, o.x, o.y, self.face < 0, bob, jackets === undefined ? cold : jackets, self.scale || 1);
  });
};

var parts = [];
function confetti(n) {
  var cols = ['#ff5a5a', '#ffd23a', '#5ad8ff', '#7aff7a', '#ff7ae0', '#ffffff'];
  for (var i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: -Math.random() * 200, vx: (Math.random() - 0.5) * 20, vy: 25 + Math.random() * 40, c: cols[i % cols.length], r: Math.random() * 6, vr: (Math.random() - 0.5) * 8, w: 2 + Math.random() * 3 });
}
function stepParts(dt, loop) {
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i]; p.x += p.vx * dt + Math.sin(p.r) * 6 * dt; p.y += p.vy * dt; p.r += p.vr * dt;
    if (p.y > H + 4) { if (loop) { p.y = -4; p.x = Math.random() * W; } else p.dead = true; }
  }
  if (!loop) parts = parts.filter(function (p) { return !p.dead; });
}
function drawParts() { parts.forEach(function (p) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, Math.round(p.w * Math.abs(Math.cos(p.r)))), 2); }); }

function drawHud(text) {
  ctx.fillStyle = 'rgba(0,0,20,.6)'; ctx.fillRect(0, 0, W, 16);
  txt(text, 90, 4, '#ffe27a', 'center', 8);
}
function drawCtxButton(label) {
  if (!label || Dlg.active || Choice.active) return;
  var press = BTN.press > 0 ? 1 : 0;
  disc(ctx, 'rgba(0,0,0,.45)', BTN.x, BTN.y + 2, BTN.r);
  disc(ctx, '#ffffff', BTN.x, BTN.y + press, BTN.r);
  disc(ctx, '#d8a010', BTN.x, BTN.y + press, BTN.r - 2);
  disc(ctx, '#ffd23a', BTN.x, BTN.y - 1 + press, BTN.r - 4);
  txt(label, BTN.x, BTN.y - 3 + press, '#5a3a00', 'center', label.length > 4 ? 6 : 8, true);
}
function drawJoystick() {
  if (!Ctl.active || Opt.mode !== 'joy') return;
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(Ctl.ox, Ctl.oy, Ctl.R, 0, Math.PI * 2); ctx.stroke();
  var dx = Ctl.x - Ctl.ox, dy = Ctl.y - Ctl.oy, d = Math.sqrt(dx * dx + dy * dy) || 1, m = Math.min(d, Ctl.R);
  disc(ctx, '#fff', Ctl.ox + dx / d * m, Ctl.oy + dy / d * m, 8);
  ctx.globalAlpha = 1;
}

/* =====================================================================
 * TITLE
 * ===================================================================== */
/* shared big buttons (title + demo end) */
function bigBtn(r, label, hot) {
  box(r[0], r[1], r[2], r[3], hot ? '#ffe27a' : '#ffffff');
  txt(label, r[0] + r[2] / 2, r[1] + r[3] / 2 - 4, '#ffffff', 'center', 8);
}
function inRect(r, x, y) { return x >= r[0] - 3 && x <= r[0] + r[2] + 3 && y >= r[1] - 3 && y <= r[1] + r[3] + 3; }

scenes.title = {
  ctxLabel: null,
  rects: { style: [8, 222, 80, 30], grade: [92, 222, 80, 30], start: [20, 262, 140, 40] },
  enter: function () { this.phase = 'wait'; this.t = 0; this.press = 0; },
  update: function (dt) { this.t += dt; if (this.press > 0) this.press -= dt; },
  draw: function () {
    var t = ST.title || {}, R_ = this.rects, neon = !!(window.TitleNeon && typeof window.TitleNeon.draw === 'function');
    if (neon) { try { window.TitleNeon.draw(ctx, W, H, this.t); } catch (e) { neon = false; } }
    if (!neon) {   // built-in fallback title
      var bob = Math.round(Math.sin(this.t * 2) * 2), tl = t.lines || [];
      spr('bg_title', 0, 0);
      tl.forEach(function (l, i) { txt(l, 90, 14 + i * 20 + bob, i === 0 ? '#ffe27a' : '#ffffff', 'center', 16); });
      txt(t.sub || '', 90, 14 + tl.length * 20 + 6, '#bcd0ff', 'center', 8);
      var s = sz('taxi_a');
      spr('taxi_a', 90 - s[0] * 1.5, 128 + Math.round(Math.sin(this.t * 3) * 2), false, 3);
    }
    if (DEV) {
      txt(ui('styleLabel', 'TYYLI') + ': ' + styleName(Opt.style), 90, 192, '#ffe27a', 'center', 8);
      txt(ui('gradeLabel', 'VÄRIT') + ': ' + gradeName(Opt.grade), 90, 204, '#bcd0ff', 'center', 8);
      bigBtn(R_.style, ui('styleBtn', 'TYYLI >'), false);
      bigBtn(R_.grade, ui('gradeBtn', 'VÄRIT >'), false);
    }
    if (this.phase === 'wait') {
      var r = R_.start, lbl = ui('start', 'ALOITA'), done = false;
      if (window.TitleNeon && typeof window.TitleNeon.button === 'function') {
        try { window.TitleNeon.button(ctx, r[0], r[1], r[2], r[3], lbl, this.press > 0, this.t); done = true; } catch (e) {}
      }
      if (!done) bigBtn(r, lbl, Math.floor(this.t * 2.5) % 2 === 0 || this.press > 0);
    }
  },
  onDown: function (x, y) {
    if (this.phase !== 'wait') return;
    if (DEV && inRect(this.rects.style, x, y)) { cycleStyle(); return; }
    if (DEV && inRect(this.rects.grade, x, y)) { cycleGrade(); return; }
    this.start();
  },
  onAction: function () { this.start(); },
  start: function () {
    if (this.phase !== 'wait') return;
    this.phase = 'intro'; this.press = 0.15; GA.sfx('confirm');
    say(ST.intro || []).then(function () { go('taxiA'); });
  }
};

/* =====================================================================
 * DRIVING scenes (taxiA / taxiB)
 * ===================================================================== */
function buildMap(cf) {
  var w = cf.w, h = cf.h, g = new Uint8Array(w * h), road = new Uint8Array(w * h), kind = new Uint8Array(w * h), x, y, i, j;
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    var n = vnoise(x * 0.14, y * 0.14, cf.seed) * 0.7 + vnoise(x * 0.4, y * 0.4, cf.seed + 5) * 0.3;
    g[y * w + x] = n > cf.snow ? 1 : 0;
  }
  function stamp(cx, cy, r) {
    for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
      var tx = Math.round(cx) + dx, ty = Math.round(cy) + dy;
      if (dx * dx + dy * dy <= r * r + 0.5 && tx >= 0 && ty >= 0 && tx < w && ty < h) road[ty * w + tx] = 1;
    }
  }
  var P = cf.path;
  for (i = 0; i < P.length - 1; i++) {
    var L = dist(P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]), steps = Math.ceil(L * 2);
    for (j = 0; j <= steps; j++) stamp(lerp(P[i][0], P[i + 1][0], j / steps), lerp(P[i][1], P[i + 1][1], j / steps), cf.roadR);
  }
  var pl = cf.plaza;
  for (y = pl.y0; y <= pl.y1; y++) for (x = pl.x0; x <= pl.x1; x++) road[y * w + x] = 1;
  // kinds: 0 ground, 1 road, 2 pavement (ring around road), 3 garden path
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    if (road[y * w + x]) { kind[y * w + x] = 1; continue; }
    for (var dy = -1; dy <= 1 && !kind[y * w + x]; dy++) for (var dx = -1; dx <= 1; dx++) {
      var tx = x + dx, ty = y + dy;
      if (tx >= 0 && ty >= 0 && tx < w && ty < h && road[ty * w + tx]) { kind[y * w + x] = 2; break; }
    }
  }
  if (cf.house) {
    var hh = cf.house, dc = hh.tx + hh.dx, r0 = hh.ty + 1, step = hh.dx < 0 ? 1 : -1, c0 = dc;
    for (var rr = r0; rr <= r0 + 1; rr++) for (var cc = dc - 1; cc <= dc; cc++) kind[rr * w + cc] = 3;
    for (var col = dc; col !== hh.tx + Math.sign(hh.dx) * (cf.roadR + 1) + step; col += step) {
      for (var r2 = r0 + 2; r2 <= r0 + 3; r2++) if (kind[r2 * w + col] !== 1) kind[r2 * w + col] = 3;
      if (Math.abs(col - dc) > 30) break;
    }
  }
  var near = new Uint8Array(w * h);
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (road[y * w + x] || kind[y * w + x] === 3) {
    for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++) {
      var ux = x + dx2, uy = y + dy2; if (ux >= 0 && uy >= 0 && ux < w && uy < h) near[uy * w + ux] = 1;
    }
  }
  var r = rng(cf.seed * 31 + 7), trees = [];
  function tt() { var q = r(); if (cf.treeKinds) return cf.treeKinds[Math.floor(q * cf.treeKinds.length)]; return cf.pines ? (q < 0.8 ? 'tree_pine' : 'tree_birch') : (q < 0.5 ? 'tree_birch' : 'tree_pine'); }
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    if (near[y * w + x]) continue;
    var p = cf.treeP * (0.3 + vnoise(x * 0.2, y * 0.2, cf.seed + 9) * 1.4);
    if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) p = 1;
    if (r() < p) trees.push({ x: x * TS + 8 + (r() - 0.5) * 8, y: y * TS + 14 + (r() - 0.5) * 6, t: tt() });
  }
  var lamps = [];
  for (i = 0; i < P.length - 1; i++) {
    var ax = P[i][0] * TS + 8, ay = P[i][1] * TS + 8, bx = P[i + 1][0] * TS + 8, by = P[i + 1][1] * TS + 8;
    var ll = dist(ax, ay, bx, by) || 1, nx = -(by - ay) / ll, ny = (bx - ax) / ll;
    if (cf.avenue) {
      for (var s = 0; s < ll; s += 26) {
        var px = lerp(ax, bx, s / ll), py = lerp(ay, by, s / ll), off = (cf.roadR + 2.2) * TS;
        [-1, 1].forEach(function (sd) { if (r() < 0.9) trees.push({ x: px + nx * off * sd + (r() - 0.5) * 6, y: py + ny * off * sd, t: 'tree_pine' }); });
      }
    }
    if (cf.lamps) {
      var side = 1;
      for (var s2 = 40; s2 < ll; s2 += 104) {
        var qx = lerp(ax, bx, s2 / ll), qy = lerp(ay, by, s2 / ll), off2 = (cf.roadR + 1) * TS;
        lamps.push({ x: qx + nx * off2 * side, y: qy + ny * off2 * side });
        side = -side;
      }
    }
  }
  var mm = mk(Math.ceil(w / 2), Math.ceil(h / 2)), mg = mm.getContext('2d');
  for (y = 0; y < h; y += 2) for (x = 0; x < w; x += 2) {
    var k = kind[y * w + x];
    mg.fillStyle = k === 1 ? '#d8d8e8' : (k >= 2 ? '#9aa0b8' : (g[y * w + x] ? '#8a96b0' : '#3a4a3a')); mg.fillRect(x / 2, y / 2, 1, 1);
  }
  return { w: w, h: h, g: g, road: road, kind: kind, trees: trees, lamps: lamps, mm: mm,
           path: P.map(function (q) { return [q[0] * TS + 8, q[1] * TS + 8]; }) };
}

function nearestOnPath(path, x, y) {
  var best = null, bd = 1e9;
  for (var i = 0; i < path.length - 1; i++) {
    var ax = path[i][0], ay = path[i][1], bx = path[i + 1][0], by = path[i + 1][1];
    var vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1;
    var t = clamp(((x - ax) * vx + (y - ay) * vy) / l2, 0, 1), px = ax + vx * t, py = ay + vy * t, d = dist(x, y, px, py);
    if (d < bd) { bd = d; best = { x: px, y: py, d: d, dx: vx, dy: vy }; }
  }
  return best;
}

function drawMoose(x, y, flip, legs) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 8, y - 1, 16, 2);
  ctx.fillStyle = '#4a3322'; ctx.fillRect(x - 7, y - 10, 14, 6);
  ctx.fillRect(x - 6, y - 4, 2, 4 + (legs ? 1 : 0)); ctx.fillRect(x - 2, y - 4, 2, 4 - (legs ? 1 : 0)); ctx.fillRect(x + 2, y - 4, 2, 4 + (legs ? 1 : 0)); ctx.fillRect(x + 5, y - 4, 2, 4);
  var hx = flip ? x - 11 : x + 7;
  ctx.fillRect(hx, y - 14, 5, 5); ctx.fillStyle = '#c9b88a'; ctx.fillRect(hx - 1, y - 18, 7, 2); ctx.fillRect(hx + 1, y - 20, 1, 3); ctx.fillRect(hx + 4, y - 20, 1, 3);
}
/* stepped (pixel) disc, used for the window / lamp glows */
function pixDisc(g, col, cx, cy, r) {
  g.fillStyle = col; cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
  for (var y = -r; y <= r; y++) { var w = Math.floor(Math.sqrt(r * r - y * y + r * 0.6)); g.fillRect(cx - w, cy + y, 2 * w + 1, 1); }
}
var DUSK = mk(W, H);
var WINDOWS = [[0.205, 0.5], [0.5, 0.5], [0.795, 0.5], [0.205, 0.76], [0.795, 0.76]];

function makeDrive(o) {
  var S = { ctxLabel: ui('honk') };
  var map, taxi, cam, target, ring, hRect, aRect, hops, picked, control, goal, moved, eng, bumpT, honkT, moose, snow, hDoor, aDoor;
  var face = 1, fences = [], sign = null, exhaust = [], exT = 0, hopPath = [], ownTiles = null, palCache = null, members = [], dragM = null, dragX = 0, dragY = 0, pendingLines = [], phase = 'drive', bagsFly = [], hist = [], APT = o.airportImg || 'airport_terminal';
  function getPal() { if (!o.pal) return STYLES[Opt.style].pal; return palCache || (palCache = mergePal(STYLES[Opt.style].pal, o.pal)); }

  S.enter = function () {
    var cf = o.map; map = buildMap(cf);
    palCache = null; ownTiles = o.pal ? buildTilesPal(getPal()) : null;
    var hs = sz(cf.houseImg), as = sz(APT);
    var hx = (cf.house.tx + cf.house.dx) * TS + 8, hy = (cf.house.ty + 1) * TS;
    hRect = { x: hx - hs[0] / 2 + 4, y: hy - hs[1] * 0.45, w: hs[0] - 8, h: hs[1] * 0.45, ax: hx, ay: hy, w0: hs[0], h0: hs[1] };
    hDoor = { x: hx, y: hy + 2 };
    var ax = cf.airport.tx * TS + 8, ay = cf.airport.ty * TS;
    aRect = { x: ax - as[0] / 2 + 4, y: ay - as[1] * 0.6, w: as[0] - 8, h: as[1] * 0.6, ax: ax, ay: ay };
    aDoor = { x: ax, y: ay + 2 };
    ring = { house: { x: cf.house.tx * TS + 8 - (cf.house.dx < 0 ? 14 : -14), y: cf.house.ty * TS + 8 }, airport: { x: ax, y: (cf.airport.ty + 3) * TS + 8 } };
    // fences along the front of the yard, with a gap for the garden path
    fences = [];
    var fy = hy + 14, roadEdge = (cf.house.tx + Math.sign(cf.house.dx) * (cf.roadR + 1)) * TS + (cf.house.dx < 0 ? 0 : TS);
    if (cf.house.dx < 0) { fences.push({ x: hx - hs[0] / 2 - 26, y: fy, w: hs[0] / 2 + 12 }); fences.push({ x: hx + 16, y: fy, w: Math.max(0, roadEdge - 4 - (hx + 16)) }); }
    else { fences.push({ x: hx - 16 - (hx - roadEdge - 4 > 0 ? hx - roadEdge - 4 : 0), y: fy, w: Math.max(0, hx - 16 - roadEdge - 4) }); fences.push({ x: hx + 16, y: fy, w: hs[0] / 2 + 12 }); }
    fences = fences.filter(function (f) { return f.w > 8 && !o.cruise; });
    // street sign on the pavement next to the pickup spot
    sign = { x: (cf.house.tx + Math.sign(cf.house.dx) * (cf.roadR + 1)) * TS + 8, y: ring.house.y + 66, text: o.signText || (o.story && o.story.street) || '' };
    map.trees = map.trees.filter(function (t) {
      return !(t.x > hRect.ax - hs[0] / 2 - 12 && t.x < hRect.ax + hs[0] / 2 + 12 && t.y > hy - hs[1] - 8 && t.y < hy + 40) &&
             !(t.x > ax - as[0] / 2 - 10 && t.x < ax + as[0] / 2 + 10 && t.y > ay - as[1] - 6 && t.y < ay + 14);
    });
    var sp = map.path[0];
    taxi = o.cruise ? { x: ring.airport.x, y: ring.airport.y, h: 0, sp: 0, target: 0 } : { x: sp[0], y: sp[1] + 20, h: 0, sp: 0, target: 0 };
    cam = { x: 0, y: 0 };
    members = []; dragM = null; pendingLines = []; bagsFly = []; phase = 'drive'; S.ctxLabel = ui('honk');
    hist = []; for (var hi = 0; hi < 30; hi++) hist.push({ x: taxi.x, y: taxi.y + hi * 2 + 2 });
    target = 'house'; hops = []; picked = o.cruise ? o.ids.length : 0; control = false; goal = null; moved = false; eng = false; bumpT = 0; honkT = 0; exhaust = [];
    var rr = rng(cf.seed + 100); moose = [];
    for (var i = 0; i < cf.moose; i++) {
      var f = (i + 0.5) / cf.moose, seg = Math.min(map.path.length - 2, Math.floor(f * (map.path.length - 1)));
      var a = map.path[seg], b = map.path[seg + 1], q = (f * (map.path.length - 1)) - seg;
      var px = lerp(a[0], b[0], q), py = lerp(a[1], b[1], q), side = rr() < 0.5 ? -1 : 1;
      moose.push({ x: px + side * (cf.roadR + 4) * TS, y: py, vx: 0, side: side, flee: 0, kind: o.cruise ? (i % 3 === 2 ? 'chicken' : 'goat') : 'moose' });
    }
    snow = [];
    for (var k = 0; k < 46; k++) snow.push({ x: rr() * W, y: rr() * H, v: 8 + rr() * 16, ph: rr() * 6, big: rr() > 0.6 });
    S.run();
  };
  S.debug = function () { return { taxi: taxi, ring: ring, target: target, control: control, phase: phase, picked: picked }; };
  S.leave = function () { if (eng) GA.sfx('engine_loop_stop'); eng = false; };

  function walkPath(tox, toy) {
    return [[hDoor.x, hDoor.y], [hDoor.x, hDoor.y + 26], [tox, hDoor.y + 26], [tox, toy]];
  }
  function pathLen(p) { var L = 0; for (var i = 0; i < p.length - 1; i++) L += dist(p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]); return L; }
  function pathAt(p, d) {
    for (var i = 0; i < p.length - 1; i++) {
      var L = dist(p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]);
      if (d <= L) { var k = L ? d / L : 0; return [lerp(p[i][0], p[i + 1][0], k), lerp(p[i][1], p[i + 1][1], k)]; }
      d -= L;
    }
    return [p[p.length - 1][0], p[p.length - 1][1]];
  }

  S.run = async function () {
    var STY = o.story;
    if (o.cruise) {
      await say(STY.start);
      control = true; GA.sfx('engine_start');
      var chat = STY.chatter || [], startY = ring.airport.y, endY = ring.house.y;
      (async function () {
        for (var ci = 0; ci < chat.length; ci++) {
          await until(function () { return (startY - taxi.y) / (startY - endY) >= (ci + 1) / (chat.length + 1) && dist(taxi.x, taxi.y, ring.house.x, ring.house.y) > 150; });
          await say(chat[ci]);
        }
      })();
      await until(function () { return dist(taxi.x, taxi.y, ring.house.x, ring.house.y) < 26; });
      control = false; goal = null; GA.sfx('honk'); buzz(30);
      await until(function () { return !Dlg.active; });
      await say(STY.arrive);
      await wait(400);
      go(o.next);
      return;
    }
    await say(STY.start);
    control = true;
    await until(function () { return dist(taxi.x, taxi.y, ring.house.x, ring.house.y) < 26; });
    control = false; goal = null;
    GA.sfx('honk'); buzz(30);
    await say(STY.arrive);
    // drag & drop boarding: family stands at the door, drag each into the taxi (or Tab / Space / big button)
    members = o.ids.map(function (id, i) {
      return { id: id, x: hDoor.x + (i - 1.5) * 15, y: hDoor.y + 10 + (i % 2) * 6, st: 'wait', t: 0, fx: 0, fy: 0, adult: id.indexOf('adult') >= 0 };
    });
    phase = 'board'; S.ctxLabel = ui('board');
    while (picked < o.ids.length) {
      await until(function () { return pendingLines.length > 0 || picked >= o.ids.length; });
      if (pendingLines.length) { var pid = pendingLines.shift(); await say([{ who: pid, t: STY.pickup[pid] }]); }
    }
    phase = 'drive'; S.ctxLabel = ui('honk');
    await say(STY.full);
    GA.sfx('engine_start');
    target = 'airport'; control = true;
    await until(function () { return dist(taxi.x, taxi.y, ring.airport.x, ring.airport.y) < 28; });
    control = false; goal = null; GA.sfx('honk'); buzz(40);
    await wait(500);
    await say(STY.airport);
    for (var j = 0; j < o.ids.length; j++) {
      var p2 = [[taxi.x, taxi.y + 6], [aDoor.x, aDoor.y + 6]], L2 = pathLen(p2);
      hops.push({ id: o.ids[j], t: 0, dur: L2 / 60, path: p2, len: L2, to: 'airport', adult: o.ids[j].indexOf('adult') >= 0 });
      GA.sfx('door'); await wait(420);
    }
    await wait(1400);
    go(o.next);
  };

  function send(m) {
    if (m.st !== 'wait' && m.st !== 'drag') return;
    m.st = 'hop'; m.t = 0; m.fx = m.x; m.fy = m.y; GA.sfx('door');
    if (m.adult) bagsFly.push({ t: 0, fx: m.x + 8, fy: m.y - 6 });
  }
  S.onDown = function (x, y) {
    if (phase === 'board') {
      var wx = cam.x + x, wy = cam.y + y, best = null, bd = 24;
      members.forEach(function (m) { if (m.st !== 'wait') return; var d = dist(wx, wy, m.x, m.y - 12); if (d < bd) { bd = d; best = m; } });
      if (best) { dragM = best; best.st = 'drag'; dragX = wx; dragY = wy; GA.sfx('tap'); }
      return;
    }
    if (control && Opt.mode === 'tap') goal = { x: cam.x + x, y: cam.y + y };
  };
  S.onMove = function (x, y) {
    if (dragM) { dragX = cam.x + x; dragY = cam.y + y; return; }
    if (control && Opt.mode === 'tap' && Ctl.active) goal = { x: cam.x + x, y: cam.y + y };
  };
  S.onUp = function () {
    if (!dragM) return;
    var m = dragM; dragM = null;
    if (dist(dragX, dragY, taxi.x, taxi.y) < 46) send(m);        // generous drop zone
    else { m.st = 'wait'; GA.sfx('back'); }
  };
  S.onAction = function () {
    if (phase === 'board') {
      for (var mi = 0; mi < members.length; mi++) if (members[mi].st === 'wait') { send(members[mi]); return; }
      return;
    }
    GA.sfx('honk'); buzz(20); honkT = 0.5;
    if (o.second) setTimeout(function () { GA.sfx('honk'); }, 140);
    moose.forEach(function (m) { if (dist(m.x, m.y, taxi.x, taxi.y) < 110 && m.flee <= 0) { m.flee = 2.5; m.vx = (m.x >= taxi.x ? 1 : -1) * 34; } });
  };

  S.update = function (dt) {
    if (BTN.press > 0) BTN.press -= dt;
    if (bumpT > 0) bumpT -= dt; if (honkT > 0) honkT -= dt;
    members.forEach(function (m) {
      if (m.st === 'hop') {
        m.t += dt / 0.55;
        if (m.t >= 1) { m.st = 'in'; picked++; GA.sfx('pickup'); buzz(30); pendingLines.push(m.id); }
      }
    });
    bagsFly.forEach(function (b) { b.t += dt / 0.7; });
    bagsFly = bagsFly.filter(function (b) { return b.t < 1; });
    var v = { x: 0, y: 0 };
    if (control) {
      v = steer(dt);
      if (Opt.mode === 'tap' && goal && !(Ctl.keys.ArrowUp || Ctl.keys.ArrowDown || Ctl.keys.ArrowLeft || Ctl.keys.ArrowRight)) {
        var gx = goal.x - taxi.x, gy = goal.y - taxi.y, gd = Math.sqrt(gx * gx + gy * gy);
        if (gd < 8) goal = null; else v = { x: gx / gd, y: gy / gd };
      }
    }
    var mag = Math.sqrt(v.x * v.x + v.y * v.y);
    if (mag > 0.08) moved = true;
    var maxS = 52;
    if (mag > 0.08) {
      var ta = Math.atan2(v.x, -v.y), d = angDiff(ta, taxi.h);
      var turn = 2.6 * dt; taxi.h += clamp(d, -turn, turn);
      taxi.target = maxS * Math.min(1, mag * 1.3) * Math.max(0.35, Math.cos(d));
    } else taxi.target = 0;
    var tx = Math.floor(taxi.x / TS), ty = Math.floor(taxi.y / TS);
    var inb = tx >= 0 && ty >= 0 && tx < map.w && ty < map.h;
    var k0 = inb ? map.kind[ty * map.w + tx] : 0;
    if (k0 === 0) taxi.target *= 0.7;
    taxi.sp += (taxi.target - taxi.sp) * Math.min(1, dt * 3);
    if (mag > 0.08 && taxi.sp > 8) { // gentle auto-alignment to the road
      var np = nearestOnPath(map.path, taxi.x, taxi.y);
      if (np && np.d < 34 && np.d > 1) {
        var pull = Math.min(1, dt * 0.9);
        taxi.x += (np.x - taxi.x) * pull * 0.5; taxi.y += (np.y - taxi.y) * pull * 0.5;
      }
      if (np && np.d < 30) {
        var pa = Math.atan2(np.dx, -np.dy), dd = angDiff(pa, taxi.h);
        if (Math.abs(dd) > Math.PI / 2) { pa += Math.PI; dd = angDiff(pa, taxi.h); }
        if (Math.abs(dd) < 0.55) taxi.h += dd * Math.min(1, dt * 1.6);
      }
    }
    var wantEng = taxi.target > 0;
    if (wantEng && !eng) { GA.sfx('engine_loop_start'); eng = true; }
    else if (!wantEng && eng && taxi.sp < 3) { GA.sfx('engine_loop_stop'); eng = false; }
    var sx = Math.sin(taxi.h);
    if (Math.abs(sx) > 0.25) face = sx > 0 ? 1 : -1;
    taxi.x += sx * taxi.sp * dt;
    taxi.y -= Math.cos(taxi.h) * taxi.sp * dt;
    var hit = false, i;
    for (i = 0; i < map.trees.length; i++) {
      var t = map.trees[i];
      if (Math.abs(t.x - taxi.x) > 28 || Math.abs(t.y - taxi.y) > 28) continue;
      var dx = taxi.x - t.x, dy = taxi.y - t.y, dd2 = Math.sqrt(dx * dx + dy * dy), rr = t.t === 'white_house' ? 20 : 13;
      if (dd2 < rr) { var k = (rr - dd2) / (dd2 || 1); taxi.x += dx * k; taxi.y += dy * k; hit = true; }
    }
    [hRect, aRect].forEach(function (rc) {
      var cx = clamp(taxi.x, rc.x, rc.x + rc.w), cy = clamp(taxi.y, rc.y, rc.y + rc.h), dx = taxi.x - cx, dy = taxi.y - cy, d2 = Math.sqrt(dx * dx + dy * dy);
      if (d2 < 12) { var k = (12 - d2) / (d2 || 1); if (d2 === 0) { dy = 1; k = 12; } taxi.x += dx * k; taxi.y += dy * k; hit = true; }
    });
    taxi.x = clamp(taxi.x, 12, map.w * TS - 12); taxi.y = clamp(taxi.y, 20, map.h * TS - 20);
    if (hit) { taxi.sp *= 0.6; if (bumpT <= 0 && taxi.sp > 6) { GA.sfx('bump'); buzz(25); bumpT = 0.5; } }
    var camX = taxi.x - 90;
    if (target === 'house') { // near the pickup, slide the view towards the house so the family is on screen
      var dh = dist(taxi.x, taxi.y, ring.house.x, ring.house.y), f = clamp(1 - (dh - 40) / 140, 0, 1);
      camX = lerp(camX, (taxi.x + hRect.ax) / 2 - 90, f);
    }
    cam.x = clamp(camX, 0, map.w * TS - W); cam.y = clamp(taxi.y - 150, 0, map.h * TS - H);
    if (o.second) { var lh = hist[0]; if (!lh || dist(taxi.x, taxi.y, lh.x, lh.y) >= 2) { hist.unshift({ x: taxi.x, y: taxi.y }); if (hist.length > 220) hist.pop(); } }
    // exhaust puffs behind the taxi
    exT -= dt;
    if (exT <= 0) { exT = eng ? 0.07 : 0.22; var td = taxiDir(); exhaust.push({ x: taxi.x - td.x * (td.half + 1), y: taxi.y + 6 - td.y * (td.half + 1), a: 0 }); }
    exhaust.forEach(function (e) { e.a += dt; e.y -= 12 * dt; e.x -= face * 5 * dt; });
    exhaust = exhaust.filter(function (e) { return e.a < 0.9; });
    hops.forEach(function (h) { h.t += dt; });
    hops = hops.filter(function (h) { return h.t < h.dur + 0.05 || h.to === 'airport'; });
    moose.forEach(function (m) {
      if (m.flee > 0) { m.flee -= dt; m.x += m.vx * dt; if (m.flee <= 0) m.vx = 0; }
      else if (dist(m.x, m.y, taxi.x, taxi.y) < 42) { m.flee = 2; m.vx = (m.x >= taxi.x ? 1 : -1) * (m.kind === 'chicken' ? 46 : 30); }
    });
    snow.forEach(function (s) { s.y += s.v * dt; s.x += Math.sin(T * 0.9 + s.ph) * 5 * dt; if (s.y > H) { s.y = -2; s.x = Math.random() * W; } });
  };

  /* side-view art faces left/right (flipped); top-down art is rotated to the heading */
  function taxiDir() {
    var s = sz(o.taxi), top = s[1] > s[0] * 1.1;
    return top ? { top: true, x: Math.sin(taxi.h), y: -Math.cos(taxi.h), half: s[1] / 2 } : { top: false, x: face, y: 0, half: s[0] / 2 };
  }
  function tileVar(x, y) { return (x * 7 + y * 13 + ((x * y) >> 2)) % 3; }

  S.draw = function () {
    var cx = Math.round(cam.x), cy = Math.round(cam.y), x, y, pal = getPal(), TL = ownTiles || TILES;
    var x0 = Math.floor(cx / TS), y0 = Math.floor(cy / TS);
    for (y = y0; y <= y0 + 21; y++) for (x = x0; x <= x0 + 11; x++) {
      if (x < 0 || y < 0 || x >= map.w || y >= map.h) continue;
      var i = y * map.w + x, sx = x * TS - cx, sy = y * TS - cy, k = map.kind[i], set;
      set = k === 1 ? TL.road : k === 2 ? TL.pave : k === 3 ? TL.path : (map.g[i] ? TL.snow : TL.grass);
      ctx.drawImage(set[tileVar(x, y) % set.length], sx, sy);
      if (k === 1) { // kerb line where the road meets pavement
        ctx.fillStyle = pal.kerb;
        if (x > 0 && map.kind[i - 1] !== 1) ctx.fillRect(sx, sy, 2, TS);
        if (x < map.w - 1 && map.kind[i + 1] !== 1) ctx.fillRect(sx + TS - 2, sy, 2, TS);
        if (y > 0 && map.kind[i - map.w] !== 1) ctx.fillRect(sx, sy, TS, 2);
        if (y < map.h - 1 && map.kind[i + map.w] !== 1) ctx.fillRect(sx, sy + TS - 2, TS, 2);
      }
    }
    ctx.fillStyle = pal.line;
    for (var pi = 0; pi < map.path.length - 1; pi++) {
      var a = map.path[pi], b = map.path[pi + 1], L = dist(a[0], a[1], b[0], b[1]);
      for (var s = 0; s < L; s += 14) {
        var qx = lerp(a[0], b[0], s / L) - cx, qy = lerp(a[1], b[1], s / L) - cy;
        if (qx > -4 && qx < W + 4 && qy > -4 && qy < H + 4) ctx.fillRect(Math.round(qx) - 1, Math.round(qy) - 1, 2, 5);
      }
    }
    // pickup / arrival marker ring
    var rg = ring[target], gx = rg.x - cx, gy = rg.y - cy, pulse = 0.5 + 0.5 * Math.sin(T * 4);
    ctx.globalAlpha = 0.28 + 0.25 * pulse; pixDisc(ctx, '#ffe27a', gx, gy, 20 + pulse * 3); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fff6b0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(gx, gy, 22, 0, Math.PI * 2); ctx.stroke();

    if (phase === 'board') {       // drop zone around the taxi, lights up while dragging near it
      var tdx = taxi.x - cx, tdy = taxi.y - cy, hot = dragM && dist(dragX, dragY, taxi.x, taxi.y) < 46;
      ctx.globalAlpha = hot ? 0.5 : 0.22 + 0.12 * Math.sin(T * 5); pixDisc(ctx, hot ? '#7aff9a' : '#ffe27a', tdx, tdy, 44); ctx.globalAlpha = 1;
      ctx.strokeStyle = hot ? '#b8ffcc' : '#fff6b0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(tdx, tdy, 44, 0, Math.PI * 2); ctx.stroke();
    }
    var objs = [];
    if (o.teide) objs.push({ y: -1e6, f: function () { var s = sz('teide'); spr('teide', map.w * TS / 2 - s[0] / 2 - cx, 76 - s[1] - cy); } });
    function visible(px, py, m) { var sx = px - cx, sy = py - cy; return sx > -m && sx < W + m && sy > -m && sy < H + m; }
    map.trees.forEach(function (t) {
      if (!visible(t.x, t.y, 40)) return;
      objs.push({ y: t.y, f: function () { var s = sz(t.t); ctx.fillStyle = 'rgba(15,20,50,.25)'; ctx.fillRect(Math.round(t.x - cx - s[0] / 3), Math.round(t.y - cy - 1), Math.round(s[0] * 0.66), 3); spr(t.t, t.x - cx - s[0] / 2, t.y - cy - s[1] + 2); } });
    });
    map.lamps.forEach(function (l) {
      if (!visible(l.x, l.y, 30)) return;
      objs.push({ y: l.y, f: function () {
        var lx = Math.round(l.x - cx), ly = Math.round(l.y - cy);
        ctx.fillStyle = 'rgba(15,20,50,.25)'; ctx.fillRect(lx - 3, ly - 1, 8, 2);
        ctx.fillStyle = '#2a2d3a'; ctx.fillRect(lx, ly - 30, 2, 30); ctx.fillRect(lx - 3, ly - 34, 8, 5);
        ctx.fillStyle = '#ffe79a'; ctx.fillRect(lx - 2, ly - 33, 6, 3);
      } });
    });
    fences.forEach(function (fc) {
      if (!visible(fc.x + fc.w / 2, fc.y, fc.w)) return;
      objs.push({ y: fc.y, f: function () {
        var fx = Math.round(fc.x - cx), fyy = Math.round(fc.y - cy);
        ctx.fillStyle = '#f5f6fa'; ctx.fillRect(fx, fyy - 9, Math.round(fc.w), 2); ctx.fillStyle = '#bdc3d1'; ctx.fillRect(fx, fyy - 5, Math.round(fc.w), 1);
        for (var q = 0; q <= fc.w; q += 5) { ctx.fillStyle = '#f5f6fa'; ctx.fillRect(fx + q, fyy - 11, 2, 11); ctx.fillStyle = '#eef3fa'; ctx.fillRect(fx + q, fyy - 12, 2, 1); }
      } });
    });
    if (sign && sign.text) objs.push({ y: sign.y, f: function () {
      var sx = Math.round(sign.x - cx), sy = Math.round(sign.y - cy);
      font(6); var tw = Math.ceil(ctx.measureText(sign.text).width) + 6;
      ctx.fillStyle = '#2a2d3a'; ctx.fillRect(sx, sy - 22, 2, 22);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - tw + 4, sy - 32, tw, 12);
      ctx.fillStyle = '#1f5fb0'; ctx.fillRect(sx - tw + 5, sy - 31, tw - 2, 10);
      txt(sign.text, sx - tw + 7, sy - 29, '#ffffff', 'left', 6, true);
    } });
    objs.push({ y: hRect.ay, f: function () { var s = sz(o.map.houseImg); spr(o.map.houseImg, hRect.ax - s[0] / 2 - cx, hRect.ay - s[1] - cy); } });
    objs.push({ y: aRect.ay - 60, f: function () { var ps = sz('plane_apron'), as_ = sz(APT); spr('plane_apron', aRect.ax + as_[0] * 0.2 - ps[0] / 2 - cx, aRect.ay - as_[1] * 0.4 - ps[1] - cy); } });
    objs.push({ y: aRect.ay, f: function () { var s = sz(APT); spr(APT, aRect.ax - s[0] / 2 - cx, aRect.ay - s[1] - cy); } });
    moose.forEach(function (m) {
      objs.push({ y: m.y, f: function () {
        var flip = m.vx < 0 || (m.vx === 0 && m.side > 0), run = Math.floor(T * 6) % 2 === 0 && m.flee > 0;
        if (m.kind === 'goat') { var gs = sz('goat'); spr('goat', m.x - cx - gs[0] / 2, m.y - cy - gs[1] - (run ? 1 : 0), flip); }
        else if (m.kind === 'chicken') {
          var hx = Math.round(m.x - cx), hy = Math.round(m.y - cy);
          ctx.fillStyle = '#fff'; ctx.fillRect(hx - 3, hy - 6 - (run ? 1 : 0), 7, 5); ctx.fillRect(hx + (flip ? -5 : 4), hy - 9 - (run ? 1 : 0), 3, 3);
          ctx.fillStyle = '#d6403a'; ctx.fillRect(hx + (flip ? -5 : 5), hy - 10 - (run ? 1 : 0), 2, 1); ctx.fillStyle = '#e8a020'; ctx.fillRect(hx - 1, hy - 1, 1, 2); ctx.fillRect(hx + 2, hy - 1, 1, 2);
        } else drawMoose(m.x - cx, m.y - cy, flip, run);
      } });
    });
    objs.push({ y: taxi.y + 10, f: function () {
      var s = sz(o.taxi), tx = Math.round(taxi.x - cx), ty = Math.round(taxi.y - cy) + 9;
      var bob = taxi.sp > 6 ? (Math.floor(T * 14) % 2) : 0, im = o.tintCar ? tintedColor(o.taxi, G.carColor) : IMG[o.taxi];
      if (s[1] > s[0] * 1.1) {
        ctx.fillStyle = 'rgba(10,14,40,.35)'; ctx.beginPath(); ctx.ellipse(tx + 1, ty - 5, s[0] / 2 + 1, s[1] / 2 - 2, taxi.h, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(tx, Math.round(taxi.y - cy) - bob); ctx.rotate(taxi.h); ctx.drawImage(im, -s[0] / 2, -s[1] / 2); ctx.restore();
        return;
      }
      ctx.fillStyle = 'rgba(10,14,40,.35)'; ctx.fillRect(tx - Math.round(s[0] / 2) + 2, ty - 1, s[0] - 4, 3);
      if (face < 0) { ctx.save(); ctx.translate(tx + s[0] / 2, ty - s[1] - bob); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0); ctx.restore(); }
      else ctx.drawImage(im, tx - Math.round(s[0] / 2), ty - s[1] - bob);
    } });
    hops.forEach(function (h) {
      var d = clamp(h.t / h.dur, 0, 1) * h.len, p = pathAt(h.path, d);
      if (h.t >= h.dur && h.to === 'taxi') return;
      var walking = d < h.len - 0.5, bob = walking ? Math.abs(Math.sin(T * 12)) * 2 : 0;
      var fadeA = (h.to === 'airport' && d > h.len - 10) || (h.to === 'taxi' && d > h.len - 6) ? 0.4 : 1;
      var px = p[0], py = p[1];
      var prev = pathAt(h.path, Math.max(0, d - 2)), flip = px < prev[0] - 0.01;
      objs.push({ y: py + 1, f: function () {
        ctx.globalAlpha = fadeA;
        if (h.adult && IMG.suitcase) { var ss = sz('suitcase'); spr('suitcase', px - cx + (flip ? -12 : 7), py - cy - ss[1] - bob * 0.5); }
        drawChar(h.id, px - cx, py - cy, flip, bob, false, 1);
        ctx.globalAlpha = 1;
      } });
    });
    members.forEach(function (m) {
      if (m.st === 'in') return;
      var px = m.x, py = m.y, lift = 0;
      if (m.st === 'drag') { px = dragX; py = dragY + 6; lift = 6; }
      else if (m.st === 'hop') { var kk = m.t; px = lerp(m.fx, taxi.x, kk); py = lerp(m.fy, taxi.y + 4, kk) - Math.sin(kk * Math.PI) * 12; }
      objs.push({ y: py + (m.st === 'drag' ? 60 : 1), f: function () {
        if (m.adult && m.st !== 'hop' && IMG.suitcase) { var ss = sz('suitcase'); spr('suitcase', px - cx + 9, py - cy - ss[1]); }
        ctx.globalAlpha = m.st === 'hop' ? 1 - m.t * 0.7 : 1;
        var bob = m.st === 'wait' ? (Math.floor(T * 2 + m.x) % 2) : 0;
        drawChar(m.id, px - cx, py - cy - lift, false, bob, false, 1.2);
        ctx.globalAlpha = 1;
      } });
    });
    bagsFly.forEach(function (b) {
      var bx = lerp(b.fx, taxi.x, b.t), by = lerp(b.fy, taxi.y, b.t) - Math.sin(b.t * Math.PI) * 18;
      objs.push({ y: by + 60, f: function () { spr('suitcase', bx - cx - 5, by - cy - 8); } });
    });
    if (o.second) {
      var acc = 0, prev = { x: taxi.x, y: taxi.y }, fp = { x: prev.x, y: prev.y + 28, px: taxi.x, py: taxi.y };
      for (var hi2 = 0; hi2 < hist.length; hi2++) {
        var dd3 = dist(prev.x, prev.y, hist[hi2].x, hist[hi2].y);
        if (acc + dd3 >= 28) { var f3 = (28 - acc) / (dd3 || 1); fp = { x: lerp(prev.x, hist[hi2].x, f3), y: lerp(prev.y, hist[hi2].y, f3), px: prev.x, py: prev.y }; break; }
        acc += dd3; prev = hist[hi2];
      }
      var fh = Math.atan2(fp.px - fp.x, -(fp.py - fp.y));
      objs.push({ y: fp.y + 10, f: function () {
        var im2 = tintedColor(o.taxi, G.carColor2), s2 = sz(o.taxi); if (!im2) return;
        var fx = Math.round(fp.x - cx), fy = Math.round(fp.y - cy);
        ctx.fillStyle = 'rgba(10,14,40,.35)'; ctx.beginPath(); ctx.ellipse(fx + 1, fy + 3, s2[0] / 2 + 1, s2[1] / 2 - 2, fh, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(fx, fy); ctx.rotate(fh); ctx.drawImage(im2, -s2[0] / 2, -s2[1] / 2); ctx.restore();
      } });
    }
    objs.sort(function (p, q) { return p.y - q.y; });
    objs.forEach(function (ob) { ob.f(); });
    // exhaust
    exhaust.forEach(function (e) {
      var kk = e.a / 0.9, r = 1 + Math.floor(kk * 3);
      pixDisc(ctx, 'rgba(230,235,245,' + (0.55 * (1 - kk)).toFixed(2) + ')', e.x - cx, e.y - cy, r);
    });
    // falling snow
    if (!o.day) snow.forEach(function (s) { ctx.fillStyle = s.big ? pal.flake : pal.snowB; ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, s.big ? 2 : 1); if (s.big) ctx.fillRect(Math.round(s.x) + 1, Math.round(s.y), 1, 1); });

    // dusk tint with stepped glows punched through (daytime stages: plain warm tint)
    if (o.day) { ctx.fillStyle = pal.dusk; ctx.fillRect(0, 0, W, H); } else {
    var dg = DUSK.getContext('2d'), hh = sz(o.map.houseImg), hsx = hRect.ax - hh[0] / 2 - cx, hsy = hRect.ay - hh[1] - cy;
    dg.globalCompositeOperation = 'source-over'; dg.clearRect(0, 0, W, H); dg.fillStyle = pal.dusk; dg.fillRect(0, 0, W, H);
    dg.globalCompositeOperation = 'destination-out';
    var glows = [], warm = [];
    var wins = pal.windows || WINDOWS;
    wins.forEach(function (w) { glows.push([hsx + w[0] * hh[0], hsy + w[1] * hh[1], 15, 0.17]); warm.push([hsx + w[0] * hh[0], hsy + w[1] * hh[1], 7, 0.1]); });
    glows.push([hRect.ax - cx, hRect.ay - cy - 6, 14, 0.18]);
    map.lamps.forEach(function (l) { glows.push([l.x - cx, l.y - cy - 31, 34, 0.18]); warm.push([l.x - cx, l.y - cy - 31, 9, 0.12]); });
    var tdr = taxiDir(); glows.push([taxi.x - cx + tdr.x * (tdr.half + 6), taxi.y - cy + (tdr.top ? tdr.y * (tdr.half + 6) : 4), 24, 0.17]);
    glows.forEach(function (g) {
      if (g[0] < -40 || g[0] > W + 40 || g[1] < -40 || g[1] > H + 40) return;
      for (var q = 0; q < 4; q++) pixDisc(dg, 'rgba(0,0,0,' + g[3] + ')', g[0], g[1], g[2] * (1 - q * 0.22));
    });
    dg.globalCompositeOperation = 'source-over';
    ctx.drawImage(DUSK, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    warm.forEach(function (g) { for (var q = 0; q < 3; q++) pixDisc(ctx, 'rgba(' + pal.glow + ',' + g[3] + ')', g[0], g[1], g[2] * (1 - q * 0.3)); });
    ctx.globalCompositeOperation = 'source-over';

    }
    // guide arrow around the taxi
    var txx = taxi.x - cx, tyy = taxi.y - cy;
    var by = gy - 34 - Math.abs(Math.sin(T * 5)) * 5;
    tri(ctx, '#ffe27a', gx - 6, by, gx + 6, by, gx, by + 9); tri(ctx, '#000', gx - 3, by + 1, gx + 3, by + 1, gx, by + 5);
    var dd = dist(taxi.x, taxi.y, rg.x, rg.y);
    if (dd > 50) {
      var ang = Math.atan2(rg.x - taxi.x, -(rg.y - taxi.y)), ax2 = txx + Math.sin(ang) * 40, ay2 = tyy - Math.cos(ang) * 40;
      ctx.save(); ctx.translate(ax2, ay2); ctx.rotate(ang);
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 6); disc(ctx, '#ffe27a', 0, 0, 10); ctx.globalAlpha = 1;
      tri(ctx, '#ffffff', 0, -8, -6, 5, 6, 5); tri(ctx, '#d8a010', 0, -4, -3, 3, 3, 3);
      ctx.restore();
    }
    var STh = ST.hud || {};
    drawHud(phase === 'board' ? ((STh.boardHint || '') + ' ' + picked + '/' + o.ids.length) : o.cruise ? (o.story.hud || '') : (target === 'house' ? (o.story.hudHouse || STh.toHouse || '') : (STh.toAirport || '')));
    txt((o.story && o.story.family) || STh.family || '', 4, 20, '#fff', 'left', 6);
    for (var q2 = 0; q2 < o.ids.length; q2++) {
      var idq = o.ids[q2], hx2 = 4 + q2 * 10;
      ctx.fillStyle = '#000'; ctx.fillRect(hx2 - 1, 29, 10, 10);
      ctx.fillStyle = q2 < picked ? CH[idq].top : '#555a70'; ctx.fillRect(hx2, 30, 8, 8);
      if (q2 < picked) { ctx.fillStyle = CH[idq].skin; ctx.fillRect(hx2 + 2, 31, 4, 3); }
    }
    var mw = map.mm.width, mh = map.mm.height;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(3, 43, mw + 2, mh + 2);
    ctx.drawImage(map.mm, 4, 44);
    ctx.fillStyle = Math.floor(T * 3) % 2 ? '#fff' : '#ff5a5a'; ctx.fillRect(4 + Math.round(taxi.x / TS / 2) - 1, 44 + Math.round(taxi.y / TS / 2) - 1, 3, 3);
    ctx.fillStyle = '#ffe27a'; ctx.fillRect(4 + Math.round(rg.x / TS / 2) - 1, 44 + Math.round(rg.y / TS / 2) - 1, 3, 3);
    if (!moved && control) txt(STh.drive || '', 90, 210, '#fff', 'center', 8);
    if (honkT > 0) txt(ui('beep'), taxi.x - cx, taxi.y - cy - 34, '#ffe27a', 'center', 8);
    drawCtxButton(phase === 'board' ? ui('board', 'KYYTIIN') : (control ? ui('honk') : null));
    if (control) drawJoystick();
    if (control && Opt.mode === 'tap' && goal) { ctx.strokeStyle = '#fff'; ctx.strokeRect(Math.round(goal.x - cx) - 3, Math.round(goal.y - cy) - 3, 6, 6); }
  };
  return S;
}

scenes.taxiA = makeDrive({
  ids: A_IDS, taxi: 'taxi_a', next: 'taxiB',
  get story() { return ST.taxiA; },
  map: { w: 30, h: 130, seed: 3, snow: 0.58, roadR: 2, pines: false, treeP: 0.1, moose: 4, lamps: true,
    path: [[15, 128], [15, 112], [10, 100], [10, 84], [18, 72], [18, 56], [12, 44], [12, 30], [17, 20], [17, 12]],
    plaza: { x0: 11, y0: 9, x1: 24, y1: 14 },
    house: { tx: 10, ty: 92, dx: -6 }, houseImg: 'house_a', airport: { tx: 17, ty: 9 } }
});
scenes.taxiB = makeDrive({
  ids: B_IDS, taxi: 'taxi_b', next: 'checkin',
  get story() { return ST.taxiB; },
  map: { w: 24, h: 150, seed: 11, snow: 0.4, roadR: 2, pines: true, treeP: 0.12, avenue: true, moose: 5, lamps: true,
    path: [[12, 148], [12, 140], [12, 24], [12, 14]],
    plaza: { x0: 7, y0: 10, x1: 17, y1: 16 },
    house: { tx: 12, ty: 134, dx: 6 }, houseImg: 'house_b', airport: { tx: 12, ty: 10 } }
});
/* sunny rental-car drive: airport (bottom) to the airbnb villa (top) */
scenes.driveRental = makeDrive({
  ids: ALL, taxi: 'rental_car', tintCar: true, second: true, cruise: true, day: true, teide: true, pal: PAL_SUNNY, next: 'airbnb',
  signText: 'AIRBNB',
  get story() { return ST.driveRental; },
  map: { w: 30, h: 110, seed: 21, snow: 0.55, roadR: 2, treeP: 0.1, moose: 6, lamps: false,
    treeKinds: ['tree_palm', 'tree_palm', 'tree_palm', 'cactus', 'cactus', 'white_house'],
    path: [[10, 106], [16, 106], [22, 100], [22, 84], [12, 70], [12, 52], [20, 36], [20, 20]],
    plaza: { x0: 6, y0: 103, x1: 24, y1: 108 },
    house: { tx: 20, ty: 26, dx: -6 }, houseImg: 'airbnb_house', airport: { tx: 10, ty: 102 } }
});

/* =====================================================================
 * Walking helper for check-in / gate (joystick or tap-to-walk)
 * ===================================================================== */
function walkUpdate(S, dt, sp, minY) {
  var tr = S.train, t0x = tr.x, t0y = tr.y;
  tr.moving = false;
  var kv = rawVec();
  if (Opt.mode === 'joy' || kv.x || kv.y) {
    var v = steer(dt);
    if (Math.abs(v.x) + Math.abs(v.y) > 0.05) tr.move(v.x * sp * dt, v.y * sp * dt);
  } else if (S.goal) {
    if (tr.step(S.goal.x, S.goal.y, sp, dt)) S.goal = null;
  }
  tr.x = clamp(tr.x, 14, W - 14); tr.y = clamp(tr.y, minY, 306);
  tr.moving = dist(t0x, t0y, tr.x, tr.y) > 0.05;
}

/* =====================================================================
 * CHECK-IN
 * ===================================================================== */
/* ---------- code-composed airport halls (one shared scale: adult ~24 px) ---------- */
var hallCache = {};
function sprG(g, n, x, y, sc) { var im = IMG[n]; if (!im) return; var s = sz(n); sc = sc || 1; g.drawImage(im, Math.round(x), Math.round(y), Math.round(s[0] * sc), Math.round(s[1] * sc)); }
function buildHall(kind) {
  var c = mk(W, H), g = c.getContext('2d'), x, y, i;
  g.imageSmoothingEnabled = false;
  function rect(col, rx, ry, rw, rh) { g.fillStyle = col; g.fillRect(rx, ry, rw, rh); }
  var sunny = kind === 'rental';
  // ceiling with light strips
  rect('#e4e8f0', 0, 0, W, 26); rect('#c4cad6', 0, 24, W, 2);
  for (i = 0; i < 5; i++) { rect('#ffffff', 14 + i * 36, 8, 22, 4); rect('rgba(255,255,225,.28)', 12 + i * 36, 12, 26, 6); }
  // back wall + blue band
  rect('#f4f6fa', 0, 26, W, 86);
  for (x = 0; x < W; x += 30) rect('#e2e6ee', x, 26, 1, 86);
  rect('#2a4aa8', 0, 92, W, 8); rect('#4a6ad0', 0, 92, W, 2); rect('#c4cad6', 0, 110, W, 3);
  // big glass windows on the apron side
  var wins = kind === 'gate' ? [[8, 32, 50, 62], [122, 32, 50, 62]] : (sunny ? [[8, 30, 164, 58]] : [[8, 32, 164, 40]]);
  wins.forEach(function (w) {
    var gr = g.createLinearGradient(0, w[1], 0, w[1] + w[3]);
    if (sunny) { gr.addColorStop(0, '#7fd0ff'); gr.addColorStop(1, '#fff2c0'); } else { gr.addColorStop(0, '#7fb8f0'); gr.addColorStop(1, '#d8ecff'); }
    g.fillStyle = gr; g.fillRect(w[0], w[1], w[2], w[3]);
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(w[0] + 6, w[1] + 8, 14, 3); g.fillRect(w[0] + w[2] - 26, w[1] + 14, 18, 3);
    g.fillStyle = sunny ? '#e8d9a0' : '#9aa0aa'; g.fillRect(w[0], w[1] + w[3] - 12, w[2], 12);      // apron / street
    g.fillStyle = '#4a5068'; g.fillRect(w[0] - 1, w[1] - 1, w[2] + 2, 1); g.fillRect(w[0] - 1, w[1] + w[3], w[2] + 2, 1);
    g.fillRect(w[0] - 1, w[1], 1, w[3]); g.fillRect(w[0] + w[2], w[1], 1, w[3]);
    for (var mx = w[0] + 20; mx < w[0] + w[2]; mx += 28) { g.fillStyle = 'rgba(80,90,110,.8)'; g.fillRect(mx, w[1], 1, w[3]); }
  });
  if (kind === 'gate') { sprG(g, 'plane_apron', 4, 60, 0.6); sprG(g, 'control_tower', 140, 36, 0.8); }
  if (sunny) { // palms seen through the glass
    sprG(g, 'tree_palm', 20, 36, 1.5); sprG(g, 'tree_palm', 128, 40, 1.3);
  }
  // pillars
  rect('#c4cad6', 0, 26, 6, 86); rect('#c4cad6', W - 6, 26, 6, 86); rect('#eef0f5', 1, 26, 2, 86); rect('#eef0f5', W - 5, 26, 2, 86);
  // terrazzo floor with tile lines
  rect('#c9ced8', 0, 113, W, H - 113);
  for (y = 113; y < H; y += 3) for (x = 0; x < W; x += 3) {
    var n = n2(x, y);
    if (n < 0.1) rect('#b6bccb', x, y, 1, 1); else if (n > 0.93) rect('#e2e6ee', x, y, 2, 1);
  }
  for (y = 113; y < H; y += 24) rect('#b4bac8', 0, y, W, 1);
  for (x = 0; x < W; x += 30) rect('#b4bac8', x, 113, 1, H - 113);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 113, W, 3);
  // pixel signage
  g.font = '6px ' + FONT; g.textBaseline = 'top'; g.textAlign = 'center';
  function sign(label, cx, sy, col) {
    var tw = Math.ceil(g.measureText(label).width) + 8;
    rect('#4a5068', cx - 1, 20, 2, sy - 18); rect('#1b2a5a', cx - tw / 2, sy, tw, 11); rect('#3a5ac8', cx - tw / 2, sy, tw, 1);
    g.fillStyle = col || '#ffe27a'; g.fillText(label, cx, sy + 3);
  }
  if (kind === 'checkin') sign(ui('checkinSign'), 76, 34);
  if (kind === 'gate') sign(ui('gate') + ' ' + (CFG.gateNumber || '7'), 90, 30, '#ffffff');
  if (kind === 'rental') sign(ui('rentalSign', 'AUTOVUOKRAUS'), 90, 34);
  return c;
}
function drawHall(kind) {
  var key = kind + '|' + curStyleId + '|' + sz('plane_apron')[0] + '|' + sz('tree_palm')[1] + '|' + sz('control_tower')[1];
  var h = hallCache[kind];
  if (!h || h.key !== key) { h = { key: key, c: buildHall(kind) }; hallCache[kind] = h; }
  ctx.drawImage(h.c, 0, 0);
}

/* =====================================================================
 * CHECK-IN
 * ===================================================================== */
scenes.checkin = {
  ctxLabel: null,
  enter: function () {
    var S = this; S.train = new Train(ALL, 90, 296, 13); S.train.scale = 1.15; S.phase = 'wait'; S.bags = 0; S.stamped = 0; S.fly = []; S.goal = null; S.busy = false; S.stampAnim = null;
    S.ctxLabel = null; S.moved = false;
    S.run();
  },
  run: async function () {
    var S = this, C = ST.checkin;
    await say(C.start);
    S.phase = 'walk';
    await until(function () { return S.train.y <= 176 && S.train.x > 30 && S.train.x < 150; });
    S.phase = 'desk'; S.goal = null;
    await until(function () { return dist(S.train.x, S.train.y, 90, 168) < 2; });
    await say(C.atDesk);
    S.phase = 'bags'; S.ctxLabel = ui('drop');
    await until(function () { return S.bags >= 4; });
    await wait(300);
    S.phase = 'wait'; S.ctxLabel = null;
    await say(C.bagsDone);
    S.phase = 'stamp'; S.ctxLabel = ui('stamp');
    await until(function () { return S.stamped >= 8; });
    S.ctxLabel = null; S.phase = 'wait';
    await wait(500);
    await say(C.stampDone);
    GA.sfx('boarding_chime');
    go('gate');
  },
  onDown: function (x, y) { if (this.phase === 'walk') { this.goal = { x: x, y: clamp(y, 150, 306) }; this.moved = true; } else this.onAction(); },
  onMove: function (x, y) { if (this.phase === 'walk' && Ctl.active) this.goal = { x: x, y: clamp(y, 150, 306) }; },
  onAction: function () {
    var S = this, C = ST.checkin;
    if (S.phase === 'bags' && !S.busy && S.bags < 4) {
      S.busy = true; S.bags++;
      S.fly.push({ t: 0, x: S.train.x, y: S.train.y - 14 });
      GA.sfx('bag_drop'); buzz(25);
      var i = S.bags - 1;
      if (S.bags < 4) say([{ who: (C.bagWho || [])[i] || 'a_kid1', t: (C.bagLines || [])[i] || '...' }]).then(function () { S.busy = false; });
      else wait(500).then(function () { S.busy = false; });
    } else if (S.phase === 'stamp' && S.stamped < 8 && !S.stampAnim) {
      S.stampAnim = { i: S.stamped, t: 0 };
      GA.sfx('stamp'); buzz(30);
    }
  },
  update: function (dt) {
    var S = this;
    if (BTN.press > 0) BTN.press -= dt;
    S.train.moving = false;
    if (S.phase === 'walk') walkUpdate(S, dt, 48, 150);
    if (S.phase === 'desk') S.train.moving = !S.train.step(90, 168, 50, dt);
    S.fly.forEach(function (f) { f.t += dt; });
    S.fly = S.fly.filter(function (f) { return f.t < 1.0; });
    if (S.stampAnim) { S.stampAnim.t += dt; if (S.stampAnim.t > 0.35) { S.stamped++; S.stampAnim = null; } }
  },
  draw: function () {
    var S = this, HUD = ST.hud || {};
    drawHall('checkin');
    prop('airport_plant', 14, 142); prop('vending_machine', 166, 142);
    prop('airport_bench', 40, 244); prop('luggage_cart', 150, 252);
    drawChar('clerk', 70, 134, false, 0, false, 1.15);
    prop('checkin_counter', 70, 142);
    prop('baggage_belt', 134, 142);
    S.fly.forEach(function (f) {
      var k = Math.min(1, f.t / 0.8), x = lerp(f.x, 134, k), y = lerp(f.y, 128, k) - Math.sin(k * Math.PI) * 24;
      spr('suitcase', x - 5, y - 8);
    });
    S.train.draw(false);
    for (var b = 0; b < 4 - S.bags; b++) spr('suitcase', 6 + b * 10, 296 - (b % 2) * 6);
    var hint = null;
    if (S.phase === 'walk') hint = HUD.desk || '';
    else if (S.phase === 'bags') hint = (HUD.bags || '') + ' ' + S.bags + '/4';
    else if (S.phase === 'stamp') hint = (HUD.stamp || '') + ' ' + S.stamped + '/8';
    if (hint) drawHud(hint);
    if (S.phase === 'stamp') {
      box(6, 180, 168, 62);
      for (var i = 0; i < 8; i++) {
        var px = 12 + (i % 4) * 40, py = 188 + Math.floor(i / 4) * 26;
        ctx.drawImage(IMG.boarding_pass, px, py, 34, 18);
        txt(nm(ALL[i]).substr(0, 6), px + 17, py + 7, '#223', 'center', 6, true);
        if (i < S.stamped || (S.stampAnim && S.stampAnim.i === i && S.stampAnim.t > 0.15)) {
          ctx.fillStyle = 'rgba(210,30,30,.85)'; ctx.fillRect(px + 20, py + 9, 12, 8); txt(ui('ok'), px + 26, py + 10, '#fff', 'center', 6, true);
        }
        if (S.stampAnim && S.stampAnim.i === i) {
          var k = S.stampAnim.t / 0.35, sy = py - 14 + Math.sin(k * Math.PI) * -6 + k * 18;
          ctx.fillStyle = '#555'; ctx.fillRect(px + 18, sy, 12, 10); ctx.fillStyle = '#c33'; ctx.fillRect(px + 20, sy + 10, 8, 3);
        }
      }
    }
    if (S.phase === 'walk' && Opt.mode === 'joy') drawJoystick();
    drawCtxButton(S.ctxLabel);
  }
};

/* =====================================================================
 * GATE
 * ===================================================================== */
scenes.gate = {
  ctxLabel: null,
  enter: function () {
    var S = this; S.train = new Train(ALL, 90, 298, 13); S.train.scale = 1.15; S.phase = 'wait'; S.goal = null; S.allIn = false;
    S.run();
  },
  run: async function () {
    var S = this, G_ = ST.gate;
    await say(G_.start);
    S.phase = 'walk';
    await until(function () { return S.train.y <= 150 && Math.abs(S.train.x - 90) < 34; });
    S.phase = 'wait'; S.goal = null;
    GA.sfx('ding');
    await say(G_.atGate);
    await say(G_.board);
    S.phase = 'board';
    await until(function () { return S.allIn; });
    await wait(500);
    GA.sfx('boarding_chime');
    go('plane');
  },
  onDown: function (x, y) { if (this.phase === 'walk') this.goal = { x: x, y: clamp(y, 120, 306) }; },
  onMove: function (x, y) { if (this.phase === 'walk' && Ctl.active) this.goal = { x: x, y: clamp(y, 120, 306) }; },
  update: function (dt) {
    var S = this, tr = S.train;
    if (S.phase === 'walk') walkUpdate(S, dt, 48, 120);
    if (S.phase === 'board') {
      tr.moving = !tr.step(90, -80, 42, dt);
      var n = 0;
      ALL.forEach(function (id, i) {
        var p = tr.pos(i);
        if (p.y <= 112 && !tr.hidden[id]) { tr.hidden[id] = true; GA.sfx('ding'); buzz(15); }
        if (tr.hidden[id]) n++;
      });
      S.allIn = n >= ALL.length;
    }
  },
  draw: function () {
    var S = this, glow = 0.5 + 0.5 * Math.sin(T * 3);
    drawHall('gate');
    // boarding door (~1.5x adult) in the wall between the two windows
    ctx.fillStyle = '#2a3b66'; ctx.fillRect(66, 70, 48, 42);
    ctx.fillStyle = 'rgba(255,230,140,' + (0.55 + glow * 0.3) + ')'; ctx.fillRect(70, 74, 40, 38);
    prop('jet_bridge', 142, 112, 0.7);
    drawChar('attendant', 28, 134, false, 0, false, 1.15);
    prop('gate_desk', 28, 142);
    prop('airport_bench', 128, 240); prop('airport_bench', 52, 270); prop('airport_plant', 160, 150);
    if (S.phase === 'walk') { ctx.globalAlpha = 0.25 + glow * 0.2; ctx.fillStyle = '#ffe27a'; ctx.fillRect(60, 120, 60, 12); ctx.globalAlpha = 1; }
    S.train.draw(false);
    if (S.phase === 'walk') { drawHud((ST.hud && ST.hud.gate) || ''); if (Opt.mode === 'joy') drawJoystick(); }
  }
};

/* =====================================================================
 * PLANE: top-down cabin cutaway composed in code
 * ===================================================================== */
var CAB = { rowY: 42, rowH: 24, rows: 7, L: [10, 30, 50], R: [110, 130, 150], seatW: 20 };
/* [side, row, col] per passenger: family 1 on the left, family 2 on the right, adjacent rows */
var SEATMAP = { a_kid1: ['L', 0, 0], a_kid2: ['L', 0, 1], a_adult1: ['L', 0, 2], a_adult2: ['L', 1, 2],
                b_kid1: ['R', 0, 2], b_kid2: ['R', 0, 1], b_adult1: ['R', 0, 0], b_adult2: ['R', 1, 0] };
function seatXY(id) { var s = SEATMAP[id]; return { x: (s[0] === 'L' ? CAB.L : CAB.R)[s[2]], y: CAB.rowY + s[1] * CAB.rowH }; }
function drawSeat(x, y, glowing) {
  if (glowing) { ctx.fillStyle = '#ffe27a'; ctx.fillRect(x - 1, y - 1, CAB.seatW, CAB.rowH - 2); }
  ctx.fillStyle = '#1c2f78'; ctx.fillRect(x, y, CAB.seatW - 2, CAB.rowH - 4);
  ctx.fillStyle = '#2a49a8'; ctx.fillRect(x + 1, y + 1, CAB.seatW - 4, CAB.rowH - 6);
  ctx.fillStyle = '#5c7fe0'; ctx.fillRect(x + 2, y + 1, CAB.seatW - 6, 4);         // blue headrest
  ctx.fillStyle = '#1c2f78'; ctx.fillRect(x, y + 6, 2, CAB.rowH - 10); ctx.fillRect(x + CAB.seatW - 4, y + 6, 2, CAB.rowH - 10);
}
function drawSeated(id, x, y) {
  var s = sz(id), h = Math.min(s[1], 17), w = s[0];
  ctx.drawImage(IMG[id], 0, 0, w, h, Math.round(x + (CAB.seatW - 2 - w) / 2), Math.round(y + 3), w, h);
  ctx.fillStyle = '#2a49a8'; ctx.fillRect(x + 1, y + CAB.rowH - 10, CAB.seatW - 4, 6);   // seat front hides the legs
  ctx.fillStyle = '#5c7fe0'; ctx.fillRect(x + 1, y + CAB.rowH - 10, CAB.seatW - 4, 1);
}
scenes.plane = {
  ctxLabel: null,
  enter: function () {
    var S = this;
    S.mode = 'seat'; S.seated = 0; S.legIdx = 0; S.legP = 0; S.legDur = 0; S.legRun = false; S.drinks = {}; S.shake = 0; S.legDone = false;
    S.tray = 0; S.ctxLabel = null; S.attY = 70;
    S.run();
  },
  run: async function () {
    var S = this, P = ST.plane;
    await say(P.start);
    S.mode = 'seat'; S.ctxLabel = ui('seat');
    await until(function () { return S.seated >= 8; });
    S.ctxLabel = null;
    await wait(400);
    await say(P.seated);
    GA.sfx('plane_takeoff'); S.shake = 2; await wait(2000);
    S.mode = 'fly';
    for (var leg = 0; leg < 3; leg++) {
      var L = P.legs[leg];
      S.legIdx = leg; S.legP = 0; S.legDur = [10, 14, 10][leg]; S.legRun = true; S.legDone = false;
      await wait(600);
      await say(L.talk);
      if (leg === 1) await S.drinkRound();
      if (L.afterDrinks) await say(L.afterDrinks);
      await until(function () { return S.legDone; });
      GA.sfx('ding');
      await say(L.end);
    }
    S.mode = 'land'; GA.sfx('plane_land');
    await wait(400);
    go('arrival');
  },
  /* the only drink is mustikkamehu; three glasses for eight people, funny but everybody gets one */
  drinkRound: async function () {
    var S = this, P = ST.plane, d = P.drinks[0];
    await choose([{ label: d.label, sub: d.sub, color: d.color, fav: true, tag: P.drinkFavTag }], P.drinkAsk, 0);
    GA.sfx('pour'); S.tray = 3;
    await say(P.trayLines || []);
    await wait(300);
    ALL.forEach(function (id) { S.drinks[id] = d; });
    S.tray = 0; GA.sfx('sip'); buzz(20);
    await say(P.cheers || []);
  },
  onDown: function () { if (this.mode === 'seat') this.seatNext(); },
  onAction: function () { if (this.mode === 'seat') this.seatNext(); },
  seatNext: function () {
    if (this.seated >= 8) return;
    this.seated++; GA.sfx('confirm'); GA.sfx('step'); buzz(20);
  },
  update: function (dt) {
    var S = this;
    if (BTN.press > 0) BTN.press -= dt;
    if (S.shake > 0) S.shake -= dt;
    if (S.legRun) { S.legP += dt / S.legDur; if (S.legP >= 1) { S.legP = 1; S.legRun = false; S.legDone = true; } }
    if (S.mode === 'fly') { S.attY += 16 * dt; if (S.attY > 200) S.attY = 56; }
  },
  draw: function () {
    var S = this, P = ST.plane, HUD = ST.hud || {}, i, r;
    var sx = S.shake > 0 ? Math.round((Math.random() - 0.5) * 3) : 0;
    ctx.save(); ctx.translate(sx, 0);
    // cabin shell: white floor, grey aisle carpet, wall strips with oval windows, lockers
    ctx.fillStyle = '#eef1f7'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c6ccd8'; ctx.fillRect(70, 38, 40, 190);
    ctx.fillStyle = '#b4bccb'; for (r = 38; r < 228; r += 6) ctx.fillRect(86, r, 8, 2);
    ctx.fillStyle = '#d4d9e4'; ctx.fillRect(0, 0, 10, H); ctx.fillRect(W - 10, 0, 10, H);
    ctx.fillStyle = '#e8ecf4'; ctx.fillRect(10, 38, 4, 190); ctx.fillRect(W - 14, 38, 4, 190);   // overhead locker strips
    ctx.fillStyle = '#b4bccb'; for (r = 38; r < 228; r += CAB.rowH) { ctx.fillRect(10, r, 4, 1); ctx.fillRect(W - 14, r, 4, 1); }
    var cloud = (S.mode === 'fly' ? T * 14 : 0);
    for (r = 0; r < CAB.rows; r++) {
      var wy = CAB.rowY + r * CAB.rowH + 4;
      [2, W - 8].forEach(function (wx) {
        ctx.fillStyle = '#5a6a8a'; ctx.beginPath(); ctx.ellipse(wx + 3, wy + 8, 4, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7fc4f4'; ctx.beginPath(); ctx.ellipse(wx + 3, wy + 8, 3, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(wx + 1 + (r % 2), wy + 2 + Math.floor((cloud + r * 9) % 12), 3, 2);
      });
    }
    // galley at the front
    ctx.fillStyle = '#9aa2b6'; ctx.fillRect(10, 0, W - 20, 36); ctx.fillStyle = '#7a8296'; ctx.fillRect(10, 34, W - 20, 3);
    ctx.fillStyle = '#c9ced8'; ctx.fillRect(14, 4, 20, 26); ctx.fillRect(146, 4, 20, 26);   // trolleys
    ctx.fillStyle = '#8a92a6'; for (r = 8; r < 28; r += 6) { ctx.fillRect(16, 4 + r - 4, 16, 1); ctx.fillRect(148, 4 + r - 4, 16, 1); }
    ctx.fillStyle = '#2a49a8'; ctx.fillRect(74, 2, 32, 32); ctx.fillStyle = '#4a69d8'; for (r = 74; r < 106; r += 6) ctx.fillRect(r, 2, 2, 32);  // curtain
    // other passengers (decor) on the unused seats
    var rr = rng(7);
    for (r = 0; r < CAB.rows; r++) {
      [CAB.L, CAB.R].forEach(function (cols, side) {
        cols.forEach(function (cx, c) {
          var taken = false;
          ALL.forEach(function (id) { var m = SEATMAP[id]; if (m[0] === (side ? 'R' : 'L') && m[1] === r && m[2] === c) taken = true; });
          if (taken) return;
          drawSeat(cx, CAB.rowY + r * CAB.rowH, false);
          if (rr() < 0.3) {
            var y0 = CAB.rowY + r * CAB.rowH;
            ctx.fillStyle = ['#c9a27a', '#8a5a3a', '#e8c9a0'][(rr() * 3) | 0]; ctx.fillRect(cx + 5, y0 + 5, 8, 8);
            ctx.fillStyle = ['#333', '#6a4a2a', '#c9a24a'][(rr() * 3) | 0]; ctx.fillRect(cx + 4, y0 + 3, 10, 4);
            ctx.fillStyle = '#2a49a8'; ctx.fillRect(cx + 1, y0 + CAB.rowH - 10, CAB.seatW - 4, 6);
          }
        });
      });
    }
    // the family
    ALL.forEach(function (id, idx) {
      var p = seatXY(id), now = (S.mode === 'seat' && idx === S.seated);
      if (idx < S.seated || S.mode !== 'seat') drawSeat(p.x, p.y, false), drawSeated(id, p.x, p.y);
      else drawSeat(p.x, p.y, now && Math.floor(T * 4) % 2 === 0);
      if (S.drinks[id]) { ctx.fillStyle = '#fff'; ctx.fillRect(p.x + CAB.seatW - 7, p.y + 10, 5, 7); ctx.fillStyle = S.drinks[id].color; ctx.fillRect(p.x + CAB.seatW - 6, p.y + 12, 3, 4); }
    });
    if (S.mode === 'seat' && S.seated < 8) {
      var tp = seatXY(ALL[S.seated]);
      tri(ctx, '#ffe27a', tp.x + 4, tp.y - 8 + Math.round(Math.sin(T * 6) * 2), tp.x + 14, tp.y - 8 + Math.round(Math.sin(T * 6) * 2), tp.x + 9, tp.y - 1);
    }
    // attendant walking the aisle with the tray
    if (S.mode === 'fly') {
      drawChar('attendant', 90, S.attY + 26, false, Math.abs(Math.sin(T * 8)), false, 1.0);
      ctx.fillStyle = '#8a6438'; ctx.fillRect(84, S.attY + 4, 12, 3);
      for (i = 0; i < (S.tray || 3); i++) { ctx.fillStyle = '#4a2f8a'; ctx.fillRect(85 + i * 4, S.attY + 1, 3, 4); }
    }
    // the tray cameo: three glasses for eight people
    if (S.tray) {
      box(30, 206, 120, 26);
      txt('3 x', 40, 215, '#ffe27a', 'left', 8);
      for (i = 0; i < 3; i++) prop('juice', 86 + i * 20, 228, 1.4);
    }
    // route strip at the top (does not cover the seats)
    if (S.mode === 'fly') {
      ctx.fillStyle = 'rgba(10,20,50,.78)'; ctx.fillRect(6, 1, 168, 37);
      var dots = [14, 56, 98, 144], lab = P.cities || [], j;
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(dots[0], 19); ctx.lineTo(dots[3], 19); ctx.stroke(); ctx.setLineDash([]);
      for (j = 0; j < 4; j++) {
        var done = j <= S.legIdx;
        pixDisc(ctx, done ? '#ffe27a' : '#ffffff', dots[j], 19, 3);
        var col = done ? '#ffe27a' : '#cfe0ff';
        if (j === 3) { txt('TENERIFFA', 148, 24, col, 'center', 6, true); txt('POHJOINEN', 148, 31, col, 'center', 6, true); }
        else txt(lab[j] || '', dots[j], j % 2 ? 25 : 8, col, 'center', 6, true);
      }
      var a = dots[S.legIdx], b = dots[Math.min(3, S.legIdx + 1)];
      var q4 = S.legP * 4, fl = Math.floor(Math.min(3.999, q4)), frac = q4 - fl, e = frac * frac * (3 - 2 * frac);
      var tt = S.legP >= 1 ? 1 : (fl + e) / 4, px = lerp(a, b, tt), py = 19 - Math.sin(frac * Math.PI) * 4;
      var ps = sz('plane_fly'), pw = 22, ph = Math.max(6, Math.round(pw * ps[1] / ps[0]));
      ctx.drawImage(IMG.plane_fly, Math.round(px - pw / 2), Math.round(py - ph / 2 - 3), pw, ph);
      var mins = [65, 250, 200], elapsed = 0;
      for (i = 0; i < S.legIdx; i++) elapsed += mins[i];
      elapsed += Math.round(mins[S.legIdx] * S.legP);
      var hh = Math.floor(elapsed / 60), mm = elapsed % 60;
      txt(ui('trip') + ' ' + hh + ui('hourUnit') + ' ' + (mm < 10 ? '0' : '') + mm, 172, 3, '#ffe27a', 'right', 6, true);
    }
    ctx.restore();
    if (S.mode === 'seat' && S.seated < 8) {
      var nid = ALL[S.seated];
      box(4, 250, 172, 64);
      ctx.drawImage(IMG['portrait_' + nid], 8, 258, 48, 48);
      txt((HUD.next || '') + ':', 62, 262, '#ffe27a', 'left', 8);
      txt(nm(nid), 62, 276, '#fff', 'left', 8);
      txt(HUD.seat || '', 62, 292, '#bcd0ff', 'left', 6);
      drawCtxButton(S.ctxLabel);
    }
  }
};

/* =====================================================================
 * ARRIVAL: side-view landing, roll-out, jackets off
 * ===================================================================== */
var GROUND_Y = 238;
scenes.arrival = {
  ctxLabel: null,
  enter: function () {
    var S = this;
    S.t = 0; S.phase = 'approach'; S.px = -80; S.py = 40; S.pitch = 0.12; S.speed = 120; S.scroll = 0; S.smoke = []; S.bounce = 0; S.landed = false; S.stopped = false;
    S.warm = 0; S.warming = false; S.jackets = true; S.doorOpen = 0; S.coats = []; S.walkTo = null; S.leg = 0;
    S.train = new Train(ALL, 0, 0, 14); S.train.scale = 1.1; S.train.reveal = true; S.train.hidden = {};
    G.hol = false;
    S.run();
  },
  geom: function () {
    var s = sz('plane_fly'), w = s[0], h = s[1];
    return { w: w, h: h, x: this.px, y: this.py,
             doorX: this.px - w / 2 + w * 0.63, doorY: this.py - h * 0.68, doorW: w * 0.07, doorH: h * 0.5 };
  },
  run: async function () {
    var S = this, A = ST.arrival;
    GA.sfx('plane_land');
    await until(function () { return S.stopped; });
    await say(A.land);
    GA.sfx('door'); S.phase = 'door';
    await wait(1200);
    await say(A.door);
    var g = S.geom(), bx = g.doorX + g.doorW / 2, gy = GROUND_Y + 12;
    S.train.x = bx; S.train.y = g.doorY + g.doorH; S.train.trail = []; for (var k = 0; k < 8 * 14 + 40; k++) S.train.trail.push({ x: bx, y: S.train.y }); S.train.traveled = 0;
    S.walkTo = [[bx + 14, gy], [bx + 40, gy]]; S.leg = 0; S.phase = 'exit';
    await until(function () { return S.train.x >= bx + 38; });
    S.warming = true;
    await say([A.warm[0], A.warm[1]]);
    GA.sfx('cheer'); S.jackets = false; G.hol = true; buzz(60);
    for (var i = 0; i < 16; i++) S.coats.push({ x: bx + 30 + Math.random() * 40, y: gy - 10, vx: (Math.random() - 0.3) * 60, vy: -70 - Math.random() * 60, r: Math.random() * 6, c: ['#3a4a7a', '#5a6a9a', '#2a3a6a'][i % 3] });
    await say(A.warm.slice(2));
    S.walkTo = [[bx + 60, gy], [bx + 340, gy]]; S.leg = 0;
    await until(function () { return S.train.pos(7).x > 196; });
    await wait(400);
    go('rentalDesk');
  },
  update: function (dt) {
    var S = this; S.t += dt;
    var gw = sz('plane_fly')[1];
    if (S.phase === 'approach') {
      var k = Math.min(1, S.t / 4.6), e = k * k * (3 - 2 * k);
      S.px = lerp(-90, 84, e);
      S.py = lerp(36, GROUND_Y - 1, Math.pow(k, 1.15));
      S.pitch = lerp(0.14, k > 0.85 ? -0.05 : 0.03, k);
      S.scroll += 60 * dt;
      if (k >= 1) {
        S.phase = 'roll'; S.landed = true; S.bounce = 1; S.pitch = 0; GA.sfx('plane_land'); buzz(60);
        for (var i = 0; i < 10; i++) S.smoke.push({ x: S.px - 8, y: GROUND_Y - 2, vx: -20 - Math.random() * 40, vy: -8 - Math.random() * 14, r: 1, life: 1 });
      }
    } else if (S.phase === 'roll') {
      S.speed = Math.max(0, S.speed - 34 * dt); S.scroll += S.speed * dt;
      if (S.bounce > 0) S.bounce = Math.max(0, S.bounce - dt * 2.4);
      if (S.t % 0.08 < dt && S.speed > 30) S.smoke.push({ x: S.px - 8, y: GROUND_Y - 2, vx: -30, vy: -10, r: 1, life: 0.8 });
      if (S.speed <= 0) { S.phase = 'stopped'; S.stopped = true; }
    }
    S.smoke.forEach(function (p) { p.x += p.vx * dt - S.speed * dt * 0.5; p.y += p.vy * dt; p.r += dt * 6; p.life -= dt * 1.4; });
    S.smoke = S.smoke.filter(function (p) { return p.life > 0; });
    if (S.phase === 'door' || S.phase === 'exit') S.doorOpen = Math.min(1, S.doorOpen + dt * 1.2);
    if (S.warming) S.warm = Math.min(1, S.warm + dt / 4);
    if (S.walkTo) {
      var w = S.walkTo[S.leg];
      if (S.train.step(w[0], w[1], 36, dt) && S.leg < S.walkTo.length - 1) S.leg++;
    } else S.train.moving = false;
    S.coats.forEach(function (c) { c.vy += 160 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += dt * 6; });
    S.coats = S.coats.filter(function (c) { return c.y < 330; });
  },
  draw: function () {
    var S = this, sc = S.scroll, i;
    // sky, parallax clouds, Teide, palms, runway strip
    var gr = ctx.createLinearGradient(0, 0, 0, GROUND_Y); gr.addColorStop(0, '#4fb3f0'); gr.addColorStop(0.7, '#bfe6ff'); gr.addColorStop(1, '#ffe8b8');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, GROUND_Y);
    spr('sun', 140, 30);
    for (i = 0; i < 5; i++) {
      var cxp = ((i * 61 - sc * 0.12 - S.t * 3) % 280 + 280) % 280 - 50, cyp = 24 + (i * 37) % 90;
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(cxp, cyp, 34, 6); ctx.fillRect(cxp + 6, cyp - 4, 20, 5); ctx.fillRect(cxp + 20, cyp + 5, 22, 4);
    }
    var tx = ((130 - sc * 0.05) % 400 + 400) % 400 - 100, ts = sz('teide');
    spr('teide', tx - ts[0] / 2, GROUND_Y - 40 - ts[1] + 40, false, 1);
    ctx.fillStyle = '#6a9a4a'; ctx.fillRect(0, GROUND_Y - 12, W, 12);
    for (i = 0; i < 6; i++) {
      var pxp = ((i * 70 - sc * 0.5) % 420 + 420) % 420 - 40;
      prop('tree_palm', pxp, GROUND_Y - 6, 1.5);
    }
    ctx.fillStyle = '#7a7a82'; ctx.fillRect(0, GROUND_Y, W, 52); ctx.fillStyle = '#8c8c96'; ctx.fillRect(0, GROUND_Y, W, 3);
    ctx.fillStyle = '#e8e8e0';
    for (i = 0; i < 9; i++) { var mx = ((i * 40 - sc) % 360 + 360) % 360 - 30; ctx.fillRect(mx, GROUND_Y + 22, 22, 3); }
    ctx.fillStyle = '#ffd23a'; for (i = 0; i < 6; i++) { var lx = ((i * 60 - sc) % 360 + 360) % 360 - 30; ctx.fillRect(lx, GROUND_Y + 4, 3, 3); }
    ctx.fillStyle = '#6a6a72'; ctx.fillRect(0, GROUND_Y + 52, W, H - GROUND_Y - 52);
    // plane: nose right, pitched gently, wheels on the ground line
    var g = S.geom(), bounce = Math.sin(S.bounce * Math.PI) * 4;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(Math.round(S.px - g.w / 2 + 6), GROUND_Y + 1, Math.round(g.w - 12), 3);
    ctx.save(); ctx.translate(Math.round(S.px), Math.round(S.py - g.h / 2 - bounce)); ctx.rotate(S.pitch);
    ctx.drawImage(IMG.plane_fly, Math.round(-g.w / 2), Math.round(-g.h / 2));
    ctx.restore();
    if (S.phase === 'door' || S.phase === 'exit' || S.phase === 'stopped') {
      var dx = Math.round(g.doorX), dy = Math.round(g.doorY), dw = Math.max(6, Math.round(g.doorW)), dh = Math.round(g.doorH);
      ctx.fillStyle = '#222a44'; ctx.fillRect(dx, dy, dw, dh);
      ctx.fillStyle = '#ffe9a0'; ctx.fillRect(dx + 1, dy + 1, Math.round((dw - 2) * S.doorOpen), dh - 2);
      if (S.doorOpen > 0.8) {      // stairs from the door to the ground
        ctx.fillStyle = '#c9ccd2';
        for (i = 0; i < 6; i++) { var sxs = dx + dw + i * 3, sys = dy + dh + Math.round(i * (GROUND_Y + 8 - dy - dh) / 6); ctx.fillRect(sxs, sys, 6, 2); ctx.fillRect(sxs + 4, sys + 2, 2, 4); }
      }
    }
    S.smoke.forEach(function (p) { ctx.fillStyle = 'rgba(235,235,240,' + Math.max(0, p.life).toFixed(2) + ')'; ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.r), Math.round(p.r)); });
    if (S.phase === 'exit' || S.phase === 'stopped') S.train.draw(S.jackets, S.jackets);
    S.coats.forEach(function (c) { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.fillStyle = c.c; ctx.fillRect(-4, -3, 8, 6); ctx.restore(); });
    // palette: cold grey-blue fades into warm sun
    var cold = 1 - S.warm;
    if (cold > 0.01) {
      ctx.globalCompositeOperation = 'multiply';
      var m = [Math.round(lerp(255, 140, cold)), Math.round(lerp(255, 156, cold)), Math.round(lerp(255, 184, cold))];
      ctx.fillStyle = 'rgb(' + m.join(',') + ')'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (S.warm > 0) { ctx.fillStyle = 'rgba(255,170,60,' + (0.12 * S.warm) + ')'; ctx.fillRect(0, 0, W, H); }
  }
};

/* =====================================================================
 * ENDING
 * ===================================================================== */
scenes.ending = {
  ctxLabel: null,
  enter: function () {
    var S = this; S.t = 0; S.phase = 'text'; parts = []; confetti(130);
    GA.sfx('cheer');
    S.run();
  },
  run: async function () {
    var S = this, E = ST.ending;
    GA.sfx('fanfare');
    await wait(1600);
    await say(E.lines);
    S.phase = 'done';
    S.credLines = wrap(tpl(E.credits), 160, 6);
  },
  update: function (dt) { this.t += dt; stepParts(dt, true); if (Math.floor(this.t * 0.4) !== Math.floor((this.t - dt) * 0.4)) { var save = parts.length; if (save < 160) confetti(10); } },
  onDown: function (x, y) { if (this.phase === 'done' && y > 240) this.replay(); },
  onAction: function () { if (this.phase === 'done') this.replay(); },
  replay: function () { GA.sfx('confirm'); go('title'); },
  draw: function () {
    var S = this, E = ST.ending;
    spr('bg_ending', 0, 0);
    spr('sun', 74, 70, false, 1);
    var pulse = 1 + Math.sin(S.t * 3) * 0.05;
    ctx.save(); ctx.translate(90, 40); ctx.scale(pulse, pulse);
    txt(E.title1 || '', 0, -10, '#ffffff', 'center', 16);
    txt(E.title2 || '', 0, 10, '#ffe27a', 'center', 16);
    ctx.restore();
    drawParts();
    if (S.phase === 'done') {
      box(8, 120, 164, 70);
      (S.credLines || []).forEach(function (l, i) { txt(l, 14, 126 + i * 9, '#fff', 'left', 6); });
      txt(E.thanks || '', 90, 176, '#ffe27a', 'center', 8);
      var blink = Math.floor(S.t * 3) % 2;
      box(12, 258, 156, 40, blink ? '#ffe27a' : '#ffffff');
      txt(E.replay || '', 90, 274, '#ffffff', 'center', 8);
      hand(16, 270);
    }
  }
};

/* =====================================================================
 * LATE STAGES: rentalDesk, (driveRental = makeDrive cruise), airbnb, pool
 * ===================================================================== */
var G = { carColor: '#d33a3a', carColor2: '#f2f2f2', hol: false };   // shared between the late stages
var colorCache = {};
/* multiply-tint a sprite (used for the chosen rental car colours) */
function tintedColor(name, color) {
  var im = IMG[name]; if (!im) return null;
  var key = name + color + curStyleId + im.width + 'x' + im.height;
  if (colorCache[key]) return colorCache[key];
  var c = mk(im.width, im.height), g = c.getContext('2d');
  g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(im, 0, 0);
  colorCache[key] = c; return c;
}
function isPng(name) { var L = loadedPng[curStyleId]; return !!(L && L[name]); }
function drawCarTop(x, y, color, sc) {
  var im = tintedColor('rental_car', color), s = sz('rental_car'); sc = sc || 1;
  if (!im) return;
  var w = Math.round(s[0] * sc), h = Math.round(s[1] * sc);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(Math.round(x - w / 2) + 2, Math.round(y + h / 2) - 3, w - 4, 4);
  ctx.drawImage(im, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
}
function drawBubble(who, text, y) {
  var lines = wrap(text, 156, 8), h = lines.length * 11 + (who ? 20 : 10);
  box(8, y, 164, h);
  if (who) txt(nm(who), 14, y + 6, '#ffe27a', 'left', 8);
  lines.forEach(function (l, i) { txt(l, 14, y + (who ? 18 : 8) + i * 11, '#ffffff', 'left', 8); });
}
/* terracotta tiles (cached) */
var tileCache = {};
function terraceTiles(y0, col1, col2) {
  var k = y0 + col1; if (tileCache[k]) return tileCache[k];
  var c = mk(W, H), g = c.getContext('2d'), x, y;
  g.fillStyle = col1; g.fillRect(0, y0, W, H - y0);
  for (y = y0; y < H; y += 12) { g.fillStyle = col2; g.fillRect(0, y, W, 1); for (x = ((y - y0) / 12) % 2 ? 0 : 12; x < W; x += 24) g.fillRect(x, y, 1, 12); }
  for (y = y0; y < H; y += 3) for (x = 0; x < W; x += 3) if (n2(x, y) > 0.9) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, y, 2, 1); }
  tileCache[k] = c; return c;
}
/* per-sprite door table: fractions of the sprite (x,y = top-left of the door, w,h); measured values for the stardew PNG */
var DOORS = { airbnb_house: { x: 0.5, y: 0.69, w: 0.16, h: 0.29 }, _hand: { x: 0.4, y: 0.62, w: 0.2, h: 0.36 }, _default: { x: 0.43, y: 0.62, w: 0.14, h: 0.3 } };
function doorRect(name, bx, by) {
  var s = sz(name), d = (isPng(name) ? DOORS[name] : DOORS._hand) || DOORS._default;
  return { x: bx - s[0] / 2 + d.x * s[0], y: by - s[1] + d.y * s[1], w: d.w * s[0], h: d.h * s[1] };
}

/* ---------------- RENTAL DESK ---------------- */
var CAR1 = { x: 140, y: 262 }, CAR2 = { x: 100, y: 262 };
scenes.rentalDesk = {
  ctxLabel: null,
  enter: function () {
    var S = this;
    S.train = new Train(ALL, 90, 304, 13); S.train.scale = 1.15;
    S.phase = 'wait'; S.goal = null; S.bags = 0; S.busy = false; S.fly = []; S.keyT = -1; S.hasKey = false;
    S.car = false; S.carT = 0; S.allIn = false; S.bw = 0; S.ctxLabel = null;
    S.run();
  },
  run: async function () {
    var S = this, C = ST.rentalDesk;
    await say(C.start);
    S.phase = 'walk';
    await until(function () { return S.train.y <= 196 && S.train.x > 36 && S.train.x < 144; });
    S.phase = 'desk'; S.goal = null;
    await until(function () { return dist(S.train.x, S.train.y, 90, 170) < 3; });
    await say(C.atDesk);
    S.keyT = 0; GA.sfx('key_jingle'); GA.sfx('coin'); buzz(40);
    await wait(1200); S.hasKey = true;
    await say(C.keys);
    await say(C.chooseAsk);
    var opts = C.colours.map(function (c) { return { label: c.label, color: c.color }; });
    var idx = await choose(opts, '', 1);
    var pick = C.colours[idx]; G.carColor = pick.color; G.carColor2 = C.colours[(idx + 1) % C.colours.length].color;
    S.car = true; GA.sfx('door');
    await say([{ who: pick.who, t: pick.t }]);
    await say(C.loadStart);
    S.phase = 'load'; S.ctxLabel = ui('drop');
    await until(function () { return S.bags >= 4 && !S.busy; });
    S.ctxLabel = null; await wait(300);
    S.phase = 'board';
    await until(function () { return S.allIn; });
    GA.sfx('door');
    await say(C.board);
    go('driveRental');
  },
  onDown: function (x, y) { if (this.phase === 'walk') this.goal = { x: x, y: clamp(y, 150, 306) }; else this.onAction(); },
  onMove: function (x, y) { if (this.phase === 'walk' && Ctl.active) this.goal = { x: x, y: clamp(y, 150, 306) }; },
  onAction: function () {
    var S = this, C = ST.rentalDesk;
    if (S.phase !== 'load' || S.busy || S.bags >= 4) return;
    S.busy = true; S.bags++;
    var i = S.bags - 1;
    S.fly.push({ t: 0, x: S.train.x, y: S.train.y - 14, car: i < 2 ? CAR1 : CAR2 });
    GA.sfx('bag_drop'); buzz(25);
    say([{ who: C.bagWho[i], t: C.bagLines[i] }]).then(function () { S.busy = false; });
  },
  update: function (dt) {
    var S = this, tr = S.train;
    if (BTN.press > 0) BTN.press -= dt;
    tr.moving = false;
    if (S.phase === 'walk') walkUpdate(S, dt, 48, 150);
    else if (S.phase === 'desk') tr.moving = !tr.step(90, 170, 50, dt);
    else if (S.phase === 'board') {
      var tgt = S.bw === 0 ? CAR1 : (S.bw === 1 ? CAR2 : { x: CAR2.x, y: 450 });
      if (tr.step(tgt.x, tgt.y, 46, dt) && S.bw < 2) S.bw++;
      tr.moving = true;
      var n = 0;
      ALL.forEach(function (id, i) {
        var p = tr.pos(i), car = i < 4 ? CAR1 : CAR2;
        if (!tr.hidden[id] && dist(p.x, p.y, car.x, car.y) < 12) { tr.hidden[id] = true; GA.sfx('door'); buzz(12); }
        if (tr.hidden[id]) n++;
      });
      S.allIn = n >= ALL.length;
    }
    S.fly.forEach(function (f) { f.t += dt; });
    S.fly = S.fly.filter(function (f) { return f.t < 0.8; });
    if (S.keyT >= 0 && S.keyT < 1.1) S.keyT += dt;
    if (S.car && S.carT < 1) S.carT = Math.min(1, S.carT + dt * 2);
  },
  draw: function () {
    var S = this, HUD = ST.hud || {};
    drawHall('rental');
    prop('airport_plant', 14, 142); prop('tree_palm', 166, 142, 1.1); prop('luggage_cart', 24, 250); prop('airport_bench', 150, 212);
    drawChar('rental_agent', 90, 134, false, 0, false, 1.15);
    prop('checkin_counter', 90, 142);
    if (!S.hasKey) {
      var kx = 108, ky = 128;
      if (S.keyT >= 0) { var k = Math.min(1, S.keyT / 1.1); kx = lerp(108, S.train.x, k); ky = lerp(128, S.train.y - 30, k) - Math.sin(k * Math.PI) * 14; }
      prop('key', kx, ky + 8, 1.4);
    } else { prop('key', 168, 30, 1.4); }
    if (S.car) {
      ctx.globalAlpha = S.carT;
      drawCarTop(CAR1.x, CAR1.y, G.carColor, 1.1); drawCarTop(CAR2.x, CAR2.y, G.carColor2, 1.1);
      ctx.globalAlpha = 1;
    }
    S.fly.forEach(function (f) {
      var k = Math.min(1, f.t / 0.7), x = lerp(f.x, f.car.x, k), y = lerp(f.y, f.car.y - 6, k) - Math.sin(k * Math.PI) * 26;
      spr('suitcase', x - 5, y - 8);
    });
    S.train.draw(false);
    if (S.phase === 'load') for (var b = 0; b < 4 - S.bags; b++) spr('suitcase', 6 + b * 10, 300 - (b % 2) * 6);
    var hint = null;
    if (S.phase === 'walk') hint = HUD.desk || '';
    else if (S.phase === 'load') hint = (HUD.load || '') + ' ' + S.bags + '/4';
    if (hint) drawHud(hint);
    if (S.phase === 'walk' && Opt.mode === 'joy') drawJoystick();
    drawCtxButton(S.ctxLabel);
  }
};

/* ---------------- AIRBNB ---------------- */
var VILLA_BASE = { x: 90, y: 214 };
scenes.airbnb = {
  ctxLabel: null,
  enter: function () {
    var S = this;
    S.train = new Train(ALL, 90, 304, 13); S.train.scale = 1.15;
    S.phase = 'wait'; S.goal = null; S.unlocked = false; S.openT = 0; S.race = false; S.raceT = 0; S.ctxLabel = null; S.keyShow = false; S.allIn = false;
    S.run();
  },
  door: function () { return doorRect('airbnb_house', VILLA_BASE.x, VILLA_BASE.y); },
  run: async function () {
    var S = this, A = ST.airbnb;
    await say(A.start);
    S.phase = 'walk';
    await until(function () { var d = S.door(); return Math.abs(S.train.x - (d.x + d.w / 2)) < 30 && S.train.y <= d.y + d.h + 34; });
    S.phase = 'door'; S.goal = null; S.keyShow = true; S.ctxLabel = ui('open');
    await until(function () { return S.unlocked; });
    S.ctxLabel = null;
    GA.sfx('key_jingle'); buzz(40);
    await wait(400);
    GA.sfx('door'); S.openT = 0.001;
    await wait(900);
    await say(A.unlock);
    S.phase = 'enter';                         // everybody walks up to the door base and steps in
    await say(A.looks);
    await until(function () { return S.allIn; });
    await say(A.race);
    S.race = true; GA.sfx('cheer');
    await wait(2300);
    go('pool');
  },
  onDown: function (x, y) {
    if (this.phase === 'walk') this.goal = { x: x, y: clamp(y, 200, 308) };
    else if (this.phase === 'door') this.unlocked = true;
  },
  onMove: function (x, y) { if (this.phase === 'walk' && Ctl.active) this.goal = { x: x, y: clamp(y, 200, 308) }; },
  onAction: function () { if (this.phase === 'door') this.unlocked = true; },
  update: function (dt) {
    var S = this, tr = S.train;
    if (BTN.press > 0) BTN.press -= dt;
    tr.moving = false;
    if (S.phase === 'walk') walkUpdate(S, dt, 48, 200);
    if (S.openT > 0) S.openT = Math.min(1, S.openT + dt * 1.5);
    if (S.phase === 'enter') {
      var d = S.door(), bx = d.x + d.w / 2, by = d.y + d.h;
      tr.moving = !tr.step(bx, by - 170, 36, dt);
      var n = 0;
      ALL.forEach(function (id, i) {
        var p = tr.pos(i);
        if (!tr.hidden[id] && p.y <= by + 1 && Math.abs(p.x - bx) < 12) { tr.hidden[id] = true; GA.sfx('step'); }
        if (tr.hidden[id]) n++;
      });
      S.allIn = n >= ALL.length;
    }
    if (S.race) S.raceT += dt;
  },
  draw: function () {
    var S = this, HUD = ST.hud || {};
    // sky + sea behind, terracotta terrace in front (all code-drawn so the scale is shared)
    var gr = ctx.createLinearGradient(0, 0, 0, 120); gr.addColorStop(0, '#4fb3f0'); gr.addColorStop(1, '#bfe6ff');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, 120);
    ctx.fillStyle = '#2f9ad8'; ctx.fillRect(0, 96, W, 24);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; for (var q = 0; q < 8; q++) ctx.fillRect((q * 37 + Math.floor(T * 6)) % 170, 100 + (q * 7) % 16, 12, 1);
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(0, 120, W, 94);                          // garden wall / sand behind the house
    ctx.drawImage(terraceTiles(212, '#d98a5a', '#b86a3c'), 0, 0);
    ctx.fillStyle = '#b86a3c'; ctx.fillRect(0, 212, W, 2);
    prop('tree_palm', 16, 214, 1.5); prop('tree_palm', 166, 210, 1.5); prop('cactus', 36, 240, 1.1); prop('cactus', 154, 246, 1.1);
    prop('airbnb_house', VILLA_BASE.x, VILLA_BASE.y);
    var d = S.door();
    if (S.openT > 0) {                         // door-open light, exactly on the measured door rect
      var ow = d.w * S.openT;
      ctx.fillStyle = '#3a2214'; ctx.fillRect(Math.round(d.x), Math.round(d.y), Math.round(d.w), Math.round(d.h));
      ctx.fillStyle = 'rgba(255,238,170,.95)'; ctx.fillRect(Math.round(d.x), Math.round(d.y), Math.round(ow), Math.round(d.h));
    }
    if (S.keyShow && S.openT === 0) {
      var by = d.y - 12 - Math.abs(Math.sin(T * 5)) * 4, cx = d.x + d.w / 2;
      tri(ctx, '#ffe27a', cx - 6, by, cx + 6, by, cx, by + 9);
      prop('key', cx, d.y + d.h * 0.6 + Math.sin(T * 4) * 2, 1.5);
    }
    // the two rental cars parked side by side
    drawCarTop(30, 286, G.carColor, 1.1); drawCarTop(58, 286, G.carColor2, 1.1);
    S.train.draw(false);
    if (S.race) {
      KIDS.forEach(function (id, i) {
        var t = S.raceT - i * 0.15; if (t < 0) return;
        var x = d.x + d.w / 2 + 6 + t * t * 40 + t * 40, y = d.y + d.h + 8 + (i - 1.5) * 7, bob = Math.abs(Math.sin(T * 14 + i)) * 3;
        if (x < 210) drawChar(id, x, y, false, bob, false, 1.15);
      });
      if (S.raceT < 2.2 && Math.floor(T * 5) % 2 === 0) txt('UIMA-ALLAS!', 90, 120, '#ffe27a', 'center', 8);
    }
    if (S.phase === 'walk') { drawHud(HUD.walk || ''); if (Opt.mode === 'joy') drawJoystick(); }
    if (S.phase === 'door') drawHud(HUD.door || '');
    drawCtxButton(S.ctxLabel);
  }
};

/* ---------------- POOL (all code-drawn) ---------------- */
var POOL = { x: 28, y: 166, w: 124, h: 76 };           // water rectangle
var POOL_SPOTS = { a_kid1: [42, 156], a_kid2: [72, 156], b_kid1: [108, 156], b_kid2: [138, 156],
                   a_adult2: [40, 262], a_adult1: [68, 262], b_adult1: [112, 262], b_adult2: [142, 262] };
scenes.pool = {
  ctxLabel: null,
  enter: function () {
    var S = this; S.t = 0; S.count = 0; S.sunTap = false; S.phase = 'wait'; S.bubble = null; S.drops = []; S.rings = [];
    S.who = {};
    ALL.forEach(function (id) { S.who[id] = { x: POOL_SPOTS[id][0], y: POOL_SPOTS[id][1], hx: POOL_SPOTS[id][0], hy: POOL_SPOTS[id][1], st: 'stand', t: 0, fx: 0, fy: 0, tx: 0, ty: 0, swim: 0 }; });
    S.ctxLabel = null;
    S.run();
  },
  run: async function () {
    var S = this, P = ST.pool;
    await say(P.start);
    S.phase = 'play'; S.ctxLabel = ui('jump');
    await until(function () { return S.count >= 6 || S.sunTap; });
    S.ctxLabel = null; S.phase = 'wait';
    await wait(1300);
    await say(P.closing);
    go('ending');
  },
  jump: function (id) {
    var S = this, w = S.who[id];
    if (S.phase !== 'play' || w.st !== 'stand') return false;
    w.st = 'jump'; w.t = 0; w.fx = w.x; w.fy = w.y;
    // strictly inside the water rectangle
    w.tx = clamp(POOL.x + 16 + Math.random() * (POOL.w - 32), POOL.x + 14, POOL.x + POOL.w - 14);
    w.ty = clamp(POOL.y + 26 + Math.random() * (POOL.h - 40), POOL.y + 24, POOL.y + POOL.h - 10);
    GA.sfx('step'); buzz(15);
    return true;
  },
  onDown: function (x, y) {
    var S = this;
    if (S.phase !== 'play') return;
    if (dist(x, y, 148, 46) < 22) { S.sunTap = true; GA.sfx('cheer'); return; }
    var best = null, bd = 30;
    ALL.forEach(function (id) {
      var w = S.who[id]; if (w.st !== 'stand') return;
      var dd = dist(x, y, w.x, w.y - 14);
      if (dd < bd) { bd = dd; best = id; }
    });
    if (best) S.jump(best);
  },
  onAction: function () {
    var S = this;
    for (var i = 0; i < ALL.length; i++) if (S.who[ALL[i]].st === 'stand') { S.jump(ALL[i]); return; }
  },
  update: function (dt) {
    var S = this; S.t += dt;
    if (BTN.press > 0) BTN.press -= dt;
    ALL.forEach(function (id) {
      var w = S.who[id];
      if (w.st === 'jump') {
        w.t += dt / 0.85;
        var k = Math.min(1, w.t);
        w.x = lerp(w.fx, w.tx, k); w.y = lerp(w.fy, w.ty, k) - Math.sin(k * Math.PI) * 46;
        if (k >= 1) {
          w.st = 'swim'; w.x = w.tx; w.y = w.ty; w.swim = 0; S.count++;
          GA.sfx('pour'); GA.sfx('bump'); buzz(40);
          S.rings.push({ x: w.x, y: w.y, t: 0 });
          for (var i = 0; i < 16; i++) S.drops.push({ x: w.x, y: w.y, vx: (Math.random() - 0.5) * 70, vy: -50 - Math.random() * 60, life: 0.8 });
          S.bubble = { who: id, text: (ST.pool.splash || {})[id] || '', t: 2.2 };
        }
      } else if (w.st === 'swim') {
        w.swim += dt;
        if (w.swim > 2.6) { w.st = 'climb'; w.t = 0; w.fx = w.x; w.fy = w.y; w.tx = clamp(w.hx, POOL.x + 10, POOL.x + POOL.w - 10); w.ty = w.hy; }
      } else if (w.st === 'climb') {
        w.t += dt / 0.9;
        var kk = Math.min(1, w.t);
        w.x = lerp(w.fx, w.tx, kk); w.y = lerp(w.fy, w.ty, kk) - Math.sin(kk * Math.PI) * 8;
        if (kk >= 1) { w.st = 'stand'; w.x = w.hx; w.y = w.hy; }
      }
    });
    S.drops.forEach(function (d) { d.vy += 180 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt; });
    S.drops = S.drops.filter(function (d) { return d.life > 0; });
    S.rings.forEach(function (r) { r.t += dt; });
    S.rings = S.rings.filter(function (r) { return r.t < 1.2; });
    if (S.bubble) { S.bubble.t -= dt; if (S.bubble.t <= 0) S.bubble = null; }
  },
  draw: function () {
    var S = this, HUD = ST.hud || {};
    // sunset sky, whitewashed garden wall, terracotta terrace
    var gr = ctx.createLinearGradient(0, 0, 0, 90); gr.addColorStop(0, '#2a2a6a'); gr.addColorStop(0.5, '#d86a8a'); gr.addColorStop(1, '#ffb860');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, 90);
    ctx.fillStyle = '#f6f2ea'; ctx.fillRect(0, 84, W, 54); ctx.fillStyle = '#d8d0c0'; ctx.fillRect(0, 84, W, 3); ctx.fillStyle = '#c9663c'; ctx.fillRect(0, 138, W, 4);
    ctx.drawImage(terraceTiles(142, '#e0a070', '#c07848'), 0, 0);
    var sunY = 46 + Math.min(18, S.t * 0.4);
    spr('sun', 148 - sz('sun')[0] / 2, sunY - sz('sun')[1] / 2);
    prop('tree_palm', 14, 140, 1.5); prop('tree_palm', 166, 140, 1.5);
    // pool: coping + water
    ctx.fillStyle = '#f6f2ea'; ctx.fillRect(POOL.x - 5, POOL.y - 5, POOL.w + 10, POOL.h + 10);
    ctx.fillStyle = '#c9c0ae'; ctx.fillRect(POOL.x - 5, POOL.y + POOL.h + 5, POOL.w + 10, 2);
    var wg = ctx.createLinearGradient(0, POOL.y, 0, POOL.y + POOL.h); wg.addColorStop(0, '#5ad0e8'); wg.addColorStop(1, '#2a8ad0');
    ctx.fillStyle = wg; ctx.fillRect(POOL.x, POOL.y, POOL.w, POOL.h);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (var q = 0; q < 10; q++) ctx.fillRect(POOL.x + 6 + ((q * 29 + Math.floor(T * 14)) % (POOL.w - 22)), POOL.y + 8 + (q * 17) % (POOL.h - 14), 8, 1);
    S.rings.forEach(function (r) {
      var k = r.t / 1.2; ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(r.x, r.y + 2, 6 + k * 18, 3 + k * 8, 0, 0, Math.PI * 2); ctx.stroke();
    });
    prop('pool_float', 60 + Math.sin(T * 1.4) * 3, POOL.y + 40 + Math.cos(T * 1.1) * 2, 1);
    prop('pool_lounger', 30, 306); prop('pool_lounger', 150, 306);
    // drinks tray
    ctx.fillStyle = '#8a6438'; ctx.fillRect(78, 296, 24, 3); ctx.fillStyle = '#6a4a28'; ctx.fillRect(84, 299, 12, 12);
    for (var j = 0; j < 4; j++) prop('juice', 80 + j * 6, 297, 0.7);
    // people (swimmers show head and shoulders bobbing at the water line)
    var list = ALL.map(function (id) { return { id: id, w: S.who[id] }; });
    list.sort(function (a, b) { return a.w.y - b.w.y; });
    list.forEach(function (o) {
      var w = o.w;
      if (w.st === 'stand') {
        var bob = S.phase === 'play' && Math.floor(T * 2 + w.x) % 2 === 0 ? 1 : 0;
        drawChar(o.id, w.x, w.y, w.x > 90, bob, false, 1.15);
      } else if (w.st === 'jump' || w.st === 'climb') {
        drawChar(o.id, w.x, w.y, false, 0, false, 1.15);
      } else {
        var bobW = Math.sin(T * 3 + w.x) * 1.5;
        ctx.save(); ctx.beginPath(); ctx.rect(w.x - 24, w.y - 50, 48, 50 + bobW * 0 - 1); ctx.clip();
        drawChar(o.id, w.x, w.y + 11 + bobW, false, 0, false, 1.15);
        ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(Math.round(w.x - 10), Math.round(w.y - 1), 20, 1);
      }
    });
    ctx.fillStyle = '#e8f8ff';
    S.drops.forEach(function (d) { ctx.fillRect(Math.round(d.x), Math.round(d.y), 2, 2); });
    ctx.fillStyle = 'rgba(255,120,60,' + Math.min(0.2, S.t * 0.006).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
    if (S.bubble) drawBubble(S.bubble.who, S.bubble.text, 24);
    if (S.phase === 'play') drawHud((HUD.jump || '') + ' ' + Math.min(S.count, 6) + '/6');
    if (S.phase === 'play') drawCtxButton(S.ctxLabel);
  }
};

/* =====================================================================
 * DEMO END (demo build: taxiA is followed by this screen)
 * ===================================================================== */
scenes.demoEnd = {
  ctxLabel: null,
  rects: { replay: [14, 206, 152, 38], style: [8, 256, 80, 30], grade: [92, 256, 80, 30] },
  enter: function () { this.t = 0; parts = []; confetti(70); GA.sfx('fanfare'); },
  update: function (dt) { this.t += dt; stepParts(dt, true); },
  draw: function () {
    var D = ST.demoEnd || {}, R_ = this.rects, pulse = 1 + Math.sin(this.t * 3) * 0.04;
    spr('bg_title', 0, 0);
    ctx.fillStyle = 'rgba(8,10,40,.45)'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(90, 30); ctx.scale(pulse, pulse);
    txt(D.title1 || '', 0, -12, '#ffe27a', 'center', 16);
    txt(D.title2 || '', 0, 8, '#ffffff', 'center', 16);
    ctx.restore();
    var lines = wrap(D.text || '', 160, 8);
    box(8, 74, 164, lines.length * 12 + 14);
    lines.forEach(function (l, i) { txt(l, 90, 82 + i * 12, '#ffffff', 'center', 8); });
    var s = sz('taxi_a');
    spr('taxi_a', 90 - s[0], 150 + Math.round(Math.sin(this.t * 4) * 1), false, 2);
    drawParts();
    bigBtn(R_.replay, ui('replay', 'PELAA UUDESTAAN'), Math.floor(this.t * 2.5) % 2 === 0);
    bigBtn(R_.style, ui('styleBtn', 'TYYLI >'), false);
    bigBtn(R_.grade, ui('gradeBtn', 'VÄRIT >'), false);
    txt(styleName(Opt.style) + ' / ' + gradeName(Opt.grade), 90, 296, '#bcd0ff', 'center', 6);
  },
  onDown: function (x, y) {
    if (inRect(this.rects.style, x, y)) cycleStyle();
    else if (inRect(this.rects.grade, x, y)) cycleGrade();
    else if (inRect(this.rects.replay, x, y)) this.replay();
  },
  onAction: function () { this.replay(); },
  replay: function () { GA.sfx('confirm'); go('title'); }
};

/* =====================================================================
 * Main loop
 * ===================================================================== */
var last = 0, frameNo = 0, bloomCv = document.getElementById('bloom'), bloomCtx = bloomCv ? bloomCv.getContext('2d') : null;
function frame(now) {
  var dt = clamp((now - last) / 1000 || 0.016, 0.001, 0.05); last = now; T += dt;
  if (fade.state === 1) { fade.a += dt / 0.3; if (fade.a >= 1) { fade.a = 1; switchTo(fade.next); fade.state = 2; } }
  else if (fade.state === 2) { fade.a -= dt / 0.3; if (fade.a <= 0) { fade.a = 0; fade.state = 0; } }
  Dlg.update(dt);
  tickAsync(dt);
  if (cur) {
    if (fade.state !== 1) { try { cur.update(dt); } catch (e) { if (window.console) console.error(e); } }
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    try { cur.draw(); } catch (e) { if (window.console) console.error(e); }
    Dlg.draw(); Choice.draw();
    if (Opt.crt && bloomCtx && (frameNo++ & 1) === 0) { try { bloomCtx.drawImage(cv, 0, 0, bloomCv.width, bloomCv.height); } catch (e) {} }
  }
  if (fade.a > 0) { ctx.fillStyle = 'rgba(0,0,0,' + fade.a + ')'; ctx.fillRect(0, 0, W, H); }
  if (!window.__ttqManual) requestAnimationFrame(frame);
}

function boot() {
  buildPlaceholders();
  initArt();
  bindUI();
  setStyle(Opt.style, true);
  STYLE_ORDER.forEach(function (id) { loadStyleAssets(id); });
  try { if (document.fonts && document.fonts.load) document.fonts.load('8px "Press Start 2P"', '\u00c4\u00d6\u00c5\u00e4\u00f6\u00e5'); } catch (e) {}
  window.__ttq = { fade: fade, go: go, scenes: scenes, Dlg: Dlg, Choice: Choice, Opt: Opt, getCur: function () { return cur; }, frame: frame };
  switchTo('title');
  requestAnimationFrame(frame);
}
boot();

})();
