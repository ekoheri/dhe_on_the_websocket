# Web Server — Implementasi dalam Python & C

Repositori ini berisi dua versi program **Web Server** sederhana yang saya tulis dalam dua bahasa berbeda:
- 🐍 **Python** — berada di folder [`python/`](./python)
- ⚙️ **C** — berada di folder [`C/`](./C)

Kedua versi server ini memiliki fungsi yang sama, namun dengan pendekatan implementasi yang berbeda untuk keperluan pembelajaran dan perbandingan performa.

---

## 📦 Persyaratan Sistem

Sebelum menjalankan aplikasi, pastikan sistem kamu sudah memiliki dependensi berikut:

### 🔧 Library yang dibutuhkan
Untuk versi **C**:
- `pthread` → untuk multithreading
- `json-c` → untuk parsing data JSON
- `crypto` → untuk operasi enkripsi/dekripsi (OpenSSL)

### 🐧 Instalasi di Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install build-essential libpthread-stubs0-dev libjson-c-dev libssl-dev
```

---

## 🚀 Menjalankan Program

### 🔹 Versi C
Masuk ke folder `C/` kemudian jalankan:

```bash
make
./server
```

File biner `server` akan dihasilkan dari proses kompilasi menggunakan `Makefile`.

---

### 🔹 Versi Python
Masuk ke folder `python/` kemudian jalankan:

```bash
python3 server.py
```

Pastikan port yang digunakan di dalam program belum digunakan oleh aplikasi lain.

---

## 🌐 Pengujian

Buka browser dan akses:

```
http://localhost:8000
```

Atau jika port diubah di konfigurasi server, sesuaikan dengan nomor port yang digunakan.

---

## 📁 Struktur Direktori

```
/
├── C/                # Implementasi web server dengan bahasa C
│   ├── Makefile
│   ├── server.c
│   └── ...
├── python/           # Implementasi web server dengan Python
│   ├── server.py
│   └── ...
└── README.md
```

---

## 🧠 Catatan
- Versi C lebih cepat dan efisien dalam manajemen koneksi.
- Versi Python lebih mudah untuk pengembangan dan debugging.
- Kedua versi dapat digunakan sebagai pembanding performa dan arsitektur jaringan.

---

## 📄 Lisensi
Proyek ini bersifat open-source dan dapat dimodifikasi bebas untuk keperluan pembelajaran.
