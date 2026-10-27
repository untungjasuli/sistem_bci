import mysql from 'mysql2/promise';
import { redirect } from '@sveltejs/kit';

const dbConfig = {
	host: '172.17.0.1',
	port: 3306,
	user: 'victor',
	password: 'VictorAI2026!',
	database: 'sistem_bci'
};

async function getConnection() {
	return mysql.createConnection(dbConfig);
}

export const load = async ({ cookies, url }) => {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login');
	}

	const search = url.searchParams.get('search')?.trim() || '';
	const sort = url.searchParams.get('sort') || 'asc'; // 'asc' | 'desc'

	let sql = 'SELECT id, no_blok, created_at FROM blok_rumah';
	const params = [];

	if (search) {
		sql += ' WHERE no_blok LIKE ?';
		params.push(`%${search}%`);
	}

	sql += ` ORDER BY no_blok ${sort === 'desc' ? 'DESC' : 'ASC'}`;

	const conn = await getConnection();
	try {
		const [rows] = await conn.execute(sql, params);
		return {
			blokRumah: rows,
			search,
			sort
		};
	} finally {
		await conn.end();
	}
};

export const actions = {
	create: async ({ request, cookies }) => {
		const user = cookies.get('session_user');
		if (!user) {
			throw redirect(303, '/login');
		}

		const form = await request.formData();
		const noBlok = form.get('no_blok')?.toString().trim() || '';

		if (!noBlok) {
			return { error: 'No. Blok wajib diisi' };
		}

		const conn = await getConnection();
		try {
			await conn.execute('INSERT INTO blok_rumah (no_blok) VALUES (?)', [noBlok]);
			return { success: 'Data blok rumah berhasil ditambahkan' };
		} catch (e) {
			if (e.code === 'ER_DUP_ENTRY') {
				return { error: 'No. Blok sudah terdaftar' };
			}
			return { error: 'Gagal menambahkan data' };
		} finally {
			await conn.end();
		}
	},

	update: async ({ request, cookies }) => {
		const user = cookies.get('session_user');
		if (!user) {
			throw redirect(303, '/login');
		}

		const form = await request.formData();
		const id = form.get('id')?.toString();
		const noBlok = form.get('no_blok')?.toString().trim() || '';

		if (!id || !noBlok) {
			return { error: 'Data tidak lengkap' };
		}

		const conn = await getConnection();
		try {
			const [result] = await conn.execute('UPDATE blok_rumah SET no_blok = ? WHERE id = ?', [noBlok, id]);
			if (result.affectedRows === 0) {
				return { error: 'Data blok rumah tidak ditemukan' };
			}
			return { success: 'Data blok rumah berhasil diperbarui' };
		} catch (e) {
			console.error('UPDATE blok_rumah error:', e);
			if (e.code === 'ER_DUP_ENTRY') {
				return { error: 'No. Blok sudah terdaftar' };
			}
			return { error: 'Gagal memperbarui data: ' + e.message };
		} finally {
			await conn.end();
		}
	},

	delete: async ({ request, cookies }) => {
		const user = cookies.get('session_user');
		if (!user) {
			throw redirect(303, '/login');
		}

		const form = await request.formData();
		const id = form.get('id')?.toString();

		if (!id) {
			return { error: 'ID tidak valid' };
		}

		const conn = await getConnection();
		try {
			await conn.execute('DELETE FROM blok_rumah WHERE id = ?', [id]);
			return { success: 'Data blok rumah berhasil dihapus' };
		} finally {
			await conn.end();
		}
	}
};
