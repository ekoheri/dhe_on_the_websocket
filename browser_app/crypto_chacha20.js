// --- 2. CHA-CHA20 CORE (Sesuai RFC 8439) ---
    
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
  
  // 1. Constants (Little-Endian)
  s[0] = 0x61707865; s[1] = 0x3320646e; s[2] = 0x79622d32; s[3] = 0x6b206574;
  
  // 2. Key (32 bytes, Little-Endian)
  for (let i = 0; i < 8; i++) {
      const offset = i * 4;
      s[4 + i] = key[offset] 
               | (key[offset + 1] << 8) 
               | (key[offset + 2] << 16) 
               | (key[offset + 3] << 24);
  }
  
  // 3. Counter (4 bytes, Little-Endian)
  s[12] = counter >>> 0; 
      
  // 4. Nonce/IV (12 bytes, Little-Endian)
  for (let i = 0; i < 3; i++) {
      const offset = i * 4;
      s[13 + i] = nonce[offset] 
                | (nonce[offset + 1] << 8) 
                | (nonce[offset + 2] << 16) 
                | (nonce[offset + 3] << 24);
  }
  
  const working = new Uint32Array(s);
  
  for (let i = 0; i < 10; i++) {
      // Column Rounds
      quarterRound(working, 0, 4, 8, 12);
      quarterRound(working, 1, 5, 9, 13);
      quarterRound(working, 2, 6, 10, 14);
      quarterRound(working, 3, 7, 11, 15);
      // Diagonal Rounds
      quarterRound(working, 0, 5, 10, 15);
      quarterRound(working, 1, 6, 11, 12);
      quarterRound(working, 2, 7, 8, 13);
      quarterRound(working, 3, 4, 9, 14);
  }

  const out = new Uint8Array(64);
  for (let i = 0; i < 16; i++) {
      const v = (working[i] + s[i]) >>> 0;
      // Konversi 32-bit word ke 4 byte Little-Endian
      out[i * 4] = v & 0xff;
      out[i * 4 + 1] = (v >>> 8) & 0xff;
      out[i * 4 + 2] = (v >>> 16) & 0xff;
      out[i * 4 + 3] = (v >>> 24) & 0xff;
  }
  return out;
}

// ==================== ChaCha20 XOR ====================
export function chacha20XOR(inputBytes, key, nonce, initialCounter = 1) {
  if (key.length !== 32 || nonce.length !== 12) {
      throw new Error("Key harus 32 byte dan Nonce harus 12 byte (RFC 8439).");
  }
  if (!(inputBytes instanceof Uint8Array)) {
      throw new Error("Input harus Uint8Array.");
  }

  const out = new Uint8Array(inputBytes.length);
  let blockCount = initialCounter; 
  
  for (let pos = 0; pos < inputBytes.length; pos += 64) {
      const block = chacha20Block(key, nonce, blockCount);
      for (let i = 0; i < 64 && pos + i < inputBytes.length; i++) {
          out[pos + i] = inputBytes[pos + i] ^ block[i];
      }
      blockCount++;
  }
  return out;
}