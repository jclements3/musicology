/* harp.js — 33-string lever-harp Roman-numeral drill.
 *
 * Renders the harp's 33 diatonic strings (C = red, F = blue, others black) plus
 * the pedal/lever positions for the current key, lights up the 3-4 strings of a
 * randomly chosen shape-chord, and asks the player to name the Roman numeral.
 *
 * The shape/hex/Roman model is the project's shape-chord system
 * (see shape-chords-keys-generator.py). The Roman numeral is key-independent;
 * the key only decides which concrete strings light up + the pedal positions.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const SVGNS = 'http://www.w3.org/2000/svg';

  // ---------------- music model ----------------
  const LO = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const LIDX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const DIGIT_STEPS = { '2': 1, '3': 2, '4': 3 };

  // Major-scale spellings for the eight harp keys (degrees 1-7).
  const KEYS = {
    C:  ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    G:  ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
    D:  ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
    A:  ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
    E:  ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
    F:  ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
    Bb: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
    Eb: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
  };
  const KEY_ORDER = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb'];

  const TRI = ['', 'm', 'm', '', '', 'm', '°'];
  const SEV = ['Δ', 'm7', 'm7', 'Δ', '7', 'm7', 'ø7'];

  // shape -> {kind, off, q}  (matches shape-chords-keys-generator.py)
  const META = {
    '33':  { kind: 'tri', off: 0 }, '34': { kind: 'tri', off: 2 }, '43': { kind: 'tri', off: 4 },
    '44':  { kind: 'quartal', off: 0, q: 'q' },
    '333': { kind: 'sev', off: 0 }, '332': { kind: 'sev', off: 2 },
    '323': { kind: 'sev', off: 4 }, '233': { kind: 'sev', off: 6 },
    '444': { kind: 'quartal', off: 0, q: 'q4' },
  };
  const HEX = {
    '33': '531', '34': '853', '43': 'A85', '44': '741',
    '333': '7531', '332': '8753', '323': 'A875', '233': 'CA87', '444': 'A741',
  };
  const ROMAN = {
    '33':  ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
    '34':  ['vi⁶', 'vii°⁶', 'I⁶', 'ii⁶', 'iii⁶', 'IV⁶', 'V⁶'],
    '43':  ['IV⁶⁄₄', 'V⁶⁄₄', 'vi⁶⁄₄', 'vii°⁶⁄₄', 'I⁶⁄₄', 'ii⁶⁄₄', 'iii⁶⁄₄'],
    '44':  ['Iq', 'iiq', 'iiiq', 'IVq', 'Vq', 'viq', 'viiq'],
    '333': ['IΔ', 'ii⁷', 'iii⁷', 'IVΔ', 'V⁷', 'vi⁷', 'viiø⁷'],
    '332': ['vi⁶⁄₅', 'viiø⁶⁄₅', 'IΔ⁶⁄₅', 'ii⁶⁄₅', 'iii⁶⁄₅', 'IVΔ⁶⁄₅', 'V⁶⁄₅'],
    '323': ['IVΔ⁴⁄₃', 'V⁴⁄₃', 'vi⁴⁄₃', 'viiø⁴⁄₃', 'IΔ⁴⁄₃', 'ii⁴⁄₃', 'iii⁴⁄₃'],
    '233': ['ii⁴⁄₂', 'iii⁴⁄₂', 'IVΔ⁴⁄₂', 'V⁴⁄₂', 'vi⁴⁄₂', 'viiø⁴⁄₂', 'IΔ⁴⁄₂'],
    '444': ['Iq4', 'iiq4', 'iiiq4', 'IVq4', 'Vq4', 'viq4', 'viiq4'],
  };
  const SHAPE_GROUPS = {
    triads: ['33', '34', '43'],
    sevenths: ['333', '332', '323', '233'],
    quartal: ['44', '444'],
  };

  // Movable-do solfa, two-letter, indexed by scale degree (0..6).
  const SOLFA = ['Do', 'Re', 'Mi', 'Fa', 'So', 'La', 'Ti'];
  // r_s figured-bass ratio per shape (quartals carry q/q4 instead).
  const RATIO = { '33': '', '34': '6', '43': '6/4', '333': '7', '332': '6/5',
    '323': '4/3', '233': '4/2', '44': 'q', '444': 'q4' };
  // Letter -> number, A..G = 1..7 (the naming-formula convention).
  const LETTER_VAL = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7 };

  // ---------------- strings: C2 .. G6 = 33 diatonic strings ----------------
  const STRINGS = [];
  for (let oct = 2; oct <= 6; oct++) {
    for (let li = 0; li < 7; li++) {
      if (oct === 6 && li > LIDX.G) break;
      STRINGS.push({ letter: LO[li], octave: oct, idx: STRINGS.length });
    }
  }
  const sidxOf = (letter, octave) => (octave - 2) * 7 + LIDX[letter];

  const fix = (s) => s.replace(/##/g, '𝄪').replace(/#/g, '♯').replace(/bb/g, '𝄫').replace(/b/g, '♭');

  function parseScale(name) {
    return KEYS[name].map((tok) => ({ letter: tok[0], acc: tok.slice(1) }));
  }
  function midiOf(n) {
    let pc = PC[n.letter];
    for (const c of n.acc) { if (c === '#') pc++; else if (c === 'b') pc--; }
    return (n.octave + 1) * 12 + pc;
  }
  function shapeSteps(label) {
    const s = [0];
    for (const d of label) s.push(s[s.length - 1] + DIGIT_STEPS[d]);
    return s;
  }

  // The concrete strings (and spelled notes) for a shape on a bass degree.
  function chordStrings(scale, bassDeg, label) {
    const steps = shapeSteps(label);
    for (const baseOct of [3, 4, 2, 5]) {
      const out = [];
      let prevLi = null, oct = baseOct, ok = true;
      for (const s of steps) {
        const deg = (bassDeg + s) % 7;
        const note = scale[deg];
        const li = LIDX[note.letter];
        if (prevLi !== null && li <= prevLi) oct++;
        prevLi = li;
        const sidx = sidxOf(note.letter, oct);
        if (sidx < 0 || sidx > 32) { ok = false; break; }
        out.push({ letter: note.letter, acc: note.acc, octave: oct, sidx });
      }
      if (ok) return out;
    }
    return null;
  }

  function concreteName(scale, bassDeg, label) {
    const m = META[label];
    if (m.kind === 'quartal') return fix(scale[bassDeg].letter + scale[bassDeg].acc) + m.q;
    const rd = ((bassDeg - m.off) % 7 + 7) % 7;
    const root = fix(scale[rd].letter + scale[rd].acc);
    const name = root + (m.kind === 'sev' ? SEV : TRI)[rd];
    return m.off === 0 ? name : name + '/' + fix(scale[bassDeg].letter + scale[bassDeg].acc);
  }

  // Long-winded spoken chord name, matching web/CHORD-GLOSSARY.md. Built from the
  // chord's ROOT degree (bass degree minus the shape's inversion offset), its
  // quality, and its inversion -- so it reads exactly like the glossary entry.
  const CARD = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'];
  const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];
  const FUNC = ['tonic', 'supertonic', 'mediant', 'subdominant', 'dominant', 'submediant', 'leading tone'];
  const TRIQ = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];
  const SEVQ = ['major seventh', 'minor seventh', 'minor seventh', 'major seventh',
    'dominant seventh', 'minor seventh', 'half-diminished seventh'];
  // [position word, bass chord-tone, figured-bass nickname] for the inverted shapes
  const INV = {
    '34': ['first', 'third', 'six'], '43': ['second', 'fifth', 'six-four'],
    '332': ['first', 'third', 'six-five'], '323': ['second', 'fifth', 'four-three'],
    '233': ['third', 'seventh', 'four-two'],
  };
  function spokenName(shape, bassDeg) {
    const m = META[shape];
    const rootDeg = ((bassDeg - m.off) % 7 + 7) % 7;
    const num = CARD[rootDeg], ord = ORD[rootDeg], fn = FUNC[rootDeg];
    if (m.kind === 'quartal') {
      return shape === '44'
        ? 'the ' + num + ' quartal chord, a quartal triad (a stack of two perfect fourths) rooted on the ' + ord + ' scale degree (the ' + fn + ').'
        : 'the ' + num + ' quartal seventh, a quartal seventh chord (a stack of three perfect fourths) rooted on the ' + ord + ' scale degree (the ' + fn + ').';
    }
    const isSev = m.kind === 'sev';
    const qual = isSev ? SEVQ[rootDeg] : TRIQ[rootDeg];
    const noun = isSev ? ' chord' : ' triad';
    if (m.off === 0) {   // root position
      return isSev
        ? 'the ' + num + ' chord, a root-position ' + qual + ' chord built on the ' + ord + ' scale degree (the ' + fn + '); this is the seven chord.'
        : 'the ' + num + ' chord, a root-position ' + qual + ' triad built on the ' + ord + ' scale degree (the ' + fn + ').';
    }
    const iv = INV[shape];   // an inversion
    return 'the ' + num + ' chord in ' + iv[0] + ' inversion, a ' + qual + noun +
      ' built on the ' + ord + ' scale degree (the ' + fn + '), with its ' + iv[1] +
      ' in the bass; this is the ' + iv[2] + ' chord.';
  }

  const ALL_ROMANS = (() => {
    const set = new Set();
    Object.values(ROMAN).forEach((row) => row.forEach((r) => set.add(r)));
    return [...set];
  })();

  // Render a Roman label with its figured bass STACKED (6 over 4), converting the
  // unicode super/subscript figures in ROMAN[] into <span class="fig"> markup.
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
  const SUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
  function romanHTML(label) {
    let prefix = '', top = '', bot = '';
    for (const ch of label) {
      if (SUP[ch] !== undefined) top += SUP[ch];
      else if (SUB[ch] !== undefined) bot += SUB[ch];
      else if (ch === '⁄') { /* fraction slash: just a separator */ }
      else prefix += ch;
    }
    // Bold only the Roman-numeral letters; the qualifiers that follow them
    // (° dim, Δ maj7, ø half-dim, q/q4 quartal) and the figured bass stay
    // regular weight. The numeral is always the leading I/V/i/v run.
    const m = prefix.match(/^[IiVv]+/);
    const numeral = m ? m[0] : '';
    const head = (numeral ? '<b class="num">' + numeral + '</b>' : '') + prefix.slice(numeral.length);
    if (!top && !bot) return head;
    const fig = '<span class="fig">' + (top ? '<span>' + top + '</span>' : '') +
      (bot ? '<span>' + bot + '</span>' : '') + '</span>';
    return head + fig;
  }

  // ---------------- progress / metrics ----------------
  const STORE = 'rnt_harp_v1';
  const blank = () => ({ answered: 0, correct: 0, score: 0, xp: 0, bestStreak: 0, mastery: {}, cells: {}, unlocked: 2, tick: 0, updated: 0 });
  let progress = load();
  function load() {
    try { const r = localStorage.getItem(STORE); if (r) return Object.assign(blank(), JSON.parse(r)); } catch (e) {}
    return blank();
  }
  function save() {
    progress.updated = Date.now();
    try { localStorage.setItem(STORE, JSON.stringify(progress)); } catch (e) {}
    try {
      fetch('/api/progress?ns=harp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(progress),
      }).catch(() => {});
    } catch (e) {}
  }
  const levelFor = (xp) => 1 + Math.floor(xp / 200);

  // ---------------- state ----------------
  const session = { streak: 0, t0: 0 };
  // All tunable training knobs live here; the gear-icon Settings panel edits
  // them and they persist to localStorage. Defaults reproduce the original
  // hard-coded behaviour exactly, so nothing changes until the user moves a
  // control. The five topbar checkboxes (triads/7ths/quartal/names/sound) and
  // the key selector write into this same object.
  const SET_STORE = 'rnt_harp_settings_v1';
  const SETTINGS_DEFAULTS = {
    key: 'random', triads: true, sevenths: true, quartal: true, names: true, sound: true,
    // pacing & feedback
    delayCorrect: 950,      // ms to hold a correct answer before advancing
    delayWrong: 3200,       // ms floor to hold a wrong answer (extended for the sung cue)
    autoHint: true,         // auto-open the hint panel on a wrong answer
    // curriculum (Koch unlocking)
    curriculum: true,       // false = free play, every chord unlocked
    unlockAcc: 0.90,        // combined accuracy across the active set needed to unlock
    unlockMin: 10,          // min attempts per active cell before a new one unlocks
    // spaced repetition weighting
    weakBias: 4,            // accuracy term multiplier (0 = ignore weakness)
    staleBias: 1.5,         // staleness term multiplier (0 = ignore staleness)
    newBias: 6,             // selection weight of a freshly-unlocked / never-tried cell
    noRepeat: true,         // forbid the same chord twice in a row
    // display & hints
    staff: true,            // show the left-strip notation staff
    hintReps: 10,           // correct answers for a shape until its scaffold hint fades (0 = always on)
  };
  const settings = Object.assign({}, SETTINGS_DEFAULTS);
  function loadSettings() {
    try { const r = localStorage.getItem(SET_STORE); if (r) Object.assign(settings, JSON.parse(r)); } catch (e) {}
  }
  function saveSettings() {
    try { localStorage.setItem(SET_STORE, JSON.stringify(settings)); } catch (e) {}
  }
  loadSettings();
  let current = null;

  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function enabledShapes() {
    let s = [];
    if (settings.triads) s = s.concat(SHAPE_GROUPS.triads);
    if (settings.sevenths) s = s.concat(SHAPE_GROUPS.sevenths);
    if (settings.quartal) s = s.concat(SHAPE_GROUPS.quartal);
    return s.length ? s : SHAPE_GROUPS.triads;
  }

  // ---- Koch-style progression: gray out all but the unlocked SOLFA CHORDS -----
  // The learnable unit is a movable-do solfa SEQUENCE, i.e. a single (shape,degree)
  // CELL of the matrix -- e.g. (33,0) is "Do-Mi-So" in every key, (33,1) is
  // "Re-Fa-La". The emphasis is the solfa sequence, not the shape. The learner
  // starts with just TWO dissimilar, simple sequences (I = Do-Mi-So major, ii =
  // Re-Fa-La minor) and earns the rest one at a time. Locked cells are grayed and
  // never quizzed. Drill stays at full tempo -- only the *set of sequences* widens
  // (Koch), never the chord speed.
  //
  // INTERLEAVED, GENTLE RAMP unlock order. Within each inversion tier the triad
  // family and the 7th family are WOVEN together (two triads lead, then triad/7th
  // alternate) so neighbours contrast in note-count + quality and a 7th shows up
  // early. Tiers run root -> 1st-inv -> 2nd-inv, then the hardest tier round-robins
  // the 3rd-inversion 7ths (233, which has no triad partner) with the quartals
  // (44/444, the most foreign sound). No shape ever repeats more than twice in a
  // row. DT/D7 are the per-family degree orders (offset so a triad and its own 7th
  // never land adjacent); WEAVE is the 14-slot triad/7th pattern per tier.
  const DT = [0, 1, 6, 3, 4, 5, 2];   // triad-family degree order
  const D7 = [4, 5, 0, 1, 6, 3, 2];   // 7th-family degree order (offset from DT)
  const WEAVE = ['T', 'T', 'S', 'T', 'S', 'T', 'S', 'T', 'S', 'T', 'S', 'T', 'S', 'S'];
  function weaveTier(triadShape, sevShape) {
    const out = []; let ti = 0, si = 0;
    WEAVE.forEach((slot) => out.push(slot === 'T' ? [triadShape, DT[ti++]] : [sevShape, D7[si++]]));
    return out;
  }
  function roundRobin(...streams) {
    const out = [], m = Math.max(...streams.map((s) => s.length));
    for (let i = 0; i < m; i++) streams.forEach((s) => { if (i < s.length) out.push(s[i]); });
    return out;
  }
  const SOLFA_CURRICULUM = [            // [ [shape,deg], ... ] in unlock order
    ...weaveTier('33', '333'),          // root position: triads + root 7ths
    ...weaveTier('34', '332'),          // 1st inversion
    ...weaveTier('43', '323'),          // 2nd inversion
    ...roundRobin(D7.map((d) => ['233', d]), DT.map((d) => ['44', d]), D7.map((d) => ['444', d])),
  ];                                    // hardest tier: 3rd-inv 7ths woven with quartals
  const cellKey = (shape, deg) => shape + ':' + deg;
  // the movable-do solfa sequence (bottom->top) for a (shape,degree) cell
  function solfaSeqOf(shape, bassDeg) {
    return shapeSteps(shape).map((off) => SOLFA[(bassDeg + off) % 7]).join('-');
  }
  function activeCells() {
    if (!settings.curriculum) return SOLFA_CURRICULUM;   // free play: everything unlocked
    const n = Math.max(2, Math.min(SOLFA_CURRICULUM.length, progress.unlocked || 2));
    return SOLFA_CURRICULUM.slice(0, n);
  }
  const isActiveCell = (shape, deg) => activeCells().some((c) => c[0] === shape && c[1] === deg);
  // cells actually quizzed = unlocked set narrowed by the group checkboxes
  // (falls back to the full unlocked set if the checkboxes would empty it).
  function quizCells() {
    const en = enabledShapes();
    const inter = activeCells().filter((c) => en.includes(c[0]));
    return inter.length ? inter : activeCells();
  }
  // If this answer crossed the proficiency gate, unlock the next solfa chord and
  // return its [shape,deg]; otherwise null. The new cell starts at 0 attempts, so
  // the gate naturally re-arms before the next unlock.
  function checkUnlock() {
    if (!settings.curriculum) return null;               // free play: nothing to unlock
    if ((progress.unlocked || 2) >= SOLFA_CURRICULUM.length) return null;
    let seen = 0, corr = 0;
    for (const [sh, d] of activeCells()) {
      const m = progress.cells[cellKey(sh, d)] || { seen: 0, correct: 0 };
      if (m.seen < settings.unlockMin) return null;
      seen += m.seen; corr += m.correct;
    }
    if (seen && corr / seen >= settings.unlockAcc) {
      progress.unlocked = (progress.unlocked || 2) + 1;
      return SOLFA_CURRICULUM[progress.unlocked - 1];
    }
    return null;
  }

  // Spaced-repetition: bias selection toward WEAK chords (low accuracy), STALE
  // chords (not seen in a while), and freshly-unlocked ones, so practice
  // concentrates where it's needed while mastered chords still recur for review.
  function cellWeight(shape, deg) {
    const m = progress.cells[cellKey(shape, deg)] || { seen: 0, correct: 0, last: 0 };
    if (m.seen === 0) return settings.newBias;   // just unlocked / never tried -> top priority
    // accuracy term: mastered ~1x weight, never-right ~ (1+weakBias)x
    let w = 1 + (1 - m.correct / m.seen) * settings.weakBias;
    // staleness term: how overdue this chord is vs. the average (set-size) interval.
    // overdue 1 = seen about as recently as average; >1 adds up to +3*staleBias.
    const n = activeCells().length;
    const overdue = n ? ((progress.tick || 0) - (m.last || 0)) / n : 0;
    return w + Math.min(Math.max(overdue - 1, 0), 3) * settings.staleBias;
  }
  let lastCellKey = null;                  // so the same chord never repeats back-to-back
  function chooseCell() {
    let cells = quizCells();
    if (settings.noRepeat && cells.length > 1 && lastCellKey) {
      const f = cells.filter((c) => cellKey(c[0], c[1]) !== lastCellKey);
      if (f.length) cells = f;
    }
    const w = cells.map((c) => cellWeight(c[0], c[1]));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < cells.length; i++) { r -= w[i]; if (r <= 0) return cells[i]; }
    return cells[cells.length - 1];
  }

  function newQuestion() {
    const keyName = settings.key === 'random' ? pick(KEY_ORDER) : settings.key;
    const scale = parseScale(keyName);
    let notes = null, shape = null, bassDeg = 0, guard = 0;
    while (!notes && guard++ < 60) {
      const c = chooseCell();   // spaced-repetition weighted pick
      shape = c[0]; bassDeg = c[1];
      notes = chordStrings(scale, bassDeg, shape);
    }
    if (!notes) { shape = '33'; bassDeg = 0; notes = chordStrings(scale, 0, '33'); }
    // mark this chord as just-seen (drives the staleness term + no-repeat guard)
    const ck = cellKey(shape, bassDeg);
    progress.tick = (progress.tick || 0) + 1;
    if (!progress.cells[ck]) progress.cells[ck] = { seen: 0, correct: 0 };
    progress.cells[ck].last = progress.tick;
    lastCellKey = ck;
    const answer = ROMAN[shape][bassDeg];
    current = { keyName, scale, shape, bassDeg, notes, answer, answered: false };
    session.t0 = performance.now();
    drawPedals(scale, keyName);
    drawHarp(notes);
    drawStaff(notes, scale, keyName);
    buildChoices(shape, bassDeg);
    showHint();
    hideHintPanel();        // the on-demand Hint panel dismisses on next exercise
    $('feedback').textContent = '';
    $('feedback').className = 'feedback';
    $('reveal').textContent = '';
    updateHud();
  }

  // Never let a render error freeze the drill: if newQuestion throws while
  // building the next exercise, log it and retry once with a fresh random pick.
  function nextQuestion() {
    try { newQuestion(); }
    catch (e) {
      if (window.console) console.error('newQuestion failed; retrying', e);
      try { newQuestion(); } catch (e2) { if (window.console) console.error('newQuestion retry failed', e2); }
    }
  }

  // Scaffolded hint tied to PER-SHAPE mastery: the more correct answers you've
  // logged for the lit chord's shape, the less the hint gives away — and it
  // disappears once that shape is mastered. Each shape weans off independently,
  // so a tricky inversion keeps its hint while easy shapes lose theirs.
  const SHAPE_KIND = { '33': 'root-position triad', '34': '1st-inversion triad', '43': '2nd-inversion triad',
    '44': 'quartal triad', '333': 'root-position 7th', '332': '1st-inversion 7th',
    '323': '2nd-inversion 7th', '233': '3rd-inversion 7th', '444': 'quartal 7th' };
  // Correct-answer thresholds for this shape, scaled off settings.hintReps
  // (HINT_NONE): below 30% of it the full hint, below 60% medium, then light,
  // then none. hintReps = 0 turns the scaffold off entirely (always blank).
  function showHint() {
    const el = $('hint');
    if (!el) return;   // scaffolded text hint removed -- replaced by the big Hint button
    if (!current) { el.className = ''; el.innerHTML = ''; return; }
    const c = current;
    const HINT_NONE = settings.hintReps;
    const HINT_FULL = Math.max(1, Math.round(HINT_NONE * 0.3));
    const HINT_MED = Math.max(HINT_FULL + 1, Math.round(HINT_NONE * 0.6));
    const m = progress.mastery[c.shape] || { seen: 0, correct: 0 };
    const got = m.correct;
    if (HINT_NONE <= 0 || got >= HINT_NONE) { el.className = ''; el.innerHTML = ''; return; }

    const bassNote = fix(c.scale[c.bassDeg].letter + c.scale[c.bassDeg].acc);
    const bassStr = c.notes[0];
    let html = '';
    if (got < HINT_FULL) {
      // most help: name the shape, the bass, and where the answer lives
      html = '<b>Hint</b> · The lowest lit string is the <b>bass</b>: ' +
        '<span class="k">' + bassNote + bassStr.octave + '</span> ' +
        '(scale degree <b>' + (c.bassDeg + 1) + '</b> in ' + fix(c.keyName) + '). ' +
        '<span class="step">' + c.notes.length + ' strings, shape <b>' + c.shape +
        '</b> = ' + SHAPE_KIND[c.shape] + ' → look in that row, column ' + (c.bassDeg + 1) + '.</span>';
    } else if (got < HINT_MED) {
      // medium: shape kind + bass degree, but you find the cell
      html = '<b>Hint</b> · ' + c.notes.length + '-note ' + SHAPE_KIND[c.shape] +
        '; bass on scale degree <b>' + (c.bassDeg + 1) + '</b> (' +
        '<span class="k">' + bassNote + '</span>).';
    } else {
      // light: just the bass note, the rest is on you
      html = '<b>Hint</b> · Bass note = <span class="k">' + bassNote + '</span>.';
    }
    el.innerHTML = html + ' <span class="step">(' + c.shape + ' mastery ' + got + '/' + HINT_NONE + ')</span>';
    el.className = 'show';
  }

  // ---------------- on-demand HINT panel (formula + solfa + chord + cue) ----
  // Distinct from the scaffolded #hint above: this is the tap-to-reveal Hint
  // button. It SHOWS the naming formula/legend, the key->pedal->shape solfa
  // phrase, and the resolved chord notation, and PLAYS a sung solfa cue.

  // Build the sung cue, voice-led to stay singable: anchor Do in a comfortable
  // middle register, then move to the bass by the SMALLEST interval (the bass is
  // placed in whichever octave is nearest Do -- e.g. from Do=C, step DOWN a 2nd
  // to the near B instead of leaping up a 7th to a high B), and build the shape
  // up from there. The shape's own steps are 2nds/3rds (4ths for quartals), so
  // every move in the cue is a 2nd, 3rd, or 4th. Key signature still applies --
  // only the octaves are chosen for singability.
  function hintCue() {
    const c = current;
    const offs = shapeSteps(c.shape);
    const tonic = c.scale[0];
    // Build the cue with the right RELATIVE pitches: Do, then the bass in the
    // octave nearest Do (small Do->bass step), then the shape up by its own steps.
    const doMidi = midiOf({ letter: tonic.letter, acc: tonic.acc, octave: 4 });
    const origBass = midiOf(c.notes[0]);
    const shift = 12 * Math.round((doMidi - origBass) / 12);
    const seq = [{ midi: doMidi, syllable: 'Do' }];
    c.notes.forEach((nt, i) => {
      const deg = ((c.bassDeg + offs[i]) % 7 + 7) % 7;
      seq.push({ midi: midiOf(nt) + shift, syllable: SOLFA[deg] });
    });
    // Transpose the WHOLE cue (by whole octaves) so it's centred in a comfortable
    // lyric-baritone range. Absolute pitch doesn't matter -- only the relative
    // intervals do -- so this just lands the tune where it's easy to sing along.
    const ms = seq.map((e) => e.midi);
    const centre = (Math.min(...ms) + Math.max(...ms)) / 2;
    const BARITONE_CENTRE = 54;   // ~F#3, middle of a lyric-baritone tessitura
    const octShift = 12 * Math.round((BARITONE_CENTRE - centre) / 12);
    seq.forEach((e) => { e.midi += octShift; });
    return seq;
  }

  let cueTimer = 0;
  function playHintCue() {
    if (!current || !window.Audio2 || !window.Audio2.playSolfa) return;
    const seq = hintCue();
    window.Audio2.playSolfa(seq);
    // brief "playing" glow on the strip for the cue's duration
    const strip = $('hintStrip');
    if (strip) {
      strip.classList.add('playing');
      clearTimeout(cueTimer);
      cueTimer = setTimeout(() => strip.classList.remove('playing'), seq.length * 760 + 200);
    }
  }

  // Reveal the hint in place (the fixed strip swaps the button for two
  // horizontal blocks): the naming FORMULA with this chord's inputs and the
  // arithmetic but the result left as "?", and the DoReMi solfa phrase. It
  // deliberately does NOT show the resolved Roman numeral -- that's the answer
  // the player is here to work out.
  function showHintPanel(play) {
    if (!current) return;
    const c = current;
    const quartal = META[c.shape].kind === 'quartal';
    const offs = shapeSteps(c.shape);

    // --- left block: formula + worked substitution (answer withheld) ---
    let worked, legend;
    if (quartal) {
      worked = 'quartal — no Roman numeral; figured bass = <span class="hp-q">' +
        RATIO[c.shape] + '</span>';
      legend = 'p = pedal (bass) letter, k = key tonic · A–G = 1–7';
    } else {
      const pL = c.scale[c.bassDeg].letter, kL = c.scale[0].letter;
      const p = LETTER_VAL[pL], k = LETTER_VAL[kL], oS = META[c.shape].off;
      const rS = RATIO[c.shape] || '(none)';
      worked = '(' + p + ' − ' + k + ' − ' + oS + ') mod 7 + 1 = <span class="hp-q">?</span>' +
        ' → numeral + r_s(<b>' + rS + '</b>) = <span class="hp-q">?</span>';
      legend = 'p=' + fix(pL) + '(' + p + '), k=' + fix(kL) + '(' + k + '), o_s=' + oS +
        ' · A–G = 1–7';
    }
    $('hpFormula').innerHTML =
      '<code>n = (p − k − o_s) mod 7 + 1</code>' +
      '<div class="hp-worked">' + worked + '</div>' +
      '<div class="hp-legend">' + legend + '</div>';

    // --- right block: key -> pedal -> shape solfa phrase, pedal emphasized ---
    const sylls = offs.map((o) => SOLFA[((c.bassDeg + o) % 7 + 7) % 7]);
    const phrase = 'Do <span class="hp-bar">|</span> ' +
      sylls.map((s, i) => (i === 0 ? '<b class="hp-pedal">' + s + '</b>' : s)).join('');
    $('hpSolfa').innerHTML = '<div class="hp-key">solfa cue</div>' +
      '<div class="hp-phrase">' + phrase + '</div>' +
      '<div class="hp-cap">tonic Do → pedal → shape</div>';

    $('hintStrip').classList.add('revealed');
    if (play !== false) playHintCue();
  }

  function hideHintPanel() {
    const el = $('hintStrip');
    if (el) el.classList.remove('revealed', 'playing');
    if (window.Audio2 && window.Audio2.stopSolfa) window.Audio2.stopSolfa();
  }

  // ---------------- pedal / lever board ----------------
  function drawPedals(scale, keyName) {
    const byLetter = {};
    scale.forEach((n) => { byLetter[n.letter] = n.acc; });
    $('keyLabel').textContent = 'Key of ' + fix(keyName);
    const wrap = $('pedals');
    wrap.innerHTML = '';
    // Concert pedal-harp layout: left foot D C B | right foot E F G A.
    const PEDAL_ORDER = ['D', 'C', 'B', 'E', 'F', 'G', 'A'];
    PEDAL_ORDER.forEach((letter) => {
      // divider between the left-foot (D C B) and right-foot (E F G A) groups
      if (letter === 'E') wrap.appendChild(Object.assign(document.createElement('div'), { className: 'pedalgap' }));
      const acc = byLetter[letter] || '';
      const pos = acc.includes('#') ? 'sharp' : acc.includes('b') ? 'flat' : 'nat';
      const cell = document.createElement('div');
      cell.className = 'pedal' + (letter === 'C' ? ' isC' : letter === 'F' ? ' isF' : '');
      // notch positions match a real pedal harp: flat (top), natural (middle),
      // sharp (bottom) -- top notch lengthens the string, bottom shortens it.
      cell.innerHTML =
        '<div class="slot ' + (pos === 'flat' ? 'on' : '') + '">♭</div>' +
        '<div class="slot ' + (pos === 'nat' ? 'on' : '') + '">♮</div>' +
        '<div class="slot ' + (pos === 'sharp' ? 'on' : '') + '">♯</div>' +
        '<div class="pname">' + letter + '</div>';
      wrap.appendChild(cell);
    });
  }

  // ---------------- left-strip music staff (no clefs) ----------------
  // A grand-staff-range staff spanning C2..G6, drawn WITHOUT treble/bass clefs.
  // The vertical axis is the same diatonic index as the strings (sidx 0 = C2 at
  // the bottom .. 32 = G6 at the top). Even sidx = a line position, odd = a
  // space. The two five-line staves are bass sidx 4..12 and treble sidx 16..24;
  // every other position (below, between, above) uses ledger lines. The current
  // chord's notes are drawn as open whole-notes; the key's sharps/flats are drawn
  // as a key signature on both staves (standard placement).
  const STAFF_BASS = [4, 6, 8, 10, 12];      // G2 B2 D3 F3 A3
  const STAFF_TREBLE = [16, 18, 20, 22, 24]; // E4 G4 B4 D5 F5
  // standard key-signature sidx positions: [bass-staff, treble-staff]
  const KEYSIG_SHARP = { F: [10, 24], C: [7, 21], G: [11, 25], D: [8, 22], A: [5, 19], E: [9, 23] };
  const KEYSIG_FLAT = { B: [6, 20], E: [9, 23], A: [5, 19], D: [8, 22], G: [11, 25], C: [7, 21] };
  const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
  // The visible staff spans C2 (sidx 0) .. G7 (sidx 39). Chords only ever reach
  // G6 (sidx 32, the top harp string); the headroom up to G7 is shown as ledger
  // ladder so the top of the column reads as real pitches, not blank space.
  const ST_MAXSIDX = 39;
  const ST_STEP = 18, ST_TOPPAD = 18, ST_W = 124, ST_H = ST_TOPPAD * 2 + ST_MAXSIDX * ST_STEP;
  const ST_NOTEX = 92, ST_LED = 18;   // ledger half-width (short, centred on the note column)
  const yAt = (sidx) => ST_TOPPAD + (ST_MAXSIDX - sidx) * ST_STEP;
  // every ledger position (even sidx outside the two staves): below the bass,
  // the middle-C line, and above the treble up to G7. Drawn as short dashes.
  const LEDGER_GUIDE = [0, 2, 14, 26, 28, 30, 32, 34, 36, 38];

  function drawStaff(notes, scale, keyName) {
    const svg = $('staffSvg');
    if (!svg || !settings.staff) return;   // staff hidden -> nothing to draw
    svg.setAttribute('viewBox', '0 0 ' + ST_W + ' ' + ST_H);
    const L = 8, R = ST_W - 8;
    const hline = (sidx, x1, x2) =>
      '<line x1="' + x1 + '" y1="' + yAt(sidx) + '" x2="' + x2 + '" y2="' + yAt(sidx) +
      '" stroke="#b59a68" stroke-width="1.4"/>';
    let s = '';
    // short dashed ledger ladder at every off-staff position (full C2..G7 range)
    LEDGER_GUIDE.forEach((p) => {
      s += '<line x1="' + (ST_NOTEX - ST_LED) + '" y1="' + yAt(p) + '" x2="' + (ST_NOTEX + ST_LED) +
        '" y2="' + yAt(p) + '" stroke="#8a734a" stroke-width="1.4" stroke-dasharray="3 3"/>';
    });
    STAFF_BASS.forEach((p) => { s += hline(p, L, R); });
    STAFF_TREBLE.forEach((p) => { s += hline(p, L, R); });

    // key signature: each accidental drawn on BOTH staves at its standard spot
    if (scale) {
      const present = {};
      scale.forEach((n) => { if (n.acc) present[n.letter] = n.acc; });
      const sharps = SHARP_ORDER.filter((l) => present[l] === '#');
      const flats = FLAT_ORDER.filter((l) => present[l] === 'b');
      let kx = 16;
      const glyph = (sym, sidx, x) =>
        '<text x="' + x + '" y="' + (yAt(sidx) + 8) + '" font-size="27" text-anchor="middle"' +
        ' fill="#e0c989" font-family="serif">' + sym + '</text>';
      sharps.forEach((l) => { const pos = KEYSIG_SHARP[l]; s += glyph('♯', pos[0], kx) + glyph('♯', pos[1], kx); kx += 13; });
      flats.forEach((l) => { const pos = KEYSIG_FLAT[l]; s += glyph('♭', pos[0], kx) + glyph('♭', pos[1], kx); kx += 13; });
    }

    // whole notes for the chord (ledger positions are already drawn as the ladder).
    // When two notes are a diatonic SECOND apart (adjacent sidx -> only ST_STEP px,
    // which is less than a notehead's height), offset the upper one to the right so
    // they sit side by side, as in standard notation. Shapes 332/323/233 (inverted
    // 7ths) contain such a second.
    const ord = (notes || []).slice().sort((a, b) => a.sidx - b.sidx);
    let prevSidx = -99, prevOffset = false;
    ord.forEach((n) => {
      const offset = (n.sidx - prevSidx === 1) && !prevOffset;   // upper note of a 2nd
      const cx = ST_NOTEX + (offset ? 17 : 0);
      const cy = yAt(n.sidx);
      s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="10.5" ry="7.6" fill="none"' +
        ' stroke="#fff7e6" stroke-width="2.6" transform="rotate(-18 ' + cx + ' ' + cy + ')"/>';
      prevSidx = n.sidx; prevOffset = offset;
    });

    svg.innerHTML = s;
    const kl = $('staffKey');
    if (kl) kl.textContent = keyName ? 'Key of ' + fix(keyName) : '';
  }

  // ---------------- harp string board (SVG) ----------------
  function drawHarp(highlight) {
    const board = $('harp');
    const W = board.clientWidth || 1200;
    const H = Math.max(360, board.clientHeight || 480);
    const marginX = 46, topY = 26, botPad = 70;
    const n = STRINGS.length;
    const gap = (W - 2 * marginX) / (n - 1);
    // 0.855 = shorten all strings ~14.5% so their bottom ends clear the (enlarged)
    // pedal/lever widget overlaid in the lower-right of the canvas (was 0.90; -5%).
    const lenBass = (H - topY - botPad) * 0.855, lenTreble = lenBass * 0.46;

    const hi = {};
    (highlight || []).forEach((h, i) => { hi[h.sidx] = { note: h, order: i, total: highlight.length }; });

    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="' + SVGNS + '">';
    // top soundboard bar
    svg += '<rect x="' + (marginX - 18) + '" y="' + (topY - 16) + '" width="' + (W - 2 * marginX + 36) + '" height="12" rx="6" fill="#7a5a36"/>';

    // Note circles/labels collect here and are appended AFTER every string so a
    // later string's line never paints over an earlier string's circle.
    let overlay = '';
    STRINGS.forEach((s, i) => {
      const x = marginX + i * gap;
      const len = lenTreble + (lenBass - lenTreble) * (1 - i / (n - 1));
      const y2 = topY + len;
      const isC = s.letter === 'C', isF = s.letter === 'F';
      const baseColor = isC ? '#d23b3b' : isF ? '#3b6fd2' : '#1b1b1b';
      const on = hi[s.idx];
      const w = on ? 6 : (isC || isF ? 2.6 : 1.8);
      const col = on ? '#16a34a' : baseColor;
      svg += '<line x1="' + x + '" y1="' + topY + '" x2="' + x + '" y2="' + y2 +
             '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"/>';
      if (on) {
        // Stagger each lit note vertically by its position in the chord so the
        // circles never overlap, even when the lit strings sit close together.
        // Notes run bass->treble (left->right); subtracting the order term pushes
        // higher notes up, reinforcing the natural string-length diagonal.
        const R = 20;        // green note-circle radius (enlarged for legibility)
        const STAGGER = 46;  // > circle diameter (2*R=40) => guaranteed no overlap
        const my = topY + len * 0.5 - (on.order - (on.total - 1) / 2) * STAGGER;
        overlay += '<circle cx="' + x + '" cy="' + my + '" r="' + R + '" fill="#16a34a" stroke="#0b3d20" stroke-width="2.5"/>';
        if (settings.names) {
          overlay += '<text x="' + x + '" y="' + (my + 6) + '" text-anchor="middle" font-size="17" font-weight="700" fill="#fff">' +
                 fix(on.note.letter + on.note.acc) + '</text>';
        }
      }
      // octave labels under C strings
      if (isC) {
        svg += '<text x="' + x + '" y="' + (y2 + 16) + '" text-anchor="middle" font-size="11" fill="#8a6a44">C' + s.octave + '</text>';
      }
    });
    svg += overlay; // note circles + labels on top of all strings
    svg += '</svg>';
    // Render only into the string layer so the pedal overlay (#pedalbox) survives.
    let layer = document.getElementById('stringlayer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'stringlayer';
      board.insertBefore(layer, board.firstChild);
    }
    layer.innerHTML = svg;
  }

  // Canonical row order of the matrix (matches the printed table).
  const SHAPE_ROWS = ['33', '34', '43', '44', '333', '332', '323', '233', '444'];

  // ---------------- choices: the full 9×7 matrix (filtered by shape group) ----
  // The left panel IS the matrix — a clean 9-row × 7-column grid of Roman
  // numerals, no headers or row labels. The lit chord is one cell; tap it.
  // Filters trim which shape-rows are shown.
  function buildChoices(correctShape, correctDeg) {
    const rows = SHAPE_ROWS.filter((s) => enabledShapes().includes(s));
    const box = $('answers');
    box.innerHTML = '';

    // Church-mode header: each column is a scale degree (1..7), which names a
    // mode of the major scale -- Ionian, Dorian, ... Locrian.
    const MODES = ['Ion', 'Dor', 'Phr', 'Lyd', 'Mix', 'Aeo', 'Loc'];
    const head = document.createElement('div');
    head.className = 'matrix-head';
    MODES.forEach((m) => {
      const c = document.createElement('div');
      c.className = 'mhead';
      c.textContent = m;
      head.appendChild(c);
    });

    const table = document.createElement('div');
    table.className = 'matrix';
    table.style.gridTemplateColumns = 'repeat(7, 1fr)';

    const act = activeCells();
    const isAct = (sh, d) => act.some((c) => c[0] === sh && c[1] === d);
    rows.forEach((shape, ri) => {
      for (let d = 0; d < 7; d++) {
        const locked = !isAct(shape, d);   // this solfa chord not yet unlocked -> grayed
        const b = document.createElement('button');
        b.className = 'ans' + (ri % 2 ? ' odd' : '') + (locked ? ' locked' : '');
        b.innerHTML = romanHTML(ROMAN[shape][d]);
        b.dataset.shape = shape;
        b.dataset.deg = String(d);
        if (locked) b.disabled = true;
        else b.onclick = () => answer(shape, d, b, correctShape, correctDeg);
        table.appendChild(b);
      }
    });
    box.appendChild(table);
    box.appendChild(head);   // church-mode labels now sit BELOW the table (above the hint)
  }

  function answer(chosenShape, chosenDeg, btn, correctShape, correctDeg) {
    if (current.answered) return;
    current.answered = true;
    const elapsed = (performance.now() - session.t0) / 1000;
    const ok = chosenShape === correctShape && chosenDeg === correctDeg;

    progress.answered++;
    const key = current.shape;
    if (!progress.mastery[key]) progress.mastery[key] = { seen: 0, correct: 0 };
    progress.mastery[key].seen++;
    // per-solfa-chord (cell) stats drive the Koch unlock gate
    const ck = cellKey(current.shape, current.bassDeg);
    if (!progress.cells[ck]) progress.cells[ck] = { seen: 0, correct: 0 };
    progress.cells[ck].seen++;

    if (ok) {
      session.streak++;
      progress.correct++;
      progress.mastery[key].correct++;
      progress.cells[ck].correct++;
      const gained = 10 + Math.min(session.streak, 10) * 2;
      progress.score += gained; progress.xp += gained;
      if (session.streak > progress.bestStreak) progress.bestStreak = session.streak;
      btn.classList.add('correct');
      flash('Correct  +' + gained + '   (' + elapsed.toFixed(1) + 's)', true);
      if (settings.sound) window.Audio2 && window.Audio2.blip(true);
    } else {
      session.streak = 0;
      btn.classList.add('wrong');
      // light up the correct cell by its (shape,degree) coordinates
      document.querySelectorAll('#answers .ans').forEach((b) => {
        if (b.dataset.shape === correctShape && b.dataset.deg === String(correctDeg)) b.classList.add('correct');
      });
      flashHTML('Answer: ' + romanHTML(current.answer), false);
      if (settings.sound) window.Audio2 && window.Audio2.blip(false);
    }
    document.querySelectorAll('#answers .ans').forEach((b) => { b.disabled = true; });

    // reveal full description
    const cn = concreteName(current.scale, current.bassDeg, current.shape);
    $('reveal').innerHTML = 'shape <b>' + current.shape + '</b> · hex <b>' + HEX[current.shape] +
      '</b> · bass degree <b>' + (current.bassDeg + 1) + '</b> · <b>' + romanHTML(current.answer) + '</b> = ' + cn +
      ' &nbsp;<span class="muted">(' + current.notes.map((x) => fix(x.letter + x.acc) + x.octave).join(' ') + ')</span>';

    // On a correct guess, also spell out the full glossary verbal name to read.
    if (ok) {
      $('reveal').innerHTML += '<div class="spoken">' + spokenName(current.shape, current.bassDeg) + '</div>';
    }

    // Koch unlock: did this answer cross the proficiency gate for the active set?
    const unlockedCell = checkUnlock();
    if (unlockedCell) {
      const [ush, ud] = unlockedCell;
      $('reveal').innerHTML += '<div class="unlock">🔓 New solfa chord unlocked: <b>' +
        romanHTML(ROMAN[ush][ud]) + '</b> &middot; ' + solfaSeqOf(ush, ud) +
        ' &nbsp;(' + activeCells().length + '/' + SOLFA_CURRICULUM.length + ')</div>';
    }

    save();
    updateHud();

    let delay = settings.delayCorrect;
    if (ok) {
      delay += 1000;   // +1s to read the spoken glossary name on a correct guess
      if (settings.sound && window.Audio2) window.Audio2.playChord(current.notes.map(midiOf));
    } else {
      // Got it wrong: optionally auto-open the Hint (formula + solfa) and sing the
      // cue (silent if Sound is off). Hold long enough to hear it / read the hint.
      if (settings.autoHint) showHintPanel(settings.sound);
      delay = settings.sound
        ? Math.max(settings.delayWrong, (current.notes.length + 1) * 760 + 2000)
        : settings.delayWrong;
    }
    if (unlockedCell) delay = Math.max(delay, 2800);   // hold so the unlock is readable
    setTimeout(nextQuestion, delay);
  }

  function flash(msg, ok) { const f = $('feedback'); f.textContent = msg; f.className = 'feedback ' + (ok ? 'ok' : 'bad'); }
  function flashHTML(html, ok) { const f = $('feedback'); f.innerHTML = html; f.className = 'feedback ' + (ok ? 'ok' : 'bad'); }

  function updateHud() {
    $('lvl').textContent = levelFor(progress.xp);
    $('streak').textContent = session.streak;
    $('score').textContent = progress.score;
    $('acc').textContent = progress.answered ? Math.round(progress.correct / progress.answered * 100) + '%' : '–';
    $('best').textContent = progress.bestStreak;
    $('answered').textContent = progress.answered;
    const sh = $('shapes'); if (sh) sh.textContent = activeCells().length + '/' + SOLFA_CURRICULUM.length;
  }

  // ---------------- settings panel (gear icon) ----------------
  // Schema-driven so "a whole bunch of things" is one list to extend. Each row
  // reads/writes settings[key]; ranges show a live value, toggles are switches,
  // and the curriculum group carries unlock buttons.
  const pct = (v) => Math.round(v * 100) + '%';
  const secs = (v) => (v / 1000).toFixed(2).replace(/0$/, '') + 's';
  const SETTINGS_SCHEMA = [
    { group: 'Pacing & feedback', rows: [
      { key: 'delayCorrect', label: 'Hold a correct answer', type: 'range', min: 300, max: 3000, step: 50, fmt: secs },
      { key: 'delayWrong', label: 'Hold a wrong answer', type: 'range', min: 1500, max: 6000, step: 100, fmt: secs,
        note: 'With Sound on, extended to fit the sung cue.' },
      { key: 'autoHint', label: 'Auto-open hint when wrong', type: 'toggle' },
    ] },
    { group: 'Curriculum — Koch unlocking', rows: [
      { key: 'curriculum', label: 'Lock chords until mastered', type: 'toggle',
        note: 'Off = free play: every chord active, nothing grayed.' },
      { key: 'unlockAcc', label: 'Mastery accuracy to unlock', type: 'range', min: 0.7, max: 1, step: 0.01, fmt: pct },
      { key: 'unlockMin', label: 'Min reps before unlock', type: 'range', min: 5, max: 30, step: 1, fmt: (v) => v + ' reps' },
      { type: 'unlock' },
    ] },
    { group: 'Spaced repetition', rows: [
      { key: 'weakBias', label: 'Weak-chord emphasis', type: 'range', min: 0, max: 8, step: 0.5, fmt: (v) => v.toFixed(1) + '×' },
      { key: 'staleBias', label: 'Staleness emphasis', type: 'range', min: 0, max: 5, step: 0.25, fmt: (v) => v.toFixed(2) + '×' },
      { key: 'newBias', label: 'New-chord priority', type: 'range', min: 1, max: 12, step: 0.5, fmt: (v) => v.toFixed(1) },
      { key: 'noRepeat', label: 'Avoid back-to-back repeats', type: 'toggle' },
    ] },
    { group: 'Display & hints', rows: [
      { key: 'staff', label: 'Show notation staff (left strip)', type: 'toggle' },
      { key: 'hintReps', label: 'Reps until scaffold hint fades', type: 'range', min: 0, max: 20, step: 1,
        fmt: (v) => (v <= 0 ? 'always on' : v + ' reps') },
    ] },
  ];

  // Re-render whatever a setting change affects (cheap; runs only on a change).
  function applySettings() {
    document.body.classList.toggle('no-staff', !settings.staff);
    saveSettings();
    if (current) {
      buildChoices(current.shape, current.bassDeg);
      drawStaff(current.notes, current.scale, current.keyName);
      drawHarp(current.notes);
    }
    updateHud();
  }

  function buildSettings() {
    const body = $('setBody');
    if (!body) return;
    body.innerHTML = '';
    SETTINGS_SCHEMA.forEach((sec) => {
      const g = document.createElement('div'); g.className = 'set-group';
      const h = document.createElement('div'); h.className = 'set-gtitle'; h.textContent = sec.group;
      g.appendChild(h);
      sec.rows.forEach((row) => g.appendChild(buildSetRow(row)));
      body.appendChild(g);
    });
  }

  function buildSetRow(row) {
    const el = document.createElement('div'); el.className = 'set-row';
    if (row.type === 'unlock') {
      el.classList.add('set-unlock');
      const info = document.createElement('div'); info.className = 'set-unlock-info';
      const refresh = () => { info.textContent = 'Unlocked ' + Math.min(progress.unlocked || 2, SOLFA_CURRICULUM.length) +
        ' of ' + SOLFA_CURRICULUM.length + ' solfa chords'; };
      refresh();
      const btns = document.createElement('div'); btns.className = 'set-unlock-btns';
      const mk = (txt, fn) => { const b = document.createElement('button'); b.className = 'set-mini'; b.textContent = txt;
        b.onclick = () => { fn(); refresh(); applySettings(); }; return b; };
      btns.appendChild(mk('Unlock next', () => { progress.unlocked = Math.min(SOLFA_CURRICULUM.length, (progress.unlocked || 2) + 1); save(); }));
      btns.appendChild(mk('Unlock all', () => { progress.unlocked = SOLFA_CURRICULUM.length; save(); }));
      btns.appendChild(mk('Reset to 2', () => { progress.unlocked = 2; save(); }));
      el.appendChild(info); el.appendChild(btns);
      return el;
    }
    const lab = document.createElement('div'); lab.className = 'set-lab';
    lab.innerHTML = '<span>' + row.label + '</span>' + (row.note ? '<small>' + row.note + '</small>' : '');
    el.appendChild(lab);
    const ctl = document.createElement('div'); ctl.className = 'set-ctl';
    if (row.type === 'toggle') {
      const sw = document.createElement('label'); sw.className = 'switch';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!settings[row.key];
      const kn = document.createElement('span'); kn.className = 'knob';
      cb.onchange = () => { settings[row.key] = cb.checked; applySettings(); };
      sw.appendChild(cb); sw.appendChild(kn); ctl.appendChild(sw);
    } else if (row.type === 'range') {
      const rng = document.createElement('input'); rng.type = 'range';
      rng.min = row.min; rng.max = row.max; rng.step = row.step; rng.value = settings[row.key];
      const out = document.createElement('span'); out.className = 'set-val'; out.textContent = row.fmt(settings[row.key]);
      rng.oninput = () => { const v = parseFloat(rng.value); settings[row.key] = v; out.textContent = row.fmt(v); applySettings(); };
      ctl.appendChild(rng); ctl.appendChild(out);
    }
    el.appendChild(ctl);
    return el;
  }

  function openSettings() { buildSettings(); const o = $('setOverlay'); if (o) o.hidden = false; }
  function closeSettings() { const o = $('setOverlay'); if (o) o.hidden = true; }
  function restoreDefaults() {
    Object.assign(settings, SETTINGS_DEFAULTS);
    // keep the user's current key + filter checkboxes as-is on the topbar
    syncTopbar();
    applySettings();
    buildSettings();
  }
  // Push settings values back onto the topbar checkboxes/select (after a reset).
  function syncTopbar() {
    [['optTri', 'triads'], ['optSev', 'sevenths'], ['optQ', 'quartal'], ['optNames', 'names'], ['optSound', 'sound']]
      .forEach(([id, k]) => { const el = $(id); if (el) el.checked = settings[k]; });
    const sel = $('keySel'); if (sel) sel.value = settings.key;
  }

  // ---------------- wiring ----------------
  function wire() {
    const sel = $('keySel');
    KEY_ORDER.forEach((k) => { const o = document.createElement('option'); o.value = k; o.textContent = fix(k) + ' major'; sel.appendChild(o); });
    sel.value = settings.key;
    sel.onchange = () => { settings.key = sel.value; saveSettings(); newQuestion(); };

    [['optTri', 'triads'], ['optSev', 'sevenths'], ['optQ', 'quartal'], ['optNames', 'names'], ['optSound', 'sound']]
      .forEach(([id, k]) => { const el = $(id); if (!el) return; el.checked = settings[k]; el.onchange = () => { settings[k] = el.checked; saveSettings(); newQuestion(); }; });

    $('skip').onclick = nextQuestion;
    $('play').onclick = () => { if (current && window.Audio2) window.Audio2.playChord(current.notes.map(midiOf)); };

    // gear icon -> training settings panel
    document.body.classList.toggle('no-staff', !settings.staff);
    const gear = $('gear'); if (gear) gear.onclick = openSettings;
    const sx = $('setClose'); if (sx) sx.onclick = closeSettings;
    const sd = $('setDone'); if (sd) sd.onclick = closeSettings;
    const sdef = $('setDefaults'); if (sdef) sdef.onclick = restoreDefaults;
    const sov = $('setOverlay'); if (sov) sov.onclick = (e) => { if (e.target === sov) closeSettings(); };
    // Hint strip: tapping the prompt reveals the hint in place + sings the cue;
    // once revealed, the ↻ button replays the cue (strip height never changes).
    $('hintBtn').onclick = showHintPanel;
    $('hpReplay').onclick = (e) => { e.stopPropagation(); playHintCue(); };
    $('reset').onclick = () => { if (confirm('Reset harp progress?')) { progress = blank(); save(); updateHud(); } };
    window.addEventListener('resize', () => { if (current) drawHarp(current.notes); });

    fetch('/api/progress?ns=harp').then((r) => r.ok ? r.json() : null).then((srv) => {
      if (srv && srv.updated && srv.updated > (progress.updated || 0)) { progress = Object.assign(blank(), srv); updateHud(); }
    }).catch(() => {});
  }

  document.addEventListener('DOMContentLoaded', () => { wire(); updateHud(); newQuestion(); });
})();
