#include "websocket_handler.h"
#include "crypto_handler.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <openssl/sha.h>
#include <json-c/json.h>
#include <openssl/sha.h>
#include <openssl/buffer.h>

#define DOCROOT "../doc-html"
#define WS_GUID "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

// Base64 encode helper (pakai OpenSSL BIO)
// Base64 encode manual (tanpa OpenSSL BIO)
static char* base64_encode(const unsigned char* input, int length) {
    static const char table[] =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    char *output, *p;
    int i, j;
    int out_len = 4 * ((length + 2) / 3);

    output = malloc(out_len + 1);
    if (!output) return NULL;

    p = output;
    for (i = 0; i < length - 2; i += 3) {
        *p++ = table[(input[i] >> 2) & 0x3F];
        *p++ = table[((input[i] & 0x3) << 4) | (input[i+1] >> 4)];
        *p++ = table[((input[i+1] & 0xF) << 2) | (input[i+2] >> 6)];
        *p++ = table[input[i+2] & 0x3F];
    }
    if (i < length) {
        *p++ = table[(input[i] >> 2) & 0x3F];
        if (i == (length - 1)) {
            *p++ = table[(input[i] & 0x3) << 4];
            *p++ = '=';
        } else {
            *p++ = table[((input[i] & 0x3) << 4) | (input[i+1] >> 4)];
            *p++ = table[((input[i+1] & 0xF) << 2)];
        }
        *p++ = '=';
    }

    *p = '\0';
    return output;
}

// Membuat Sec-WebSocket-Accept
static char* build_ws_accept(const char* key_b64) {
    char combined[256];
    snprintf(combined, sizeof(combined), "%s%s", key_b64, WS_GUID);

    unsigned char sha[SHA_DIGEST_LENGTH];
    SHA1((unsigned char*)combined, strlen(combined), sha);

    return base64_encode(sha, SHA_DIGEST_LENGTH);
}

// Kirim frame teks ke client
static void ws_send_text(int conn, const char* text) {
    size_t len = strlen(text);
    unsigned char header[10];
    int header_len = 0;

    header[0] = 0x81; // FIN + text frame
    if (len <= 125) {
        header[1] = len;
        header_len = 2;
    } else if (len < 65536) {
        header[1] = 126;
        header[2] = (len >> 8) & 0xFF;
        header[3] = len & 0xFF;
        header_len = 4;
    } else {
        header[1] = 127;
        for (int i = 0; i < 8; i++) {
            header[9 - i] = (len >> (8 * i)) & 0xFF;
        }
        header_len = 10;
    }

    send(conn, header, header_len, 0);
    send(conn, text, len, 0);
}

// Terima frame dari client
static int ws_recv_frame(int conn, int* opcode, unsigned char** payload) {
    unsigned char hdr[2];
    if (recv(conn, hdr, 2, MSG_WAITALL) != 2) return -1;

    *opcode = hdr[0] & 0x0F;
    int masked = (hdr[1] >> 7) & 1;
    size_t length = hdr[1] & 0x7F;

    if (length == 126) {
        unsigned char ext[2];
        if (recv(conn, ext, 2, MSG_WAITALL) != 2) return -1;
        length = (ext[0] << 8) | ext[1];
    } else if (length == 127) {
        unsigned char ext[8];
        if (recv(conn, ext, 8, MSG_WAITALL) != 8) return -1;
        length = 0;
        for (int i = 0; i < 8; i++) {
            length = (length << 8) | ext[i];
        }
    }

    unsigned char mask[4];
    if (masked) {
        if (recv(conn, mask, 4, MSG_WAITALL) != 4) return -1;
    }

    *payload = malloc(length + 1);
    if (recv(conn, *payload, length, MSG_WAITALL) != (int)length) {
        free(*payload);
        return -1;
    }

    if (masked) {
        for (size_t i = 0; i < length; i++) {
            (*payload)[i] ^= mask[i % 4];
        }
    }
    (*payload)[length] = '\0';
    return length;
}

// Handler utama websocket
void handle_websocket(int conn, header_t* headers, int header_count) {
    const char* key = get_header(headers, header_count, "sec-websocket-key");
    if (!key) {
        header_t resp_headers[1];
        strcpy(resp_headers[0].key, "Content-Type");
        strcpy(resp_headers[0].value, "text/plain");
        size_t resp_len;
        char* resp = http_response(400, "Bad Request", resp_headers, 1,
                                   (const unsigned char*)"Missing Sec-WebSocket-Key", 26, &resp_len);
        send(conn, resp, resp_len, 0);
        free(resp);
        return;
    }

    char* accept_val = build_ws_accept(key);
    char response[512];
    snprintf(response, sizeof(response),
             "HTTP/1.1 101 Switching Protocols\r\n"
             "Upgrade: websocket\r\n"
             "Connection: Upgrade\r\n"
             "Sec-WebSocket-Accept: %s\r\n\r\n", accept_val);
    free(accept_val);
    send(conn, response, strlen(response), 0);

    long long shared_secret = -1;

    while (1) {
        int opcode;
        unsigned char* payload;
        int len = ws_recv_frame(conn, &opcode, &payload);
        if (len <= 0) break;

        if (opcode == 0x8) { // close
            free(payload);
            break;
        }
        if (opcode == 0x1) { // text
            struct json_object* msg = json_tokener_parse((char*)payload);
            free(payload);
            if (!msg) continue;

            struct json_object* type_obj;
            if (!json_object_object_get_ex(msg, "type", &type_obj)) {
                json_object_put(msg);
                continue;
            }
            const char* msg_type = json_object_get_string(type_obj);

            printf("Request via WebSocket %s\n", msg_type);

            if (strcmp(msg_type, "dhe_init") == 0) {
                struct json_object *pobj, *gobj, *pubobj;
                json_object_object_get_ex(msg, "p", &pobj);
                json_object_object_get_ex(msg, "g", &gobj);
                json_object_object_get_ex(msg, "pub", &pubobj);

                int p = json_object_get_int(pobj);
                int g = json_object_get_int(gobj);
                int client_pub = json_object_get_int(pubobj);

                int server_priv = 2 + rand() % (p - 2);
                long long server_pub = mod_exp(g, server_priv, p);
                shared_secret = mod_exp(client_pub, server_priv, p);

                printf(" * DHE Init: p=%d g=%d client_pub=%d server_pub=%lld shared_secret=%lld\n",
           p, g, client_pub, server_pub, shared_secret);

                struct json_object* resp = json_object_new_object();
                json_object_object_add(resp, "type", json_object_new_string("dhe"));
                json_object_object_add(resp, "p", json_object_new_int(p));
                json_object_object_add(resp, "g", json_object_new_int(g));
                json_object_object_add(resp, "pub", json_object_new_int64(server_pub));

                ws_send_text(conn, json_object_to_json_string(resp));
                json_object_put(resp);
            }

            else if (strcmp(msg_type, "get_page") == 0 && shared_secret != -1) {
                struct json_object* pathobj;
                json_object_object_get_ex(msg, "path", &pathobj);
                const char* path = json_object_get_string(pathobj);

                char filepath[512];
                if (strcmp(path, "/") == 0 || strcmp(path, "/index.html") == 0) {
                    snprintf(filepath, sizeof(filepath), "%s/page1.html", DOCROOT);
                } else {
                    snprintf(filepath, sizeof(filepath), "%s/%s", DOCROOT, path[0] == '/' ? path+1 : path);
                }

                printf(" * WebSocket get_page request path=%s -> filepath=%s\n", path, filepath);

                FILE* f = fopen(filepath, "r");
                struct json_object* resp = json_object_new_object();

                if (!f) {
                    json_object_object_add(resp, "type", json_object_new_string("page"));
                    json_object_object_add(resp, "html", json_object_new_string("<h2>404 Not Found</h2>"));
                    ws_send_text(conn, json_object_to_json_string(resp));
                    json_object_put(resp);
                    json_object_put(msg);
                    continue;
                }

                fseek(f, 0, SEEK_END);
                long fsize = ftell(f);
                rewind(f);
                char* body = malloc(fsize + 1);
                fread(body, 1, fsize, f);
                body[fsize] = '\0';
                fclose(f);

                int encrypt_needed = !(strcmp(path, "/") == 0 || strcmp(path, "/index.html") == 0 || strcmp(path, "/websocket.js") == 0);

                if (encrypt_needed) {
                    int seed = shared_secret % 1000;
                    char* encrypted = xor_encrypt(body, seed);
                    free(body);
                    body = encrypted;
                }

                json_object_object_add(resp, "type", json_object_new_string("page"));
                json_object_object_add(resp, "html", json_object_new_string(body));
                json_object_object_add(resp, "encrypted", json_object_new_boolean(encrypt_needed));

                ws_send_text(conn, json_object_to_json_string(resp));

                free(body);
                json_object_put(resp);
            }

            json_object_put(msg);
        }
    }

    close(conn);
}
