#!/usr/bin/env node
// Run migration using direct mysql2 connection

import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database config (same as src/lib/server/db.js)
const dbConfig = {
    host: process.env.DB_HOST || '172.17.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'victor',
    password: process.env.DB_PASSWORD || 'VictorAI2026!',
    database: process.env.DB_NAME || 'sistem_bci',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

async function runMigration() {
    const sqlPath = join(__dirname, '..', 'migrations', '001_iuran_bulanan.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    const pool = mysql.createPool(dbConfig);
    const conn = await pool.getConnection();
    
    try {
        // Parse SQL statements properly (handle multi-line statements)
        const statements = [];
        let currentStmt = '';
        const lines = sql.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            // Skip comments
            if (trimmed.startsWith('--') || trimmed === '') {
                continue;
            }
            currentStmt += line + '\n';
            // Check if line ends with semicolon (statement end)
            if (trimmed.endsWith(';')) {
                statements.push(currentStmt.trim());
                currentStmt = '';
            }
        }
        // Handle any remaining statement without semicolon
        if (currentStmt.trim()) {
            statements.push(currentStmt.trim());
        }
        
        console.log(`Running ${statements.length} statements...\n`);
        
        for (const stmt of statements) {
            const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
            console.log(`Executing: ${preview}...`);
            try {
                await conn.execute(stmt);
                console.log('  ✓ OK');
            } catch (e) {
                // Ignore "already exists" errors
                if (e.code === 'ER_TABLE_EXISTS_ERROR' || 
                    e.code === 'ER_DUP_FIELDNAME' ||
                    e.code === 'ER_DUP_KEYNAME' ||
                    e.message.includes('Duplicate entry') ||
                    e.message.includes('already exists') ||
                    e.code === 'ER_DUP_FIELDNAME') {  // Duplicate column
                    console.log('  ⊘ Already exists, skipping');
                } else {
                    console.error('  ✗ Error:', e.message);
                    throw e;
                }
            }
        }
        console.log('\n✅ Migration completed successfully');
    } finally {
        conn.release();
        await pool.end();
        process.exit(0);
    }
}

runMigration().catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
});