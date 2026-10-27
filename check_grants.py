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
    cur.execute("SHOW GRANTS")
    grants = cur.fetchall()
    for g in grants:
        print(g[0])

conn.close()
