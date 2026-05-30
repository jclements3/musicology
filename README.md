# Roman Numeral Chord Trainer

A music-theory game: match **chords and chord shapes** to their **roman numerals**,
in *any key signature*. Built to teach harmonic function independent of key —
the same chord shape gets a different roman numeral in a different key, and the
game randomizes keys so you learn the transposition-invariant skill.

- **Desktop / development:** a zero-dependency Python server (standard library only).
- **Android:** the whole UI is a self-contained web app, so it ports cleanly —
  run it on a device over USB-C today, or wrap it as a standalone APK later.
- Tuned for a **13" 1920×1200 Android tablet in landscape** (large tap targets,
  high-DPI keyboard rendering, dark high-contrast theme).

---

## What it does

Two game modes:

1. **Identify** (chord → roman): a chord is shown on a piano keyboard with its
   note names, plus the current key. Pick the correct roman numeral from the
   seven diatonic choices.
2. **Build** (roman → chord): a roman numeral is shown for a key; pick the chord
   (set of notes) that it names.

Theory coverage:

- All 12 major keys and 12 minor keys (correct enharmonic spelling per key).
- Natural minor by default; optional **harmonic minor** (gives `V` and `vii°`).
- Triads by default; optional **seventh chords** (`maj7`, `7`, `m7`, `ø7`, `°7`).
- Roman numerals use standard casing/symbols: `I ii iii IV V vi vii°`, etc.

Metrics & progress (kept across sessions):

- Level + XP bar, score, current/best streak, overall accuracy, average answer time.
- **Per-roman-numeral mastery** bars (correct / seen).
- Stored in `localStorage` and mirrored to the server (`data/progress.json`) so it
  survives reinstalls and can sync to the Android build.

Audio: chords play back on reveal (Web Audio), with a "Play" button for ear training.

---

## Run on desktop (development & testing)

Requires Python 3.7+. No packages to install.

```bash
cd /home/clementsj/projects/musicology
python3 server.py            # defaults to 0.0.0.0:8000
```

Then open <http://localhost:8000/>.

Options: `python3 server.py --port 8000 --host 0.0.0.0`.

Progress is saved to `data/progress.json` automatically.

---

## Run on the Android tablet over USB-C (quick path)

This needs no build — it runs the live dev server on your computer and views it on
the device, which is ideal while iterating.

1. Enable **Developer options → USB debugging** on the Android 16 tablet and plug
   in the USB-C cable.
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

## Build a proper standalone Android app (Capacitor)

When you want a real installable app (no computer required at play time), wrap the
same `web/` folder with [Capacitor](https://capacitorjs.com/) into an APK. A
`capacitor.config.json` is already included, and **`build-apk.sh` does the whole
thing** — scaffold, bundle, build, and install onto the tablet over USB-C.

This is the lab-computer path: plug in the cable, then:

```bash
./build-apk.sh --install     # first run scaffolds android/, builds a debug APK, installs it
```

That's it — look for **RN Trainer** in the tablet's app drawer afterward. It runs
fully offline; no Python server on the device.

Other modes:

```bash
./build-apk.sh               # just build a debug APK (don't install)
./build-apk.sh --release     # unsigned release APK instead of debug
./build-apk.sh --open        # open in Android Studio instead of CLI-building
./build-apk.sh --clean       # wipe generated node_modules/ + android/ and rebuild
./build-apk.sh --help
```

Prefer doing it by hand? The equivalent manual steps:

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap sync android          # copies web/ into the native project
cd android && ./gradlew assembleDebug      # APK in app/build/outputs/apk/debug/
# or: npx cap open android    # then Build > Build APK in Android Studio
```

Notes:
- `webDir` is `web`, so `cap sync` bundles the app assets locally — it then runs
  fully offline (no Python server needed on the device).
- For offline progress in the standalone build, `localStorage` is the source of
  truth; the server sync is a harmless no-op when there's no server.
- The debug APK is fine for your own tablet. A signed *release* APK is only needed
  for the Play Store; `--release` produces an unsigned one to sign later.

### Prerequisites (lab computer)

- **Node.js 18+** and **npm** — `node -v`, `npm -v`.
- **JDK 17** — `java -version` (Android Gradle Plugin wants 17).
- **Android SDK** with the `ANDROID_SDK_ROOT` env var pointing at it, e.g.
  `export ANDROID_SDK_ROOT=$HOME/Android/Sdk`. Installing Android Studio once is
  the easiest way to get the SDK + platform-tools.
- **adb** (platform-tools) on `PATH` for `--install`.

### Troubleshooting checklist

USB-C / device:
- [ ] **USB debugging** enabled: Settings → About → tap *Build number* 7×, then
      Settings → System → Developer options → **USB debugging** on.
- [ ] Plugged in, and the on-tablet **"Allow USB debugging?"** prompt accepted
      (tick *Always allow from this computer*).
- [ ] `adb devices` lists the tablet as `device` (not `unauthorized` / `offline`).
      If `unauthorized`: re-accept the prompt. If empty: try another cable/port
      (some cables are charge-only), or `adb kill-server && adb start-server`.
- [ ] USB mode set to **File transfer / MTP**, not "charging only".

Build:
- [ ] `node -v` ≥ 18. If older, install via [nvm](https://github.com/nvm-sh/nvm).
- [ ] `java -version` shows 17. Wrong JDK is the #1 Gradle failure; set
      `JAVA_HOME` to the JDK 17 path.
- [ ] `echo $ANDROID_SDK_ROOT` is non-empty and the path exists. If Gradle says
      *"SDK location not found"*, set it (see prereqs) or create
      `android/local.properties` with `sdk.dir=/path/to/Android/Sdk`.
- [ ] First Gradle run downloads a lot — let it finish; it needs network.
- [ ] *"Failed to install... INSTALL_FAILED_UPDATE_INCOMPATIBLE"*: a different
      build is already installed — `adb uninstall com.musicology.rntrainer` then
      re-run.
- [ ] Licenses not accepted: `sdkmanager --licenses` and accept all.
- [ ] Clean slate after a broken run: `./build-apk.sh --clean`.

App behavior:
- [ ] Blank screen / no sound on first tap: audio needs a user gesture — tap
      once; the Web Audio context resumes on the first interaction.
- [ ] Stuck rotated: the app requests landscape via the manifest; if your tablet
      forces portrait, disable auto-rotate or rotate the device.

---

## Project layout

```
musicology/
├── server.py                 # Python dev server + /api/progress GET/POST (?ns= per app)
├── build-apk.sh              # one-command Capacitor build + USB install
├── capacitor.config.json     # Android packaging config
├── data/                     # progress.json / progress_harp.json (created on save)
└── web/                      # the app (this is what ships to Android)
    ├── index.html            # piano game (identify / build)
    ├── harp.html             # 33-string harp shape-chord drill
    ├── harp.js               # harp strings, pedals, 9×7 matrix, mastery hints
    ├── style.css
    ├── theory.js             # key-agnostic music engine (scales, chords, romans)
    ├── audio.js              # Web Audio chord/feedback playback
    ├── keyboard.js           # high-DPI piano renderer (the "chord shape")
    ├── game.js               # game flow, modes, metrics, persistence
    ├── manifest.webmanifest  # PWA: fullscreen landscape install
    └── icon.svg
```

## How "regardless of key signature" works

`theory.js` builds every chord from **scale degrees**, not absolute pitches.
A roman numeral is derived from `(scale degree, chord quality)`, which is exactly
what's invariant across keys. Because the game draws a random key each round, the
same shape on the keyboard maps to different roman numerals over time — training
the underlying function rather than memorized note names.
```
