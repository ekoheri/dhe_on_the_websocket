import random
from chacha20 import chacha20_encrypt

# implementasi rumus DHE : p^g mod p
def mod_exp(base, exp, mod):
    result = 1
    base = base % mod
    while exp > 0:
        if exp % 2 == 1:
            result = (result * base) % mod
        exp //= 2
        base = (base * base) % mod
    return result

def hitung_public_key(p, g):
    server_priv = random.randint(2, p - 2)
    return server_priv, mod_exp(g, server_priv, p)

def hitung_shared_key(client_pub, server_priv, p):
    return mod_exp(client_pub, server_priv, p)

def hitung_lcg(seed, length, a=987654321, c=1000, m=526):
    key_stream = [seed]
    X = seed
    for _ in range(length):
        X = (a * X + c) % m
        key_stream.append(X)
    return "".join(str(num) for num in key_stream)

def hitung_lcg_hex(seed, length, a=1664525, c=1013904223, m=2**32):
    X = seed
    out = []
    for _ in range(length):
        X = (a * X + c) % m
        # ambil 1 byte terakhir, ubah ke hexa 2 digit
        out.append(f"{X & 0xFF:02x}")
    return "".join(out)

def xor_encrypt_bytes(plain_bytes, seed):
    key_str = hitung_lcg(seed, len(plain_bytes))
    key_digits = [int(ch) for ch in key_str]
    ciphertext = bytearray()
    for i, b in enumerate(plain_bytes):
        xor_val = b ^ key_digits[i % len(key_digits)]
        ciphertext.append(xor_val)
    return bytes(ciphertext)

def chacha_encrypt_byte(plain_bytes, seed):
    key_str = hitung_lcg_hex(seed, 48)  # 48 byte → 96 hex chars
    print(key_str)
    key = bytes.fromhex(key_str[:64])   # 32 byte
    nonce = bytes.fromhex(key_str[64:96]) # 16 byte

    return chacha20_encrypt(plain_bytes, key, nonce)