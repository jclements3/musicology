# HANDOFF — Harp Shape-Chord Trainer

Context for the **other Claude (home laptop)** picking this up. Read this first,
then `README.md` for the deeper "how it works" notes.

## What this project is (now)

A single web app — the **Harp Shape-Chord Trainer** — wrapped as a standalone
Android APK with Capacitor and run on a 13" Android tablet in landscape.

You are shown a chord lit up on a 33-string lever/pedal harp; you pick the
matching Roman numeral from the grid. Key-agnostic: the same string-shape maps to
different numerals as the key changes.

> The repo used to also contain a *piano* "Roman Numeral Chord Trainer"
> (`index.html` + `game.js`/`keyboard.js`/`theory.js`/`style.css`). That was
> **deleted** this session — the harp is the whole app now. `web/index.html` IS
> the harp (it was promoted from the old `web/harp.html`). If you see piano
> references lingering (see TODOs), they're leftovers.

## Latest session (2026-05-31) — ii-V-I "altered dominant" licks (RH) + Somerset LH

New notation asset, parallel to `romanescaEb/` (engraved ABC/PDF, **not yet wired
into the web app**). Lives in **`licks/`**.

**What it is:** the 15 Jens Larsen ii-V-I "altered dominant" guitar licks from
`15-II-V-I-licks-Altered-Dominants.pdf` (source PDF + DOCX now committed at repo
root), arranged for harp as a **grand staff** — the lick in the **right hand**, a
**Somerset left-hand pattern** underneath.

**The Somerset LH:** the `V:2` / `LHxx` voices in `romanescaEb/romanescaEb.abc`
are a progressive left-hand pattern library (root, octave, root-fifth-octave,
block triad, broken fifths, arpeggio, …) — originally written under Canon-in-D
violins over an E♭ Pachelbel ground. Here the violins are dropped and only the LH
patterns are kept, **re-voiced onto Dm7 → G7alt → Cmaj7** (ii-V-I in C). Each lick
gets one pattern (cycling LH00, LH01, …, named in each tune title); the last bar
lands on a held Cmaj7.

**Files / pipeline (mirrors `romanescaEb/`):**
- `licks/rh01-15.png` — extracted TAB image of each lick.
- `licks/generate_licks.py` — **source of truth.** MIDI→ABC + LH-pattern generator.
  The 15 RH transcriptions live in the `LICKS` list (MIDI, written treble pitch:
  bar1 = 8 eighths Dm7, bar2 = 8 eighths G7alt, bar3 = whole-note Cmaj7). LH
  patterns + chord pools in `PATTERNS` / `DM,G7,CM`.
- `licks/print_licks_pdf.py` — `abcm2ps` + `ps2pdf` → `licks.pdf`.
- `licks/licks.abc`, `licks/licks.pdf` — generated output (committed).
- Regenerate: `cd licks && python3 generate_licks.py && python3 print_licks_pdf.py`.

**Transcription caveat:** no OCR was available, so RH pitches were read by eye from
the low-res TAB crops and **validated bar-by-bar against the chord scales**
(D-dorian / G-altered / C-major) — almost all 15 validated cleanly. Still
**verify against the source PDF.** Soft spots noted in `licks/README.md`: Lick 5
bar 1 (middle 3 notes could be a string higher), Lick 11 bar 1 (wide/fourths,
opens on low F2), and a few V-bars passing through a C-natural over G7alt (kept as
chromatic passing tones).

**Not done / next:** these are standalone notation (like `romanescaEb`); they are
**not** surfaced in the harp-trainer web app. If you want them in-app, that's new
work. `harp-singing-drill.html` at repo root is unrelated WIP, left untracked.

## Latest session — sung-solfa HINT feature + bottom-bar redesign

A tap-to-sing **Hint** was added and the chrome was reflowed to give the chord
table and the hint more room. All of this is in `web/` (the Capacitor bundle);
no native layer exists — there is **no oboe / native TextToSpeech** here, the
"audio path" is `web/audio.js` (Web Audio) + the browser speech engine.

**The Hint (big blue strip at the bottom of the left column):**

- Tapping the strip swaps it *in place* (fixed 110px height — the table never
  shrinks) from the call-to-action button to two horizontal blocks, and plays a
  sung cue. The ↻ button (pinned absolute to the right edge so flex overflow
  can't clip it) replays. Dismisses on the next exercise (`hideHintPanel()` in
  `newQuestion()`).
- **Auto-opens on a WRONG answer:** `answer()` calls `showHintPanel(settings.sound)`
  on a miss, so the formula + solfa appear and the cue sings (silent if Sound is
  off) alongside the usual red/green + answer reveal. The wrong-answer
  auto-advance delay is stretched to fit the cue
  (`(notes+1)*760 + 2000` ms, or 3200 ms when muted). `showHintPanel(play)` takes
  a flag; the manual tap passes nothing (plays), the auto-open passes the Sound
  setting.
- **It deliberately hides the Roman-numeral ANSWER.** Left block shows the
  naming formula `n = (p − k − o_s) mod 7 + 1` with this chord's inputs plugged
  in and the arithmetic, but the result is left as `?` (so the player works out
  the numeral). Right block is the movable-do solfa phrase `Do | <shape>` with
  the pedal syllable (first shape syllable) emphasised. Quartals show
  "no Roman numeral; figured bass = q/q4".
- Formula tables/logic all live in `harp.js` and match `concreteName()` /
  `ROMAN[]`: `SOLFA`, `RATIO` (r_s per shape), `LETTER_VAL` (A..G = 1..7),
  `META[].off` (= o_s). `showHintPanel()` builds the markup; `hintCue()` builds
  the played sequence.

**The played cue (`hintCue()` in harp.js + `playSolfa()`/`voice()`/`speak()` in
audio.js):**

- Sings the tonic **Do**, then the shape bottom→top on solfa syllables.
- **Voice-led** to be singable: Do is anchored, the bass is placed in the octave
  *nearest* Do (so e.g. Do=C steps **down a 2nd** to the near B instead of
  leaping up a 7th), and the shape builds up by its own 2nd/3rd/4th steps.
- **Transposed as a whole into a lyric-baritone range** (centred ~F#3,
  `BARITONE_CENTRE = 54`). Absolute pitch is intentionally NOT the harp's actual
  octave — only the *relative* intervals matter (per the player's request).
- Timbre is a **voiced "aah"**: sawtooth through three "ah"-vowel bandpass
  formants (darkened for a baritone colour) + vibrato — not a piano/MIDI tone.
  The syllable WORDS are spoken via `window.speechSynthesis`, scheduled to each
  note's onset (the in-app stand-in for Android TextToSpeech).

**Layout changes (all CSS/markup in `index.html`):**

- **Footer removed.** `▶ Play` and `Skip / Next` moved into the top bar; the old
  footer stats became `Done`/`Best` HUD tiles. (`#app` is now `auto 1fr`.)
- Removed the "Which Roman-numeral chord…" question line.
- **Column fills the height** (`main` got `grid-template-rows:minmax(0,1fr)`,
  `.left` got `height:100%`) so the matrix grows — **taller rows**, bigger
  formula font (code 18 / worked 17 / legend 13px).
- **No gap between table and hint:** `#feedback`/`#reveal` are now
  `position:absolute` overlays that float over the bottom of the table (above the
  hint) and only paint a backing panel when non-empty (`:not(:empty)`), so they
  reserve no flow space. The hint strip sits flush at the very bottom.

> Untouched on purpose: the exercise/scoring logic in `answer()` and the
> per-shape mastery tracking. The *old* mastery-scaffolded text hint (`#hint`,
> `showHint()`) was answer-revealing and conflicted with the new non-revealing
> Hint, so `showHint()` is now a no-op guard (the `#hint` element was removed);
> the mastery data it read is still tracked. Bring it back if wanted.

## The tablet

- Serial: `P90YPDU16Y251200164`, ~1920x1200 landscape, Android.
- USB-C + `adb`. The app installed on it is package id **`com.musicology.harptrainer`**,
  drawer label **"Harp Trainer"**.

## Build & deploy (one command)

Plug the tablet in over USB-C, then from the repo root:

```bash
./build-apk.sh --install     # build a debug APK and install onto the tablet
```

Look for **Harp Trainer** in the app drawer. It runs fully offline (the whole
`web/` folder is bundled; no Python server needed on the device).

Other modes: `./build-apk.sh` (build only), `--release` (unsigned release APK),
`--open` (open in Android Studio), `--clean` (wipe generated `node_modules/` +
`android/` and rebuild), `--help`.

For live dev without a build: `python3 server.py` then on the tablet
`adb reverse tcp:8000 tcp:8000` and open <http://localhost:8000/>.

## Environment gotchas (all already resolved on the lab machine)

- **Node 20 -> Capacitor 7.** Capacitor 8 requires Node >=22; the lab has Node 20.
  `build-apk.sh` pins `@capacitor/*@^7` (works on Node 20). `package.json` records
  the same. If the home laptop has Node 22+, plain Capacitor 8 would also work, but
  the v7 pin is harmless either way.
- **JDK 21 is fine.** Gradle 8.11 (what Capacitor 7 uses) supports JDK 21, despite
  the README's "JDK 17 recommended" note. No action needed.
- **Android SDK:** `ANDROID_HOME` must point at the SDK (lab: `~/Android/Sdk`).
  `ANDROID_SDK_ROOT` was unset and that's OK — `build-apk.sh` accepts either.
- **Device shows `unauthorized`:** the #1 first-time blocker. Unlock the tablet and
  accept the on-screen **"Allow USB debugging?"** prompt (tick "always allow").
  Verify with `adb devices` -> it should say `device`, not `unauthorized`.

## Launcher icon pipeline (important — `android/` is gitignored)

The custom icon is generated from a committed master, **not** stored in git as the
Android resources (those live under the gitignored `android/`).

- Source of truth: **`icon-build/icon-1024.png`** (derived from
  `music-notes-set_78370-2137.avif`, the original 740x740 art, also committed).
- `build-apk.sh` calls `apply_icons()` after `cap sync` on every build: it
  regenerates the legacy launcher bitmaps (48-192px) and the adaptive-icon
  foregrounds (108-432px, art scaled into the inner 2/3 safe zone so the Android 8+
  icon mask doesn't crop it) into `android/.../res/mipmap-*`.
- **Requires ImageMagick** (`convert`). If it's missing the build still succeeds but
  falls back to Capacitor's default icon — `sudo apt install imagemagick` to fix.
- To change the icon: replace `icon-build/icon-1024.png` (square PNG) and rebuild.

## This session's changes (already committed before this handoff)

- Wrapped the web app as an APK and installed it on the tablet (Capacitor 7).
- Deleted the piano game; promoted the harp to `web/index.html`; removed the dead
  "Piano" nav link; pointed the manifest/title/colors at the harp.
- Renamed the app to **Harp Trainer** (`capacitor.config.json`, manifest).
- Added the music-notes launcher icon + reproducible `apply_icons()` build step.
- **Lit-note circles fix:** they were overlapping. Now staggered vertically by
  chord position (`web/harp.js`, `drawHarp`: `STAGGER` kept larger than the circle
  diameter `2*R`, applied along the natural string-length diagonal). Also
  **removed the finger numbers** and their toolbar toggle.
- **Rewrote `README.md`** for the harp (was still describing the deleted piano).
- **Bigger answer-grid fonts:** the 9x7 Roman-numeral matrix was small. Bumped
  `.ans` to 38px (28px under the `<=1280px` breakpoint) and trimmed cell padding to
  `0 1px`. Verified on the tablet that the widest labels still fit their columns.
- **Bold Roman numerals:** `romanHTML` now bolds only the leading numeral letters
  (`I/V/i/v`) via a `.num` span; quality qualifiers (`° Δ ø q`) and figured bass
  stay regular weight.
- **Pedal board now matches a real concert harp:** laid out in foot order
  `D C B | E F G A` with a center divider (`.pedalgap`) between the feet (was scale
  order `C D E F G A B`), and the notches run **flat (top) / natural (middle) /
  sharp (bottom)** (they were inverted). Canonical layout was verified against harp
  references.
- **Renamed the package id** `com.musicology.rntrainer` -> `com.musicology.harptrainer`
  (edited `appId` in `capacitor.config.json`, clean-rescaffolded `android/`,
  uninstalled the old app, installed the new one).
- **Enlarged the pedals/levers widget** for legibility (`#pedalbox` CSS): pedal
  cells 30px -> 46px, notch glyphs 11px -> 17px, letter names 12px -> 19px.
- **Wider harp / bigger note circles:** narrowed the answer-table column
  (`main` grid `minmax(440px,0.72fr) 1fr`) so the harp panel is ~15% wider, and
  bumped the green note circles (`drawHarp`: `R = 20`, name font 17, `STAGGER = 46`).
- **Shortened the strings ~10%** (`drawHarp`: `lenBass *= 0.90`) so their ends clear
  the enlarged pedal widget in the lower-right.
- **Church-mode header above the table** (`buildChoices` builds `.matrix-head`):
  each of the 7 columns is a scale degree, labelled with its major-scale mode
  (Ion Dor Phr Lyd Mix Aeo Loc).
- **Note-circle z-order fix** (`drawHarp`): circles + labels now collect in an
  `overlay` buffer appended after all strings, so a later string never paints over
  an earlier string's circle (was happening with the larger radius).

## Known TODOs / loose ends

1. **Release signing:** only a debug APK exists. `--release` makes an *unsigned*
   release APK; sign it before any Play Store path. Not needed for personal use.

## Repo layout

```
musicology/
├── HANDOFF.md               # this file
├── README.md                # harp trainer docs (build, theory coverage, layout)
├── build-apk.sh             # Capacitor build + USB install + apply_icons()
├── capacitor.config.json    # appName "Harp Trainer", appId com.musicology.harptrainer
├── package.json             # pins @capacitor/*@^7
├── server.py                # Python dev server (serves web/, /api/progress)
├── icon-build/icon-1024.png # canonical launcher-icon master
├── music-notes-set_*.avif   # original icon art (740x740)
└── web/                     # the app (bundled into the APK)
    ├── index.html           # the harp trainer (was harp.html)
    ├── harp.js              # strings, pedals, chord logic, SVG render (drawHarp)
    ├── audio.js             # Web Audio chord playback
    ├── manifest.webmanifest # PWA: fullscreen landscape
    ├── icon.svg / icon-192.png / icon-512.png
```

(`android/`, `node_modules/`, `package-lock.json`, `data/` are gitignored —
regenerated by `build-apk.sh` / `server.py`.)
