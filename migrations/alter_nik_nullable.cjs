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
        const sql = `ALTER TABLE \`pemilik_rumah\` MODIFY \`nik\` VARCHAR(16) NULL;`;
        await conn.execute(sql);
        console.log('NIK column altered to NULL successfully');
        await conn.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

run();