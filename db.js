// Database Module with Auto-Fallback & mysql2 support
require('dotenv').config();

let pool = null;
let isConnected = false;

// Initialize MySQL pool asynchronously
async function initDb() {
    try {
        const mysql = require('mysql2/promise');
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'translator_db',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            connectTimeout: 5000 // 5 sec timeout
        });

        // Test connection
        const connection = await pool.getConnection();
        console.log('[DB] ✅ Berhasil terhubung ke Database MySQL:', process.env.DB_NAME || 'translator_db');
        connection.release();
        isConnected = true;

        // Auto-ensure schema tables exist
        await ensureTablesExist();
    } catch (err) {
        console.warn('[DB] ⚠️ Koneksi MySQL tidak tersedia atau offline:', err.message);
        console.warn('[DB] ℹ️ Mengaktifkan Auto-Fallback ke mode file lokal (history.json). Sistem tetap dapat berjalan normal.');
        isConnected = false;
        pool = null;
    }
}

async function ensureTablesExist() {
    if (!pool || !isConnected) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rooms (
                id INT AUTO_INCREMENT PRIMARY KEY,
                room_name VARCHAR(50) NOT NULL UNIQUE,
                pin VARCHAR(4) NOT NULL,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS transcriptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                msg_id VARCHAR(100) NOT NULL UNIQUE,
                room_name VARCHAR(50) NOT NULL,
                source_lang VARCHAR(10) NOT NULL DEFAULT 'ja',
                source_text TEXT NOT NULL,
                translation_vi TEXT,
                translation_id TEXT,
                translation_my TEXT,
                translation_tl TEXT,
                translation_en TEXT,
                translation_ja TEXT,
                engine VARCHAR(50) DEFAULT 'Groq LLaMA 3.3',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_room_name (room_name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS glossary_terms (
                id INT AUTO_INCREMENT PRIMARY KEY,
                term_jp VARCHAR(100) NOT NULL,
                term_translated VARCHAR(150) NOT NULL,
                target_lang VARCHAR(10) NOT NULL DEFAULT 'all',
                category VARCHAR(50) DEFAULT 'Pabrik',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_jp_lang (term_jp, target_lang)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Insert sample glossary if empty
        const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM glossary_terms');
        if (rows[0].cnt === 0) {
            await pool.query(`
                INSERT INTO glossary_terms (term_jp, term_translated, target_lang, category) VALUES
                ('金型', 'Ketik / Cetakan Presisi (Mold)', 'id', 'Mesin'),
                ('検品', 'Pemeriksaan Kualitas (Quality Check)', 'id', 'QC'),
                ('梱包', 'Pengemasan (Packing)', 'id', 'Packing'),
                ('安全第一', 'Keselamatan Utama (Safety First)', 'id', 'K3'),
                ('残業', 'Lembur (Overtime)', 'id', 'SDM'),
                ('金型', 'Khuôn mẫu (Mold)', 'vi', 'Mesin'),
                ('検品', 'Kiểm tra chất lượng (QC)', 'vi', 'QC'),
                ('梱包', 'Đóng gói (Packing)', 'vi', 'Packing'),
                ('安全第一', 'An toàn là trên hết', 'vi', 'K3');
            `);
        }
    } catch (e) {
        console.error('[DB] Gagal memastikan ketersediaan tabel:', e.message);
    }
}

// Data Abstraction Methods with Fallback Support
async function loadRoomsFromDb() {
    if (!isConnected || !pool) return null;
    try {
        const [rows] = await pool.query('SELECT room_name, pin FROM rooms WHERE status = "active"');
        return rows;
    } catch (e) {
        console.error('[DB] Gagal membaca rooms:', e.message);
        return null;
    }
}

async function saveRoomToDb(roomName, pin) {
    if (!isConnected || !pool) return;
    try {
        await pool.query(
            'INSERT INTO rooms (room_name, pin, status) VALUES (?, ?, "active") ON DUPLICATE KEY UPDATE pin = VALUES(pin), status = "active"',
            [roomName, pin]
        );
    } catch (e) {
        console.error('[DB] Gagal menyimpan room:', e.message);
    }
}

async function loadHistoryFromDb(roomName) {
    if (!isConnected || !pool) return null;
    try {
        const [rows] = await pool.query(
            'SELECT msg_id as msgId, source_text as source, source_lang as sourceLang, translation_vi, translation_id, translation_my, translation_tl, translation_en, translation_ja, engine, DATE_FORMAT(created_at, "%H:%i:%s") as timestamp FROM transcriptions WHERE room_name = ? ORDER BY id ASC LIMIT 100',
            [roomName]
        );
        return rows.map(r => ({
            msgId: r.msgId,
            source: r.source,
            sourceLang: r.sourceLang,
            engine: r.engine,
            timestamp: r.timestamp,
            translations: {
                vi: r.translation_vi || '',
                id: r.translation_id || '',
                my: r.translation_my || '',
                tl: r.translation_tl || '',
                en: r.translation_en || '',
                ja: r.translation_ja || ''
            }
        }));
    } catch (e) {
        console.error('[DB] Gagal membaca history:', e.message);
        return null;
    }
}

async function saveTranscriptionToDb(roomName, item) {
    if (!isConnected || !pool) return;
    try {
        const tr = item.translations || {};
        await pool.query(
            `INSERT INTO transcriptions 
            (msg_id, room_name, source_lang, source_text, translation_vi, translation_id, translation_my, translation_tl, translation_en, translation_ja, engine) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE source_text = VALUES(source_text)`,
            [
                item.msgId,
                roomName,
                item.sourceLang || 'ja',
                item.source,
                tr.vi || '',
                tr.id || '',
                tr.my || '',
                tr.tl || '',
                tr.en || '',
                tr.ja || '',
                item.engine || 'Unknown'
            ]
        );
    } catch (e) {
        console.error('[DB] Gagal menyimpan terjemahan:', e.message);
    }
}

async function clearHistoryFromDb(roomName) {
    if (!isConnected || !pool) return;
    try {
        await pool.query('DELETE FROM transcriptions WHERE room_name = ?', [roomName]);
    } catch (e) {
        console.error('[DB] Gagal menghapus history:', e.message);
    }
}

async function getGlossaryFromDb() {
    if (!isConnected || !pool) return [];
    try {
        const [rows] = await pool.query('SELECT id, term_jp, term_translated, target_lang, category FROM glossary_terms ORDER BY id ASC');
        return rows;
    } catch (e) {
        console.error('[DB] Gagal membaca glossary:', e.message);
        return [];
    }
}

async function addGlossaryTermToDb(termJp, termTranslated, targetLang = 'all', category = 'Pabrik') {
    if (!isConnected || !pool) return false;
    try {
        await pool.query(
            'INSERT INTO glossary_terms (term_jp, term_translated, target_lang, category) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE term_translated = VALUES(term_translated), category = VALUES(category)',
            [termJp, termTranslated, targetLang, category]
        );
        return true;
    } catch (e) {
        console.error('[DB] Gagal menambah istilah glossary:', e.message);
        return false;
    }
}

async function deleteGlossaryTermFromDb(id) {
    if (!isConnected || !pool) return false;
    try {
        await pool.query('DELETE FROM glossary_terms WHERE id = ?', [id]);
        return true;
    } catch (e) {
        console.error('[DB] Gagal menghapus istilah glossary:', e.message);
        return false;
    }
}

async function deleteRoomFromDb(roomName) {
    if (!isConnected || !pool) return false;
    try {
        await pool.query('DELETE FROM rooms WHERE room_name = ?', [roomName]);
        await pool.query('DELETE FROM transcriptions WHERE room_name = ?', [roomName]);
        console.log(`[DB] Room "${roomName}" dan riwayatnya berhasil dihapus dari MySQL.`);
        return true;
    } catch (e) {
        console.error('[DB] Gagal menghapus room:', e.message);
        return false;
    }
}

// Auto-run initialization
initDb();

module.exports = {
    isDbConnected: () => isConnected,
    loadRoomsFromDb,
    saveRoomToDb,
    deleteRoomFromDb,
    loadHistoryFromDb,
    saveTranscriptionToDb,
    clearHistoryFromDb,
    getGlossaryFromDb,
    addGlossaryTermToDb,
    deleteGlossaryTermFromDb
};
