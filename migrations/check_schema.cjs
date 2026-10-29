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
        const [rows] = await conn.execute(`DESCRIBE \`pemilik_rumah\`;`);
        console.table(rows);
        await conn.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

run();