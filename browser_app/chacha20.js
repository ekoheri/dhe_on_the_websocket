function rotl(x, n) {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}

function quarterRound(s, a, b, c, d) {
  s[a] = (s[a] + s[b]) >>> 0; s[d] = rotl(s[d] ^ s[a], 16);
  s[c] = (s[c] + s[d]) >>> 0; s[b] = rotl(s[b] ^ s[c], 12);
  s[a] = (s[a] + s[b]) >>> 0; s[d] = rotl(s[d] ^ s[a], 8);
  s[c] = (s[c] + s[d]) >>> 0; s[b] = rotl(s[b] ^ s[c], 7);
}

function chacha20Block(key, nonce, counter = 0) {
  const s = new Uint32Array(16);
  // constants
  s[0] = 0x61707865; s[1] = 0x3320646e; s[2] = 0x79622d32; s[3] = 0x6b206574;
  // key (32 bytes)
  for (let i = 0; i < 8; i++) {
      s[4 + i] = (key[i * 4]) | (key[i * 4 + 1] << 8) | (key[i * 4 + 2] << 16) | (key[i * 4 + 3] << 24);
  }
  // nonce (16 bytes)
  for (let i = 0; i < 4; i++) {
      s[12 + i] = (nonce[i * 4]) | (nonce[i * 4 + 1] << 8) | (nonce[i * 4 + 2] << 16) | (nonce[i * 4 + 3] << 24);
  }
  // set counter di posisi s[12] (4 byte pertama dari nonce)
  s[12] += counter;

  const working = new Uint32Array(s);
  for (let i = 0; i < 10; i++) {
      quarterRound(working, 0, 4, 8, 12);
      quarterRound(working, 1, 5, 9, 13);
      quarterRound(working, 2, 6, 10, 14);
      quarterRound(working, 3, 7, 11, 15);
      quarterRound(working, 0, 5, 10, 15);
      quarterRound(working, 1, 6, 11, 12);
      quarterRound(working, 2, 7, 8, 13);
      quarterRound(working, 3, 4, 9, 14);
  }

  const out = new Uint8Array(64);
  for (let i = 0; i < 16; i++) {
      const v = (working[i] + s[i]) >>> 0;
      out[i * 4] = v & 0xff;
      out[i * 4 + 1] = (v >>> 8) & 0xff;
      out[i * 4 + 2] = (v >>> 16) & 0xff;
      out[i * 4 + 3] = (v >>> 24) & 0xff;
  }
  return out;
}

// ==================== ChaCha20 XOR ====================
export function chacha20XOR(inputBytes, key, nonce) {
  const out = new Uint8Array(inputBytes.length);
  let blockCount = 0;
  for (let pos = 0; pos < inputBytes.length; pos += 64) {
      const block = chacha20Block(key, nonce, blockCount);
      for (let i = 0; i < 64 && pos + i < inputBytes.length; i++) {
          out[pos + i] = inputBytes[pos + i] ^ block[i];
      }
      blockCount++;
  }
  return out;
}