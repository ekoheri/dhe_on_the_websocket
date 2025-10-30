#ifndef WEBSOCKET_HANDLER_H
#define WEBSOCKET_HANDLER_H

#include "http_handler.h"

// Menangani koneksi WebSocket
void handle_websocket(int conn, header_t* headers, int header_count);

#endif
