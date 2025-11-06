// websocket.js
import { hitung_kunci_public, hitung_shared_key, xor_decrypt_bytes, chacha20_decrypt } from './crypto.js';
import { decompressSync, strFromU8 } from "./fflate.js";
import { compressBytes, decompressBytes } from './brotli_web.js';
import { updateView } from './view.js'; 

let ws = null;
let client_private = null;
let seed = null;

let pendingPath = null;

function decodeBase64(b64) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

export function requestPage(path) {
    const p = 23;
    const g = 2;
    
    //priv = Math.floor(Math.random() * (p-2)) + 2;
    //const client_pub = Number(modPow(BigInt(g), BigInt(priv), BigInt(p)));


    const { clientPriv, clientPub } = hitung_kunci_public(p, g);
    client_private = clientPriv;
    console.log("Proses Pertukaran kunci");
    console.log(" * Private Key =", client_private);
    console.log(" * Public Key =", clientPub);

    pendingPath = path;

    ws.send(JSON.stringify({ type: "dhe_init", p, g, pub: clientPub }));
}

export function connect(contentEl, onPageLoaded) {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${location.host}/ws`;
    ws = new WebSocket(url);

    // var Jenis :Digunakan untuk memilih jenis compress (1. Brotli, 2. ZLib, 3. Gzip, 4.Deflate)
    let jenis = parseInt(localStorage.getItem("jenis") || "0");
    jenis++;
    if (jenis > 4) jenis = 1;
    localStorage.setItem("jenis", jenis);

    ws.onopen = () => {
        // console.log('WS connected');
        // kalau URL root, fallback ke page1.html, selain itu ikuti pathname
        let initialPath = location.pathname === "/" ? "/page1.html" : location.pathname;
        requestPage(initialPath);
    };

    ws.onmessage = async (ev) => {
        const msg = JSON.parse(ev.data);

        if (msg.type === "dhe") {
            const server_pub = msg.pub;
            const p = msg.p;
            const g = msg.g;

            const shared_secret = hitung_shared_key(server_pub, client_private, p); //Number(modPow(BigInt(server_pub), BigInt(priv), BigInt(p)));
            seed = shared_secret % 1000;
            
            console.log(" * Kunci bersama =", shared_secret);

            ws.send(JSON.stringify({ type: "get_page", path: pendingPath, secure_type : jenis }));
            return;
        }

        if (msg.type === "page") {
            const b64Cipher = msg.html;
            let plainText = b64Cipher;

            if (msg.encrypted) {
                console.log("Proses Dekripsi");
                
                jenis = Number(msg.secure_type);
                const cipherBytes = decodeBase64(b64Cipher);
                
                //const decryptedBytes = xor_decrypt_bytes(cipherBytes, seed);
                const decryptedBytes = chacha20_decrypt(cipherBytes, seed);
                let plainBytes;

                let startTime = performance.now(); // ⏱️ Mulai hitung waktu
                try {
                    if(jenis == 1) {
                        // ini decompress dengan Brotli
                        plainBytes = await decompressBytes(decryptedBytes);
                        console.log(" * Decompress Brotli");
                    } else if(jenis == 2) {
                        // ini decompress dengan Zlib
                        plainBytes = decompressSync(decryptedBytes, { format: 'zlib' });
                        console.log(" * Decompress Zlib");
                    } else if(jenis == 3) {
                        // ini decompress dengan Gzip
                        plainBytes = decompressSync(decryptedBytes, { format: 'gzip' });
                        console.log(" * Decompress Gzip");
                    } else if(jenis == 4) {
                        // ini decompress dengan Deflate
                        plainBytes = decompressSync(decryptedBytes, { format: 'raw' });
                        console.log(" * Decompress Deflate");
                    }

                    
                    plainText = strFromU8(plainBytes);
                } catch (err) {
                    console.error("Decompression failed:", err);
                }

                let endTime = performance.now(); // ⏱️ Selesai hitung waktu
                const elapsed = (endTime - startTime) / 1000; 

                // LOG UKURAN
                const sizeCipher = b64Cipher.length;
                const sizeDecrypted = decryptedBytes.length;
                const sizePlain = plainBytes ? plainBytes.length : 0;

                console.log(` * Ukuran cipher B64 : ${sizeCipher} bytes (${(sizeCipher/1024).toFixed(2)} KB)`);
                console.log(` * Ukuran decrypted  : ${sizeDecrypted} bytes (${(sizeDecrypted/1024).toFixed(2)} KB)`);
                console.log(` * Ukuran decompress : ${sizePlain} bytes (${(sizePlain/1024).toFixed(2)} KB)`);
                console.log(` * Waktu dekompresi  : ${elapsed.toFixed(6)} detik`);
            }

            // panggil view.js
            updateView(plainText, b64Cipher);
            if (onPageLoaded) onPageLoaded();
        }
    };
}


