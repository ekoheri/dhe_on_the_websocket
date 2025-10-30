// view.js
const contentEl = document.getElementById('content');
const radios = document.querySelectorAll('input[name="mode"]');

let plaintextData = "";
let ciphertextData = "";

// Ganti tampilan sesuai mode aktif
function render() {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    if (mode === 'plaintext') {
        contentEl.innerHTML = plaintextData || "(Belum ada plaintext)";
    } else {
        contentEl.innerText = ciphertextData || "(Belum ada ciphertext)";
    }
}

// Fungsi dipanggil oleh websocket.js
export function updateView(plain, cipher) {
    plaintextData = plain;
    ciphertextData = cipher;
    render();
}

// Event listener untuk radio button
radios.forEach(radio => {
    radio.addEventListener('change', render);
});
