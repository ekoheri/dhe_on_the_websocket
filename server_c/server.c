#include "server.h"
#include "http_handler.h"
#include "websocket_handler.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <pthread.h>
#include <arpa/inet.h>

#define HOST "127.0.0.1"
#define PORT 8000

struct client_arg {
    int conn;
    struct sockaddr_in addr;
};

static void *client_thread(void *arg) {
    struct client_arg *c = (struct client_arg*)arg;
    int conn = c->conn;
    free(c);

    char method[16];
    char path[512];
    header_t headers[MAX_HEADERS];
    int header_count = 0;

    // inisialisasi agar tidak berisi sampah
    method[0] = '\0';
    path[0] = '\0';

    if (read_http_request(conn, method, path, headers, &header_count) != 0) {
        // gagal membaca request -> tutup koneksi
        close(conn);
        pthread_exit(NULL);
    }

    // jika bukan websocket path "/ws" -> layani HTTP
    const char *upgrade = get_header(headers, header_count, "upgrade");
    if (strcmp(method, "GET") == 0 && strcmp(path, "/ws") != 0) {
        handle_http(conn, method, path, headers, header_count);
        // koneksi ditutup oleh handle_http (header Connection: close)
        close(conn);
    } else {
        if (upgrade && strcasecmp(upgrade, "websocket") == 0 && strcmp(path, "/ws") == 0) {
            // serahkan ke handler websocket (handler yang akan menutup soket saat selesai)
            handle_websocket(conn, headers, header_count);
        } else {
            // kirim 400 Bad Request
            header_t resp_headers[1];
            strcpy(resp_headers[0].key, "Content-Type");
            strcpy(resp_headers[0].value, "text/plain");
            size_t resp_len;
            char *resp = http_response(400, "Bad Request",
                                       resp_headers, 1,
                                       (const unsigned char*)"Invalid request",
                                       strlen("Invalid request"),
                                       &resp_len);
            if (resp) {
                send(conn, resp, resp_len, 0);
                free(resp);
            }
            close(conn);
        }
    }

    pthread_exit(NULL);
}

void run_server(void) {
    int server_fd;
    struct sockaddr_in server_addr;
    int opt = 1;

    server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) {
        perror("socket");
        exit(EXIT_FAILURE);
    }

    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
        perror("setsockopt");
        close(server_fd);
        exit(EXIT_FAILURE);
    }

    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    inet_pton(AF_INET, HOST, &server_addr.sin_addr);
    server_addr.sin_port = htons(PORT);

    if (bind(server_fd, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
        perror("bind");
        close(server_fd);
        exit(EXIT_FAILURE);
    }

    if (listen(server_fd, 128) < 0) {
        perror("listen");
        close(server_fd);
        exit(EXIT_FAILURE);
    }

    printf("Serving HTTP + WebSocket on %s:%d\n", HOST, PORT);

    while (1) {
        struct sockaddr_in client_addr;
        socklen_t addrlen = sizeof(client_addr);
        int conn = accept(server_fd, (struct sockaddr*)&client_addr, &addrlen);
        if (conn < 0) {
            perror("accept");
            continue;
        }

        struct client_arg *carg = malloc(sizeof(struct client_arg));
        if (!carg) {
            close(conn);
            continue;
        }
        carg->conn = conn;
        memcpy(&carg->addr, &client_addr, sizeof(client_addr));

        pthread_t tid;
        if (pthread_create(&tid, NULL, client_thread, carg) != 0) {
            perror("pthread_create");
            close(conn);
            free(carg);
            continue;
        }
        pthread_detach(tid); // agar tidak perlu pthread_join (mirip daemon thread)
    }

    close(server_fd);
}

int main(void) {
    run_server();
    return 0;
}

