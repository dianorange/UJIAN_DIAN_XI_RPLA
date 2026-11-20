const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API Sistem Peminjaman Alat Praktik Sekolah berjalan");
});

app.get("/api/alat", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, k.nama_kategori
      FROM alat a
      LEFT JOIN kategori_alat k ON a.id_kategori = k.id_kategori
      ORDER BY a.id_alat ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/peminjaman", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, a.nama_alat, a.kondisi
      FROM peminjaman p
      LEFT JOIN alat a ON p.id_alat = a.id_alat
      ORDER BY p.id_peminjaman DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/kategori", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        k.id_kategori,
        k.nama_kategori,
        k.deskripsi,
        COUNT(a.id_alat)::int AS jumlah_alat
      FROM kategori_alat k
      LEFT JOIN alat a ON a.id_kategori = k.id_kategori
      GROUP BY k.id_kategori, k.nama_kategori, k.deskripsi
      ORDER BY k.id_kategori ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/alat", async (req, res) => {
  try {
    const { id_kategori, nama_alat, kondisi, stok, lokasi } = req.body;
    const result = await pool.query(
      `INSERT INTO alat (id_kategori, nama_alat, kondisi, stok, lokasi)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id_kategori, nama_alat, kondisi || "Baik", stok, lokasi || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/peminjaman", async (req, res) => {
  try {
    const { id_alat, nama_peminjam, kelas, jumlah } = req.body;
    const result = await pool.query(
      `INSERT INTO peminjaman (id_alat, nama_peminjam, kelas, jumlah)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id_alat, nama_peminjam, kelas, jumlah]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ error: err.message });
  }
});

// TAMBAH kategori
app.post("/api/kategori", async (req, res) => {
  try {
    const { nama_kategori, deskripsi } = req.body;
    const result = await pool.query(
      `INSERT INTO kategori_alat (nama_kategori, deskripsi)
       VALUES ($1, $2) RETURNING *`,
      [nama_kategori, deskripsi || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/alat/:id", async (req, res) => {
  try {
    const { id_kategori, nama_alat, kondisi, stok, lokasi } = req.body;
    const result = await pool.query(
      `UPDATE alat
       SET id_kategori = $1, nama_alat = $2, kondisi = $3, stok = $4, lokasi = $5
       WHERE id_alat = $6 RETURNING *`,
      [id_kategori, nama_alat, kondisi, stok, lokasi || null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Data alat tidak ditemukan" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/peminjaman/:id", async (req, res) => {
  try {
    const { status, tanggal_kembali } = req.body;
    const result = await pool.query(
      `UPDATE peminjaman
       SET status = COALESCE($1, status),
           tanggal_kembali = COALESCE($2, tanggal_kembali)
       WHERE id_peminjaman = $3 RETURNING *`,
      [status || null, tanggal_kembali || null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Data peminjaman tidak ditemukan" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ error: err.message });
  }
});

// EDIT kategori
app.patch("/api/kategori/:id", async (req, res) => {
  try {
    const { nama_kategori, deskripsi } = req.body;
    const result = await pool.query(
      `UPDATE kategori_alat
       SET nama_kategori = $1, deskripsi = $2
       WHERE id_kategori = $3 RETURNING *`,
      [nama_kategori, deskripsi || null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Kategori tidak ditemukan" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ error: err.message });
  }
});

// HAPUS alat. Foreign key RESTRICT melindungi alat yang punya riwayat peminjaman.
app.delete("/api/alat/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM alat WHERE id_alat = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Data alat tidak ditemukan" });
    }
    res.json({ message: "Alat berhasil dihapus" });
  } catch (err) {
    console.error(err.message);
    res.status(400).json({
      error: "Alat tidak dapat dihapus karena masih memiliki riwayat peminjaman."
    });
  }
});

app.delete("/api/peminjaman/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM peminjaman
       WHERE id_peminjaman = $1 AND status <> 'Dipinjam'
       RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({
        error: "Peminjaman yang masih aktif harus dikembalikan sebelum dihapus."
      });
    }
    res.json({ message: "Data peminjaman berhasil dihapus" });
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/kategori/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM kategori_alat WHERE id_kategori = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Kategori tidak ditemukan" });
    }
    res.json({ message: "Kategori berhasil dihapus" });
  } catch (err) {
    console.error(err.message);
    res.status(400).json({
      error: "Kategori tidak dapat dihapus. Periksa apakah alat di dalamnya memiliki riwayat peminjaman."
    });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
