/* audio.js - Tenerife Taxi Quest AUDIO track.
 * Global: GameAudio. 100% WebAudio synthesis, no files, no network.
 * API: unlock(), music(sceneId|null), sfx(name), speak(voiceId,text)->ms, setMuted(b), isMuted()
 *
 * ---- HOW TO EDIT THE TUNES ----
 * Each scene in SCENES is plain data:
 *   bpm, swing (0..0.33 delay of off-16ths), root (MIDI tonic), oct (lead octave offset from root),
 *   lp (music lowpass Hz), echo [seconds, feedback] optional, vol (scene level)
 *   prog : one [semitoneOffsetFromRoot, chordType] per bar (cycles). Types: M m M7 m7 sus m9
 *   lead : array of bars, each bar = 16 sixteenth-note tokens separated by spaces:
 *          number = semitones above (root+oct), '.' = rest, '-' = hold previous note
 *   bass : bar string(s) of 16 tokens, numbers = semitones above the current chord root
 *   arp  : 16 tokens, number = chord-tone index (0=root,1=third...) plucked an octave up; '.' rest
 *   drums: name of a preset in DR (kick/snare/hat strings of 16 chars: x hit, o soft, . none)
 */
(function (G) {
  'use strict';

  var AC = G.AudioContext || G.webkitAudioContext;
  var ctx = null, master = null, musicOut = null, sfxBus = null, voiceBus = null, noiseBuf = null;
  var muted = false, wantScene = null, curTrack = null, curId = null, tracks = [], timer = null;
  var engine = null, water = null, speakNode = null, lastStep = 0, stepFlip = 0;

  /* ------------------------------ DATA ------------------------------ */
  var CH = {
    M: [0, 4, 7], m: [0, 3, 7], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
    sus: [0, 5, 7], m9: [0, 3, 7, 10, 14], '7': [0, 4, 7, 10]
  };

  var DR = {
    lazy:  { k: 'x.....x...x.....', s: '....x.......x...', h: 'x.o.x.o.x.o.x.o.' },
    drive: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.xox.xox.xox.xo' },
    busy:  { k: 'x..x..x.x..x..x.', s: '....x.......x..x', h: 'xoxoxoxoxoxoxoxo' },
    walk:  { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' },
    soft:  { k: 'x.......x.......', s: '................', h: '....o.......o...' },
    party: { k: 'x...x...x...x...', s: '....x.......x.x.', h: 'xoxoxoxoxoxoxoxo' },
    synth: { k: 'x...x...x...x...', s: '....x.......x...', h: '.o.o.o.o.o.o.o.o' },
    bossa: { k: 'x..o..x...x..o..', s: '..o...o...o...o.', h: 'x.xox.xox.xox.xo' }
  };

  var SCENES = {
    title: { /* retro NEON synthwave, A minor: detuned saw pad, 16th arp, gated bass */
      bpm: 106, swing: 0, root: 57, oct: 12, lp: 4200, drums: 'synth', vol: 1,
      padw: 'sawtooth', bw: 'sawtooth', bv: 0.11, arpw: 'square', arpv: 0.02,
      prog: [[0,'m'],[8,'M'],[3,'M'],[10,'M'],[0,'m7'],[8,'M7'],[3,'M'],[7,'sus']],
      bass: ['0 0 12 0 0 0 12 0 0 0 12 0 0 12 0 0'],
      arp:  '0 1 2 3 2 1 2 3 0 1 2 3 2 1 2 3',
      lead: [
        '12 - - - 10 - 7 - 12 - - - 15 - 14 -',
        '12 - - - 8 - 12 - 15 - - - 12 - . .',
        '15 - - - 14 - 10 - 7 - - - 10 - 12 -',
        '14 - - - - - 10 - 14 - - - 17 - 14 -',
        '19 - - - - - 17 - 15 - - - 14 - 12 -',
        '17 - - - 15 - 12 - 8 - - - 12 - 15 -',
        '19 - - - 15 - 19 - 17 - - - 15 - 14 -',
        '12 - - - - - - - . . . . 7 - 10 -']
    },
    taxiA: { /* cosy night drive, A minor, melancholy */
      bpm: 76, swing: 0.18, root: 57, oct: 12, lp: 2400, drums: 'lazy', vol: 1,
      prog: [[0,'m7'],[8,'M7'],[3,'M7'],[7,'m7'],[0,'m7'],[5,'m7'],[8,'M7'],[7,'sus']],
      bass: ['0 . . . . . 0 . 7 . . . 0 . . .'],
      arp:  '0 . . 2 . . 1 . . 3 . . 2 . . .',
      lead: [
        '12 . . . 10 . 7 . 5 . . . 7 . . .',
        '8 . 12 . 15 . . . 12 . 7 . 8 . . .',
        '15 . . . 12 . 10 . 7 . . . 3 . . .',
        '10 . 14 . 12 . 10 . 7 . . . . . . .',
        '12 . . 15 . . 17 . 15 . 12 . 10 . . .',
        '17 . . . 15 . 12 . 8 . . . 12 . . .',
        '15 . . 12 . . 8 . 12 . 15 . 19 . . .',
        '14 . . . 12 - - - - - - - . . . .']
    },
    taxiB: { /* cosy night drive, D minor, a little lonelier */
      bpm: 72, swing: 0.2, root: 62, oct: 0, lp: 2200, drums: 'lazy', vol: 1,
      prog: [[0,'m9'],[8,'M7'],[5,'m7'],[7,'sus'],[0,'m9'],[3,'M7'],[10,'M'],[7,'m7']],
      bass: ['0 . . . 0 . . . . . 7 . 0 . . .'],
      arp:  '0 . 2 . . 3 . . 1 . 2 . . 4 . .',
      lead: [
        '7 . . 5 . . 7 . 10 . . . 12 . 10 .',
        '12 . . . 10 . 8 . 7 . . . 3 . 5 .',
        '8 . 12 . 15 . 12 . 8 . . . 5 . . .',
        '14 . . 12 . . 7 . 12 . . . 14 . . .',
        '15 . . 14 . . 12 . 10 . 7 . 10 . 12 .',
        '14 . . . 10 . 7 . 10 . 14 . 15 . . .',
        '17 . . 14 . . 10 . 14 . 17 . 19 . . .',
        '17 . 14 . 10 . . . 7 - - - - - - -']
    },
    checkin: { /* busy but calm, G major */
      bpm: 92, swing: 0.1, root: 55, oct: 12, lp: 4200, drums: 'busy', vol: 0.95,
      prog: [[0,'M7'],[2,'m7'],[5,'M7'],[7,'M'],[0,'M7'],[4,'m7'],[5,'M7'],[7,'sus']],
      bass: ['0 . 0 . 12 . 0 . 7 . 0 . 12 . 7 .'],
      arp:  '0 1 2 1 0 1 2 3 0 1 2 1 0 1 2 3',
      lead: [
        '7 . 11 . 12 . 11 . 7 . 4 . 7 . 9 .',
        '9 . 12 . 14 . 12 . 9 . 5 . 9 . . .',
        '12 . 16 . 14 . 12 . 9 . 12 . 11 . 9 .',
        '14 . 11 . 7 . 11 . 14 . 16 . 14 . . .',
        '12 . 11 . 7 . 11 . 12 . 14 . 16 . 14 .',
        '14 . 11 . 7 . 4 . 7 . 11 . 14 . 11 .',
        '16 . 14 . 12 . 9 . 12 . 14 . 16 . 17 .',
        '14 . 12 . 14 . . . 12 . 7 . . . . .']
    },
    gate: { /* anticipation, E minor */
      bpm: 86, swing: 0.08, root: 52, oct: 12, lp: 3000, drums: 'walk', vol: 1,
      prog: [[0,'m7'],[8,'M7'],[10,'M'],[7,'sus'],[0,'m7'],[3,'M7'],[5,'m7'],[7,'sus']],
      bass: ['0 . . . . . . . 0 . . . 7 . . .'],
      arp:  '0 . . 1 . . 2 . . 3 . . 2 . 1 .',
      lead: [
        '7 . . 7 . . 10 . 12 . . . 14 . . .',
        '12 . . 12 . . 15 . 14 . . . 12 . . .',
        '14 . . 14 . . 17 . 19 . . . 17 . . .',
        '19 . . . 17 . 14 . 12 . . . 14 . . .',
        '7 . 10 . 12 . 14 . 15 . . . 14 . 12 .',
        '15 . . 14 . . 10 . 14 . 15 . 19 . . .',
        '17 . . 15 . . 12 . 15 . 17 . 19 . 17 .',
        '19 - - - - - - - 14 . 17 . 19 . . .']
    },
    plane: { /* floaty dreamy, F lydian, echo */
      bpm: 70, swing: 0.15, root: 53, oct: 12, lp: 2200, drums: 'soft', vol: 1, echo: [0.64, 0.38],
      prog: [[0,'M7'],[2,'M'],[4,'m7'],[2,'M7'],[0,'M7'],[7,'M7'],[9,'m7'],[2,'M']],
      bass: ['0 . . . . . . . . . . . 7 . . .'],
      arp:  '0 . . . 2 . . . 1 . . . 3 . . .',
      lead: [
        '11 - - - - - . . 7 - - - 9 - - -',
        '14 - - - 11 - - - 9 - - - 6 - - .',
        '16 - - - - - - - 14 - - - 11 - . .',
        '18 - - - 14 - - - 11 - - - 9 - - -',
        '12 - - 11 - - 7 - . . 9 - - - 11 -',
        '14 - - - 18 - - - 16 - - - 14 - . .',
        '16 - - - 14 - - - 12 - - - 9 - . .',
        '11 - - - - - - - 14 - - - - - - .']
    },
    arrival: { /* bright warm reveal, D major */
      bpm: 90, swing: 0.12, root: 62, oct: 0, lp: 4500, drums: 'drive', vol: 1,
      prog: [[0,'M7'],[7,'M'],[9,'m7'],[5,'M7'],[0,'M7'],[5,'M7'],[7,'sus'],[0,'M']],
      bass: ['0 . . 0 . . 7 . 0 . 12 . 7 . 5 .'],
      arp:  '0 . 1 . 2 . 1 . 0 . 1 . 2 . 3 .',
      lead: [
        '12 . 16 . 19 . 16 . 14 . 12 . 16 . . .',
        '14 . 19 . 23 . 19 . 16 . 14 . 11 . . .',
        '16 . 19 . 21 . 19 . 16 . 12 . 14 . 16 .',
        '17 . 16 . 14 . 12 . 9 . 12 . 14 . . .',
        '19 . . 16 . . 12 . 16 . 19 . 21 . 19 .',
        '23 . 21 . 19 . 16 . 14 . 16 . 19 . . .',
        '21 . 19 . 17 . 14 . 12 . 14 . 16 . . .',
        '24 - - - - - - - 19 - 16 - 12 - - -']
    },
    ending: { /* joyful, A major */
      bpm: 95, swing: 0.1, root: 57, oct: 12, lp: 5000, drums: 'party', vol: 1,
      prog: [[0,'M'],[7,'M'],[9,'m7'],[5,'M7'],[0,'M'],[5,'M7'],[7,'sus'],[0,'M7']],
      bass: ['0 . 0 . 7 . 0 . 12 . 0 . 7 . 12 .'],
      arp:  '0 1 2 1 0 1 2 3 0 1 2 1 0 1 2 3',
      lead: [
        '0 . 4 . 7 . 12 . 9 . 7 . 4 . 7 .',
        '11 . 11 . 14 . 11 . 7 . 11 . 14 . . .',
        '12 . 9 . 12 . 16 . 14 . 12 . 9 . . .',
        '9 . 12 . 14 . 12 . 9 . 7 . 5 . 7 .',
        '4 . 7 . 12 . 16 . 12 . 7 . 12 . 16 .',
        '17 . 16 . 14 . 12 . 9 . 12 . 14 . 16 .',
        '14 . 12 . 14 . 16 . 19 . 16 . 14 . . .',
        '12 - - - 9 . 7 . 12 . 16 . 19 - - -']
    },
    rental: { /* sunny drive: bossa / reggae-lite, F major, marimba lead */
      bpm: 96, swing: 0.2, root: 53, oct: 12, lp: 4800, drums: 'bossa', vol: 1, lv: 'pluck',
      prog: [[0,'M7'],[2,'m7'],[7,'7'],[0,'M7'],[0,'M7'],[5,'M7'],[2,'m7'],[7,'7']],
      bass: ['0 . . . . . 7 . . . 0 . . . 7 .'],
      arp:  '. . 1 . . . 2 . . . 1 . . . 2 .',
      lead: [
        '12 . . 11 . 9 . . 7 . . 9 . 11 . .',
        '12 . . 9 . 5 . . 9 . . 12 . 14 . .',
        '11 . . 14 . 11 . . 7 . . 11 . 14 . .',
        '12 . 14 . 16 . . . 12 . . . . . . .',
        '16 . . 14 . 12 . . 9 . . 12 . 14 . .',
        '17 . . 16 . 12 . . 9 . . 12 . 16 . .',
        '14 . . 12 . 9 . . 12 . . 14 . 17 . .',
        '14 . 11 . 7 . 11 . 14 - - - . . . .']
    },
    airbnb: { /* cosy arrival, Bb major, gentle */
      bpm: 80, swing: 0.14, root: 58, oct: 12, lp: 2600, drums: 'lazy', vol: 0.9,
      prog: [[0,'M7'],[9,'m7'],[5,'M7'],[7,'M'],[0,'M7'],[4,'m7'],[5,'M7'],[7,'sus']],
      bass: ['0 . . . . . . . 7 . . . . . 0 .'],
      arp:  '0 . 1 . 2 . 1 . 0 . 1 . 2 . 1 .',
      lead: [
        '7 . . . 4 . 7 . 11 . . . 9 . 7 .',
        '12 . . . 9 . 7 . 4 . . . 7 . 9 .',
        '12 . . 9 . . 5 . 9 . 12 . 14 . . .',
        '14 . . 11 . . 7 . 11 . . . 14 - - -',
        '16 . . 14 . . 12 . 11 . . . 7 . 11 .',
        '14 . . 11 . 7 . . 4 . . . 7 . 11 .',
        '16 . . 12 . . 9 . 12 . 14 . 16 . . .',
        '14 . . . 12 . . . 7 . . . 12 - - -']
    },
    pool: { /* slowest lounge, vibraphone, wave wash, sunset melancholy -> joy */
      bpm: 72, swing: 0.16, root: 57, oct: 12, lp: 2800, drums: 'soft', vol: 1, lv: 'vib',
      wash: 0.035, echo: [0.625, 0.3],
      prog: [[9,'m7'],[5,'M7'],[2,'m7'],[4,'7'],[0,'M7'],[7,'M'],[5,'M7'],[0,'M7']],
      bass: ['0 . . . . . . . . . . . 7 . . .'],
      arp:  '0 . . . 2 . . . 1 . . . 3 . . .',
      lead: [
        '16 - - - - - 12 - 9 - - - 12 - . .',
        '14 - - - 12 - 9 - 5 - - - 9 - 12 -',
        '12 - - - - - 9 - 5 - - - 2 - . .',
        '11 - - - 14 - 17 - 16 - - - 14 - 11 -',
        '16 - - - - - 14 - 12 - - - 16 - 19 -',
        '19 - - - 16 - 14 - 11 - - - 14 - 16 -',
        '17 - - - 16 - 12 - 14 - - - 16 - 17 -',
        '19 - - - - - - - 16 - - - 12 - . .']
    }
  };

  /* Voice profiles: base Hz, wave, ms per blip (~2 letters), semitone spread, lowpass, volume, glide */
  var VOICES = {
    narrator:  { f: 300, w: 'triangle', ms: 70, sp: 1.0, lp: 3000, v: 0.16, g: 0.02 },
    driver:    { f: 105, w: 'sawtooth', ms: 78, sp: 0.8, lp: 750,  v: 0.15, g: -0.04, gravel: 1 },
    clerk:     { f: 235, w: 'square',   ms: 62, sp: 0.9, lp: 2400, v: 0.08, g: 0.0 },
    attendant: { f: 400, w: 'square',   ms: 54, sp: 1.35, lp: 4200, v: 0.075, g: 0.05 },
    rental_agent: { f: 275, w: 'square', ms: 56, sp: 1.2, lp: 3600, v: 0.075, g: 0.04 },
    a_adult1:  { f: 350, w: 'triangle', ms: 66, sp: 1.15, lp: 3400, v: 0.16, g: 0.03 }, /* Nelli */
    a_adult2:  { f: 150, w: 'square',   ms: 72, sp: 0.9, lp: 1300, v: 0.09, g: -0.02 }, /* Mikko */
    a_kid1:    { f: 430, w: 'square',   ms: 50, sp: 1.3, lp: 3600, v: 0.07, g: 0.04 },  /* boy-ish */
    a_kid2:    { f: 760, w: 'triangle', ms: 44, sp: 1.6, lp: 5400, v: 0.15, g: 0.07 },  /* small, high */
    b_adult1:  { f: 370, w: 'sine',     ms: 68, sp: 1.2, lp: 3200, v: 0.2, g: 0.03 },   /* Kaisa */
    b_adult2:  { f: 135, w: 'sawtooth', ms: 74, sp: 0.8, lp: 1300, v: 0.1, g: -0.03 },  /* Ville */
    b_kid1:    { f: 470, w: 'square',   ms: 52, sp: 1.35, lp: 3800, v: 0.065, g: 0.05 }, /* boy-ish */
    b_kid2:    { f: 850, w: 'sine',     ms: 42, sp: 1.7, lp: 5800, v: 0.2, g: 0.08 }    /* small, high */
  };
  var PENTA = [0, 2, 4, 7, 9];

  /* ------------------------------ HELPERS ------------------------------ */
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function fold(m, lo) { while (m < lo) m += 12; while (m >= lo + 12) m -= 12; return m; }

  function parseBar(str) { /* -> array(16) of null | {n, len} */
    var tk = String(str).split(/\s+/), out = [], last = null, i, t;
    for (i = 0; i < 16; i++) {
      t = tk[i];
      if (t === undefined || t === '.' || t === '') { out.push(null); last = null; }
      else if (t === '-') { if (last) last.len++; out.push(null); }
      else { last = { n: parseFloat(t), len: 1 }; out.push(last); }
    }
    return out;
  }
  function compile(id) {
    var S = SCENES[id];
    if (S._c) return S;
    S._c = true;
    S.leadC = S.lead.map(parseBar);
    S.bassC = S.bass.map(parseBar);
    S.arpC = S.arp ? parseBar(S.arp) : null;
    S.bars = Math.max(S.lead.length, S.prog.length);
    S.sd = 60 / S.bpm / 4;
    return S;
  }

  /* low-level voices (all take absolute context time t) */
  function osc(type, f0, f1, t, d, v, dest, a) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    a = a || 0.004;
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    o.connect(g); g.connect(dest || sfxBus);
    o.start(t); o.stop(t + a + d + 0.03);
  }
  function hold(type, f, t, d, v, dest, a, r, dt) { /* sustained note with attack/release */
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (dt) o.detune.value = dt;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.setValueAtTime(v, t + Math.max(a, d - r));
    g.gain.linearRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + d + 0.02);
  }
  function noise(t, d, v, ftype, f0, f1, q, dest) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = ftype; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.005 + d);
    s.connect(f); f.connect(g); g.connect(dest || sfxBus);
    s.start(t, Math.random() * 0.4, d + 0.05);
  }
  function swell(type, f0, f1, t, d, v, dest, peak) { /* gain rises to peak fraction then falls */
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + d * peak);
    g.gain.linearRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(dest || sfxBus);
    o.start(t); o.stop(t + d + 0.03);
  }
  function seq(type, notes, t, v, d, dest) { /* notes: [[midi, offsetSec], ...] */
    for (var i = 0; i < notes.length; i++) osc(type, mtof(notes[i][0]), 0, t + notes[i][1], d, v, dest);
  }

  /* ------------------------------ GRAPH ------------------------------ */
  function build() {
    if (ctx || !AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ctx.destination);
    musicOut = ctx.createGain(); musicOut.gain.value = 0.55; musicOut.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    voiceBus = ctx.createGain(); voiceBus.gain.value = 0.9; voiceBus.connect(master);
    /* one-time 0.5s noise table (looped by sources); everything else is native nodes */
    var n = (ctx.sampleRate / 2) | 0, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = b;
  }
  function ready() { return !!ctx && ctx.state !== 'closed'; }

  /* ------------------------------ MUSIC ------------------------------ */
  function makeTrack(id) {
    var S = compile(id), tr = { id: id, s: S, step: 0, total: S.bars * 16, next: ctx.currentTime + 0.06 };
    tr.gain = ctx.createGain(); tr.gain.gain.value = 0.0001;
    tr.lp = ctx.createBiquadFilter(); tr.lp.type = 'lowpass'; tr.lp.frequency.value = S.lp; tr.lp.Q.value = 0.5;
    tr.pad = ctx.createGain();
    tr.lead = ctx.createGain();
    tr.pad.connect(tr.lp); tr.lead.connect(tr.lp);
    tr.lp.connect(tr.gain); tr.gain.connect(musicOut);
    if (S.echo) {
      var dl = ctx.createDelay(1.5), fb = ctx.createGain(), wet = ctx.createGain();
      dl.delayTime.value = S.echo[0]; fb.gain.value = S.echo[1]; wet.gain.value = 0.5;
      tr.lead.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(tr.lp);
    }
    if (S.wash) { /* soft waves: looped noise, slow LFO on level and cutoff */
      var ws = ctx.createBufferSource(), wf = ctx.createBiquadFilter(), wg = ctx.createGain(),
          wl = ctx.createOscillator(), wa = ctx.createGain(), wc = ctx.createGain();
      ws.buffer = noiseBuf; ws.loop = true;
      wf.type = 'lowpass'; wf.frequency.value = 800;
      wg.gain.value = S.wash; wl.frequency.value = 0.12;
      wa.gain.value = S.wash * 0.8; wc.gain.value = 450;
      wl.connect(wa); wa.connect(wg.gain); wl.connect(wc); wc.connect(wf.frequency);
      ws.connect(wf); wf.connect(wg); wg.connect(tr.gain);
      ws.start(); wl.start(); tr.src = [ws, wl];
    }
    return tr;
  }

  function playStep(tr, bar, i, t) {
    var S = tr.s, sd = S.sd, ch = S.prog[bar % S.prog.length], iv = CH[ch[1]] || CH.M, k, ev, m, dr = DR[S.drums], v = S.vol;
    if (i === 0) { /* pad, folded low and soft */
      var pr = fold(S.root + ch[0], 48), len = sd * 16;
      for (k = 0; k < iv.length && k < 4; k++) {
        if (S.padw) { /* detuned pair, e.g. synthwave saws */
          hold(S.padw, mtof(pr + iv[k]), t, len, 0.022 * v, tr.pad, 0.1, 0.2, -9);
          hold(S.padw, mtof(pr + iv[k]), t, len, 0.022 * v, tr.pad, 0.1, 0.2, 9);
        } else hold('triangle', mtof(pr + iv[k]), t, len, 0.05 * v, tr.pad, 0.18, 0.25);
      }
    }
    ev = S.bassC[bar % S.bassC.length][i];
    if (ev) {
      m = fold(S.root + ch[0], 33) + ev.n;
      hold(S.bw || 'triangle', mtof(m), t, ev.len * sd * (S.bw ? 0.7 : 0.9), (S.bv || 0.2) * v, tr.lp, 0.01, 0.06);
    }
    ev = S.leadC[bar % S.leadC.length][i];
    if (ev) {
      var d = ev.len * sd * 0.95, f = mtof(S.root + (S.oct == null ? 12 : S.oct) + ev.n),
          o = ctx.createOscillator(), g = ctx.createGain();
      if (S.lv === 'pluck') { /* marimba / steel-drum-ish */
        osc('triangle', f, 0, t, Math.min(0.4, d + 0.12), 0.1 * v, tr.lead);
        osc('sine', f * 4, 0, t, 0.06, 0.035 * v, tr.lead);
      } else if (S.lv === 'vib') { /* vibraphone-ish */
        osc('sine', f, 0, t, Math.min(1.4, d * 1.3 + 0.3), 0.1 * v, tr.lead, 0.01);
        osc('sine', f * 4, 0, t, 0.15, 0.025 * v, tr.lead);
      } else {
        o.type = 'square'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.045 * v, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.028 * v, t + d * 0.55);
        g.gain.linearRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(tr.lead); o.start(t); o.stop(t + d + 0.02);
      }
    }
    if (S.arpC && (ev = S.arpC[i])) {
      k = ev.n | 0;
      m = fold(S.root + ch[0], 48) + 12 + iv[k % iv.length] + (k >= iv.length ? 12 : 0);
      osc(S.arpw || 'triangle', mtof(m), 0, t, 0.16, (S.arpv || 0.035) * v, tr.pad);
    }
    if (dr) {
      var c;
      c = dr.k.charAt(i);
      if (c !== '.') {
        osc('sine', 125, 42, t, 0.14, 0.33 * v, tr.lp);
        tr.pad.gain.setValueAtTime(0.55, t); /* sidechain-ish duck */
        tr.pad.gain.linearRampToValueAtTime(1, t + 0.2);
      }
      c = dr.s.charAt(i);
      if (c !== '.') {
        noise(t, 0.11, (c === 'x' ? 0.13 : 0.05) * v, 'bandpass', 1900, 0, 0.8, tr.lp);
        osc('triangle', 200, 130, t, 0.06, 0.06 * v, tr.lp);
      }
      c = dr.h.charAt(i);
      if (c !== '.') noise(t, 0.035, (c === 'x' ? 0.045 : 0.02) * v, 'highpass', 7000, 0, 0.7, tr.lp);
    }
  }

  function tick() {
    if (!ready() || ctx.state !== 'running') return;
    var now = ctx.currentTime, until = now + 0.22, n, tr;
    for (n = 0; n < tracks.length; n++) {
      tr = tracks[n];
      if (tr.next < now) tr.next = now + 0.04;
      while (tr.next < until) {
        var idx = tr.step % tr.total, bar = idx >> 4, i = idx & 15;
        playStep(tr, bar, i, tr.next + ((i & 1) ? tr.s.swing * tr.s.sd : 0));
        tr.next += tr.s.sd; tr.step++;
      }
    }
  }
  function ensureTimer() {
    if (!timer && tracks.length) timer = setInterval(tick, 40);
    if (timer && !tracks.length) { clearInterval(timer); timer = null; }
  }
  function fadeOut(tr, sec) {
    var t = ctx.currentTime;
    try {
      tr.gain.gain.cancelScheduledValues(t);
      tr.gain.gain.setValueAtTime(tr.gain.gain.value, t);
      tr.gain.gain.linearRampToValueAtTime(0.0001, t + sec);
    } catch (e) {}
    tr.dead = true;
    setTimeout(function () {
      var ix = tracks.indexOf(tr);
      if (ix >= 0) tracks.splice(ix, 1);
      try { tr.gain.disconnect(); } catch (e) {}
      if (tr.src) for (var q = 0; q < tr.src.length; q++) try { tr.src[q].stop(); } catch (e) {}
      ensureTimer();
    }, sec * 1000 + 150);
  }
  function startMusic(id) {
    if (id === curId) return;
    var old = curTrack;
    curTrack = null; curId = id;
    if (old) fadeOut(old, 1.0);
    if (id === null) return;
    var tr = makeTrack(id), t = ctx.currentTime;
    tr.gain.gain.setValueAtTime(0.0001, t);
    tr.gain.gain.linearRampToValueAtTime(1, t + (old ? 1.0 : 0.4));
    tracks.push(tr); curTrack = tr;
    ensureTimer(); tick();
  }

  /* ------------------------------ SFX ------------------------------ */
  var SFX = {
    tap: function (t) { osc('square', 880, 0, t, 0.04, 0.1); },
    select: function (t) { seq('square', [[76, 0], [83, 0.055]], t, 0.09, 0.07); },
    confirm: function (t) { seq('square', [[72, 0], [76, 0.06], [79, 0.12], [84, 0.18]], t, 0.09, 0.09); },
    back: function (t) { seq('square', [[79, 0], [72, 0.07]], t, 0.09, 0.09); },
    dialog_open: function (t) {
      osc('sine', 400, 900, t, 0.09, 0.2);
      osc('triangle', 1200, 0, t + 0.07, 0.08, 0.1);
    },
    honk: function (t) {
      for (var i = 0; i < 2; i++) {
        var s = t + i * 0.2;
        osc('square', 392, 0, s, 0.14, 0.07); osc('square', 494, 0, s, 0.14, 0.07);
        osc('sawtooth', 196, 0, s, 0.14, 0.05);
      }
    },
    engine_start: function (t) {
      var p = 0, gap = 0.16, i;
      for (i = 0; i < 7; i++) {
        osc('sawtooth', 62 + i * 5, 0, t + p, 0.09, 0.14);
        noise(t + p, 0.05, 0.04, 'lowpass', 400, 0, 1);
        p += gap; gap *= 0.84;
      }
      swell('sawtooth', 45, 90, t + p, 0.6, 0.1, sfxBus, 0.3);
    },
    engine_loop_start: function () {
      if (engine) return;
      var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(),
          l = ctx.createOscillator(), lg = ctx.createGain(), t = ctx.currentTime;
      o.type = 'sawtooth'; o.frequency.value = 46;
      f.type = 'lowpass'; f.frequency.value = 240;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + 0.3);
      l.type = 'square'; l.frequency.value = 10; lg.gain.value = 0.025;
      l.connect(lg); lg.connect(g.gain);
      o.connect(f); f.connect(g); g.connect(sfxBus);
      o.start(t); l.start(t);
      engine = { o: o, l: l, g: g };
    },
    engine_loop_stop: function () {
      if (!engine) return;
      var e = engine, t = ctx.currentTime;
      engine = null;
      try {
        e.g.gain.cancelScheduledValues(t);
        e.g.gain.setValueAtTime(e.g.gain.value, t);
        e.g.gain.linearRampToValueAtTime(0.0001, t + 0.25);
        e.o.stop(t + 0.3); e.l.stop(t + 0.3);
      } catch (x) {}
    },
    door: function (t) {
      noise(t, 0.05, 0.16, 'bandpass', 1500, 0, 1);
      osc('sine', 150, 55, t + 0.04, 0.12, 0.3);
      noise(t + 0.04, 0.1, 0.12, 'lowpass', 500, 0, 1);
    },
    pickup: function (t) { seq('square', [[79, 0], [84, 0.06], [91, 0.12]], t, 0.08, 0.1); },
    bump: function (t) {
      osc('sine', 160, 50, t, 0.14, 0.35);
      noise(t, 0.06, 0.1, 'lowpass', 700, 0, 1);
    },
    coin: function (t) {
      osc('square', mtof(83), 0, t, 0.06, 0.09);
      osc('square', mtof(88), 0, t + 0.07, 0.3, 0.09);
    },
    bag_drop: function (t) {
      osc('sine', 110, 45, t, 0.16, 0.38); noise(t, 0.09, 0.15, 'lowpass', 600, 0, 1);
      osc('sine', 90, 50, t + 0.17, 0.1, 0.18); noise(t + 0.17, 0.05, 0.06, 'lowpass', 500, 0, 1);
    },
    stamp: function (t) {
      noise(t, 0.04, 0.14, 'bandpass', 2500, 0, 1);
      osc('sine', 140, 60, t + 0.03, 0.12, 0.38);
      noise(t + 0.03, 0.08, 0.1, 'lowpass', 500, 0, 1);
    },
    boarding_chime: function (t) {
      var n = [[79, 0], [72, 0.3], [76, 0.6]], i;
      for (i = 0; i < n.length; i++) {
        osc('sine', mtof(n[i][0]), 0, t + n[i][1], 0.55, 0.2);
        osc('sine', mtof(n[i][0] + 12), 0, t + n[i][1], 0.3, 0.05);
      }
    },
    plane_takeoff: function (t) {
      swell('sawtooth', 70, 260, t, 2.6, 0.08, sfxBus, 0.7);
      noise(t, 2.6, 0.14, 'bandpass', 250, 2600, 0.9);
      osc('square', 55, 0, t, 0.3, 0.05);
    },
    plane_land: function (t) {
      swell('sawtooth', 220, 65, t, 2.2, 0.07, sfxBus, 0.3);
      noise(t, 2.2, 0.12, 'bandpass', 2200, 300, 0.9);
      osc('sine', 120, 45, t + 2.1, 0.15, 0.3);
      noise(t + 2.1, 0.12, 0.1, 'lowpass', 600, 0, 1);
      seq('square', [[72, 2.35], [79, 2.45]], t, 0.07, 0.15);
    },
    ding: function (t) {
      osc('sine', 1318, 0, t, 0.7, 0.22);
      osc('sine', 2637, 0, t, 0.35, 0.06);
    },
    pour: function (t) {
      noise(t, 0.9, 0.1, 'bandpass', 700, 2200, 2);
      for (var i = 0; i < 5; i++) {
        var f = 500 + Math.random() * 500;
        osc('sine', f, f * 1.7, t + 0.08 + i * 0.16, 0.05, 0.06);
      }
    },
    sip: function (t) {
      osc('sine', 520, 280, t, 0.09, 0.2);
      osc('sine', 480, 260, t + 0.13, 0.09, 0.18);
      noise(t + 0.3, 0.12, 0.03, 'bandpass', 1500, 600, 1);
      osc('triangle', 600, 700, t + 0.32, 0.12, 0.06);
    },
    cheer: function (t) {
      swell('sine', 100, 100, t, 1.0, 0.0001, sfxBus, 0.5);
      noise(t, 1.0, 0.07, 'bandpass', 1600, 2100, 1.5);
      noise(t + 0.25, 0.7, 0.05, 'bandpass', 2400, 1800, 1.5);
      seq('square', [[72, 0], [76, 0.07], [79, 0.14], [84, 0.21], [88, 0.28], [91, 0.35]], t, 0.06, 0.1);
    },
    fanfare: function (t) {
      var n = [[67, 0], [72, 0.11], [76, 0.22], [79, 0.33]], i;
      seq('square', n, t, 0.08, 0.1);
      osc('square', mtof(84), 0, t + 0.5, 0.3, 0.08);
      osc('square', mtof(79), 0, t + 0.8, 0.12, 0.07);
      osc('square', mtof(81), 0, t + 0.93, 0.12, 0.07);
      var c = [72, 76, 79, 84];
      for (i = 0; i < c.length; i++) {
        osc('square', mtof(c[i]), 0, t + 1.08, 0.9, 0.05);
        osc('triangle', mtof(c[i] - 12), 0, t + 1.08, 0.9, 0.08);
      }
    },
    key_jingle: function (t) {
      var n = [96, 100, 93, 103, 98, 101, 105], i;
      for (i = 0; i < n.length; i++) osc('triangle', mtof(n[i]), 0, t + i * 0.035, 0.1, 0.05);
      noise(t, 0.2, 0.04, 'highpass', 6000, 0, 0.7);
    },
    car_unlock: function (t) {
      osc('sine', 200, 90, t, 0.1, 0.3);
      osc('square', 1760, 0, t + 0.04, 0.06, 0.07);
      osc('square', 1760, 0, t + 0.15, 0.06, 0.07);
    },
    car_door: function (t) {
      osc('sine', 100, 38, t, 0.22, 0.42);
      noise(t, 0.16, 0.18, 'lowpass', 350, 0, 1);
      noise(t + 0.09, 0.03, 0.1, 'bandpass', 2600, 0, 1.5);
    },
    car_start: function (t) {
      var i;
      for (i = 0; i < 5; i++) {
        osc('square', 68, 0, t + i * 0.1, 0.07, 0.1);
        noise(t + i * 0.1, 0.04, 0.03, 'lowpass', 350, 0, 1);
      }
      swell('sawtooth', 50, 150, t + 0.5, 0.6, 0.11, sfxBus, 0.25);
      osc('sawtooth', 46, 0, t + 1.1, 0.25, 0.08);
    },
    splash: function (t) {
      noise(t, 0.5, 0.2, 'bandpass', 1400, 400, 0.8);
      noise(t, 0.25, 0.1, 'highpass', 3500, 1000, 0.7);
      osc('sine', 300, 700, t + 0.1, 0.06, 0.08); osc('sine', 450, 900, t + 0.2, 0.06, 0.07);
    },
    cannonball: function (t) {
      osc('sine', 1200, 260, t, 0.45, 0.14);
      noise(t + 0.5, 0.9, 0.3, 'lowpass', 2200, 250, 0.8);
      noise(t + 0.5, 0.4, 0.14, 'highpass', 3000, 900, 0.7);
      osc('sine', 90, 38, t + 0.5, 0.3, 0.4);
      osc('sine', 350, 800, t + 0.8, 0.07, 0.07); osc('sine', 500, 1000, t + 0.95, 0.07, 0.06);
    },
    water_loop_start: function () {
      if (water) return;
      var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(),
          l = ctx.createOscillator(), lg = ctx.createGain(), t = ctx.currentTime;
      s.buffer = noiseBuf; s.loop = true;
      f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.8;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.5);
      l.frequency.value = 0.35; lg.gain.value = 0.02;
      l.connect(lg); lg.connect(g.gain);
      s.connect(f); f.connect(g); g.connect(sfxBus);
      s.start(t); l.start(t);
      water = { s: s, l: l, g: g };
    },
    water_loop_stop: function () {
      if (!water) return;
      var e = water, t = ctx.currentTime;
      water = null;
      try {
        e.g.gain.cancelScheduledValues(t);
        e.g.gain.setValueAtTime(e.g.gain.value, t);
        e.g.gain.linearRampToValueAtTime(0.0001, t + 0.4);
        e.s.stop(t + 0.45); e.l.stop(t + 0.45);
      } catch (x) {}
    },
    goat: function (t) { /* "meeeh": vibrato saw through a formant bandpass */
      var o = ctx.createOscillator(), l = ctx.createOscillator(), lg = ctx.createGain(),
          f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(330, t);
      o.frequency.linearRampToValueAtTime(440, t + 0.12);
      o.frequency.linearRampToValueAtTime(300, t + 0.7);
      l.frequency.value = 26; lg.gain.value = 28;
      l.connect(lg); lg.connect(o.frequency);
      f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 2.5;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.06);
      g.gain.setValueAtTime(0.2, t + 0.45);
      g.gain.linearRampToValueAtTime(0.0001, t + 0.72);
      o.connect(f); f.connect(g); g.connect(sfxBus);
      o.start(t); l.start(t); o.stop(t + 0.75); l.stop(t + 0.75);
    },
    cicada_burst: function (t) {
      var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), tg = ctx.createGain(),
          l = ctx.createOscillator(), lg = ctx.createGain(), e = ctx.createGain();
      s.buffer = noiseBuf; s.loop = true;
      f.type = 'bandpass'; f.frequency.value = 5200; f.Q.value = 9;
      tg.gain.value = 0.04; l.type = 'sawtooth'; l.frequency.value = 38; lg.gain.value = 0.04;
      l.connect(lg); lg.connect(tg.gain);
      e.gain.setValueAtTime(0.0001, t);
      e.gain.linearRampToValueAtTime(1, t + 0.5);
      e.gain.setValueAtTime(1, t + 1.0);
      e.gain.linearRampToValueAtTime(0.0001, t + 1.15);
      s.connect(f); f.connect(tg); tg.connect(e); e.connect(sfxBus);
      s.start(t, Math.random() * 0.3, 1.2); l.start(t); l.stop(t + 1.2);
    },
    step: function (t) {
      stepFlip ^= 1;
      noise(t, 0.03, 0.07, 'bandpass', stepFlip ? 900 : 1200, 0, 1.2);
      osc('sine', stepFlip ? 120 : 140, 70, t, 0.04, 0.05);
    }
  };

  /* ------------------------------ SPEAK ------------------------------ */
  function speakPlan(voiceId, text) { /* -> {events:[[tOffsetSec, pitchSemis, loud]], dur} */
    var P = VOICES[voiceId] || VOICES.narrator, s = String(text == null ? '' : text),
        t = 0, letters = 0, ev = [], i, c, run = [], per = P.ms / 1000, seed = 0;
    function endPhrase(mark) {
      var n = run.length, j, up = 0;
      for (j = 0; j < n; j++) {
        var arch = Math.sin(Math.PI * (j + 0.5) / n) * 1.8;
        if (mark === '?' && j >= n - 3) up = (j - (n - 4)) * 1.8;
        else if (mark === '!') up = 1.5;
        else up = 0;
        if (mark === '.' && j >= n - 2) up = -(j - (n - 3)) * 1.2;
        run[j].p = run[j].p * P.sp + arch + up;
        run[j].l = mark === '!' ? 1.25 : 1;
        ev.push(run[j]);
      }
      run = [];
    }
    for (i = 0; i < s.length && ev.length + run.length < 400; i++) {
      c = s.charAt(i);
      if (/[A-Za-z0-9À-ɏ]/.test(c)) {
        letters++; seed = (seed * 7 + c.charCodeAt(0)) | 0;
        if (letters % 2 === 1) {
          run.push({ t: t, p: PENTA[Math.abs(seed + letters) % 5] + (/[AEIOUYaeiouyäö]/.test(c) ? 0 : -2), l: 1 });
          t += per;
        }
      } else if (c === ' ') { t += per * 0.25; }
      else if (c === '.' || c === '!' || c === '?') { endPhrase(c); t += per * 3.2; }
      else if (c === ',' || c === ';' || c === ':' || c === '-' || c === '–') { endPhrase(','); t += per * 1.7; }
      else { t += per * 0.2; }
    }
    endPhrase(',');
    return { P: P, ev: ev, dur: Math.max(t, 0) };
  }
  function playSpeak(plan) {
    if (speakNode) {
      var old = speakNode, now = ctx.currentTime;
      try { old.gain.cancelScheduledValues(now); old.gain.setTargetAtTime(0, now, 0.01); } catch (e) {}
      setTimeout(function () { try { old.disconnect(); } catch (e) {} }, 100);
    }
    var P = plan.P, bus = ctx.createGain(), lp = ctx.createBiquadFilter(), t0 = ctx.currentTime + 0.03, k;
    bus.gain.value = 1; lp.type = 'lowpass'; lp.frequency.value = P.lp; lp.Q.value = 0.7;
    lp.connect(bus); bus.connect(voiceBus);
    speakNode = bus;
    for (k = 0; k < plan.ev.length; k++) {
      var e = plan.ev[k], f = P.f * Math.pow(2, e.p / 12), t = t0 + e.t, d = 0.055,
          o = ctx.createOscillator(), g = ctx.createGain();
      o.type = P.w;
      o.frequency.setValueAtTime(f, t);
      o.frequency.linearRampToValueAtTime(f * (1 + P.g + (P.gravel ? (Math.random() - 0.5) * 0.08 : 0)), t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(P.v * e.l, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.02);
      o.connect(g); g.connect(lp);
      o.start(t); o.stop(t + d + 0.04);
      if (P.gravel) { /* growl: low square an octave down, tiny */
        var o2 = ctx.createOscillator(), g2 = ctx.createGain();
        o2.type = 'square'; o2.frequency.setValueAtTime(f * 0.5, t);
        g2.gain.setValueAtTime(0.0001, t); g2.gain.linearRampToValueAtTime(P.v * 0.35, t + 0.006);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o2.connect(g2); g2.connect(lp); o2.start(t); o2.stop(t + d + 0.03);
      }
    }
    setTimeout(function () { if (speakNode === bus) speakNode = null; try { bus.disconnect(); } catch (e) {} },
      plan.dur * 1000 + 400);
  }

  /* ------------------------------ PUBLIC ------------------------------ */
  function safe(fn) { try { return fn(); } catch (e) { return undefined; } }

  var GameAudio = {
    unlock: function () {
      safe(function () {
        build();
        if (!ctx) return;
        if (ctx.state !== 'running' && ctx.resume) ctx.resume();
        if (wantScene !== null && curId === null) { var w = wantScene; wantScene = null; startMusic(w); }
      });
    },
    music: function (id) {
      safe(function () {
        if (id !== null && id !== undefined && !SCENES[id]) return;
        id = (id === undefined) ? null : id;
        wantScene = id;
        if (!ready()) return;
        startMusic(id);
      });
    },
    sfx: function (name) {
      safe(function () {
        if (!ready() || !SFX[name]) return;
        if (name === 'step') { var n = ctx.currentTime; if (n - lastStep < 0.07) return; lastStep = n; }
        SFX[name](ctx.currentTime + 0.01);
      });
    },
    speak: function (voiceId, text) {
      var plan = speakPlan(voiceId, text);
      safe(function () { if (ready() && !muted && plan.ev.length) playSpeak(plan); });
      return Math.round(plan.dur * 1000);
    },
    setMuted: function (b) {
      muted = !!b;
      safe(function () {
        if (master) {
          var t = ctx.currentTime;
          master.gain.cancelScheduledValues(t);
          master.gain.setTargetAtTime(muted ? 0 : 0.85, t, 0.03);
        }
      });
    },
    isMuted: function () { return muted; }
  };
  G.GameAudio = GameAudio;

  /* resume after tab switch / OS interruptions */
  safe(function () {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', function () {
      if (!ctx) return;
      if (document.hidden) { if (ctx.suspend) ctx.suspend(); }
      else if (ctx.resume) ctx.resume();
    });
    var kick = function () { if (ctx && ctx.state !== 'running' && ctx.resume && !document.hidden) ctx.resume(); };
    document.addEventListener('touchend', kick, { passive: true });
    document.addEventListener('click', kick, true);
  });
})(typeof window !== 'undefined' ? window : this);
