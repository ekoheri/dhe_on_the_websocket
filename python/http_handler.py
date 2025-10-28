import os

#DOCROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "doc-html")
DOCROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "doc-html")

def read_http_request(conn):
    data = b""
    while b"\r\n\r\n" not in data:
        chunk = conn.recv(4096)
        if not chunk:
            break
        data += chunk
        if len(data) > 65536:
            break
    text = data.decode("iso-8859-1", errors="replace")
    lines = text.split("\r\n")
    if not lines or not lines[0]:
        return None, None, {}
    request_line = lines[0]
    parts = request_line.split()
    if len(parts) < 3:
        return None, None, {}
    method, path, version = parts[0], parts[1], parts[2]
    headers = {}
    for line in lines[1:]:
        if not line:
            break
        if ":" in line:
            k, v = line.split(":", 1)
            headers[k.strip().lower()] = v.strip()

    print(f"Request via HTTP : {path}")            
    return method, path, headers

def guess_mime(path):
    if path.endswith(".html"):
        return "text/html; charset=utf-8"
    if path.endswith(".js"):
        return "application/javascript; charset=utf-8"
    if path.endswith(".css"):
        return "text/css; charset=utf-8"
    return "application/octet-stream"

def http_response(status_code, reason, headers=None, body=b""):
    if headers is None:
        headers = {}
    headers.setdefault("Content-Length", str(len(body)))
    headers.setdefault("Connection", "close")
    lines = [f"HTTP/1.1 {status_code} {reason}\r\n"]
    for k, v in headers.items():
        lines.append(f"{k}: {v}\r\n")
    lines.append("\r\n")
    head = "".join(lines).encode("utf-8")
    return head + body

def handle_http(conn, method, path, headers):
    if method != "GET":
        resp = http_response(405, "Method Not Allowed",
                             {"Content-Type": "text/plain"},
                             b"405 Method Not Allowed")
        conn.sendall(resp)
        return

    # daftar file yang boleh dilayani lewat HTTP
    allowed_files = {"index.html", "main.js", "websocket.js", "navigation.js", "crypto.js", "view.js", "favicon.ico"}

    # normalisasi path
    if path == "/":
        filename = "index.html"
    else:
        filename = path.lstrip("/")

    try:
        if filename in allowed_files:
            file_path = os.path.join(DOCROOT, filename)
            with open(file_path, "rb") as f:
                body = f.read()
            headers = {
                "Content-Type": guess_mime(file_path),
                "Content-Length": str(len(body)),
                "Connection": "close",
            }
            resp = http_response(200, "OK", headers, body)
            conn.sendall(resp)
            print(f" * Response via HTTP : {file_path} ")
        else:
            # fallback ke index.html (SPA entry point)
            index_path = os.path.join(DOCROOT, "index.html")
            with open(index_path, "rb") as f:
                body = f.read()
            headers = {
                "Content-Type": "text/html; charset=utf-8",
                "Content-Length": str(len(body)),
                "Connection": "close",
            }
            resp = http_response(200, "OK", headers, body)
            conn.sendall(resp)
            print(f" * Response via HTTP : {index_path} ")

    except FileNotFoundError:
        resp = http_response(404, "Not Found",
                             {"Content-Type": "text/plain"},
                             b"404 Not Found")
        conn.sendall(resp)

