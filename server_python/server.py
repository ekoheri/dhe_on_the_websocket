import socket
import threading
from http_handler import handle_http, read_http_request, http_response
from websocket_handler import handle_websocket

HOST = "127.0.0.1"
PORT = 8000

def client_thread(conn, addr):
    upgrade = None   # definisi awal biar tidak error
    path = None      # sama, path juga
    try:
        method, path, headers = read_http_request(conn)
        if not method:
            conn.close()
            return
                # Dahulukan HTTP
        if method == "GET" and path != "/ws":
            handle_http(conn, method, path, headers)
        else:
            upgrade = headers.get("upgrade")
            if upgrade and upgrade.lower() == "websocket" and path == "/ws":
                handle_websocket(conn, headers)
            else:
                resp = http_response(
                    400, "Bad Request",
                    {"Content-Type": "text/plain"},
                    b"Invalid request"
                )
                conn.sendall(resp)

    except Exception as e:
        try:
            resp = http_response(500, "Internal Server Error",
                                 {"Content-Type": "text/plain"},
                                 str(e).encode())
            conn.sendall(resp)
        except Exception:
            pass
    finally:
        if not (upgrade and upgrade.lower() == "websocket" and path == "/ws"):
            try:
                conn.close()
            except Exception:
                pass


def run_server():
    print(f"Serving HTTP + WebSocket on {HOST}:{PORT}")
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((HOST, PORT))
        s.listen(128)
        while True:
            conn, addr = s.accept()
            threading.Thread(target=client_thread, args=(conn, addr), daemon=True).start()


if __name__ == "__main__":
    run_server()
