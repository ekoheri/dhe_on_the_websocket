import struct

# Fungsi utilitas rotasi 32-bit ke kiri
def rotl(x, n):
    """Rotate Left 32-bit."""
    # (x << n) | (x >>> (32 - n))
    return ((x << n) & 0xFFFFFFFF) | (x >> (32 - n))

# Fungsi Quarter Round
def quarter_round(x, a, b, c, d):
    """ChaCha20 Quarter Round operation on indices a, b, c, d."""
    # (x[a] + x[b])
    x[a] = (x[a] + x[b]) & 0xFFFFFFFF
    # (x[d] ^ x[a]), rotl 16
    x[d] = rotl(x[d] ^ x[a], 16)

    # (x[c] + x[d])
    x[c] = (x[c] + x[d]) & 0xFFFFFFFF
    # (x[b] ^ x[c]), rotl 12
    x[b] = rotl(x[b] ^ x[c], 12)

    # (x[a] + x[b])
    x[a] = (x[a] + x[b]) & 0xFFFFFFFF
    # (x[d] ^ x[a]), rotl 8
    x[d] = rotl(x[d] ^ x[a], 8)

    # (x[c] + x[d])
    x[c] = (x[c] + x[d]) & 0xFFFFFFFF
    # (x[b] ^ x[c]), rotl 7
    x[b] = rotl(x[b] ^ x[c], 7)

# Fungsi Inisialisasi State dan Komputasi Block
def chacha20_block(key_bytes, nonce_bytes, counter):
    """
    Menghasilkan satu keystream block (64 byte) ChaCha20.
    Key 32B, Nonce 12B, Counter 4B.
    """
    # 1. Inisialisasi State Awal (16 words 32-bit)
    state = [0] * 16

    # Constants (s[0]-s[3]): "expa", "nd 32-", "byte", " k"
    # Format 'I' adalah unsigned 32-bit integer, '<' adalah Little-Endian
    constants = struct.unpack('<4I', b'expand 32-byte k')
    state[0:4] = list(constants)

    # Key (s[4]-s[11]): 32 bytes (Little-Endian)
    state[4:12] = struct.unpack('<8I', key_bytes)
    
    # Counter (s[12]): 4 bytes (Little-Endian)
    state[12] = counter & 0xFFFFFFFF
    
    # Nonce/IV (s[13]-s[15]): 12 bytes (Little-Endian)
    state[13:16] = struct.unpack('<3I', nonce_bytes)

    # State kerja untuk 20 putaran
    working_state = list(state)
    
    # 2. Komputasi Block (20 Putaran)
    for _ in range(10): # 10 iterasi = 20 putaran
        # Column Rounds
        quarter_round(working_state, 0, 4, 8, 12)
        quarter_round(working_state, 1, 5, 9, 13)
        quarter_round(working_state, 2, 6, 10, 14)
        quarter_round(working_state, 3, 7, 11, 15)

        # Diagonal Rounds
        quarter_round(working_state, 0, 5, 10, 15)
        quarter_round(working_state, 1, 6, 11, 12)
        quarter_round(working_state, 2, 7, 8, 13)
        quarter_round(working_state, 3, 4, 9, 14)

    # 3. Final Summation dan Output
    output_words = [
        (working_state[i] + state[i]) & 0xFFFFFFFF
        for i in range(16)
    ]
    
    # Konversi 16 words 32-bit (Little-Endian) kembali ke 64 byte
    # '<16I' artinya 16 unsigned 32-bit integers, Little-Endian
    return struct.pack('<16I', *output_words)

# Fungsi Enkripsi/Dekripsi Utama (XOR)
def chacha20_xor(data_bytes, key_bytes, nonce_bytes, initial_counter=1):
    """
    Melakukan enkripsi atau dekripsi XOR dengan ChaCha20.
    Data harus berupa bytes, Key 32B, Nonce 12B.
    """
    
    if len(key_bytes) != 32:
        raise ValueError("Key harus 32 byte (256-bit).")
    if len(nonce_bytes) != 12:
        raise ValueError("Nonce harus 12 byte (96-bit), sesuai RFC 8439.")
    
    data_length = len(data_bytes)
    output_bytes = bytearray(data_length)
    block_size = 64
    
    block_counter = initial_counter
    
    for offset in range(0, data_length, block_size):
        # 1. Generate Keystream Block
        keystream_block = chacha20_block(key_bytes, nonce_bytes, block_counter)
        
        # Tentukan panjang data yang tersisa di blok ini
        length_to_xor = min(block_size, data_length - offset)
        
        # 2. XOR dengan Data
        for i in range(length_to_xor):
            output_bytes[offset + i] = data_bytes[offset + i] ^ keystream_block[i]
            
        block_counter += 1
        
    return bytes(output_bytes)

def chacha20_encrypt(plaintext: bytes, key: bytes, nonce: bytes) -> bytes:
    cipher= chacha20_xor(plaintext, key, nonce, initial_counter=1)
    return cipher

def chacha20_decrypt(plaintext: bytes, key: bytes, nonce: bytes) -> bytes:
    plain = chacha20_xor(plaintext, key, nonce, initial_counter=1)
    return plain