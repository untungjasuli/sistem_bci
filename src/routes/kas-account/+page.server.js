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

	const allowedSortColumns = ['kode', 'nama', 'tipe', 'saldo_current', 'is_active'];
	const allowedSortOrders = ['asc', 'desc'];
	const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'kode';
	const safeSort = allowedSortOrders.includes(sort) ? sort : 'asc';

	const offset = (page - 1) * itemsPerPage;

	let whereClause = '';
	const params = [];

	if (search) {
		whereClause = ' WHERE kode LIKE ? OR nama LIKE ?';
		const searchTerm = `%${search}%`;
		params.push(searchTerm, searchTerm);
	}

	// Total count
	const countSql = `SELECT COUNT(*) as total FROM kas_account${whereClause}`;
	const countRows = await executeQuery(countSql, params);
	const total = countRows[0]?.total || 0;
	const totalPages = Math.ceil(total / itemsPerPage) || 1;

	// Data
	const dataSql = `
		SELECT id, kode, nama, tipe, saldo_awal, saldo_current, is_active, created_at
		FROM kas_account
		${whereClause}
		ORDER BY ${safeSortBy} ${safeSort.toUpperCase()}
		LIMIT ? OFFSET ?
	`;
	params.push(itemsPerPage, offset);
	const rows = await executeQuery(dataSql, params);

	const itemsPerPageOptions = [10, 25, 50, 100];

	return {
		user,
		kas: rows,
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
			return fail(400, { error: 'Hanya admin yang bisa menambah rekening kas' });
		}

		const formData = await request.formData();
		const kode = formData.get('kode')?.toString().trim().toUpperCase();
		const nama = formData.get('nama')?.toString().trim();
		const tipe = formData.get('tipe')?.toString().trim();
		const saldo_awal = parseFloat(formData.get('saldo_awal')?.toString() || '0');

		if (!kode || !nama || !tipe) {
			return fail(400, { error: 'Kode, Nama, dan Tipe wajib diisi' });
		}
		if (!['kas', 'bank', 'ewallet'].includes(tipe)) {
			return fail(400, { error: 'Tipe tidak valid' });
		}

		// Cek kode unique
		const existing = await executeQuery('SELECT id FROM kas_account WHERE kode = ?', [kode]);
		if (existing.length > 0) {
			return fail(400, { error: 'Kode sudah digunakan' });
		}

		await executeQuery(
			'INSERT INTO kas_account (kode, nama, tipe, saldo_awal, saldo_current) VALUES (?, ?, ?, ?, ?)',
			[kode, nama, tipe, saldo_awal, saldo_awal]
		);

		return { success: 'Rekening kas berhasil ditambahkan' };
	},

	update: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return fail(400, { error: 'Hanya admin yang bisa mengedit rekening kas' });
		}

		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() || '0');
		const kode = formData.get('kode')?.toString().trim().toUpperCase();
		const nama = formData.get('nama')?.toString().trim();
		const tipe = formData.get('tipe')?.toString().trim();
		const is_active = formData.get('is_active') === 'on';

		if (!id || !kode || !nama || !tipe) {
			return fail(400, { error: 'Data tidak lengkap' });
		}
		if (!['kas', 'bank', 'ewallet'].includes(tipe)) {
			return fail(400, { error: 'Tipe tidak valid' });
		}

		// Cek kode unique (kecuali dirinya sendiri)
		const existing = await executeQuery('SELECT id FROM kas_account WHERE kode = ? AND id != ?', [kode, id]);
		if (existing.length > 0) {
			return fail(400, { error: 'Kode sudah digunakan' });
		}

		await executeQuery(
			'UPDATE kas_account SET kode = ?, nama = ?, tipe = ?, is_active = ? WHERE id = ?',
			[kode, nama, tipe, is_active, id]
		);

		return { success: 'Rekening kas berhasil diupdate' };
	},

	delete: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return fail(400, { error: 'Hanya admin yang bisa menghapus rekening kas' });
		}

		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() || '0');

		if (!id) {
			return fail(400, { error: 'ID tidak valid' });
		}

		// Cek apakah masih dipakai di transaksi
		const used = await executeQuery('SELECT id FROM transaksi_kas WHERE kas_account_id = ? LIMIT 1', [id]);
		if (used.length > 0) {
			return fail(400, { error: 'Rekening ini masih memiliki transaksi, tidak bisa dihapus' });
		}

		// Cek apakah dipakai di pembayaran_method
		const usedMethod = await executeQuery('SELECT id FROM pembayaran_method WHERE default_kas_account_id = ? LIMIT 1', [id]);
		if (usedMethod.length > 0) {
			return fail(400, { error: 'Rekening ini masih dipakai di Metode Pembayaran, tidak bisa dihapus' });
		}

		await executeQuery('DELETE FROM kas_account WHERE id = ?', [id]);

		return { success: 'Rekening kas berhasil dihapus' };
	}
};