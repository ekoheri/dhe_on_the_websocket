// crypto.js

// modular exponentiation (Diffie-Hellman)
import { chacha20XOR } from './chacha20.js';

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

function hitung_lcg_bytes(seed, length, a = 1664525n, c = 1013904223n, m = 2n ** 32n) {
    let X = BigInt(seed);
    const out = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        X = (a * X + c) % m;
        out[i] = Number(X & 0xFFn); // ambil 1 byte
    }
    return out;
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

export function chacha20_decrypt(cipherBytes, seed) {
    const lcg48 = hitung_lcg_bytes(seed, 48);
    const key = lcg48.slice(0, 32);   // 32-byte key
    const nonce = lcg48.slice(32);    // 16-byte nonce

    return chacha20XOR(cipherBytes, key, nonce);
}
