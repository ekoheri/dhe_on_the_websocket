// --- Bagian inisialisasi Brotli WASM tanpa index.web.js ---
import init, * as brotliWasm from "./brotli_wasm.js";

let brotli;
(async () => {
  await init();                 // panggil inisialisasi bawaan
  brotli = brotliWasm;          // simpan semua ekspor
  console.log("Brotli WASM siap digunakan!");
})();

// ==========================
// Fungsi Byte-Level API
// ==========================
export function compressBytes(inputBytes) {
  if (!brotli) throw new Error("Brotli belum siap!");
  return brotli.compress(inputBytes);
}

export function decompressBytes(compressedBytes) {
  if (!brotli) throw new Error("Brotli belum siap!");
  return brotli.decompress(compressedBytes);
}