#!/usr/bin/env python3
"""
Local dev server with static file hosting + system report POST handler.

Usage (from project root):
  python3 scripts/dev_server.py 5500

Writes reports to:
  reports/system-report.json
  reports/history/system-report-<timestamp>.json
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPORTS_DIR = ROOT / "reports"
HISTORY_DIR = REPORTS_DIR / "history"


class DevServerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_OPTIONS(self):
        if self.path.startswith("/api/v1/system-report"):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Accept")
            self.end_headers()
            return
        super().do_OPTIONS()

    def do_POST(self):
        if not self.path.startswith("/api/v1/system-report"):
            self.send_error(404, "Not Found")
            return

        length = int(self.headers.get("Content-Length", "0") or 0)
        raw = self.rfile.read(length) if length > 0 else b"{}"

        try:
            payload = json.loads(raw.decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("payload must be object")
            paths = self._save_report(payload)
            body = json.dumps({"ok": True, **paths}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as exc:
            body = json.dumps({"ok": False, "error": str(exc)}).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def _save_report(self, payload: dict) -> dict:
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        HISTORY_DIR.mkdir(parents=True, exist_ok=True)

        text = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
        main_path = REPORTS_DIR / "system-report.json"
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        history_path = HISTORY_DIR / f"system-report-{ts}.json"

        main_path.write_text(text, encoding="utf-8")
        history_path.write_text(text, encoding="utf-8")
        (HISTORY_DIR / "latest.json").write_text(text, encoding="utf-8")

        return {
            "path": "reports/system-report.json",
            "history": f"reports/history/system-report-{ts}.json",
        }


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
    server = ThreadingHTTPServer(("127.0.0.1", port), DevServerHandler)
    print(f"Serving {ROOT} at http://127.0.0.1:{port}/")
    print("System report endpoint: POST /api/v1/system-report")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
