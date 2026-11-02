-- Fix collation for template_html columns to support UTF-8 characters
ALTER TABLE jenis_surat MODIFY template_html LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE surat MODIFY template_html LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE surat MODIFY variabel JSON CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE jenis_surat MODIFY variabel_default JSON CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;