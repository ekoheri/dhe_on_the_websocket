#include "crypto_handler.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

long long mod_exp(long long base, long long exp, long long mod) {
    long long result = 1;
    base = base % mod;
    while (exp > 0) {
        if (exp % 2 == 1) {
            result = (result * base) % mod;
        }
        exp /= 2;
        base = (base * base) % mod;
    }
    return result;
}

char* generate_key(int seed, int length, long long a, long long c, long long m) {
    int* key_stream = malloc((length + 1) * sizeof(int));
    key_stream[0] = seed;
    long long X = seed;
    for (int i = 0; i < length; i++) {
        X = (a * X + c) % m;
        key_stream[i + 1] = (int)X;
    }

    char* result = malloc(length * 10);
    result[0] = '\0';
    for (int i = 0; i <= length; i++) {
        char buf[32];
        sprintf(buf, "%d", key_stream[i]);
        strcat(result, buf);
    }
    free(key_stream);
    return result;
}

char* xor_encrypt(const char* plaintext, int seed) {
    int len = strlen(plaintext);
    char* key_str = generate_key(seed, len, 987654321, 1000, 526);
    int key_len = strlen(key_str);
    int* key_digits = malloc(key_len * sizeof(int));
    for (int i = 0; i < key_len; i++) {
        key_digits[i] = key_str[i] - '0';
    }

    char* ciphertext = malloc(len * 2 + 1);
    ciphertext[0] = '\0';
    for (int i = 0; i < len; i++) {
        int xor_val = (unsigned char)plaintext[i] ^ key_digits[i % key_len];
        char buf[8];
        sprintf(buf, "%02x", xor_val);
        strcat(ciphertext, buf);
    }

    free(key_str);
    free(key_digits);
    return ciphertext;
}

char* xor_decrypt(const char* ciphertext, int seed) {
    int len = strlen(ciphertext) / 2;
    char* key_str = generate_key(seed, len, 987654321, 1000, 526);
    int key_len = strlen(key_str);
    int* key_digits = malloc(key_len * sizeof(int));
    for (int i = 0; i < key_len; i++) {
        key_digits[i] = key_str[i] - '0';
    }

    char* plaintext = malloc(len + 1);
    for (int i = 0; i < len; i++) {
        char hex[3] = {ciphertext[i * 2], ciphertext[i * 2 + 1], '\0'};
        int val = (int)strtol(hex, NULL, 16);
        plaintext[i] = (char)(val ^ key_digits[i % key_len]);
    }
    plaintext[len] = '\0';

    free(key_str);
    free(key_digits);
    return plaintext;
}
