import pymysql

conn = pymysql.connect(
    host='172.17.0.1',
    port=3306,
    user='victor',
    password='VictorAI2026!',
    database='sistem_bci',
    connect_timeout=5
)

with conn.cursor() as cur:
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

    cur.execute("SELECT id, username, name, role FROM users")
    users = cur.fetchall()
    print("Data users:", users)

conn.commit()
conn.close()
print("Database setup selesai")
