# Live Multi-Language Translator

Aplikasi penerjemah suara langsung (real-time) dari bahasa Jepang ke 4 bahasa target (Indonesia, Vietnam, Myanmar, Filipina) yang dirancang untuk kebutuhan komunikasi di pabrik/lingkungan kerja. Aplikasi ini menggunakan panel Admin (Operator) untuk menangkap suara dan mengirimkan terjemahan ke layar Client (Pekerja) secara instan menggunakan WebSockets.

---

## 💻 1. Cara Setup & Menjalankan di Komputer Lokal (Untuk Teman)

Ikuti langkah-langkah di bawah ini untuk membuka dan menjalankan aplikasi ini langsung di VS Code:

### Persyaratan Awal
Pastikan komputer Anda sudah terpasang:
1. **Node.js** (Versi 18 ke atas) - [Unduh Node.js di sini](https://nodejs.org/)
2. **VS Code (Visual Studio Code)** - [Unduh VS Code di sini](https://code.visualstudio.com/)

### Langkah Setup
1. **Ekstrak File ZIP** yang diberikan ke dalam folder pilihan Anda.
2. **Buka di VS Code**:
   - Jalankan VS Code, pilih menu **File > Open Folder...**
   - Pilih folder proyek yang baru diekstrak tersebut.
3. **Instalasi Dependencies**:
   - Buka terminal bawaan VS Code dengan menekan tombol kombinasi `Ctrl + ` ` ` (backtick) atau melalui menu **Terminal > New Terminal**.
   - Jalankan perintah berikut untuk menginstal modul pendukung (`express` dan `socket.io`):
     ```bash
     npm install
     ```
4. **Menjalankan Server**:
   - **Metode 1 (Rekomendasi - Cepat)**: Tekan tombol **F5** pada keyboard Anda atau masuk ke tab **Run and Debug** di sebelah kiri VS Code, lalu klik tombol play hijau bertuliskan **"Jalankan Server Translator"**.
   - **Metode 2 (Terminal)**: Jalankan perintah berikut di terminal VS Code Anda:
     ```bash
     npm start
     ```

### Cara Mengakses Aplikasi
Setelah server berhasil dijalankan, buka browser Anda dan akses alamat berikut:
- **Dashboard Utama (Pilih Peran)**: [http://localhost:3000/](http://localhost:3000/)
- **Layar Admin (Operator)**: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)
- **Layar Client (Pekerja)**: [http://localhost:3000/client.html](http://localhost:3000/client.html)

*Catatan: Jika ingin diakses dari perangkat lain (HP/Tablet) dalam satu jaringan Wi-Fi, ganti `localhost` dengan alamat IP lokal komputer Anda yang tertera pada log terminal saat server dijalankan (misal: `http://192.168.1.10:3000/client.html`).*

---

## 🌐 2. Panduan Deploy ke Hosting cPanel (Jarak Jauh)

Untuk meng-host aplikasi ini di cPanel agar dapat digunakan dari jarak jauh (misal dari Jepang):

### Langkah 1: Persiapan & Upload File
1. Kompres seluruh file proyek ke dalam file `.zip` (abaikan folder `node_modules` karena akan diinstal langsung di cPanel).
2. Masuk ke **cPanel File Manager**.
3. Buat folder baru (misal: `translator`) di dalam direktori home Anda (direkomendasikan di luar `public_html` demi keamanan, atau di dalam `public_html/translator` jika ingin diakses langsung).
4. Unggah (Upload) file `.zip` ke folder tersebut, lalu klik kanan dan **Extract**.

### Langkah 2: Setup Aplikasi Node.js di cPanel
1. Cari dan buka menu **Setup Node.js App** di cPanel Anda.
2. Klik tombol **Create Application**.
3. Isi kolom konfigurasi sebagai berikut:
   - **Node.js version**: Pilih versi terbaru yang stabil (disarankan versi **18.x** atau **20.x**).
   - **Application mode**: Pilih `Production` (atau `Development` jika ingin melakukan debugging).
   - **Application root**: Isi dengan nama folder tempat Anda mengekstrak file tadi (misal: `translator`).
   - **Application URL**: Isi dengan path URL yang diinginkan (misal: `translator` jika ingin diakses di `domainanda.com/translator`).
   - **Application startup file**: Isi dengan `server.js`.
4. Klik tombol **Create** di kanan atas.

### Langkah 3: Menginstal Dependencies di cPanel
1. Setelah aplikasi berhasil dibuat, gulir ke bawah ke bagian **Configuration files**. cPanel akan mendeteksi file `package.json`.
2. Klik tombol **Run npm Install** untuk memasang pustaka pendukung secara otomatis.
3. Setelah proses selesai, klik tombol **Restart** di bagian atas konfigurasi Node.js Anda.

### 💡 Catatan Penting Mengenai WebSockets di Hosting cPanel
Sebagian besar layanan shared hosting cPanel membatasi koneksi WebSockets secara langsung melalui Apache/Nginx. Namun, Anda tidak perlu khawatir:
- Pustaka **Socket.IO** pada aplikasi ini memiliki fitur **HTTP Long-Polling fallback**.
- Jika server cPanel Anda mendeteksi bahwa koneksi WebSocket diblokir, Socket.IO akan secara otomatis menurunkan metode koneksi ke polling HTTP biasa tanpa memutuskan transmisi data. Terjemahan teks dan audio streaming akan tetap terkirim secara *real-time* dengan penyesuaian latensi yang sangat kecil.
