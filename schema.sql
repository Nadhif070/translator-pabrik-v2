-- Database Schema for Live Translator System (Ninomiya Co., Ltd.)
-- Compatible with MySQL 5.7+ / MySQL 8.0+ / MariaDB / Laragon / XAMPP

CREATE DATABASE IF NOT EXISTS `translator_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `translator_db`;

-- 1. Table for Lini Produksi / Rooms
CREATE TABLE IF NOT EXISTS `rooms` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `room_name` VARCHAR(50) NOT NULL UNIQUE,
    `pin` VARCHAR(4) NOT NULL,
    `status` ENUM('active', 'inactive') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table for Transcription Logs & History
CREATE TABLE IF NOT EXISTS `transcriptions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `msg_id` VARCHAR(100) NOT NULL UNIQUE,
    `room_name` VARCHAR(50) NOT NULL,
    `source_lang` VARCHAR(10) NOT NULL DEFAULT 'ja',
    `source_text` TEXT NOT NULL,
    `translation_vi` TEXT,
    `translation_id` TEXT,
    `translation_my` TEXT,
    `translation_tl` TEXT,
    `translation_en` TEXT,
    `translation_ja` TEXT,
    `engine` VARCHAR(50) DEFAULT 'Groq LLaMA 3.3',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_room_name` (`room_name`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table for Factory Technical Glossary (Kamus Istilah Pabrik)
CREATE TABLE IF NOT EXISTS `glossary_terms` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `term_jp` VARCHAR(100) NOT NULL,
    `term_translated` VARCHAR(150) NOT NULL,
    `target_lang` VARCHAR(10) NOT NULL DEFAULT 'all',
    `category` VARCHAR(50) DEFAULT 'Pabrik',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_jp_lang` (`term_jp`, `target_lang`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample Technical Terms Data for Ninomiya Co.
INSERT INTO `glossary_terms` (`term_jp`, `term_translated`, `target_lang`, `category`) VALUES
('金型', 'Ketik / Cetakan Presisi (Mold)', 'id', 'Mesin'),
('検品', 'Pemeriksaan Kualitas (Quality Check)', 'id', 'QC'),
('梱包', 'Pengemasan (Packing)', 'id', 'Packing'),
('安全第一', 'Keselamatan Utama (Safety First)', 'id', 'K3'),
('残業', 'Lembur (Overtime)', 'id', 'SDM'),
('金型', 'Khuôn mẫu (Mold)', 'vi', 'Mesin'),
('検品', 'Kiểm tra chất lượng (QC)', 'vi', 'QC'),
('梱包', 'Đóng gói (Packing)', 'vi', 'Packing'),
('安全第一', 'An toàn là trên hết', 'vi', 'K3')
ON DUPLICATE KEY UPDATE `term_translated` = VALUES(`term_translated`);
