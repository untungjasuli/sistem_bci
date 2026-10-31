import pymysql

conn = pymysql.connect(
    host='172.17.0.1',
    port=3306,
    user='victor',
    password='VictorAI2026!',
    database='sistem_bci'
)

with conn.cursor() as cur:
    # users table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(100) NOT NULL,
            role VARCHAR(20) DEFAULT 'admin',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("Tabel users dibuat / sudah ada")

    cur.execute("SELECT COUNT(*) FROM users WHERE username = 'admin'")
    count = cur.fetchone()[0]
    if count == 0:
        cur.execute(
            "INSERT INTO users (username, password, name, role) VALUES (%s, MD5(%s), %s, %s)",
            ('admin', 'admin', 'Administrator', 'admin')
        )
        print("User admin berhasil dibuat")
    else:
        print("User admin sudah ada")

    # keluarga table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS keluarga (
            id INT AUTO_INCREMENT PRIMARY KEY,
            no_kk VARCHAR(16) NOT NULL UNIQUE,
            blok_rumah_id INT NOT NULL,
            status_rumah ENUM('sendiri','ngontrak','ikut_ortu_mertua') NOT NULL DEFAULT 'sendiri',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    """)
    print("Tabel keluarga dibuat / sudah ada")

    # Update ENUM status_rumah jika tabel sudah ada tanpa value 'ikut_ortu_mertua'
    cur.execute("SHOW COLUMNS FROM keluarga LIKE 'status_rumah'")
    col = cur.fetchone()
    if col and 'ikut_ortu_mertua' not in col[1]:
        cur.execute("ALTER TABLE keluarga MODIFY status_rumah ENUM('sendiri','ngontrak','ikut_ortu_mertua') NOT NULL DEFAULT 'sendiri'")
        print("ENUM status_rumah diperbarui: ditambah 'ikut_ortu_mertua'")
    else:
        print("ENUM status_rumah sudah mengandung 'ikut_ortu_mertua'")

    # blok_rumah table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS blok_rumah (
            id INT AUTO_INCREMENT PRIMARY KEY,
            no_blok VARCHAR(20) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    """)
    print("Tabel blok_rumah dibuat / sudah ada")

    # anggota_keluarga table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS anggota_keluarga (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nik VARCHAR(16) NOT NULL UNIQUE,
            nama VARCHAR(100) NOT NULL,
            jenis_kelamin ENUM('Laki-laki','Perempuan') NOT NULL,
            tempat_lahir VARCHAR(100) DEFAULT NULL,
            tanggal_lahir DATE NOT NULL,
            hub_keluarga ENUM('Kepala Keluarga','Istri','Anak') NOT NULL,
            keluarga_id INT NOT NULL,
            nomor_hp VARCHAR(13) DEFAULT NULL,
            agama ENUM('Islam','Kristen Protestan','Kristen Katolik','Hindu','Buddha','Konghucu') DEFAULT NULL,
            pekerjaan ENUM('Tidak Bekerja','Ibu Rumah Tangga','Pelajar/Mahasiswa','Pensiunan','Karyawan Swasta','Wiraswasta','Pedagang','Buruh Harian Lepas','PNS/ASN','TNI','POLRI','Karyawan BUMN','Karyawan Honorer','Dokter/Bidan/Perawat/Apoteker','Guru/Dosen','Pengacara/Notaris/Akuntan','Petani/Pekebun dan Nelayan','Seniman','Wartawan') DEFAULT NULL,
            status_perkawinan ENUM('Belum Kawin','Kawin Tercatat','Kawin Belum Tercatat','Cerai Hidup','Cerai Mati') DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    """)
    print("Tabel anggota_keluarga dibuat / sudah ada")

    # Add new columns if table existed before without them
    new_columns = [
        ('tempat_lahir', "ALTER TABLE anggota_keluarga ADD COLUMN tempat_lahir VARCHAR(100) DEFAULT NULL AFTER jenis_kelamin"),
        ('nomor_hp', "ALTER TABLE anggota_keluarga ADD COLUMN nomor_hp VARCHAR(13) DEFAULT NULL AFTER hub_keluarga"),
        ('agama', "ALTER TABLE anggota_keluarga ADD COLUMN agama ENUM('Islam','Kristen Protestan','Kristen Katolik','Hindu','Buddha','Konghucu') DEFAULT NULL AFTER nomor_hp"),
        ('pekerjaan', "ALTER TABLE anggota_keluarga ADD COLUMN pekerjaan ENUM('Tidak Bekerja','Ibu Rumah Tangga','Pelajar/Mahasiswa','Pensiunan','Karyawan Swasta','Wiraswasta','Pedagang','Buruh Harian Lepas','PNS/ASN','TNI','POLRI','Karyawan BUMN','Karyawan Honorer','Dokter/Bidan/Perawat/Apoteker','Guru/Dosen','Pengacara/Notaris/Akuntan','Petani/Pekebun dan Nelayan','Seniman','Wartawan') DEFAULT NULL AFTER agama"),
        ('status_perkawinan', "ALTER TABLE anggota_keluarga ADD COLUMN status_perkawinan ENUM('Belum Kawin','Kawin Tercatat','Kawin Belum Tercatat','Cerai Hidup','Cerai Mati') DEFAULT NULL AFTER pekerjaan")
    ]
    
    for col_name, alter_sql in new_columns:
        cur.execute(f"SHOW COLUMNS FROM anggota_keluarga LIKE '{col_name}'")
        if cur.fetchone() is None:
            cur.execute(alter_sql)
            print(f"Kolom {col_name} ditambahkan ke anggota_keluarga")
        else:
            print(f"Kolom {col_name} sudah ada di anggota_keluarga")

conn.commit()
conn.close()
print("Database setup selesai")
