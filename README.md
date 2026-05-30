# Harp Shape-Chord Trainer

A music-theory drill for the **33-string lever/pedal harp**: a chord lights up on
the strings, and you name its **Roman numeral** — in *any key*. Built to teach
harmonic function from the *shape your hand makes on the strings*, independent of
key. The same string-shape is a different Roman numeral in a different key, and the
game randomizes the key so you learn the transposition-invariant skill.

- **Desktop / development:** a zero-dependency Python server (standard library only).
- **Android tablet:** the whole UI is a self-contained web app, so it ports cleanly —
  run it on a device over USB-C today, or wrap it as a standalone APK (see below).
- Tuned for a **13" 1920×1200 Android tablet in landscape** (large tap targets,
  high-DPI string rendering, warm high-contrast theme).

> Picking the project up on another machine? See **[HANDOFF.md](HANDOFF.md)** for
> the build/deploy quickstart and environment gotchas.

---

## What it does

One game mode: **identify the chord lit on the harp.** A shape-chord (3–4 strings)
lights up green on the harp board with its note names; you pick the matching Roman
numeral from the grid of choices.

The harp board:

- **33 diatonic strings, C2 → G6.** As on a real harp, **C strings are red** and
  **F strings are blue** (the rest black) so you can orient by octave at a glance.
- A **pedal / lever panel** shows the ♯ / ♮ / ♭ position of each letter for the
  current key.
- The lit chord's note names sit on the strings, **staggered vertically** so the
  circles never overlap.

Theory coverage:

- **Eight harp-friendly keys:** C, G, D, A, E, F, B♭, E♭ (correct enharmonic
  spelling per key). Pick one or play **Random key**.
- **Shape-chords**, selectable by family:
  - **Triads** — root (`33`), 1st inversion (`34`), 2nd inversion (`43`).
  - **Sevenths** — root (`333`), 1st (`332`), 2nd (`323`), 3rd (`233`) inversion.
  - **Quartal** — quartal triad (`44`) and quartal seventh (`444`).
- **Roman numerals** use standard casing + figured-bass symbols:
  `I ii iii IV V vi vii°`, inversions as `⁶`, `⁶⁄₄`, `⁶⁄₅`, `⁴⁄₃`, `⁴⁄₂`, sevenths as
  `Δ 7 ø7`, and quartal voicings tagged `q` / `q4`.

A "shape" is the string-gap pattern your fingers span: each digit is the gap to the
next lit string (`2`=2nd, `3`=3rd, `4`=4th). So `233` is a 3rd-inversion seventh and
`33` is a root-position triad — the same shape names a different Roman numeral
depending on the bass scale degree and the key.

Scaffolded, self-weaning hints:

- The hint is **tied to your per-shape mastery**. Early on it names the shape, the
  bass note + scale degree, and even which grid row/column to look in; as your
  correct count for that shape climbs it gives less away (`<3` full · `<6` medium ·
  `<10` light · `≥10` none). Each shape weans off independently, so a tricky
  inversion keeps its hint while easy shapes lose theirs.

Metrics & progress (kept across sessions):

- **Level + XP** (level up every 200 XP), score, current/best streak, overall
  accuracy, answered count. Correct answers earn `10 + min(streak,10)×2`.
- **Per-shape mastery** (correct / seen) drives the hint scaling above.
- Stored in `localStorage` and mirrored to the server (`data/progress_harp.json`,
  namespace `harp`) so it survives reinstalls.

Audio: the chord plays back on reveal (Web Audio), with a **Play chord** button for
ear training, plus correct/wrong blips.

---

## Run on desktop (development & testing)

Requires Python 3.7+. No packages to install.

```bash
cd /path/to/musicology
python3 server.py            # defaults to 0.0.0.0:8000
```

Then open <http://localhost:8000/> (the server serves the harp at `/`).

Options: `python3 server.py --port 8000 --host 0.0.0.0`.

Progress is saved to `data/progress_harp.json` automatically.

---

## Run on the Android tablet over USB-C (quick path)

This needs no build — it runs the live dev server on your computer and views it on
the device, which is ideal while iterating.

1. Enable **Developer options → USB debugging** on the tablet and plug in the
   USB-C cable.
2. Install Android platform-tools (`adb`) on your computer.
3. Start the server: `python3 server.py`
4. Forward the device's localhost to your computer:

   ```bash
   adb reverse tcp:8000 tcp:8000
   ```

5. On the tablet, open **Chrome** at <http://localhost:8000/>.
   Use the browser menu → *Add to Home screen* / *Install* for a fullscreen,
   landscape, app-like experience (the PWA manifest handles orientation & theme).

---

## Build a standalone Android app (Capacitor)

When you want a real installable app (no computer required at play time), wrap the
same `web/` folder with [Capacitor](https://capacitorjs.com/) into an APK. A
`capacitor.config.json` is included, and **`build-apk.sh` does the whole thing** —
scaffold, bundle, apply the launcher icon, build, and install onto the tablet over
USB-C.

Plug in the cable, then:

```bash
./build-apk.sh --install     # first run scaffolds android/, builds a debug APK, installs it
```

That's it — look for **Harp Trainer** in the tablet's app drawer afterward. It runs
fully offline; no Python server on the device.

Other modes:

```bash
./build-apk.sh               # just build a debug APK (don't install)
./build-apk.sh --release     # unsigned release APK instead of debug
./build-apk.sh --open        # open in Android Studio instead of CLI-building
./build-apk.sh --clean       # wipe generated node_modules/ + android/ and rebuild
./build-apk.sh --help
```

Notes:
- `webDir` is `web`, so `cap sync` bundles the app assets locally — it then runs
  fully offline (no Python server needed on the device).
- **Capacitor is pinned to v7** in `build-apk.sh` / `package.json` because v8
  requires Node ≥22; v7 works on Node 20 and produces the same standalone APK.
- For offline progress in the standalone build, `localStorage` is the source of
  truth; the server sync is a harmless no-op when there's no server.
- The debug APK is fine for your own tablet. A signed *release* APK is only needed
  for the Play Store; `--release` produces an unsigned one to sign later.

### Launcher icon

The app icon is generated from a committed master, **not** stored as Android
resources (the `android/` tree is gitignored). On every build, `build-apk.sh`
regenerates the launcher bitmaps + adaptive-icon foregrounds from
`icon-build/icon-1024.png` using **ImageMagick** (`convert`). To change the icon,
replace that square PNG and rebuild. If ImageMagick is missing the build still
succeeds but falls back to Capacitor's default icon (`sudo apt install imagemagick`).

### Prerequisites (lab computer)

- **Node.js 18+** and **npm** — `node -v`, `npm -v` (Capacitor v7 needs Node 18+).
- **A JDK** — `java -version`. JDK 17 *or* 21 work (Gradle 8.11 supports 21).
- **Android SDK** with `ANDROID_SDK_ROOT` *or* `ANDROID_HOME` pointing at it, e.g.
  `export ANDROID_HOME=$HOME/Android/Sdk`. Installing Android Studio once is the
  easiest way to get the SDK + platform-tools.
- **adb** (platform-tools) on `PATH` for `--install`.
- **ImageMagick** for the custom launcher icon (optional but recommended).

### Troubleshooting checklist

USB-C / device:
- [ ] **USB debugging** enabled: Settings → About → tap *Build number* 7×, then
      Settings → System → Developer options → **USB debugging** on.
- [ ] Plugged in, and the on-tablet **"Allow USB debugging?"** prompt accepted
      (tick *Always allow from this computer*). This is the #1 first-time blocker.
- [ ] `adb devices` lists the tablet as `device` (not `unauthorized` / `offline`).
      If `unauthorized`: unlock the screen and re-accept the prompt. If empty: try
      another cable/port (some are charge-only), or `adb kill-server && adb start-server`.
- [ ] USB mode set to **File transfer / MTP**, not "charging only".

Build:
- [ ] `node -v` ≥ 18. If older, install via [nvm](https://github.com/nvm-sh/nvm).
- [ ] A JDK on `PATH` (17 or 21). If Gradle complains about the Java version, set
      `JAVA_HOME` to a supported JDK.
- [ ] `echo $ANDROID_HOME` (or `$ANDROID_SDK_ROOT`) is non-empty and the path
      exists. If Gradle says *"SDK location not found"*, set it or create
      `android/local.properties` with `sdk.dir=/path/to/Android/Sdk`.
- [ ] First Gradle run downloads a lot — let it finish; it needs network.
- [ ] *"The Capacitor CLI requires NodeJS >=22"*: you got Capacitor 8 somehow —
      `./build-apk.sh --clean` reinstalls the pinned v7.
- [ ] *"INSTALL_FAILED_UPDATE_INCOMPATIBLE"*: a different build is already
      installed — `adb uninstall com.musicology.harptrainer` then re-run.
- [ ] Licenses not accepted: `sdkmanager --licenses` and accept all.

App behavior:
- [ ] No sound on first tap: audio needs a user gesture — tap once; the Web Audio
      context resumes on the first interaction.
- [ ] Stuck rotated: the app requests landscape via the manifest; if your tablet
      forces portrait, disable auto-rotate or rotate the device.

---

## Project layout

```
musicology/
├── HANDOFF.md               # build/deploy quickstart + environment notes
├── server.py                # Python dev server + /api/progress GET/POST (?ns=harp)
├── build-apk.sh             # Capacitor build + USB install + launcher-icon regen
├── capacitor.config.json    # Android packaging config ("Harp Trainer")
├── icon-build/icon-1024.png # canonical launcher-icon master
├── data/                    # progress_harp.json (created on save)
└── web/                     # the app (this is what ships to Android)
    ├── index.html           # the harp trainer UI
    ├── harp.js              # strings, pedals, shape-chord logic, SVG render
    ├── audio.js             # Web Audio chord / feedback playback
    ├── manifest.webmanifest # PWA: fullscreen landscape install
    └── icon.svg / icon-192.png / icon-512.png
```

## How "regardless of key" works

`harp.js` builds every chord from **scale degrees and string-gap shapes**, not
absolute pitches. A Roman numeral is derived from `(shape, bass scale degree)`,
which is exactly what's invariant across keys. Because the game draws a random key
each round, the same shape on the strings maps to different Roman numerals over time
— training the underlying harmonic function rather than memorized note names. The
key only decides which concrete strings light up and where the pedals/levers sit.

There's also a companion generator, `shape-chords-keys-generator.py`, that documents
the shape → hex → Roman model the trainer implements.
```
