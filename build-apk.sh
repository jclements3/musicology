#!/usr/bin/env bash
#
# build-apk.sh — wrap the web/ app as a standalone Android APK with Capacitor,
# build it, and (optionally) install it onto a USB-C-connected tablet.
#
# Designed for the lab computer: run it with the cable plugged in and it will
# produce a proper installable Android app — no Python server needed on the
# device afterwards (the whole web/ folder is bundled in).
#
# Usage:
#   ./build-apk.sh              # build a debug APK (first run also scaffolds the project)
#   ./build-apk.sh --install    # build, then install onto the connected device via adb
#   ./build-apk.sh --release    # build an unsigned release APK instead of debug
#   ./build-apk.sh --clean      # remove generated node_modules/ and android/ then rebuild
#   ./build-apk.sh --open       # open the project in Android Studio instead of CLI-building
#
# Prerequisites (see the troubleshooting checklist in README.md):
#   - Node.js + npm
#   - A JDK (17 recommended) and the Android SDK; ANDROID_SDK_ROOT (or ANDROID_HOME) set
#   - For --install: adb on PATH and USB debugging enabled on the tablet
#
set -euo pipefail

cd "$(dirname "$0")"
ROOT="$(pwd)"

usage() {
  cat <<'USAGE'
build-apk.sh — wrap web/ as a standalone Android APK with Capacitor.

  ./build-apk.sh              build a debug APK (first run also scaffolds android/)
  ./build-apk.sh --install    build, then install onto the USB-connected device
  ./build-apk.sh --release    build an unsigned release APK instead of debug
  ./build-apk.sh --clean      remove generated node_modules/ and android/, then rebuild
  ./build-apk.sh --open       open in Android Studio instead of CLI-building
  ./build-apk.sh --help       show this help

Prereqs: Node 18+, a JDK (17), the Android SDK with ANDROID_SDK_ROOT set,
and (for --install) adb with USB debugging enabled on the tablet.
USAGE
}

INSTALL=0; RELEASE=0; CLEAN=0; OPEN=0
for arg in "$@"; do
  case "$arg" in
    --install) INSTALL=1 ;;
    --release) RELEASE=1 ;;
    --clean)   CLEAN=1 ;;
    --open)    OPEN=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg (try --help)"; exit 2 ;;
  esac
done

say()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[x]\033[0m %s\n' "$*" >&2; exit 1; }

# ---- regenerate the launcher icon from the committed master --------------
# android/ is gitignored, so its res/mipmap-* icons are NOT in the repo. We
# regenerate them from icon-build/icon-1024.png on every build so any clone
# gets the harp icon (not Capacitor's default). Needs ImageMagick; skips with
# a warning if it's missing so the build still succeeds with the default icon.
apply_icons() {
  local master="$ROOT/icon-build/icon-1024.png"
  local res="android/app/src/main/res"
  [ -f "$master" ] || { warn "icon master $master missing; keeping Capacitor's default icon."; return 0; }
  command -v convert >/dev/null 2>&1 || { warn "ImageMagick 'convert' not found; keeping default icon. (apt install imagemagick)"; return 0; }
  say "Applying launcher icon from icon-build/icon-1024.png"
  # Legacy square + round launcher bitmaps (density:size).
  for pair in "mdpi 48" "hdpi 72" "xhdpi 96" "xxhdpi 144" "xxxhdpi 192"; do
    set -- $pair
    convert "$master" -resize "$2x$2" "$res/mipmap-$1/ic_launcher.png"
    cp "$res/mipmap-$1/ic_launcher.png" "$res/mipmap-$1/ic_launcher_round.png"
  done
  # Adaptive foregrounds at 108dp; art scaled into the inner 2/3 safe zone on a
  # transparent canvas so the Android 8+ icon mask doesn't crop the notes.
  for triple in "mdpi 108 72" "hdpi 162 108" "xhdpi 216 144" "xxhdpi 324 216" "xxxhdpi 432 288"; do
    set -- $triple
    convert "$master" -resize "$3x$3" -background none -gravity center \
            -extent "$2x$2" "$res/mipmap-$1/ic_launcher_foreground.png"
  done
}

# ---- prerequisite checks -------------------------------------------------
command -v node >/dev/null 2>&1 || die "node not found. Install Node.js (e.g. 'sudo apt install nodejs npm' or nvm)."
command -v npm  >/dev/null 2>&1 || die "npm not found. Install Node.js/npm."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || warn "Node $NODE_MAJOR detected; Capacitor wants Node 18+. Continuing anyway."

if [ "$CLEAN" = "1" ]; then
  say "Cleaning generated node_modules/ and android/"
  rm -rf node_modules android package-lock.json
fi

# ---- package.json + Capacitor deps --------------------------------------
if [ ! -f package.json ]; then
  say "Creating package.json"
  npm init -y >/dev/null
fi

if [ ! -d node_modules/@capacitor/core ]; then
  # Pin to Capacitor 7.x: Capacitor 8 requires Node >=22, but the lab runs
  # Node 20. v7 supports Node 20 and produces the same standalone APK.
  say "Installing Capacitor 7.x (core, cli, android)"
  npm install @capacitor/core@^7 @capacitor/cli@^7 @capacitor/android@^7
fi

NPX="npx --no-install"

# ---- scaffold the native Android project on first run -------------------
if [ ! -d android ]; then
  say "Adding the Android platform (first-run scaffold)"
  $NPX cap add android
fi

# ---- copy web/ assets into the native project ---------------------------
say "Copying web/ assets into the Android project (cap sync)"
$NPX cap sync android

# ---- regenerate the custom launcher icon (after sync, before build) ------
apply_icons

# ---- open in Android Studio instead of CLI-building, if asked -----------
if [ "$OPEN" = "1" ]; then
  say "Opening in Android Studio — use Build > Build Bundle(s)/APK(s) > Build APK(s)"
  exec $NPX cap open android
fi

# ---- CLI build via Gradle -----------------------------------------------
[ -d android ] || die "android/ project missing after scaffold — re-run, or use --open."
cd android

if [ -n "${ANDROID_SDK_ROOT:-}" ] || [ -n "${ANDROID_HOME:-}" ]; then :; else
  warn "ANDROID_SDK_ROOT / ANDROID_HOME not set. Gradle may fail to find the SDK."
  warn "Typical: export ANDROID_SDK_ROOT=\$HOME/Android/Sdk"
fi

GRADLE="./gradlew"
[ -x "$GRADLE" ] || GRADLE="sh ./gradlew"

if [ "$RELEASE" = "1" ]; then
  say "Building UNSIGNED release APK"
  $GRADLE assembleRelease
  APK="$(find app/build/outputs/apk/release -name '*.apk' | head -1)"
else
  say "Building debug APK"
  $GRADLE assembleDebug
  APK="$(find app/build/outputs/apk/debug -name '*.apk' | head -1)"
fi

cd "$ROOT"
[ -n "${APK:-}" ] && [ -f "android/$APK" ] || die "APK not produced — check the Gradle output above."
APK_PATH="android/$APK"
say "APK built: $APK_PATH"

# ---- optional install onto the connected tablet -------------------------
if [ "$INSTALL" = "1" ]; then
  command -v adb >/dev/null 2>&1 || die "adb not found; install platform-tools to use --install."
  DEVS="$(adb devices | awk 'NR>1 && $2=="device" {print $1}')"
  [ -n "$DEVS" ] || die "No authorized device. Plug in USB-C, enable USB debugging, accept the prompt, then re-run."
  say "Installing onto: $DEVS"
  adb install -r "$APK_PATH"
  say "Installed. Look for 'Harp Trainer' in the tablet's app drawer."
else
  echo
  say "To install onto the tablet:  adb install -r $APK_PATH"
  say "Or re-run:  ./build-apk.sh --install"
fi
