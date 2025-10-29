// websocket.js
import { modPow, xor_decrypt_bytes } from './crypto.js';
import { decompressSync, strFromU8 } from "./fflate.js";
import { updateView } from './view.js'; // hanya impor dari view.js

let ws = null;
let priv = null;
let seed = null;
let pendingPath = null;

function decodeBase64(b64) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

export function requestPage(path) {
    const p = 23;
    const g = 2;
    priv = Math.floor(Math.random() * (p-2)) + 2;
    const client_pub = Number(modPow(BigInt(g), BigInt(priv), BigInt(p)));
    console.log("Proses Pertukaran kunci");
    console.log(" * Private Key =", priv);
    console.log(" * Public Key =", client_pub);

    pendingPath = path;

    ws.send(JSON.stringify({ type: "dhe_init", p, g, pub: client_pub }));
}

export function connect(contentEl, onPageLoaded) {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${location.host}/ws`;
    ws = new WebSocket(url);

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

            const shared_secret = Number(modPow(BigInt(server_pub), BigInt(priv), BigInt(p)));
            seed = shared_secret % 1000;
            
            console.log(" * Kunci bersama =", shared_secret);

            ws.send(JSON.stringify({ type: "get_page", path: pendingPath }));
            return;
        }

        if (msg.type === "page") {
            const b64Cipher = msg.html;
            let plainText = b64Cipher;

            if (msg.encrypted) {
                console.log("Proses Dekripsi");
                
                const cipherBytes = decodeBase64(b64Cipher);
                
                const decryptedBytes = xor_decrypt_bytes(cipherBytes, seed);
                let plainBytes;
                try {
                    plainBytes = decompressSync(decryptedBytes, { format: 'zlib' });
                    plainText = strFromU8(plainBytes);
                } catch (err) {
                    console.error("Decompression failed:", err);
                }

                // LOG UKURAN
                const sizeCipher = b64Cipher.length;
                const sizeDecrypted = decryptedBytes.length;
                const sizePlain = plainBytes ? plainBytes.length : 0;

                console.log(` * Ukuran cipher B64 : ${sizeCipher} bytes (${(sizeCipher/1024).toFixed(2)} KB)`);
                console.log(` * Ukuran decrypted  : ${sizeDecrypted} bytes (${(sizeDecrypted/1024).toFixed(2)} KB)`);
                console.log(` * Ukuran decompress : ${sizePlain} bytes (${(sizePlain/1024).toFixed(2)} KB)`);
            }

            // panggil view.js
            updateView(plainText, b64Cipher);
            if (onPageLoaded) onPageLoaded();
        }
    };
}


