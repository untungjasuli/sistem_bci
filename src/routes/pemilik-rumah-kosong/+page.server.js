import { redirect } from '@sveltejs/kit';
import { getConnection, executeQuery } from '#lib/server/db';

export async function load({ url, locals }) {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login');
	}

	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const itemsPerPage = parseInt(url.searchParams.get('itemsPerPage') || '10', 10);
	const search = url.searchParams.get('search') || '';
	const sortBy = url.searchParams.get('sortBy') || 'br.no_blok';
	const sort = url.searchParams.get('sort') || 'asc';

	const allowedSortColumns = ['br.no_blok', 'pr.nama', 'pr.nik', 'pr.no_hp', 'pr.created_at'];
	const allowedSortOrders = ['asc', 'desc'];
	const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'br.no_blok';
	const safeSort = allowedSortOrders.includes(sort) ? sort : 'asc';

	const offset = (page - 1) * itemsPerPage;

	let whereClause = '';
	const params = [];

	// Hanya blok dengan status 'Kosong' (tidak ada keluarga)
	const kosongCondition = "NOT EXISTS (SELECT 1 FROM keluarga k WHERE k.blok_rumah_id = br.id)";
	if (search) {
		whereClause = ` WHERE ${kosongCondition} AND (pr.nama LIKE ? OR pr.nik LIKE ? OR pr.no_hp LIKE ? OR br.no_blok LIKE ?)`;
		const searchTerm = `%${search}%`;
		params.push(searchTerm, searchTerm, searchTerm, searchTerm);
	} else {
		whereClause = ` WHERE ${kosongCondition}`;
	}

	// Total count
	let countSql = `
		SELECT COUNT(*) as total
		FROM pemilik_rumah pr
		JOIN blok_rumah br ON pr.blok_rumah_id = br.id
		${whereClause}
	`;
	const countRows = await executeQuery(countSql, params);
	const total = countRows[0]?.total || 0;
	const totalPages = Math.ceil(total / itemsPerPage) || 1;

	// Data
	let dataSql = `
		SELECT 
			pr.id,
			pr.blok_rumah_id,
			br.no_blok,
			pr.nama,
			pr.nik,
			pr.no_hp,
			pr.created_at
		FROM pemilik_rumah pr
		JOIN blok_rumah br ON pr.blok_rumah_id = br.id
		${whereClause}
		ORDER BY ${safeSortBy} ${safeSort.toUpperCase()}
		LIMIT ? OFFSET ?
	`;
	params.push(itemsPerPage, offset);
	const rows = await executeQuery(dataSql, params);

	// Get empty blocks for dropdown (blok kosong yang belum punya pemilik)
	const emptyBlocks = await executeQuery(`
		SELECT id, no_blok 
		FROM blok_rumah 
		WHERE NOT EXISTS (SELECT 1 FROM keluarga k WHERE k.blok_rumah_id = blok_rumah.id)
		AND id NOT IN (SELECT blok_rumah_id FROM pemilik_rumah)
		ORDER BY no_blok
	`);

	return {
		pemilik: rows,
		emptyBlocks,
		pagination: {
			page,
			itemsPerPage,
			total,
			totalPages,
			search,
			sortBy: safeSortBy,
			sort: safeSort
		}
	};
}

export const actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const blok_rumah_id = formData.get('blok_rumah_id');
		const nama = formData.get('nama');
		const nik = formData.get('nik') || null;
		const no_hp = formData.get('no_hp');

		if (!blok_rumah_id || !nama || !no_hp) {
			return { error: 'Blok Rumah, Nama, dan Nomor HP wajib diisi' };
		}

		if (nik && (nik.length !== 16 || !/^\d+$/.test(nik))) {
			return { error: 'NIK harus 16 digit angka' };
		}

		if (no_hp.length < 11 || no_hp.length > 13 || !/^\d+$/.test(no_hp)) {
			return { error: 'Nomor HP harus 11-13 digit angka' };
		}

		// Cek apakah blok sudah punya pemilik
		const existing = await executeQuery(
			'SELECT id FROM pemilik_rumah WHERE blok_rumah_id = ?',
			[blok_rumah_id]
		);
		if (existing.length > 0) {
			return { error: 'Blok ini sudah memiliki pemilik' };
		}

		// Cek NIK unique
		const nikCheck = await executeQuery('SELECT id FROM pemilik_rumah WHERE nik = ?', [nik]);
		if (nikCheck.length > 0) {
			return { error: 'NIK sudah terdaftar' };
		}

		await executeQuery(
			`INSERT INTO pemilik_rumah (blok_rumah_id, nama, nik, no_hp) VALUES (?, ?, ?, ?)`,
			[blok_rumah_id, nama, nik, no_hp]
		);

		return { success: 'Pemilik rumah kosong berhasil ditambahkan' };
	},

	update: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const nama = formData.get('nama');
		const nik = formData.get('nik') || null;
		const no_hp = formData.get('no_hp');

		if (!id || !nama || !no_hp) {
			return { error: 'Blok Rumah, Nama, dan Nomor HP wajib diisi' };
		}

		if (nik && (nik.length !== 16 || !/^\d+$/.test(nik))) {
			return { error: 'NIK harus 16 digit angka' };
		}

		if (no_hp.length < 11 || no_hp.length > 13 || !/^\d+$/.test(no_hp)) {
			return { error: 'Nomor HP 11-13 digit angka' };
		}

		// Cek NIK unique (kecuali dirinya sendiri)
		const nikCheck = await executeQuery('SELECT id FROM pemilik_rumah WHERE nik = ? AND id != ?', [nik, id]);
		if (nikCheck.length > 0) {
			return { error: 'NIK sudah terdaftar' };
		}

		await executeQuery(
			`UPDATE pemilik_rumah SET nama = ?, nik = ?, no_hp = ? WHERE id = ?`,
			[nama, nik, no_hp, id]
		);

		return { success: 'Pemilik rumah kosong berhasil diupdate' };
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const blok_rumah_id = formData.get('blok_rumah_id');

		if (!id) {
			return { error: 'ID tidak valid' };
		}

		await executeQuery('DELETE FROM pemilik_rumah WHERE id = ?', [id]);

		return { success: 'Pemilik rumah kosong berhasil dihapus' };
	}
};