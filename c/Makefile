CC = gcc
LDFLAGS = -lpthread -ljson-c -lcrypto

TARGET = server
SRCS = server.c http_handler.c websocket_handler.c crypto_handler.c

all: $(TARGET)

$(TARGET): $(SRCS)
	$(CC) $(SRCS) -o $(TARGET) $(LDFLAGS)

run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET)
