import random
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend

# constants.py

# p_hex = """
# FFFFFFFFFFFFFFFFADF85458A2BB4A9AAFDC5620273D3CF1
# D8B9C583CE2D3695A9E13641146433FBCC939DCE249B3EF9
# 7D2FE363630C75D8F681B202AEC4617AD3DF1ED5D5FD6561
# 2433F51F5F066ED0856365553DED1AF3B557135E7F57C935
# 984F0C70E0E68B77E2A689DAF3EFE8721DF158A136ADE735
# 30ACCA4F483A797ABC0AB182B324FB61D108A94BB2C8E3FB
# B96ADAB760D7F4681D4F42A3DE394DF4AE56EDE76372BB19
# 0B07A7C8EE0A6D709E02FCE1CDF7E2ECC03404CD28342F61
# 9172FE9CE98583FF8E4F1232EEF28183C3FE3B1B4C6FAD73
# 3BB5FCBC2EC22005C58EF1837D1683B2C6F34A26C1B2EFFA
# 886B423861285C97FFFFFFFFFFFFFFFF
# """.replace("\n", "").replace(" ", "")
# 
# prime = int(p_hex, 16)
# generator = 2

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

def random_private_key(bits=256):
    priv = 0
    for _ in range(0, bits, 32):
        priv = (priv << 32) + random.getrandbits(32)
    return priv

def hitung_public_key(p, g):
    # server_priv = random.randint(2, p - 2)
    server_priv = random_private_key(256)
    return server_priv, mod_exp(g, server_priv, p)

def hitung_shared_key(client_pub, server_priv, p):
    return mod_exp(client_pub, server_priv, p)

# Fungsi untuk menghitung HKDF
def derive_key_nonce(shared_secret_int):
    secret_bytes = shared_secret_int.to_bytes((shared_secret_int.bit_length() + 7) // 8, 'big')

    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=44,  # 32 untuk key, 12 untuk nonce
        salt=None,  # harus sama di JS
        info=b"ChaCha20 key+nonce derivation",  # harus sama di JS
        backend=default_backend()
    )
    derived = hkdf.derive(secret_bytes)
    key = derived[:32]
    nonce = derived[32:44]
    return key, nonce
