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

## Build a standalone Android APK later (Capacitor)

When you want a real installable app (no computer required), wrap the same `web/`
folder with [Capacitor](https://capacitorjs.com/). A `capacitor.config.json` is
already included.

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap copy            # copies web/ into the native project
npx cap open android    # opens Android Studio -> Build > Build APK
```

Notes:
- `webDir` is set to `web`, so `npx cap copy` bundles the app assets locally —
  it then runs fully offline (no Python server needed on the device).
- For offline progress in the standalone build, `localStorage` is the source of
  truth; the server sync is a no-op when there's no server, which is fine.

---

## Project layout

```
musicology/
├── server.py                 # Python dev server + /api/progress GET/POST
├── capacitor.config.json     # Android packaging config
├── data/                     # progress.json lives here (created on first save)
└── web/                      # the app (this is what ships to Android)
    ├── index.html
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
