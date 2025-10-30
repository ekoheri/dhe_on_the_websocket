// crypto.js

// modular exponentiation (Diffie-Hellman)
function modPow(base, exp, mod) {
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

export function hitung_kunci_public(p, g){
    const clientPriv = Math.floor(Math.random() * (p-2)) + 2;
    const clientPub = Number(modPow(BigInt(g), BigInt(clientPriv), BigInt(p)));;//modPow(g, serverPriv, p);
    return { clientPriv, clientPub };
}

export function hitung_shared_key(server_pub, client_priv, p) {
    return Number(modPow(BigInt(server_pub), BigInt(client_priv), BigInt(p)));
}

// pseudo-random key generator
function hitung_lcg(seed, length, a = 987654321, c = 1000, m = 526) {
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
export function xor_decrypt_bytes(cipherBytes, seed) {
    const key_str = hitung_lcg(seed, cipherBytes.length);
    const key_digits = key_str.split("").map(ch => parseInt(ch, 10));

    const plainBytes = new Uint8Array(cipherBytes.length);
    for (let i = 0; i < cipherBytes.length; i++) {
        plainBytes[i] = cipherBytes[i] ^ key_digits[i % key_digits.length];
    }
    return plainBytes; // hasilnya Uint8Array siap didekompres
}

