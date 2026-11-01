const { executeQuery } = require('./src/lib/server/db.js');

async function runMigration() {
    try {
        // Create jenis_surat table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS jenis_surat (
                id INT AUTO_INCREMENT PRIMARY KEY,
                kode VARCHAR(10) NOT NULL UNIQUE,
                nama VARCHAR(100) NOT NULL,
                deskripsi TEXT,
                template_html LONGTEXT,
                variabel_default JSON,
                aktif BOOLEAN DEFAULT TRUE,
                urutan INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('jenis_surat table created');

        // Create surat table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS surat (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nomor_surat VARCHAR(50) NOT NULL UNIQUE,
                jenis_surat_id INT NOT NULL,
                anggota_keluarga_id INT NOT NULL,
                blok_rumah_id INT NOT NULL,
                keterangan_keperluan TEXT,
                template_html LONGTEXT,
                variabel JSON,
                status ENUM('draft', 'selesai', 'dibatalkan') DEFAULT 'selesai',
                tanggal_surat DATE NOT NULL,
                rt_pembuat_id INT,
                file_pdf_path VARCHAR(255),
                catatan TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('surat table created');

        // Insert RT/RW settings
        const settings = [
            ['rt_no', '001', 'Nomor RT (3 digit)'],
            ['rw_no', '002', 'Nomor RW (3 digit)'],
            ['rt_alamat', 'Jl. Mawar No. 10, Kel. Melati, Kec. Mawar, Kota Bandung', 'Alamat lengkap RT'],
            ['rt_nama', 'Bpk. Ahmad Susanto', 'Nama RT'],
            ['rt_nip', '197001012000121001', 'NIP RT'],
            ['rw_nama', 'Bpk. Surya Wijaya', 'Nama RW'],
            ['rw_nip', '196502022000121002', 'NIP RW']
        ];

        for (const [key, value, desc] of settings) {
            await executeQuery('INSERT IGNORE INTO settings (`key`, `value`, description) VALUES (?, ?, ?)', [key, value, desc]);
        }
        console.log('Settings added');

        console.log('Migration completed successfully!');
    } catch (e) {
        console.error('Migration error:', e.message);
    }
}

runMigration();