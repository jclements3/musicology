#!/usr/bin/env python3
"""Development server for the Roman Numeral Chord Trainer.

Serves the static web/ app and exposes a tiny progress API so that play data
persists server-side (handy once the app runs on an Android device over USB-C
via `adb reverse tcp:8000 tcp:8000`).

    python3 server.py [--port 8000] [--host 0.0.0.0]

Then open http://localhost:8000/ in a browser.

No third-party dependencies — standard library only.
"""

import argparse
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(ROOT, "web")
DATA_DIR = os.path.join(ROOT, "data")
PROGRESS_FILE = os.path.join(DATA_DIR, "progress.json")

CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
}


class Handler(BaseHTTPRequestHandler):
    server_version = "RNTrainer/1.0"

    # ---- helpers ----
    def _send(self, code, body=b"", ctype="text/plain; charset=utf-8"):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        # disable caching during development
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _safe_path(self, url_path):
        # strip query, normalize, prevent directory traversal
        path = url_path.split("?", 1)[0]
        if path == "/" or path == "":
            path = "/index.html"
        rel = os.path.normpath(path.lstrip("/"))
        full = os.path.join(WEB_DIR, rel)
        if not os.path.abspath(full).startswith(WEB_DIR):
            return None
        return full

    # ---- routes ----
    def do_GET(self):
        if self.path.split("?", 1)[0] == "/api/progress":
            return self._get_progress()
        full = self._safe_path(self.path)
        if not full or not os.path.isfile(full):
            return self._send(404, "Not found")
        ext = os.path.splitext(full)[1].lower()
        ctype = CONTENT_TYPES.get(ext, "application/octet-stream")
        with open(full, "rb") as f:
            self._send(200, f.read(), ctype)

    def do_HEAD(self):
        self.do_GET()

    def do_POST(self):
        if self.path.split("?", 1)[0] == "/api/progress":
            return self._post_progress()
        self._send(404, "Not found")

    def _get_progress(self):
        if os.path.isfile(PROGRESS_FILE):
            with open(PROGRESS_FILE, "rb") as f:
                return self._send(200, f.read(), "application/json; charset=utf-8")
        return self._send(200, "{}", "application/json; charset=utf-8")

    def _post_progress(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return self._send(400, "Bad JSON")
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        self._send(200, '{"ok":true}', "application/json; charset=utf-8")

    def log_message(self, fmt, *args):
        # keep the dev console quiet-ish
        print("[server] " + (fmt % args))


def main():
    ap = argparse.ArgumentParser(description="Roman Numeral Chord Trainer dev server")
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--host", default="0.0.0.0")
    args = ap.parse_args()

    os.makedirs(DATA_DIR, exist_ok=True)
    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
    url = "http://localhost:%d/" % args.port
    print("Roman Numeral Chord Trainer")
    print("Serving %s" % WEB_DIR)
    print("Open %s  (listening on %s:%d)" % (url, args.host, args.port))
    print("Android over USB-C:  adb reverse tcp:%d tcp:%d  then open %s in Chrome"
          % (args.port, args.port, url))
    print("Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping.")
        httpd.server_close()


if __name__ == "__main__":
    main()
