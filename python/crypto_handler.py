def mod_exp(base, exp, mod):
    result = 1
    base = base % mod
    while exp > 0:
        if exp % 2 == 1:
            result = (result * base) % mod
        exp //= 2
        base = (base * base) % mod
    return result


def generate_key(seed, length, a=987654321, c=1000, m=526):
    key_stream = [seed]
    X = seed
    for _ in range(length):
        X = (a * X + c) % m
        key_stream.append(X)
    return "".join(str(num) for num in key_stream)


def xor_encrypt(plaintext, seed):
    key_str = generate_key(seed, len(plaintext))
    print("  *** Kunci Enkripsi Asli :")
    print(f"{key_str}")
    key_digits = [int(ch) for ch in key_str]

    ciphertext = []
    for i, ch in enumerate(plaintext):
        xor_val = ord(ch) ^ key_digits[i % len(key_digits)]
        ciphertext.append(f"{xor_val:02x}")
    return "".join(ciphertext)

def xor_encrypt_bytes(plain_bytes, seed):
    key_str = generate_key(seed, len(plain_bytes))
    key_digits = [int(ch) for ch in key_str]
    ciphertext = bytearray()
    for i, b in enumerate(plain_bytes):
        xor_val = b ^ key_digits[i % len(key_digits)]
        ciphertext.append(xor_val)
    return bytes(ciphertext)

def xor_decrypt(ciphertext, seed):
    key_str = generate_key(seed, len(ciphertext) // 2)
    key_digits = [int(ch) for ch in key_str]

    bytes_cipher = [int(ciphertext[i:i+2], 16) for i in range(0, len(ciphertext), 2)]

    plaintext_chars = []
    for i, val in enumerate(bytes_cipher):
        ch = val ^ key_digits[i % len(key_digits)]
        plaintext_chars.append(chr(ch))
    return "".join(plaintext_chars)
