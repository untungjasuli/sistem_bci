-- Tambah kolom posisi & ukuran untuk denah blok rumah
ALTER TABLE `blok_rumah`
ADD COLUMN `pos_x` INT DEFAULT 0 COMMENT 'Posisi X di grid (kolom)',
ADD COLUMN `pos_y` INT DEFAULT 0 COMMENT 'Posisi Y di grid (baris)',
ADD COLUMN `width` INT DEFAULT 1 COMMENT 'Lebar blok (jumlah kolok grid)',
ADD COLUMN `height` INT DEFAULT 1 COMMENT 'Tinggi blok (jumlah baris grid)';