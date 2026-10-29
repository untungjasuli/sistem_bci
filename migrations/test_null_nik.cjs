const mysql = require('mysql2/promise');

const dbConfig = {
    host: '172.17.0.1',
    port: 3306,
    user: 'victor',
    password: 'VictorAI2026!',
    database: 'sistem_bci'
};

async function run() {
    try {
        const conn = await mysql.createConnection(dbConfig);
        
        // Test insert with NULL nik
        const [result] = await conn.execute(
            `INSERT INTO pemilik_rumah (blok_rumah_id, nama, nik, no_hp) VALUES (?, ?, ?, ?)`,
            [999, 'Test Null NIK', null, '081234567890']
        );
        console.log('Insert with NULL nik SUCCESS:', result.insertId);
        
        // Clean up
        await conn.execute('DELETE FROM pemilik_rumah WHERE id = ?', [result.insertId]);
        console.log('Cleaned up');
        
        await conn.end();
    } catch (err) {
        console.error('Error:', err.message);
        console.error('Code:', err.code);
        console.error('SQL State:', err.sqlState);
    }
}

run();