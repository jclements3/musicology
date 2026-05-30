#!/usr/bin/env python3
"""shape-chords-eb.py — single-page harp practice sheet for the E-flat
shape-chords (the "Eb portion" of shape-chords-eight-keys-hex.{tex,pdf}).

Each of the nine voicing shapes (33 34 43 44 / 333 332 323 233 444) is one
grand-staff system: its seven diatonic chords (built on scale degrees 1-7)
written as stacked WHOLE NOTES, echoed in both hands — the right hand in the
treble register, the left hand the same chord two octaves lower in the bass.

The shape label's digits are the diatonic interval stack from the bass note
(3 = a third / +2 scale steps, 4 = a fourth / +3, 2 = a second / +1); the hex
string beside it (e.g. 531) is the diatonic string-position pattern from
shape-chords-keys-generator.py. The bass note of each chord is the column's
scale degree, so the same shape climbs the E-flat scale across the row.

Output is a single self-contained HTML file that inlines the abcjsharp library
(grand-staff fork) — open or print it with no network dependency. Mirrors the
canonEb.py standalone viewer and the HarpHymnal grand-staff ABC conventions.

Run:
    python3 shape-chords-eb.py            # writes shape-chords-eb.{abc,html}
"""
import argparse
import json
from pathlib import Path

HERE = Path(__file__).parent
DEFAULT_ABCJS = HERE.parent / "abcjsharp" / "dist" / "abcjs-basic-min.js"
if not DEFAULT_ABCJS.exists():
    DEFAULT_ABCJS = HERE / "node_modules" / "abcjs" / "dist" / "abcjs-basic-min.js"

# ---------------------------------------------------------------------------
# Shape-chord model (Eb only), lifted from shape-chords-keys-generator.py.
# ---------------------------------------------------------------------------
SCALE = ["Eb", "F", "G", "Ab", "Bb", "C", "D"]   # Eb major, degrees 1-7
TRI = ["", "m", "m", "", "", "m", "°"]
SEV = ["Δ", "m7", "m7", "Δ", "7", "m7", "ø7"]
# (label, kind, offset, quartal-suffix)
SHAPES = [
    ("33",  "tri", 0, None), ("34",  "tri", 2, None), ("43",  "tri", 4, None),
    ("44",  "quartal", 0, "q"),
    ("333", "sev", 0, None), ("332", "sev", 2, None),
    ("323", "sev", 4, None), ("233", "sev", 6, None),
    ("444", "quartal", 0, "q4"),
]
HEX = {"33": "531", "34": "853", "43": "A85", "44": "741",
       "333": "7531", "332": "8753", "323": "A875", "233": "CA87", "444": "A741"}
# Roman-numeral chord labels per shape × scale degree (user-supplied). Figured-
# bass inversions use Unicode super/subscripts + fraction slash (e.g. ⁶⁄₄).
ROMAN = {
    "33":  ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
    "34":  ["vi⁶", "vii°⁶", "I⁶", "ii⁶", "iii⁶", "IV⁶", "V⁶"],
    "43":  ["IV⁶⁄₄", "V⁶⁄₄", "vi⁶⁄₄", "vii°⁶⁄₄", "I⁶⁄₄", "ii⁶⁄₄", "iii⁶⁄₄"],
    "44":  ["Iq", "iiq", "iiiq", "IVq", "Vq", "viq", "viiq"],
    "333": ["IΔ", "ii⁷", "iii⁷", "IVΔ", "V⁷", "vi⁷", "viiø⁷"],
    "332": ["vi⁶⁄₅", "viiø⁶⁄₅", "IΔ⁶⁄₅", "ii⁶⁄₅", "iii⁶⁄₅", "IVΔ⁶⁄₅", "V⁶⁄₅"],
    "323": ["IVΔ⁴⁄₃", "V⁴⁄₃", "vi⁴⁄₃", "viiø⁴⁄₃", "IΔ⁴⁄₃", "ii⁴⁄₃", "iii⁴⁄₃"],
    "233": ["ii⁴⁄₂", "iii⁴⁄₂", "IVΔ⁴⁄₂", "V⁴⁄₂", "vi⁴⁄₂", "viiø⁴⁄₂", "IΔ⁴⁄₂"],
    "444": ["Iq4", "iiq4", "iiiq4", "IVq4", "Vq4", "viq4", "viiq4"],
}
# Diatonic step count for each interval digit (3rd = +2 steps, 4th = +3, 2nd = +1).
DIGIT_STEPS = {"2": 1, "3": 2, "4": 3}


def chord_name(bass, kind, off, qsuf):
    """Harmonic label for the chord whose bass is scale degree `bass` (0-6)."""
    if kind == "quartal":
        return SCALE[bass]            # quartal stacks have no triadic name
    rd = (bass - off) % 7
    name = SCALE[rd] + (SEV if kind == "sev" else TRI)[rd]
    return name if off == 0 else name + "/" + SCALE[bass]


def fix(n):
    return n.replace("#", "♯").replace("b", "♭")


# ---------------------------------------------------------------------------
# Diatonic step -> ABC pitch.  Step 0 = Eb4 (the E on the treble bottom line;
# the K:Eb signature supplies every flat, so we only ever write plain letters).
# ---------------------------------------------------------------------------
SCALE_LETTERS = ["E", "F", "G", "A", "B", "C", "D"]
DEG_OCT0 = [4, 4, 4, 4, 4, 5, 5]   # octave of each degree when degree 0 = Eb4


def abc_pitch(step):
    deg = step % 7
    octv = DEG_OCT0[deg] + step // 7
    letter = SCALE_LETTERS[deg]
    if octv >= 5:
        return letter.lower() + "'" * (octv - 5)
    return letter.upper() + "," * (4 - octv)


def shape_steps(label):
    """Cumulative diatonic steps (from the bass) for each note of the shape."""
    steps = [0]
    for d in label:
        steps.append(steps[-1] + DIGIT_STEPS[d])
    return steps


def chord_abc(bass, label, octave_shift):
    """ABC chord token, e.g. [EGB], for the shape on scale degree `bass`."""
    notes = [abc_pitch(bass + s + octave_shift) for s in shape_steps(label)]
    return "[" + "".join(notes) + "]"


# Articulation drill (harp: 1=thumb/top … 4=ring/bottom, no pinky). Each row
# walks one shape up the scale; each measure is a DIFFERENT pluck sequence.
# A measure is (kind, plucks) where plucks is a list of (note-index-from-bottom,
# finger):
#   'roll' — rolled block chord, four quarter rolls.
#   'rep'  — base pattern repeated 4× to fill 4/4 (fingers print on 1st repeat).
#   'seq'  — an explicit full-bar sequence used as-is (fingers print on all).
# Note value comes from the total note count: 16 → sixteenths, 12 → eighth-note
# triplets, 8 → eighths. No spaces between notes → abcjs beams them.
#
# Measure order: 1 rolled · 2 roll-up · 3 roll-down · 4 broken-up · 5 broken-down
#                · 6 turn/zigzag · 7 up-and-down run (full sweep through tones).
TRIAD_MEASURES = [
    ("roll", None),
    ("rep", [(0, 3), (1, 2), (2, 1)]),                 # 3-2-1
    ("rep", [(2, 1), (1, 2), (0, 3)]),                 # 1-2-3
    ("rep", [(0, 3), (2, 1), (1, 2), (2, 1)]),         # 3-1-2-1
    ("rep", [(2, 1), (0, 3), (1, 2), (0, 3)]),         # 1-3-2-3
    # M6 = finger-combination drill (all sixteenths): full chord, every pair,
    # and each finger vs the rest. A split (e.g. 1-23) is two strikes — the
    # single, then the rest — each its own labeled sixteenth. (idxs, syllable);
    # idx: 1=top(2) 2=mid(1) 3=bottom(0).
    ("dyad", [([0, 1, 2], "1⁄2⁄3"), ([1, 2], "1⁄2"), ([0, 2], "1⁄3"), ([0, 1], "2⁄3"),
              ([2], "1"), ([0, 1], "2⁄3"), ([1], "2"), ([0, 2], "1⁄3"),
              ([0], "3"), ([1, 2], "1⁄2"), ([0, 1, 2], "1⁄2⁄3")]),
    # M7 = up-and-down: 1-2-3-2 (×4)
    ("rep", [(2, 1), (1, 2), (0, 3), (1, 2)]),
]
# Finger→note-index maps: triad 1→2,2→1,3→0 ; seventh 1→3,2→2,3→1,4→0.
_F4 = {1: 3, 2: 2, 3: 1, 4: 0}


def _seq4(fingers):
    """Build an explicit (idx, finger) sequence from seventh-chord finger nums."""
    return [(_F4[f], f) for f in fingers]


# Seventh-chord dyad strikes by finger-pair label (idx: 1=top(3)…4=bottom(0)).
_DY7 = {"14": ([0, 3], "14"), "23": ([1, 2], "23"),
        "13": ([1, 3], "13"), "24": ([0, 2], "24")}


SEV_MEASURES = [
    ("roll", None),
    ("rep", [(0, 4), (1, 3), (2, 2), (3, 1)]),         # 4-3-2-1
    ("rep", [(3, 1), (2, 2), (1, 3), (0, 4)]),         # 1-2-3-4
    ("rep", [(0, 4), (3, 1), (1, 3), (2, 2)]),         # 4-1-3-2
    ("rep", [(3, 1), (0, 4), (2, 2), (1, 3)]),         # 1-4-2-3
    # M6 = finger-combination drill (all sixteenths): every pair, plus
    # finger-1-vs-rest and finger-4-vs-rest (each split = single then rest).
    # (idxs, syllable); idx: 1=top(3) 2=(2) 3=(1) 4=bottom(0).
    ("dyad", [([0, 1, 2, 3], "1⁄2⁄3⁄4"),
              ([2, 3], "1⁄2"), ([1, 3], "1⁄3"), ([0, 3], "1⁄4"), ([1, 2], "2⁄3"),
              ([0, 2], "2⁄4"), ([0, 1], "3⁄4"),
              ([3], "1"), ([0, 1, 2], "2⁄3⁄4"), ([0], "4"), ([1, 2, 3], "1⁄2⁄3")]),
    # M7 = up-and-down run: 1234 3212 3432 1234 (user-specified)
    ("seq", _seq4([1, 2, 3, 4, 3, 2, 1, 2, 3, 4, 3, 2, 1, 2, 3, 4])),
]

REPEATS = 4

# Measure-1 octave jumps: each shape's four rolls leap among the four root
# octaves E♭2/E♭3/E♭4/E♭5 in a randomized order, covering the harp range.
# Split at middle C so the hands never cross: E♭2/E♭3 → left hand (bass),
# E♭4/E♭5 → right hand (treble). Value = octave number of the root.
OCT_ORDER = {
    "33":  [2, 5, 3, 4],
    "34":  [4, 2, 5, 3],
    "43":  [5, 3, 2, 4],
    "44":  [3, 4, 2, 5],
    "333": [2, 4, 5, 3],
    "332": [5, 2, 4, 3],
    "323": [3, 5, 2, 4],
    "233": [4, 3, 5, 2],
    "444": [2, 5, 4, 3],
}


def measure1_jumps(label):
    """Measure 1: four rolled chords leaping the four root octaves (E♭2/3 = bass,
    E♭4/5 = treble). Returns (treble_cell, bass_cell, treble_syllables) — one
    syllable per treble note (all '*', the rolls are unfingered)."""
    rh, lh, syl = [], [], []
    for octv in OCT_ORDER[label]:
        chord = chord_abc(0, label, (octv - 4) * 7)      # 7 diatonic steps/octave
        roll = f"!arpeggio!{chord}2"
        if octv >= 4:                                    # right hand (treble)
            rh.append(roll); lh.append("z2"); syl.append("*")
        else:                                            # left hand (bass)
            lh.append(roll); rh.append("z2")
    return "".join(rh), "".join(lh), syl


def measures_for(label):
    return TRIAD_MEASURES if len(shape_steps(label)) == 3 else SEV_MEASURES


BAR_NOTES = 16   # every pattern measure = 16 sixteenths, so barlines align across rows


def pattern_bar(bass, label, octave_shift, kind, plucks):
    """One drill measure, all sixteenths → (music, syllables). `syllables` has
    one entry per NOTE for the lyric verse: a finger number, a dyad/combo label,
    or '*' (blank). Chord names and fingerings are drawn as w: verses, not here.
    'rep' cycles its base figure to 16 notes; 'seq' is an explicit 16; 'dyad'
    plays its (idxs, syllable) strikes."""
    pitches = [abc_pitch(bass + s + octave_shift) for s in shape_steps(label)]
    if kind == "dyad":
        toks, syl = [], []
        for idxs, syllable in plucks:
            toks.append("[" + "".join(pitches[k] for k in idxs) + "]/2")
            syl.append(syllable)
        return "".join(toks), syl
    seq = []
    if kind == "rep":
        n = len(plucks)
        for j in range(BAR_NOTES):
            idx, finger = plucks[j % n]
            seq.append((idx, finger, j < n))
    else:                                              # 'seq' — explicit, all shown
        for idx, finger in plucks:
            seq.append((idx, finger, True))
    toks, syl = [], []
    for idx, finger, show in seq:
        toks.append(f"{pitches[idx]}/2")               # sixteenth (L:1/8)
        syl.append(str(finger) if show else "*")
    return "".join(toks), syl


# ---------------------------------------------------------------------------
# ABC document.
# ---------------------------------------------------------------------------
def build_abc(drill=False):
    if drill:
        title = "T: E♭ Shape Chords — articulation drill (7 sequences per shape)"
        note = ("N: Each row walks one shape up the scale; each measure is a "
                "different pluck sequence. M1 rolled chord; then roll-up, "
                "roll-down, broken up & down, turn/zigzag; M7 up-and-down. RH "
                "fingerings shown (1=thumb…4=ring); LH mirrors two octaves lower.")
        scale = "%%scale 0.52"
        meter = "M: none"          # no time signature on the drill
    else:
        title = "T: E♭ Shape Chords — stacked-whole-note drill (RH + LH)"
        note = ("N: Nine voicing shapes; each row = one shape across all seven "
                "scale degrees. Chord stacked as whole notes, RH (treble) "
                "echoed by LH (bass, two octaves lower).")
        scale = "%%scale 0.6"
        meter = "M: C"
    _ = note                       # (N: note text retained in source but not printed)
    head = [
        "X: 1", title, "C: J. Clements III",
        meter, "L: 1/8", scale, "%%nowrap true", "%%score {1 | 2}",
        "V:1 clef=treble", "V:2 clef=bass", "K: Eb",
    ]
    if drill:
        head.insert(7, "%%leftmargin 1.4cm")   # left space for overlaid row labels
        head.insert(7, "%%vocalfont Helvetica 13")  # lyric verses: non-bold
    lines = []
    for label, kind, off, qsuf in SHAPES:
        row_name = f"{label}  {HEX[label]}"
        measures = measures_for(label)
        if drill:
            # Drill: notes only (no inline chords/fingerings). The chord names
            # (verse 1) and fingerings (verse 2) are w: lyric lines below the
            # treble — like hymnal verses — so they stack cleanly, are aligned to
            # the notes, and are never clobbered. Row labels stay SVG overlays.
            rh, lh, syls = [], [], []
            for d in range(7):
                if d == 0:
                    rm, lm, rs = measure1_jumps(label)
                else:
                    mkind, plucks = measures[d]
                    rm, rs = pattern_bar(d, label, 0, mkind, plucks)
                    lm, _ = pattern_bar(d, label, -14, mkind, plucks)
                rh.append(rm); lh.append(lm); syls.append(rs)
            chord_v = [" ".join([ROMAN[label][d]] + ["*"] * max(0, len(syls[d]) - 1))
                       for d in range(7)]
            finger_v = [" ".join(syls[d]) if syls[d] else "*" for d in range(7)]
            lines.append('[V:1 name=""] ' + " | ".join(rh) + " |")
            lines.append("w: " + " | ".join(chord_v))     # verse 1: chord names
            lines.append("w: " + " | ".join(finger_v))    # verse 2: fingerings
            lines.append('[V:2 name=""] ' + " | ".join(lh) + " |")
        else:
            rh, lh = [], []
            for d in range(7):
                clabel = f'"{ROMAN[label][d]}"'
                rh.append(f'{clabel}{chord_abc(d, label, 0)}8')
                lh.append(f"{chord_abc(d, label, -14)}8")
            lines.append(f'[V:1 name="{row_name}"] ' + " | ".join(rh) + " |")
            lines.append('[V:2 name=""] ' + " | ".join(lh) + " |")
    return "\n".join(head + lines) + "\n"


# ---------------------------------------------------------------------------
# Standalone single-page HTML (mirrors canonEb.py).
# ---------------------------------------------------------------------------
HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{heading}</title>
<style>
  :root {{ --bg: #f6f1e7; --ink: #1a1612; --rule: #b8a988; }}
  html, body {{ margin: 0; padding: 0; background: var(--bg); color: var(--ink); }}
  body {{ font-family: "Palatino Linotype", Palatino, "Book Antiqua", serif; }}
  header {{
    position: sticky; top: 0; z-index: 10;
    background: rgba(26, 22, 18, 0.96); color: var(--bg);
    padding: 10px 18px; display: flex; align-items: center; gap: 16px;
  }}
  header h1 {{ font-size: 16px; margin: 0; font-weight: 500; }}
  header .subtle {{ font-size: 12px; color: #d8cdb4; }}
  header button {{
    margin-left: auto; background: transparent; color: var(--bg);
    border: 1px solid var(--bg); border-radius: 4px;
    padding: 6px 14px; cursor: pointer; font: inherit; font-size: 13px;
  }}
  header button:hover {{ background: var(--bg); color: var(--ink); }}
  main {{ max-width: 1400px; margin: 12px auto; padding: 0 14px; }}
  /* abcjs adds class "abcjs-container" which sets display:inline-block; that makes
     #score an atomic inline box and the browser then ignores break-inside:avoid on
     its children when paginating. Force it back to a normal block so each grand
     staff's wrapper div is a real break-avoid unit. */
  #score {{ background: var(--bg); display: block !important; }}
  /* oneSvgPerLine: abcjs renders each grand staff as its own SVG inside its own
     per-line wrapper div (#score > div). break-inside:avoid on those wrapper
     divs is what keeps a system whole — Chrome ignores break-inside on the bare
     replaced <svg>, so the wrapper (a real block box) is the unbreakable unit. */
  #score > div {{ break-inside: avoid; page-break-inside: avoid; margin: 0 auto 10px; }}
  #score svg {{ display: block; max-width: 100%; height: auto; margin: 0 auto; }}
  @media print {{
    @page {{ size: letter landscape; margin: 0.4in; }}
    header {{ display: none; }}
    body, main {{ background: #fff; padding: 0; margin: 0; max-width: none; }}
    /* never split a grand staff across a page boundary */
    #score > div {{ break-inside: avoid; page-break-inside: avoid; margin: 0 auto 6px; }}
  }}
</style>
</head>
<body>
<header>
  <h1>{heading}</h1>
  <span class="subtle">RH + LH · 33-string lever harp · J. Clements III</span>
  <button onclick="window.print()">Print / PDF</button>
</header>
<main>
  <div id="score">Loading…</div>
</main>
<script>{abcjs}</script>
<script>
const ABC = {abc_json};
// Drill overlays: per-measure chord labels (rows × 7) and per-row shape labels.
// Empty on the block sheet (which keeps abcjs chord-symbols / voice-names).
const CHORD_LABELS = {chord_labels_json};
const ROW_LABELS = {row_labels_json};
const SUPMAP = {{'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9'}};
const SUBMAP = {{'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9'}};
const SVGNS = 'http://www.w3.org/2000/svg';

// Draw a label as an SVG <text>, stacking a figured-bass fraction (e.g. ⁶⁄₄)
// as 6-over-4 when present. anchor: 'middle' or 'start'.
function makeLabel(svg, str, x, y, anchor, fs, bold, rotate) {{
  const t = document.createElementNS(SVGNS, 'text');
  t.setAttribute('y', y);
  t.setAttribute('text-anchor', anchor);
  t.setAttribute('font-family', 'Helvetica, Arial, sans-serif');
  t.setAttribute('font-size', fs);
  t.setAttribute('fill', '#1a1612');
  if (bold) t.setAttribute('font-weight', 'bold');
  if (rotate) t.setAttribute('transform', 'rotate(' + rotate + ' ' + x + ' ' + y + ')');
  const si = str.indexOf('⁄');
  if (si < 1) {{
    t.setAttribute('x', x);
    const ts = document.createElementNS(SVGNS, 'tspan');
    ts.setAttribute('x', x); ts.textContent = str; t.appendChild(ts);
    svg.appendChild(t);
    return;
  }}
  // stacked figure: prefix + top digit over bottom digit, recentered on x
  const top = SUPMAP[str[si - 1]] || str[si - 1];
  const bot = SUBMAP[str[si + 1]] || str[si + 1];
  const prefix = str.slice(0, si - 1);
  const small = fs * 0.62;
  t.setAttribute('text-anchor', 'start');
  const mk = (txt, sz) => {{
    const e = document.createElementNS(SVGNS, 'tspan');
    e.textContent = txt; if (sz) e.setAttribute('font-size', sz);
    t.appendChild(e); return e;
  }};
  const tp = mk(prefix);
  svg.appendChild(t);                       // attach so getComputedTextLength works
  const wp = tp.getComputedTextLength();
  const tt = mk(top, small);
  const wd = tt.getComputedTextLength();
  const left = (anchor === 'middle') ? x - (wp + wd) / 2
             : (anchor === 'end') ? x - (wp + wd) : x;
  t.setAttribute('x', left);
  tp.setAttribute('x', left); tp.setAttribute('y', y);
  tt.setAttribute('x', left + wp); tt.setAttribute('y', y - small * 0.5);
  const tb = mk(bot, small);
  tb.setAttribute('x', left + wp); tb.setAttribute('y', y + small * 0.62);
}}

// Place the drill's row labels (left) and chord labels (above each measure) as
// overlays, using the barline positions for x and stems for the label height.
function drawOverlays(scoreEl) {{
  if ((!CHORD_LABELS || !CHORD_LABELS.length) && (!ROW_LABELS || !ROW_LABELS.length)) return;
  scoreEl.querySelectorAll('svg').forEach(svg => {{
    const coords = d => (d || '').match(/-?\\d+(?:\\.\\d+)?/g) || [];
    // barlines
    const bars = [];
    svg.querySelectorAll('g[data-name="bar"] > path, path[data-name="bar"]').forEach(p => {{
      const n = coords(p.getAttribute('d')); if (n.length < 4) return;
      const xs = [], ys = [];
      for (let i = 0; i < n.length - 1; i += 2) {{ xs.push(+n[i]); ys.push(+n[i + 1]); }}
      bars.push({{ x: Math.min(...xs), yTop: Math.min(...ys), yBot: Math.max(...ys) }});
    }});
    if (!bars.length) return;
    bars.sort((a, b) => a.yTop - b.yTop || a.x - b.x);
    const staves = []; let cur = null;
    bars.forEach(b => {{
      if (!cur || b.yTop - cur.yTop > 30) {{ cur = {{ yTop: b.yTop, yBot: b.yBot, xs: [] }}; staves.push(cur); }}
      cur.xs.push(b.x); cur.yBot = Math.max(cur.yBot, b.yBot);
    }});
    // stems (for the highest-note height of each system)
    const stems = [];
    svg.querySelectorAll('g[data-name="stem"] > path, path[data-name="stem"]').forEach(p => {{
      const n = coords(p.getAttribute('d')); if (n.length < 2) return;
      const xs = [], ys = [];
      for (let i = 0; i < n.length - 1; i += 2) {{ xs.push(+n[i]); ys.push(+n[i + 1]); }}
      stems.push({{ x: Math.min(...xs), yTop: Math.min(...ys), yBot: Math.max(...ys) }});
    }});
    // finger annotations (abcjs "_n" labels) — used to find the fingering row.
    const annos = [];
    svg.querySelectorAll('text[data-name="annotation"]').forEach(t => {{
      const x = parseFloat(t.getAttribute('x')), y = parseFloat(t.getAttribute('y'));
      if (!isNaN(x) && !isNaN(y)) annos.push({{ x, y }});
    }});
    let leftRef = Infinity;
    svg.querySelectorAll('path').forEach(p => {{
      const m = (p.getAttribute('d') || '').match(/^M\\s*(-?\\d+(?:\\.\\d+)?)/);
      if (m) leftRef = Math.min(leftRef, parseFloat(m[1]));
    }});
    let row = 0;
    for (let si = 0; si < staves.length; si += 2, row++) {{   // treble staves only
      const st = staves[si], bass = staves[si + 1] || st;
      const xs = Array.from(new Set(st.xs.map(x => Math.round(x * 10) / 10))).sort((a, b) => a - b);
      if (xs.length < 7) continue;
      const mw = xs[1] - xs[0];
      const bounds = [xs[0] - mw * 0.85].concat(xs);       // M1 left edge estimate
      // highest note in this system → label baseline above it
      if (CHORD_LABELS && row < CHORD_LABELS.length) {{
        // chord names go at the START of each measure, on the fingering row
        // (just before the finger numbers), not above the staff.
        const fy = [];
        annos.forEach(a => {{ if (a.y > st.yTop && a.y < bass.yTop + 5) fy.push(a.y); }});
        fy.sort((a, b) => a - b);
        const fingerY = fy.length ? fy[Math.floor(fy.length / 2)] : st.yBot + 18;
        const labs = CHORD_LABELS[row];
        for (let m = 0; m < 7 && m < labs.length; m++) {{
          if (m === 0) {{                              // M1 (rolls, unfingered)
            makeLabel(svg, labs[0], bounds[0] + 3, fingerY, 'start', 16, false);
            continue;
          }}
          // end the label just before the measure's first (treble) note, so it
          // sits in front of the finger numbers rather than under the note.
          let fx = bounds[m + 1];
          stems.forEach(s => {{
            if (s.x >= bounds[m] && s.x < bounds[m + 1] && s.yTop < bass.yTop)
              fx = Math.min(fx, s.x);
          }});
          makeLabel(svg, labs[m], fx - 4, fingerY, 'end', 16, false);
        }}
      }}
      if (ROW_LABELS && row < ROW_LABELS.length)
        // row label: vertical (rotated 90° CCW), non-bold, in the left margin
        // to the LEFT of the brace, centered on the grand staff.
        makeLabel(svg, ROW_LABELS[row], Math.max(10, leftRef - 18),
                  (st.yTop + bass.yBot) / 2, 'middle', 13, false, -90);
    }}
  }});
}}

// Turn a figured-bass chord label like "IV⁶⁄₄" into a vertically-stacked
// fraction (6 directly over 4), the SVG equivalent of the .fig CSS stack.
// abcjs renders each chord as <text data-name="chord"><tspan>…</tspan></text>;
// we split off the prefix and re-emit the two digits at one x, raised/lowered.
function stackFigures(scoreEl) {{
  const SUP = {{'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9'}};
  const SUB = {{'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9'}};
  const NS = 'http://www.w3.org/2000/svg';
  scoreEl.querySelectorAll('text[data-name="chord"]').forEach(text => {{
    const tspan = text.querySelector('tspan');
    if (!tspan) return;
    const s = tspan.textContent;
    const si = s.indexOf('⁄');                       // fraction slash U+2044
    if (si < 1) return;                              // no stacked figure here
    const top = SUP[s[si - 1]] || s[si - 1];
    const bot = SUB[s[si + 1]] || s[si + 1];
    const prefix = s.slice(0, si - 1);
    const cx = parseFloat(text.getAttribute('x'));
    const y = parseFloat(text.getAttribute('y'));
    const fs = parseFloat(text.getAttribute('font-size')) || 16;
    const small = fs * 0.58;
    while (text.firstChild) text.removeChild(text.firstChild);
    text.setAttribute('text-anchor', 'start');
    const mk = (t, sz) => {{
      const e = document.createElementNS(NS, 'tspan');
      e.textContent = t;
      if (sz) e.setAttribute('font-size', sz);
      text.appendChild(e);
      return e;
    }};
    const tp = mk(prefix);
    const wp = tp.getComputedTextLength();
    const tt = mk(top, small);
    const wd = tt.getComputedTextLength();
    const left = cx - (wp + wd) / 2;                 // re-center prefix+fraction on cx
    const digitX = left + wp;
    text.setAttribute('x', left);
    tp.setAttribute('x', left); tp.setAttribute('y', y);
    tt.setAttribute('x', digitX); tt.setAttribute('y', y - small * 0.5);
    const tb = mk(bot, small);
    tb.setAttribute('x', digitX); tb.setAttribute('y', y + small * 0.62);
  }});
}}

// Shift every ABSOLUTE x-coordinate in a path d-string by a constant dx
// (relative/lowercase commands are left alone — a uniform translate).
function shiftAbsX(d, dx) {{
  const toks = d.match(/[A-Za-z]|-?\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?/g) || [];
  const stride = {{ M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 }};
  const xIdx = {{ M: [0], L: [0], T: [0], H: [0], C: [0, 2, 4], S: [0, 2], Q: [0, 2], A: [5] }};
  const out = []; let i = 0, cmd = '';
  while (i < toks.length) {{
    const t = toks[i];
    if (/[A-Za-z]/.test(t)) {{ out.push(t); cmd = t; i++; continue; }}
    const up = cmd.toUpperCase(); const st = stride[up] || 2;
    const idxs = (cmd === up) ? (xIdx[up] || []) : [];   // only absolute commands
    const args = toks.slice(i, i + st).map(Number);
    if (args.length < st) {{ while (i < toks.length) out.push(toks[i++]); break; }}
    idxs.forEach(xi => {{ args[xi] += dx; }});
    args.forEach(n => out.push('' + (+n.toFixed(3))));
    i += st;
    if (cmd === 'M') cmd = 'L'; else if (cmd === 'm') cmd = 'l';
  }}
  return out.join(' ');
}}

// oneSvgPerLine: each grand staff is rendered as its own SVG. Shift each so
// its first barline lands on a common x, and give every system SVG the SAME
// viewBox width, so they scale identically and barlines line up across the
// stacked SVGs (and each SVG can page-break cleanly when printed).
function snapSystems(scoreEl) {{
  const svgs = Array.prototype.slice.call(scoreEl.querySelectorAll('svg'))
    .filter(svg => svg.querySelectorAll('g[data-name="bar"]').length >= 7);
  if (svgs.length < 2) return;
  const info = svgs.map(svg => {{
    let firstBar = Infinity, maxX = 0;
    svg.querySelectorAll('g[data-name="bar"] > path, path[data-name="bar"]').forEach(p => {{
      const mm = (p.getAttribute('d') || '').match(/-?\\d+(?:\\.\\d+)?/);
      if (mm) {{ const x = +mm[0]; if (x < firstBar) firstBar = x; }}
    }});
    svg.querySelectorAll('path').forEach(p => {{
      const nums = (p.getAttribute('d') || '').match(/-?\\d+(?:\\.\\d+)?/g) || [];
      for (let i = 0; i < nums.length - 1; i += 2) {{ const x = +nums[i]; if (x > maxX) maxX = x; }}
    }});
    return {{ svg, firstBar, maxX }};
  }});
  const target = Math.max.apply(null, info.map(i => i.firstBar));
  let commonW = 0;
  info.forEach(i => {{ const r = i.maxX + (target - i.firstBar); if (r > commonW) commonW = r; }});
  commonW = Math.ceil(commonW + 16);
  info.forEach(i => {{
    const dx = target - i.firstBar;
    if (Math.abs(dx) > 0.5) {{
      i.svg.querySelectorAll('path').forEach(p => p.setAttribute('d', shiftAbsX(p.getAttribute('d'), dx)));
      i.svg.querySelectorAll('text').forEach(t => {{
        const x = parseFloat(t.getAttribute('x'));
        if (!isNaN(x)) t.setAttribute('x', x + dx);
        t.querySelectorAll('tspan').forEach(ts => {{
          const tx = parseFloat(ts.getAttribute('x'));
          if (!isNaN(tx)) ts.setAttribute('x', tx + dx);
        }});
      }});
    }}
    const vb = (i.svg.getAttribute('viewBox') || '').split(/\\s+/).map(Number);
    const minY = vb.length === 4 ? vb[1] : 0, h = vb.length === 4 ? vb[3] : 100;
    i.svg.setAttribute('viewBox', '0 ' + minY + ' ' + commonW + ' ' + h);
  }});
}}

function render() {{
  const el = document.getElementById('score');
  el.innerHTML = '';
  const width = Math.min(el.clientWidth || 1200, 1380);
  ABCJS.renderAbc('score', ABC, {{
    staffwidth: width,
    responsive: 'resize',
    oneSvgPerLine: true,     // each grand staff = its own SVG → page-breakable for print
    lyricsNoSpacing: true,   // abcjsharp fork: verse labels don't widen note spacing
    wrap: {{ minSpacing: 1.8, maxSpacing: 2.7, minSpacingLimit: 1.0, lastLineLimit: true }}
  }});
  stackFigures(el);
  drawOverlays(el);
  snapSystems(el);   // align all grand-staff SVGs + give them one uniform viewBox width
}}
document.addEventListener('DOMContentLoaded', () => {{
  render();
  let t;
  window.addEventListener('resize', () => {{ clearTimeout(t); t = setTimeout(render, 150); }});
}});
</script>
</body>
</html>
"""


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--abcjs", default=str(DEFAULT_ABCJS))
    args = ap.parse_args()

    abcjs_path = Path(args.abcjs)
    if not abcjs_path.exists():
        raise SystemExit(f"abcjs library not found: {abcjs_path}")
    abcjs_text = abcjs_path.read_text(encoding="utf-8")

    # Two sheets: the stacked-whole-note block reference, and the broken
    # 3-1-2-1 / 4-1-3-2 finger-pattern drill.
    sheets = [
        ("shape-chords-eb", True, "E♭ Shape Chords — articulation drill"),
        ("shape-chords-eb-blocks", False, "E♭ Shape Chords — stacked-whole-note reference"),
    ]
    shape_order = [s[0] for s in SHAPES]
    chord_labels = [ROMAN[sh] for sh in shape_order]          # 9 rows × 7 degrees
    row_labels = [f"{sh}  {HEX[sh]}" for sh in shape_order]
    for stem, drill, heading in sheets:
        abc_text = build_abc(drill=drill)
        abc_path = HERE / f"{stem}.abc"
        html_path = HERE / f"{stem}.html"
        abc_path.write_text(abc_text, encoding="utf-8")
        html = HTML_TEMPLATE.format(
            heading=heading,
            abcjs=abcjs_text,
            abc_json=json.dumps(abc_text),
            chord_labels_json=json.dumps([]),   # chord names now in w: verses
            row_labels_json=json.dumps(row_labels if drill else []),
        )
        html_path.write_text(html, encoding="utf-8")
        print(f"Wrote {abc_path.name} + {html_path.name} "
              f"({html_path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
