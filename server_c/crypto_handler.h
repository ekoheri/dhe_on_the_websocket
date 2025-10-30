#ifndef CRYPTO_HANDLER_H
#define CRYPTO_HANDLER_H

#include <stddef.h>

long long mod_exp(long long base, long long exp, long long mod);
char* generate_key(int seed, int length, long long a, long long c, long long m);
char* xor_encrypt(const char* plaintext, int seed);
char* xor_decrypt(const char* ciphertext, int seed);

#endif
