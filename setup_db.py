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
            status_rumah ENUM('sendiri','ngontrak') NOT NULL DEFAULT 'sendiri',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    """)
    print("Tabel keluarga dibuat / sudah ada")

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
            tanggal_lahir DATE NOT NULL,
            hub_keluarga ENUM('Kepala Keluarga','Istri','Anak') NOT NULL,
            keluarga_id INT NOT NULL,
            nomor_hp VARCHAR(13) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    """)
    print("Tabel anggota_keluarga dibuat / sudah ada")

    # Add nomor_hp column if table existed before without it
    cur.execute("SHOW COLUMNS FROM anggota_keluarga LIKE 'nomor_hp'")
    if cur.fetchone() is None:
        cur.execute("ALTER TABLE anggota_keluarga ADD COLUMN nomor_hp VARCHAR(13) DEFAULT NULL AFTER hub_keluarga")
        print("Kolom nomor_hp ditambahkan ke anggota_keluarga")
    else:
        print("Kolom nomor_hp sudah ada di anggota_keluarga")

conn.commit()
conn.close()
print("Database setup selesai")
