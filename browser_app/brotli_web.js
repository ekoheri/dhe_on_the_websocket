// --- Bagian inisialisasi Brotli WASM tanpa index.web.js ---
import init, * as brotliWasm from "./brotli_wasm.js";

let brotliReady = null;

export async function initBrotli() {
  if (!brotliReady) {
    brotliReady = (async () => {
      await init();
      return brotliWasm;
    })();
  }
  return brotliReady;
}

// ==========================
// Fungsi Byte-Level API
// ==========================
/*export function compressBytes(inputBytes) {
  if (!brotli) throw new Error("Brotli belum siap!");
  return brotli.compress(inputBytes);
}*/

export async function compressBytes(inputBytes) {
  const brotli = await initBrotli();

  if (!(inputBytes instanceof Uint8Array)) {
    console.warn("⚠️ Input bukan Uint8Array, akan dikonversi:", inputBytes);
    inputBytes = new TextEncoder().encode(inputBytes);
  }

  const result = brotli.compress(inputBytes);
  return result;
}

/*export function decompressBytes(compressedBytes) {
  if (!brotli) throw new Error("Brotli belum siap!");
  return brotli.decompress(compressedBytes);
}*/

export async function decompressBytes(compressedBytes) {
  const brotli = await initBrotli();

  if (!(compressedBytes instanceof Uint8Array)) {
    console.warn("⚠️ Input bukan Uint8Array, akan dikonversi:", compressedBytes);
    compressedBytes = new Uint8Array(compressedBytes);
  }

  const result = brotli.decompress(compressedBytes);
  return result;
}
