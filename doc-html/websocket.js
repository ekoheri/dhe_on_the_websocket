// websocket.js
import { modPow, xor_decrypt } from './crypto.js';
import { updateView } from './view.js'; // hanya impor dari view.js

let ws = null;
let priv = null;
let seed = null;
let pendingPath = null;

export function connect(contentEl, onPageLoaded) {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${location.host}/ws`;
    ws = new WebSocket(url);

    ws.onopen = () => {
        console.log('WS connected');
        // requestPage(location.pathname);
        // kalau URL root, fallback ke page1.html, selain itu ikuti pathname
        let initialPath = location.pathname === "/" ? "/page1.html" : location.pathname;
        requestPage(initialPath);
    };

    ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);

        if (msg.type === "dhe") {
            const server_pub = msg.pub;
            const p = msg.p;
            const g = msg.g;

            const shared_secret = Number(modPow(BigInt(server_pub), BigInt(priv), BigInt(p)));
            seed = shared_secret % 1000;
            
            console.log("Kunci bersama =", shared_secret);

            ws.send(JSON.stringify({ type: "get_page", path: pendingPath }));
            return;
        }

        if (msg.type === "page") {
            const cipherText = msg.html;
            let plainText = cipherText;
            if (msg.encrypted) {
                console.log("Proses Dekripsi");
                plainText = xor_decrypt(cipherText, seed);
            }

            // panggil view.js
            updateView(plainText, cipherText);
            if (onPageLoaded) onPageLoaded();
        }
    };
}

export function requestPage(path) {
    const p = 23;
    const g = 2;
    priv = Math.floor(Math.random() * (p-2)) + 2;
    const client_pub = Number(modPow(BigInt(g), BigInt(priv), BigInt(p)));
    console.log("Private Key =", priv);
    console.log("Public Key =", client_pub);

    pendingPath = path;

    ws.send(JSON.stringify({ type: "dhe_init", p, g, pub: client_pub }));
}
