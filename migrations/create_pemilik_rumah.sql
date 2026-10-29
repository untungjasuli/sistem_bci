-- Migration: Create pemilik_rumah table
CREATE TABLE IF NOT EXISTS `pemilik_rumah` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `blok_rumah_id` INT NOT NULL,
    `nama` VARCHAR(100) NOT NULL,
    `nik` VARCHAR(16) NOT NULL UNIQUE,
    `no_hp` VARCHAR(13) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`blok_rumah_id`) REFERENCES `blok_rumah`(`id`) ON DELETE CASCADE,
    INDEX `idx_blok_rumah` (`blok_rumah_id`),
    INDEX `idx_nik` (`nik`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;