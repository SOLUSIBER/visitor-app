require('dotenv').config(); // Baris ini harus ada di paling atas

// Import modul yang dibutuhkan
const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise'); // Menggunakan driver mysql2

// --- KONFIGURASI ---
const app = express();
const PORT = 3000;

// Middleware untuk parsing body JSON dari request
app.use(express.json());
// Middleware untuk menyajikan file statis (HTML, CSS, JS) dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Konfigurasi koneksi ke database MariaDB
// Environment variables ini akan disediakan oleh Docker Compose
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

// --- FUNGSI UNTUK MEMASTIKAN TABEL ADA ---
const initializeDatabase = async () => {
  try {
    pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();
    console.log("Berhasil terhubung ke database MariaDB.");
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS visitors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        purpose VARCHAR(255) NOT NULL,
        check_in_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        check_out_time TIMESTAMP NULL
      );
    `);
    
    connection.release();
    console.log("Database siap dan tabel 'visitors' berhasil diverifikasi.");
  } catch (err) {
    console.error('Gagal menginisialisasi database:', err);
    // Coba lagi setelah beberapa detik jika koneksi gagal (misalnya saat DB sedang startup)
    setTimeout(initializeDatabase, 5000);
  }
};


// --- API ENDPOINTS ---

// [POST] /api/visitors/checkin - Mendaftarkan pengunjung baru
app.post('/api/visitors/checkin', async (req, res) => {
  try {
    const { name, purpose } = req.body;
    if (!name || !purpose) {
      return res.status(400).json({ error: 'Nama dan tujuan kunjungan harus diisi.' });
    }
    const [result] = await pool.query(
      "INSERT INTO visitors (name, purpose) VALUES (?, ?)",
      [name, purpose]
    );
    const [rows] = await pool.query("SELECT * FROM visitors WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// [PUT] /api/visitors/checkout/:id - Melakukan checkout untuk pengunjung
app.put('/api/visitors/checkout/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      "UPDATE visitors SET check_out_time = NOW() WHERE id = ? AND check_out_time IS NULL",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pengunjung tidak ditemukan atau sudah checkout.' });
    }
    
    const [rows] = await pool.query("SELECT * FROM visitors WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// [GET] /api/visitors/current - Mendapatkan daftar pengunjung yang sedang di dalam
app.get('/api/visitors/current', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM visitors WHERE check_out_time IS NULL ORDER BY check_in_time DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// [GET] /api/visitors/history - Mendapatkan riwayat semua pengunjung
app.get('/api/visitors/history', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM visitors ORDER BY check_in_time DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});


// --- MENJALANKAN SERVER ---
// Inisialisasi database dulu, baru jalankan server
initializeDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server pendaftaran pengunjung berjalan di http://localhost:${PORT}`);
  });
});
