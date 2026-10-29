import mysql from 'mysql2/promise';

// Konfigurasi database dari environment variables
const dbConfig = {
	host: process.env.DB_HOST || '172.17.0.1',
	port: parseInt(process.env.DB_PORT || '3306'),
	user: process.env.DB_USER || 'victor',
	password: process.env.DB_PASSWORD || 'VictorAI2026!',
	database: process.env.DB_NAME || 'sistem_bci',
	// Connection pool settings untuk production
	waitForConnections: true,
	connectionLimit: parseInt(process.env.DB_POOL_LIMIT || '10'),
	queueLimit: 0
};

// Connection pool singleton
let pool = null;

export function getPool() {
	if (!pool) {
		pool = mysql.createPool(dbConfig);
	}
	return pool;
}

// Helper untuk get connection dari pool
export async function getConnection() {
	const pool = getPool();
	return pool.getConnection();
}

// Helper untuk execute query dengan auto-release connection
export async function executeQuery(sql, params = []) {
	const conn = await getConnection();
	try {
		const [rows] = await conn.execute(sql, params);
		return rows;
	} finally {
		conn.release();
	}
}

// Helper untuk transaction
export async function executeTransaction(callback) {
	const conn = await getConnection();
	try {
		await conn.beginTransaction();
		const result = await callback(conn);
		await conn.commit();
		return result;
	} catch (e) {
		await conn.rollback();
		throw e;
	} finally {
		conn.release();
	}
}

// Graceful shutdown
export async function closePool() {
	if (pool) {
		await pool.end();
		pool = null;
	}
}