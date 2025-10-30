#ifndef HTTP_HANDLER_H
#define HTTP_HANDLER_H

#include <stddef.h>

#define MAX_HEADERS 100

// Struktur header key-value
typedef struct {
    char key[256];
    char value[1024];
} header_t;

// Membaca HTTP request dari socket
int read_http_request(int conn, char* method, char* path, header_t* headers, int* header_count);

// Membuat response HTTP lengkap
char* http_response(int status_code, const char* reason, 
                    header_t* headers, int header_count, 
                    const unsigned char* body, size_t body_len, size_t* resp_len);

// Menangani request HTTP (GET file dari DOCROOT)
void handle_http(int conn, const char* method, const char* path, header_t* headers, int header_count);

// Ambil header tertentu
const char* get_header(header_t* headers, int header_count, const char* key);

#endif
