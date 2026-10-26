"""Ponte local da Central. Só escuta em 127.0.0.1."""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, HTTPServer

import gerar_cliente

HOST = "127.0.0.1"
PORT = 8765
ALLOWED_ORIGINS = {"http://127.0.0.1:5173", "http://localhost:5173"}
MAX_BODY = 256 * 1024


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        return

    def _origin(self) -> str:
        return self.headers.get("Origin", "")

    def _cors(self) -> None:
        origin = self._origin()
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")

    def _send(self, code: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        if self._origin() not in ALLOWED_ORIGINS:
            self.send_response(403)
            self.end_headers()
            return
        self.send_response(204)
        self._cors()
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]
        if path == "/health":
            self._send(200, {"ok": True, "message": "Gerador local ligado."})
            return
        if path == "/status":
            query = self.path.split("?", 1)[1] if "?" in self.path else ""
            slug = ""
            for part in query.split("&"):
                if part.startswith("slug="):
                    slug = part.split("=", 1)[1]
            self._send(200, gerar_cliente.status(slug))
            return
        self._send(404, {"ok": False, "message": "Caminho desconhecido."})

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length > MAX_BODY:
            self._send(413, {"ok": False, "message": "Pedido grande demais."})
            return
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            self._send(400, {"ok": False, "message": "JSON inválido."})
            return
        path = self.path.split("?", 1)[0]
        if path == "/pasta":
            result = gerar_cliente.ensure_folder(str(payload.get("slug") or ""), str(payload.get("tradeName") or ""))
        elif path == "/gerar":
            result = gerar_cliente.package_client(payload, migrate=True)
        elif path == "/empacotar":
            result = gerar_cliente.package_client(payload, migrate=False)
        elif path == "/abrir":
            result = gerar_cliente.open_client(str(payload.get("slug") or ""))
        elif path == "/recompilar":
            result = gerar_cliente.recompile()
        else:
            self._send(404, {"ok": False, "message": "Caminho desconhecido."})
            return
        self._send(200 if result.ok else 400, {"ok": result.ok, "message": result.message})


def main() -> None:
    server = HTTPServer((HOST, PORT), Handler)
    print(f"Gerador local em http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
