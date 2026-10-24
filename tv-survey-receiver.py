#!/usr/bin/env python3
"""One-report, LAN-only diagnostic JSON receiver (Python standard library)."""
import argparse
import datetime as dt
import hmac
import json
import os
from pathlib import Path
import secrets
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

MAX_BYTES = 256 * 1024
PORT = 38767


def main():
    parser = argparse.ArgumentParser(description="Receive one private TV process report")
    parser.add_argument("--bind", required=True, help="LAN address of this computer, e.g. 192.168.1.10")
    parser.add_argument("--out", default=str(Path.home() / "tv-reports"), help="Private report directory")
    args = parser.parse_args()
    out = Path(args.out).expanduser()
    out.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(out, 0o700)
    pin = f"{secrets.randbelow(100000000):08d}"
    print(f"Listening on {args.bind}:{PORT} for ONE report")
    print(f"One-time receiver code: {pin}")
    print("On the TV: enter this PC's IP and code, then press Send.")
    print("No cloud services are involved. Press Ctrl+C to cancel.", flush=True)

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path != "/upload":
                self.send_error(404)
                return
            if not hmac.compare_digest(self.headers.get("X-TV-Report-Code", ""), pin):
                self.send_error(403, "Incorrect receiver code")
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                length = 0
            if length < 2 or length > MAX_BYTES:
                self.send_error(413, "Bad report size")
                return
            raw = self.rfile.read(length)
            try:
                report = json.loads(raw.decode("utf-8"))
                if not (isinstance(report, dict) and isinstance(report.get("processes"), dict)):
                    raise ValueError("Report format invalid")
            except (ValueError, UnicodeDecodeError):
                self.send_error(400, "Invalid JSON report")
                return
            stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
            name = f"tv-survey-{stamp}-{secrets.token_hex(3)}.json"
            path = out / name
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as file:
                    json.dump(report, file, indent=2, ensure_ascii=False)
                    file.write("\n")
            except BaseException:
                path.unlink(missing_ok=True)
                raise
            reply = json.dumps({"ok": True, "filename": name}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(reply)))
            self.end_headers()
            self.wfile.write(reply)
            print(f"Saved report privately: {path}", flush=True)
            threading.Thread(target=self.server.shutdown, daemon=True).start()

        def log_message(self, fmt, *args):
            # Avoid logging headers, codes, or report contents.
            return

    httpd = HTTPServer((args.bind, PORT), Handler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("Stopped without receiving a report.")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
