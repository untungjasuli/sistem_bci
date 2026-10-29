-- Migration: Iuran Bulanan System
-- Created: 2026

-- 1. Settings table (key-value)
CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` TEXT NOT NULL,
    `description` VARCHAR(255),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO settings (`key`, `value`, `description`) VALUES
('iuran_jatuh_tempo', '10', 'Tanggal jatuh tempo iuran bulanan (1-28)'),
('iuran_nominal_penuh', '50000', 'Nominal iuran penuh untuk keluarga penghuni (Rp)'),
('iuran_nominal_keamanan', '25000', 'Nominal iuran keamanan untuk pemilik rumah kosong (Rp)')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- 2. Users table - add role column if not exists
-- Assuming users table already exists with: id, username, password, name, role, created_at
-- Check and add role column
ALTER TABLE users 
ADD COLUMN `role` ENUM('admin', 'petugas') DEFAULT 'admin' AFTER `name`;

-- Update existing users to have role 'admin'
UPDATE users SET `role` = 'admin' WHERE `role` IS NULL OR `role` = '';

-- 3. Pemilik rumah kosong
CREATE TABLE IF NOT EXISTS pemilik_rumah (
    id INT PRIMARY KEY AUTO_INCREMENT,
    blok_rumah_id INT UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    no_hp VARCHAR(20),
    alamat TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_blok_rumah (blok_rumah_id)
);

-- 4. Tagihan iuran bulanan
CREATE TABLE IF NOT EXISTS tagihan_iuran (
    id INT PRIMARY KEY AUTO_INCREMENT,
    periode CHAR(7) NOT NULL COMMENT 'Format: YYYY-MM',
    blok_rumah_id INT NOT NULL,
    tipe_pembayar ENUM('keluarga', 'pemilik_kosong') NOT NULL,
    keluarga_id INT NULL,
    pemilik_rumah_id INT NULL,
    nominal DECIMAL(10,2) NOT NULL,
    status ENUM('belum_bayar', 'lunas') DEFAULT 'belum_bayar',
    jatuh_tempo DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_periode_blok (periode, blok_rumah_id),
    INDEX idx_blok_rumah (blok_rumah_id),
    INDEX idx_keluarga (keluarga_id),
    INDEX idx_pemilik_rumah (pemilik_rumah_id),
    INDEX idx_periode (periode),
    INDEX idx_status (status),
    INDEX idx_tipe (tipe_pembayar)
);

-- 5. Pembayaran iuran
CREATE TABLE IF NOT EXISTS pembayaran_iuran (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tagihan_id INT NOT NULL,
    nominal_bayar DECIMAL(10,2) NOT NULL,
    tanggal_bayar DATE NOT NULL,
    metode_bayar ENUM('transfer', 'qris', 'cash') NOT NULL,
    petugas_id INT NOT NULL,
    catatan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tagihan (tagihan_id),
    INDEX idx_tanggal (tanggal_bayar),
    INDEX idx_petugas (petugas_id)
);