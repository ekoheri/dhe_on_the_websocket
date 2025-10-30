#include "http_handler.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <ctype.h>
#include <sys/socket.h>

#define DOCROOT "../doc-html"

int read_http_request(int conn, char* method, char* path, header_t* headers, int* header_count) {
    char buffer[65536];
    int received = 0;

    while (strstr(buffer, "\r\n\r\n") == NULL && received < sizeof(buffer)-1) {
        int n = recv(conn, buffer + received, sizeof(buffer) - 1 - received, 0);
        if (n <= 0) break;
        received += n;
    }
    buffer[received] = '\0';

    if (received == 0) return -1;

    char* line = strtok(buffer, "\r\n");
    if (!line) return -1;

    // Parse request line
    if (sscanf(line, "%15s %255s", method, path) < 2) return -1;

    *header_count = 0;
    while ((line = strtok(NULL, "\r\n")) != NULL && strlen(line) > 0) {
        char* colon = strchr(line, ':');
        if (colon && *header_count < MAX_HEADERS) {
            *colon = '\0';
            strncpy(headers[*header_count].key, line, sizeof(headers[*header_count].key)-1);
            strncpy(headers[*header_count].value, colon+1, sizeof(headers[*header_count].value)-1);

            // trim whitespace
            while (isspace((unsigned char)headers[*header_count].value[0])) {
                memmove(headers[*header_count].value, headers[*header_count].value+1, strlen(headers[*header_count].value));
            }

            (*header_count)++;
        }
    }

    printf("Request via HTTP : %s\n", path);
    return 0;
}

const char* guess_mime(const char* path) {
    if (strstr(path, ".html")) return "text/html; charset=utf-8";
    if (strstr(path, ".js"))   return "application/javascript; charset=utf-8";
    if (strstr(path, ".css"))  return "text/css; charset=utf-8";
    return "application/octet-stream";
}

char* http_response(int status_code, const char* reason, 
                    header_t* headers, int header_count, 
                    const unsigned char* body, size_t body_len, size_t* resp_len) {
    char head[8192];
    int offset = snprintf(head, sizeof(head), "HTTP/1.1 %d %s\r\n", status_code, reason);

    for (int i = 0; i < header_count; i++) {
        offset += snprintf(head+offset, sizeof(head)-offset, "%s: %s\r\n", 
                           headers[i].key, headers[i].value);
    }
    offset += snprintf(head+offset, sizeof(head)-offset, "\r\n");

    *resp_len = offset + body_len;
    char* resp = malloc(*resp_len);
    memcpy(resp, head, offset);
    memcpy(resp+offset, body, body_len);
    return resp;
}

void handle_http(int conn, const char* method, const char* path, header_t* headers, int header_count) {
    if (strcmp(method, "GET") != 0) {
        header_t resp_headers[1];
        strcpy(resp_headers[0].key, "Content-Type");
        strcpy(resp_headers[0].value, "text/plain");
        size_t resp_len;
        char* resp = http_response(405, "Method Not Allowed", resp_headers, 1,
                                   (const unsigned char*)"405 Method Not Allowed", 23, &resp_len);
        send(conn, resp, resp_len, 0);
        free(resp);
        return;
    }

    const char* allowed_files[] = {
        "index.html", "main.js", "websocket.js", "navigation.js", "crypto.js", "view.js", "favicon.ico"
    };
    int allowed_count = sizeof(allowed_files)/sizeof(allowed_files[0]);

    char filename[512];
    if (strcmp(path, "/") == 0) {
        strcpy(filename, "index.html");
    } else {
        strncpy(filename, path+1, sizeof(filename)-1);
    }

    int is_allowed = 0;
    for (int i = 0; i < allowed_count; i++) {
        if (strcmp(filename, allowed_files[i]) == 0) {
            is_allowed = 1;
            break;
        }
    }

    char filepath[1024];
    if (is_allowed) {
        snprintf(filepath, sizeof(filepath), "%s/%s", DOCROOT, filename);
    } else {
        snprintf(filepath, sizeof(filepath), "%s/index.html", DOCROOT);
    }

    FILE* f = fopen(filepath, "rb");
    if (!f) {
        header_t resp_headers[1];
        strcpy(resp_headers[0].key, "Content-Type");
        strcpy(resp_headers[0].value, "text/plain");
        size_t resp_len;
        char* resp = http_response(404, "Not Found", resp_headers, 1,
                                   (const unsigned char*)"404 Not Found", 13, &resp_len);
        send(conn, resp, resp_len, 0);
        free(resp);
        return;
    }

    fseek(f, 0, SEEK_END);
    long fsize = ftell(f);
    rewind(f);

    unsigned char* body = malloc(fsize);
    fread(body, 1, fsize, f);
    fclose(f);

    header_t resp_headers[3];
    strcpy(resp_headers[0].key, "Content-Type");
    strcpy(resp_headers[0].value, guess_mime(filepath));
    strcpy(resp_headers[1].key, "Content-Length");
    sprintf(resp_headers[1].value, "%ld", fsize);
    strcpy(resp_headers[2].key, "Connection");
    strcpy(resp_headers[2].value, "close");

    size_t resp_len;
    char* resp = http_response(200, "OK", resp_headers, 3, body, fsize, &resp_len);
    send(conn, resp, resp_len, 0);

    printf(" * Response via HTTP : %s\n", filepath);

    free(body);
    free(resp);
}

const char* get_header(header_t* headers, int header_count, const char* key) {
    for (int i = 0; i < header_count; i++) {
        if (strcasecmp(headers[i].key, key) == 0) {
            return headers[i].value;
        }
    }
    return NULL;
}
