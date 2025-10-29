// crypto.js

// modular exponentiation (Diffie-Hellman)
export function modPow(base, exp, mod) {
    let result = 1n;
    let b = BigInt(base);
    let e = BigInt(exp);
    let m = BigInt(mod);
    while (e > 0n) {
        if (e & 1n) result = (result * b) % m;
        b = (b * b) % m;
        e >>= 1n;
    }
    return result;
}

// pseudo-random key generator
export function generate_key(seed, length, a = 987654321, c = 1000, m = 526) {
    let key_stream = [];
    key_stream.push(seed);
    let X = seed;
    for (let i = 0; i < length; i++) {
        X = (a * X + c) % m;
        key_stream.push(X);
    }
    return key_stream.map(num => String(num)).join("");
}

// XOR dekripsi
export function xor_decrypt(ciphertext, seed) {
    const key_str = generate_key(seed, ciphertext.length / 2);
    console.log("Kunci Dekripsi Asli =", key_str);
    const key_digits = key_str.split("").map(ch => parseInt(ch, 10));

    let bytes_cipher = [];
    for (let i = 0; i < ciphertext.length; i += 2) {
        bytes_cipher.push(parseInt(ciphertext.substr(i, 2), 16));
    }

    let plaintext_chars = [];
    for (let i = 0; i < bytes_cipher.length; i++) {
        let ch = bytes_cipher[i] ^ key_digits[i % key_digits.length];
        plaintext_chars.push(String.fromCharCode(ch));
    }

    return plaintext_chars.join("");
}

export function xor_decrypt_bytes(cipherBytes, seed) {
    const key_str = generate_key(seed, cipherBytes.length);
    const key_digits = key_str.split("").map(ch => parseInt(ch, 10));

    const plainBytes = new Uint8Array(cipherBytes.length);
    for (let i = 0; i < cipherBytes.length; i++) {
        plainBytes[i] = cipherBytes[i] ^ key_digits[i % key_digits.length];
    }
    return plainBytes; // hasilnya Uint8Array siap didekompres
}

