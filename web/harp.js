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
    if (!top && !bot) return prefix;
    const fig = '<span class="fig">' + (top ? '<span>' + top + '</span>' : '') +
      (bot ? '<span>' + bot + '</span>' : '') + '</span>';
    return prefix + fig;
  }

  // ---------------- progress / metrics ----------------
  const STORE = 'rnt_harp_v1';
  const blank = () => ({ answered: 0, correct: 0, score: 0, xp: 0, bestStreak: 0, mastery: {}, updated: 0 });
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
  const settings = { key: 'random', triads: true, sevenths: true, quartal: true, names: true, fingers: true, sound: true };
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

  function newQuestion() {
    const keyName = settings.key === 'random' ? pick(KEY_ORDER) : settings.key;
    const scale = parseScale(keyName);
    const shapes = enabledShapes();
    let notes = null, shape = null, bassDeg = 0, guard = 0;
    while (!notes && guard++ < 40) {
      shape = pick(shapes);
      bassDeg = Math.floor(Math.random() * 7);
      notes = chordStrings(scale, bassDeg, shape);
    }
    if (!notes) { shape = '33'; bassDeg = 0; notes = chordStrings(scale, 0, '33'); }
    const answer = ROMAN[shape][bassDeg];
    current = { keyName, scale, shape, bassDeg, notes, answer, answered: false };
    session.t0 = performance.now();
    drawPedals(scale, keyName);
    drawHarp(notes);
    buildChoices(shape, bassDeg);
    showHint();
    $('feedback').textContent = '';
    $('feedback').className = 'feedback';
    $('reveal').textContent = '';
    updateHud();
  }

  // Scaffolded hint tied to PER-SHAPE mastery: the more correct answers you've
  // logged for the lit chord's shape, the less the hint gives away — and it
  // disappears once that shape is mastered. Each shape weans off independently,
  // so a tricky inversion keeps its hint while easy shapes lose theirs.
  const SHAPE_KIND = { '33': 'root-position triad', '34': '1st-inversion triad', '43': '2nd-inversion triad',
    '44': 'quartal triad', '333': 'root-position 7th', '332': '1st-inversion 7th',
    '323': '2nd-inversion 7th', '233': '3rd-inversion 7th', '444': 'quartal 7th' };
  // Correct-answer thresholds for this shape: <3 full · <6 medium · <10 light · ≥10 none.
  const HINT_FULL = 3, HINT_MED = 6, HINT_NONE = 10;
  function showHint() {
    const el = $('hint');
    if (!current) { el.className = ''; el.innerHTML = ''; return; }
    const c = current;
    const m = progress.mastery[c.shape] || { seen: 0, correct: 0 };
    const got = m.correct;
    if (got >= HINT_NONE) { el.className = ''; el.innerHTML = ''; return; }

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

  // ---------------- pedal / lever board ----------------
  function drawPedals(scale, keyName) {
    const byLetter = {};
    scale.forEach((n) => { byLetter[n.letter] = n.acc; });
    $('keyLabel').textContent = 'Key of ' + fix(keyName);
    const wrap = $('pedals');
    wrap.innerHTML = '';
    LO.forEach((letter) => {
      const acc = byLetter[letter] || '';
      const pos = acc.includes('#') ? 'sharp' : acc.includes('b') ? 'flat' : 'nat';
      const cell = document.createElement('div');
      cell.className = 'pedal' + (letter === 'C' ? ' isC' : letter === 'F' ? ' isF' : '');
      cell.innerHTML =
        '<div class="slot ' + (pos === 'sharp' ? 'on' : '') + '">♯</div>' +
        '<div class="slot ' + (pos === 'nat' ? 'on' : '') + '">♮</div>' +
        '<div class="slot ' + (pos === 'flat' ? 'on' : '') + '">♭</div>' +
        '<div class="pname">' + letter + '</div>';
      wrap.appendChild(cell);
    });
  }

  // ---------------- harp string board (SVG) ----------------
  function drawHarp(highlight) {
    const board = $('harp');
    const W = board.clientWidth || 1200;
    const H = Math.max(360, board.clientHeight || 480);
    const marginX = 46, topY = 26, botPad = 70;
    const n = STRINGS.length;
    const gap = (W - 2 * marginX) / (n - 1);
    const lenBass = H - topY - botPad, lenTreble = lenBass * 0.46;

    const hi = {};
    (highlight || []).forEach((h, i) => { hi[h.sidx] = { note: h, order: i, total: highlight.length }; });

    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="' + SVGNS + '">';
    // top soundboard bar
    svg += '<rect x="' + (marginX - 18) + '" y="' + (topY - 16) + '" width="' + (W - 2 * marginX + 36) + '" height="12" rx="6" fill="#7a5a36"/>';

    STRINGS.forEach((s, i) => {
      const x = marginX + i * gap;
      const len = lenTreble + (lenBass - lenTreble) * (1 - i / (n - 1));
      const y2 = topY + len;
      const isC = s.letter === 'C', isF = s.letter === 'F';
      const baseColor = isC ? '#d23b3b' : isF ? '#3b6fd2' : '#1b1b1b';
      const on = hi[s.idx];
      const w = on ? 5 : (isC || isF ? 2.4 : 1.6);
      const col = on ? '#16a34a' : baseColor;
      svg += '<line x1="' + x + '" y1="' + topY + '" x2="' + x + '" y2="' + y2 +
             '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"/>';
      if (on) {
        const my = topY + len * 0.5;
        svg += '<circle cx="' + x + '" cy="' + my + '" r="15" fill="#16a34a" stroke="#0b3d20" stroke-width="2"/>';
        if (settings.names) {
          svg += '<text x="' + x + '" y="' + (my + 4) + '" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">' +
                 fix(on.note.letter + on.note.acc) + '</text>';
        }
        if (settings.fingers) {
          // thumb (1) plays the highest string => largest order index
          const finger = on.total - on.order;
          svg += '<text x="' + x + '" y="' + (my - 22) + '" text-anchor="middle" font-size="13" font-weight="700" fill="#0b3d20">' + finger + '</text>';
        }
      }
      // octave labels under C strings
      if (isC) {
        svg += '<text x="' + x + '" y="' + (y2 + 16) + '" text-anchor="middle" font-size="11" fill="#8a6a44">C' + s.octave + '</text>';
      }
    });
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

    const table = document.createElement('div');
    table.className = 'matrix';
    table.style.gridTemplateColumns = 'repeat(7, 1fr)';

    rows.forEach((shape, ri) => {
      for (let d = 0; d < 7; d++) {
        const b = document.createElement('button');
        b.className = 'ans' + (ri % 2 ? ' odd' : '');   // alternating row stripe
        b.innerHTML = romanHTML(ROMAN[shape][d]);
        b.dataset.shape = shape;
        b.dataset.deg = String(d);
        b.onclick = () => answer(shape, d, b, correctShape, correctDeg);
        table.appendChild(b);
      }
    });
    box.appendChild(table);
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

    if (ok) {
      session.streak++;
      progress.correct++;
      progress.mastery[key].correct++;
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

    // reveal full description + play the chord
    const cn = concreteName(current.scale, current.bassDeg, current.shape);
    $('reveal').innerHTML = 'shape <b>' + current.shape + '</b> · hex <b>' + HEX[current.shape] +
      '</b> · bass degree <b>' + (current.bassDeg + 1) + '</b> · <b>' + romanHTML(current.answer) + '</b> = ' + cn +
      ' &nbsp;<span class="muted">(' + current.notes.map((x) => fix(x.letter + x.acc) + x.octave).join(' ') + ')</span>';
    if (settings.sound && window.Audio2) window.Audio2.playChord(current.notes.map(midiOf));

    save();
    updateHud();
    setTimeout(newQuestion, ok ? 950 : 2100);
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
  }

  // ---------------- wiring ----------------
  function wire() {
    const sel = $('keySel');
    KEY_ORDER.forEach((k) => { const o = document.createElement('option'); o.value = k; o.textContent = fix(k) + ' major'; sel.appendChild(o); });
    sel.value = 'random';
    sel.onchange = () => { settings.key = sel.value; newQuestion(); };

    [['optTri', 'triads'], ['optSev', 'sevenths'], ['optQ', 'quartal'], ['optNames', 'names'], ['optFingers', 'fingers'], ['optSound', 'sound']]
      .forEach(([id, k]) => { const el = $(id); if (!el) return; el.checked = settings[k]; el.onchange = () => { settings[k] = el.checked; newQuestion(); }; });

    $('skip').onclick = newQuestion;
    $('play').onclick = () => { if (current && window.Audio2) window.Audio2.playChord(current.notes.map(midiOf)); };
    $('reset').onclick = () => { if (confirm('Reset harp progress?')) { progress = blank(); save(); updateHud(); } };
    window.addEventListener('resize', () => { if (current) drawHarp(current.notes); });

    fetch('/api/progress?ns=harp').then((r) => r.ok ? r.json() : null).then((srv) => {
      if (srv && srv.updated && srv.updated > (progress.updated || 0)) { progress = Object.assign(blank(), srv); updateHud(); }
    }).catch(() => {});
  }

  document.addEventListener('DOMContentLoaded', () => { wire(); updateHud(); newQuestion(); });
})();
