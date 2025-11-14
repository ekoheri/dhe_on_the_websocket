// modular exponentiation (Diffie-Hellman)

// https://datatracker.ietf.org/doc/html/rfc7919#appendix-A.1
// Standard nilai p 2048 bit dari RFC 7919

const p_hex = `
FFFFFFFFFFFFFFFFADF85458A2BB4A9AAFDC5620273D3CF1
D8B9C583CE2D3695A9E13641146433FBCC939DCE249B3EF9
7D2FE363630C75D8F681B202AEC4617AD3DF1ED5D5FD6561
2433F51F5F066ED0856365553DED1AF3B557135E7F57C935
984F0C70E0E68B77E2A689DAF3EFE8721DF158A136ADE735
30ACCA4F483A797ABC0AB182B324FB61D108A94BB2C8E3FB
B96ADAB760D7F4681D4F42A3DE394DF4AE56EDE76372BB19
0B07A7C8EE0A6D709E02FCE1CDF7E2ECC03404CD28342F61
9172FE9CE98583FF8E4F1232EEF28183C3FE3B1B4C6FAD73
3BB5FCBC2EC22005C58EF1837D1683B2C6F34A26C1B2EFFA
886B423861285C97FFFFFFFFFFFFFFFF
`.replace(/\s+/g, "");

const prime = BigInt("0x" + p_hex);
const generator = 2n;

export {prime, generator};

function modPow(base, exp, mod) {
    let result = 1n;
    let b = base % mod;
    let e = exp;
    while (e > 0n) {
        if (e & 1n) result = (result * b) % mod;
        b = (b * b) % mod;
        e >>= 1n;
    }
    return result;
}

// Generate random private key (256-bit)
function randomPrivateKey(bits = 256) {
    let priv = 0n;
    for (let i = 0; i < bits; i += 32) {
        priv = (priv << 32n) + BigInt(Math.floor(Math.random() * 0x100000000));
    }
    return priv;
}

export function hitung_kunci_public(p, g){
    //const clientPriv = Math.floor(Math.random() * (p-2)) + 2;
    const clientPriv = randomPrivateKey(256);
    const clientPub = modPow(g, clientPriv, p);
    return { clientPriv, clientPub };
}

export function hitung_shared_key(server_pub_hex, client_priv_bigint, p_hex) {
    // 1. Kunci Publik Server (Base) dikonversi dari string hex yang diterima
    const base = BigInt("0x" + server_pub_hex); 
    
    // 2. Kunci Privat Klien (Eksponen) sudah berupa BigInt, gunakan langsung
    const exp = client_priv_bigint; 
    
    // 3. Modulus (p) dikonversi dari string hex yang diterima
    const mod = BigInt("0x" + p_hex);             
    
    return modPow(base, exp, mod);
}

// Hashed Message Authentication Code (HMAC)-based Key Derivation Function.
// HKDF (browser) → derive key+nonce untuk ChaCha20
export async function deriveKeyNonce(sharedSecretHex) {
    const secret = new Uint8Array(
        sharedSecretHex.match(/.{1,2}/g).map(b => parseInt(b,16))
    );

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        secret,
        "HKDF",
        false,
        ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "HKDF",
            hash: "SHA-256",
            salt: new Uint8Array([]),
            info: new TextEncoder().encode("ChaCha20 key+nonce derivation")
        },
        keyMaterial,
        44*8  // 32 key + 12 nonce
    );

    const derived = new Uint8Array(derivedBits);
    const key = derived.slice(0, 32);
    const nonce = derived.slice(32, 44); // 12 bytes
    return { key, nonce };
}

export function uint8ArrayToHex(arr) {
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// XOR dekripsi
/*export function xor_decrypt_bytes(cipherBytes, seed) {
    const key_str = hitung_lcg(seed, cipherBytes.length);
    const key_digits = key_str.split("").map(ch => parseInt(ch, 10));

    const plainBytes = new Uint8Array(cipherBytes.length);
    for (let i = 0; i < cipherBytes.length; i++) {
        plainBytes[i] = cipherBytes[i] ^ key_digits[i % key_digits.length];
    }
    return plainBytes; // hasilnya Uint8Array siap didekompres
}*/

