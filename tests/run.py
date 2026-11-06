#!/usr/bin/env python3
"""Roda as páginas de teste num navegador sem janela e resume o resultado.

Uso: python tests/run.py

Não precisa de instalação: usa só a biblioteca padrão do Python e o Chrome, o Edge
ou o Chromium que já estiver na máquina (ou o caminho em CHROME_PATH).
Sai com código 0 se tudo passar e 1 se algo falhar. É o que a CI executa.
"""
import functools
import http.server
import json
import os
import queue
import shutil
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ["tests/math.test.html", "tests/app.test.html"]
TIMEOUT_S = 180
NAMES = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome", "msedge"]
WINDOWS_PATHS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]
MAC_PATHS = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]


def find_browser():
    custom = os.environ.get("CHROME_PATH")
    if custom:
        return custom
    for name in NAMES:
        found = shutil.which(name)
        if found:
            return found
    for path in WINDOWS_PATHS + MAC_PATHS:
        if Path(path).exists():
            return path
    return None


def serve(reports):
    """Serve o projeto e recebe o resultado que cada página de teste envia ao terminar."""

    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def end_headers(self):
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

        def do_POST(self):
            size = int(self.headers.get("Content-Length", 0))
            reports.put(json.loads(self.rfile.read(size)))
            self.send_response(204)
            self.end_headers()

    handler = functools.partial(Handler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def run_page(browser, base, page, reports):
    url = f"{base}/{page}?report=1"
    profile = tempfile.mkdtemp(prefix="markov-lab-tests-")
    flags = [
        "--headless=new",
        "--disable-gpu",
        "--window-size=1400,1000",
        "--no-first-run",
        "--no-default-browser-check",
        f"--user-data-dir={profile}",
    ]
    if os.environ.get("CI"):
        flags.append("--no-sandbox")  # as máquinas da CI não oferecem o sandbox do Chrome
    proc = subprocess.Popen([browser, *flags, url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        return reports.get(timeout=TIMEOUT_S)
    except queue.Empty:
        return None
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
        shutil.rmtree(profile, ignore_errors=True)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    browser = find_browser()
    if not browser:
        print("Não encontrei Chrome, Edge ou Chromium. Indique o caminho em CHROME_PATH.")
        return 1
    print(f"Navegador: {browser}")

    reports = queue.Queue()
    server = serve(reports)
    base = f"http://127.0.0.1:{server.server_address[1]}"
    ok = True
    for page in PAGES:
        report = run_page(browser, base, page, reports)
        if report is None:
            print(f"✗ {page}: não terminou em {TIMEOUT_S} s")
            ok = False
            continue
        print(f"{'✓' if not report['failed'] else '✗'} {page}: {report['passed']} passaram, {report['failed']} falharam")
        for failure in report["failures"]:
            print(f"    ✗ {failure}")
        ok = ok and not report["failed"]
    server.shutdown()
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
