const mysql = require('mysql2/promise');

const dbConfig = {
    host: '172.17.0.1',
    port: 3306,
    user: 'victor',
    password: 'VictorAI2026!',
    database: 'sistem_bci'
};

async function run() {
    const conn = await mysql.createConnection(dbConfig);
    const sql = `CREATE TABLE IF NOT EXISTS \`pemilik_rumah\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`blok_rumah_id\` INT NOT NULL,
        \`nama\` VARCHAR(100) NOT NULL,
        \`nik\` VARCHAR(16) NULL UNIQUE,
        \`no_hp\` VARCHAR(13) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_blok_rumah\` (\`blok_rumah_id\`),
        INDEX \`idx_nik\` (\`nik\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
    await conn.execute(sql);
    console.log('Table created successfully');
    await conn.end();
}

run().catch(console.error);