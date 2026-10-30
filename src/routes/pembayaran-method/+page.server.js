import { redirect, error, fail } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const load = async ({ locals, url }) => {
	const user = locals.user;
	if (!user || user.role !== 'admin') {
		throw redirect(303, '/login');
	}

	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const itemsPerPage = parseInt(url.searchParams.get('itemsPerPage') || '10', 10);
	const search = url.searchParams.get('search') || '';
	const sortBy = url.searchParams.get('sortBy') || 'kode';
	const sort = url.searchParams.get('sort') || 'asc';

	const allowedSortColumns = ['kode', 'nama', 'default_kas_account_id', 'is_active'];
	const allowedSortOrders = ['asc', 'desc'];
	const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'kode';
	const safeSort = allowedSortOrders.includes(sort) ? sort : 'asc';

	const offset = (page - 1) * itemsPerPage;

	let whereClause = '';
	const params = [];

	if (search) {
		whereClause = ' WHERE pm.kode LIKE ? OR pm.nama LIKE ? OR ka.nama LIKE ?';
		const searchTerm = `%${search}%`;
		params.push(searchTerm, searchTerm, searchTerm);
	}

	// Total count
	const countSql = `SELECT COUNT(*) as total FROM pembayaran_method pm LEFT JOIN kas_account ka ON pm.default_kas_account_id = ka.id${whereClause}`;
	const countRows = await executeQuery(countSql, params);
	const total = countRows[0]?.total || 0;
	const totalPages = Math.ceil(total / itemsPerPage) || 1;

	// Data
	const dataSql = `
		SELECT pm.*, ka.kode as kas_kode, ka.nama as kas_nama, ka.tipe as kas_tipe
		FROM pembayaran_method pm
		LEFT JOIN kas_account ka ON pm.default_kas_account_id = ka.id
		${whereClause}
		ORDER BY ${safeSortBy} ${safeSort.toUpperCase()}
		LIMIT ? OFFSET ?
	`;
	params.push(itemsPerPage, offset);
	const rows = await executeQuery(dataSql, params);

	// Get all kas accounts for dropdown
	const kasAccounts = await executeQuery('SELECT id, kode, nama, tipe FROM kas_account WHERE is_active = 1 ORDER BY kode');

	const itemsPerPageOptions = [10, 25, 50, 100];

	return {
		user,
		methods: rows,
		kasAccounts,
		pagination: {
			page,
			itemsPerPage,
			total,
			totalPages,
			search,
			sortBy: safeSortBy,
			sort: safeSort
		},
		itemsPerPageOptions
	};
};

export const actions = {
	create: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return fail(400, { error: 'Hanya admin yang bisa menambah metode pembayaran' });
		}

		const formData = await request.formData();
		const kode = formData.get('kode')?.toString().trim().toLowerCase();
		const nama = formData.get('nama')?.toString().trim();
		const default_kas_account_id = parseInt(formData.get('default_kas_account_id')?.toString() || '0');

		if (!kode || !nama || !default_kas_account_id) {
			return fail(400, { error: 'Kode, Nama, dan Rekening Kas wajib diisi' });
		}
		if (!['cash', 'qris', 'transfer'].includes(kode)) {
			return fail(400, { error: 'Kode harus salah satu dari: cash, qris, transfer' });
		}

		// Cek kas account exists
		const kas = await executeQuery('SELECT id FROM kas_account WHERE id = ? AND is_active = 1', [default_kas_account_id]);
		if (kas.length === 0) {
			return fail(400, { error: 'Rekening kas tidak ditemukan atau nonaktif' });
		}

		// Cek kode unique
		const existing = await executeQuery('SELECT id FROM pembayaran_method WHERE kode = ?', [kode]);
		if (existing.length > 0) {
			return fail(400, { error: 'Kode sudah digunakan' });
		}

		await executeQuery(
			'INSERT INTO pembayaran_method (kode, nama, default_kas_account_id) VALUES (?, ?, ?)',
			[kode, nama, default_kas_account_id]
		);

		return { success: 'Metode pembayaran berhasil ditambahkan' };
	},

	update: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return fail(400, { error: 'Hanya admin yang bisa mengedit metode pembayaran' });
		}

		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() || '0');
		const kode = formData.get('kode')?.toString().trim().toLowerCase();
		const nama = formData.get('nama')?.toString().trim();
		const default_kas_account_id = parseInt(formData.get('default_kas_account_id')?.toString() || '0');
		const is_active = formData.get('is_active') === 'on';

		if (!id || !kode || !nama || !default_kas_account_id) {
			return fail(400, { error: 'Data tidak lengkap' });
		}
		if (!['cash', 'qris', 'transfer'].includes(kode)) {
			return fail(400, { error: 'Kode harus salah satu dari: cash, qris, transfer' });
		}

		// Cek kas account exists
		const kas = await executeQuery('SELECT id FROM kas_account WHERE id = ? AND is_active = 1', [default_kas_account_id]);
		if (kas.length === 0) {
			return fail(400, { error: 'Rekening kas tidak ditemukan atau nonaktif' });
		}

		// Cek kode unique (kecuali dirinya sendiri)
		const existing = await executeQuery('SELECT id FROM pembayaran_method WHERE kode = ? AND id != ?', [kode, id]);
		if (existing.length > 0) {
			return fail(400, { error: 'Kode sudah digunakan' });
		}

		await executeQuery(
			'UPDATE pembayaran_method SET kode = ?, nama = ?, default_kas_account_id = ?, is_active = ? WHERE id = ?',
			[kode, nama, default_kas_account_id, is_active, id]
		);

		return { success: 'Metode pembayaran berhasil diupdate' };
	},

	delete: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return fail(400, { error: 'Hanya admin yang bisa menghapus metode pembayaran' });
		}

		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() || '0');

		if (!id) {
			return fail(400, { error: 'ID tidak valid' });
		}

		await executeQuery('DELETE FROM pembayaran_method WHERE id = ?', [id]);

		return { success: 'Metode pembayaran berhasil dihapus' };
	}
};