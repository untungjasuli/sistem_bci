import pymysql

try:
    conn = pymysql.connect(
        host='172.17.0.1',
        port=3306,
        user='victor',
        password='VictorAI2026!',
        database='sistem_bci',
        connect_timeout=5
    )
    with conn.cursor() as cur:
        cur.execute("SELECT DATABASE()")
        print("Database aktif:", cur.fetchone()[0])
        cur.execute("SHOW TABLES")
        tables = cur.fetchall()
        print("Tabel:", [t[0] for t in tables] if tables else "(kosong)")
    conn.close()
    print("Koneksi ke sistem_bci BERHASIL")
except Exception as e:
    print("Gagal:", e)
