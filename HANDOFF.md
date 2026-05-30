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
