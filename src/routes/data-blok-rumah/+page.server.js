import { redirect, fail } from '@sveltejs/kit';
import { getConnection, executeQuery } from '#lib/server/db';

export const load = async ({ cookies, url }) => {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login');
	}

	const search = url.searchParams.get('search')?.trim() || '';
	const sort = url.searchParams.get('sort') || 'asc';
	const sortBy = url.searchParams.get('sortBy') || 'no_blok';
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const itemsPerPage = Math.max(1, parseInt(url.searchParams.get('itemsPerPage') || '10'));

	let sql = `
		SELECT b.id, b.no_blok, b.created_at,
		       COUNT(k.id) as jumlah_kk,
		       GROUP_CONCAT(k.no_kk SEPARATOR ', ') as daftar_kk,
		       CASE WHEN COUNT(k.id) > 0 THEN 'Dihuni' ELSE 'Kosong' END as status
		FROM blok_rumah b
		LEFT JOIN keluarga k ON b.id = k.blok_rumah_id AND k.status_keluarga = 'aktif'
	`;
	const params = [];

	if (search) {
		sql += ' WHERE b.no_blok LIKE ?';
		params.push(`%${search}%`);
	}

	sql += `
		GROUP BY b.id, b.no_blok, b.created_at
	`;

	const orderField = sortBy === 'status'
		? "CASE WHEN COUNT(k.id) > 0 THEN 'Dihuni' ELSE 'Kosong' END"
		: 'b.no_blok';
	sql += ` ORDER BY ${orderField} ${sort === 'desc' ? 'DESC' : 'ASC'}`;

	// Count
	let countSql = `SELECT COUNT(*) as total FROM blok_rumah b`;
	const countParams = [];
	if (search) {
		countSql += ' WHERE b.no_blok LIKE ?';
		countParams.push(`%${search}%`);
	}
	const conn = await getConnection();
	try {
		const [countRows] = await conn.execute(countSql, countParams);
		const total = countRows[0]?.total || 0;

		sql += ` LIMIT ? OFFSET ?`;
		params.push(itemsPerPage, (page - 1) * itemsPerPage);

		const [rows] = await conn.execute(sql, params);
		return {
			blokRumah: rows,
			search,
			sort,
			sortBy,
			page,
			itemsPerPage,
			total
		};
	} finally {
		conn.release();
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
			return fail(400, { error: 'No. Blok wajib diisi' });
		}

		const conn = await getConnection();
		try {
			await conn.execute('INSERT INTO blok_rumah (no_blok) VALUES (?)', [noBlok]);
			return { success: 'Data blok rumah berhasil ditambahkan' };
		} catch (e) {
			if (e.code === 'ER_DUP_ENTRY') {
				return fail(400, { error: 'No. Blok sudah terdaftar' });
			}
			return fail(400, { error: 'Gagal menambahkan data' });
		} finally {
			conn.release();
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
			return fail(400, { error: 'Data tidak lengkap' });
		}

		const conn = await getConnection();
		try {
			const [result] = await conn.execute('UPDATE blok_rumah SET no_blok = ? WHERE id = ?', [noBlok, id]);
			if (result.affectedRows === 0) {
				return fail(400, { error: 'Data blok rumah tidak ditemukan' });
			}
			return { success: 'Data blok rumah berhasil diperbarui' };
		} catch (e) {
			console.error('UPDATE blok_rumah error:', e);
			if (e.code === 'ER_DUP_ENTRY') {
				return fail(400, { error: 'No. Blok sudah terdaftar' });
			}
			return fail(400, { error: 'Gagal memperbarui data: ' + e.message });
		} finally {
			conn.release();
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
			return fail(400, { error: 'ID tidak valid' });
		}

		const conn = await getConnection();
		try {
			await conn.execute('DELETE FROM blok_rumah WHERE id = ?', [id]);
			return { success: 'Data blok rumah berhasil dihapus' };
		} finally {
			conn.release();
		}
	}
};