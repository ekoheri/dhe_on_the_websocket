import base64
import hashlib
import os
import random
import json
from http_handler import http_response
from crypto_handler import mod_exp, xor_encrypt

#DOCROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "doc-html")
DOCROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "doc-html")

WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"


def build_ws_accept(key_b64):
    s = (key_b64 + WS_GUID).encode("utf-8")
    sha = hashlib.sha1(s).digest()
    return base64.b64encode(sha).decode("utf-8")


def ws_send_text(conn, text):
    payload = text.encode("utf-8")
    b1 = 0x80 | 0x1
    length = len(payload)
    header = bytearray([b1])
    if length <= 125:
        header.append(length)
    elif length < (1 << 16):
        header.append(126)
        header += length.to_bytes(2, "big")
    else:
        header.append(127)
        header += length.to_bytes(8, "big")
    try:
        conn.sendall(header + payload)
    except OSError:
        pass


def ws_recv_frame(conn):
    def recvn(n):
        buf = b""
        while len(buf) < n:
            chunk = conn.recv(n - len(buf))
            if not chunk:
                return None
            buf += chunk
        return buf

    hdr = recvn(2)
    if hdr is None:
        return (None, None)
    b1, b2 = hdr[0], hdr[1]
    opcode = b1 & 0x0F
    masked = (b2 >> 7) & 1
    length = b2 & 0x7F

    if length == 126:
        ext = recvn(2)
        if ext is None:
            return (None, None)
        length = int.from_bytes(ext, "big")
    elif length == 127:
        ext = recvn(8)
        if ext is None:
            return (None, None)
        length = int.from_bytes(ext, "big")

    mask_key = b""
    if masked:
        mask_key = recvn(4)
        if mask_key is None:
            return (None, None)

    payload = recvn(length)
    if payload is None:
        return (None, None)

    if masked and mask_key:
        payload = bytes(b ^ mask_key[i % 4] for i, b in enumerate(payload))

    return (opcode, payload)


def handle_websocket(conn, headers):
    key = headers.get("sec-websocket-key")
    if not key:
        resp = http_response(400, "Bad Request",
                             {"Content-Type": "text/plain"},
                             b"Missing Sec-WebSocket-Key")
        conn.sendall(resp)
        return

    accept_val = build_ws_accept(key)
    response = (
        "HTTP/1.1 101 Switching Protocols\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        f"Sec-WebSocket-Accept: {accept_val}\r\n\r\n"
    ).encode("utf-8")
    conn.sendall(response)

    shared_secret = None

    try:
        while True:
            opcode, payload = ws_recv_frame(conn)
            if opcode is None:
                break
            if opcode == 0x8:
                break
            if opcode == 0x1:
                text = payload.decode("utf-8", errors="replace").strip()
                if text.startswith("{"):
                    try:
                        msg = json.loads(text)
                    except Exception:
                        continue

                    msg_type = msg.get("type")
                    print(f"Request via WebSocket {msg_type}")
                    print(" * Response via WebSocket")
                    if msg.get("type") == "dhe_init":
                        p = int(msg["p"])
                        g = int(msg["g"])
                        client_pub = int(msg["pub"])
                        server_priv = random.randint(2, p - 2)
                        server_pub = mod_exp(g, server_priv, p)
                        shared_secret = mod_exp(client_pub, server_priv, p)
                        
                        print(f"  ** Private Key : {server_priv}")
                        print(f"  ** Public Key : {server_pub}")
                        print(f"  ** Kunci bersama : {shared_secret}")

                        ws_send_text(conn, json.dumps({
                            "type": "dhe",
                            "p": p,
                            "g": g,
                            "pub": server_pub
                        }))
                        continue

                    if msg.get("type") == "get_page" and shared_secret is not None:
                        path = msg.get("path", "/")
                        if path == "/" or path == "/index.html":
                            file_path = os.path.join(DOCROOT, "page1.html")
                        else:
                            file_path = os.path.join(DOCROOT, path.lstrip("/"))

                        try:
                            encrypt_needed = not (path in ["/", "/index.html", "/websocket.js"])
                            with open(file_path, "r", encoding="utf-8") as f:
                                body = f.read()
                            if encrypt_needed:
                                seed = shared_secret % 1000
                                body = xor_encrypt(body, seed)

                                print(f"  ** Proses enkripsi file : {file_path}")
                            response = {"type": "page", "html": body, "encrypted": encrypt_needed}
                        except FileNotFoundError:
                            response = {"type": "page", "html": "<h2>404 Not Found</h2>"}

                        ws_send_text(conn, json.dumps(response))
                        continue
    except Exception as e:
        print("WS error:", e)
    finally:
        try:
            conn.close()
        except Exception:
            pass
