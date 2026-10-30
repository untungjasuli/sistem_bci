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
	const tipeFilter = url.searchParams.get('tipe') || 'semua'; // semua, pemasukan, pengeluaran
	const sortBy = url.searchParams.get('sortBy') || 'urutan';
	const sort = url.searchParams.get('sort') || 'asc';

	const allowedSortColumns = ['kode', 'nama', 'tipe', 'urutan', 'is_active'];
	const allowedSortOrders = ['asc', 'desc'];
	const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'urutan';
	const safeSort = allowedSortOrders.includes(sort) ? sort : 'asc';

	const offset = (page - 1) * itemsPerPage;

	let whereClause = '';
	const params = [];

	const conditions = [];
	if (search) {
		conditions.push('(kode LIKE ? OR nama LIKE ?)');
		const searchTerm = `%${search}%`;
		params.push(searchTerm, searchTerm);
	}
	if (tipeFilter !== 'semua') {
		conditions.push('tipe = ?');
		params.push(tipeFilter);
	}
	if (conditions.length > 0) {
		whereClause = ' WHERE ' + conditions.join(' AND ');
	}

	// Total count
	const countSql = `SELECT COUNT(*) as total FROM kategori_kas${whereClause}`;
	const countRows = await executeQuery(countSql, params);
	const total = countRows[0]?.total || 0;
	const totalPages = Math.ceil(total / itemsPerPage) || 1;

	// Data - include parent name for display
	const dataSql = `
		SELECT kk.*, kp.nama as parent_nama
		FROM kategori_kas kk
		LEFT JOIN kategori_kas kp ON kk.parent_id = kp.id
		${whereClause}
		ORDER BY kk.tipe, kk.urutan, kk.nama
		LIMIT ? OFFSET ?
	`;
	params.push(itemsPerPage, offset);
	const rows = await executeQuery(dataSql, params);

	// Get all categories for parent dropdown (only active)
	const allKategori = await executeQuery('SELECT id, kode, nama, tipe FROM kategori_kas WHERE is_active = 1 ORDER BY tipe, urutan, nama');

	const itemsPerPageOptions = [10, 25, 50, 100];

	return {
		user,
		kategori: rows,
		allKategori,
		pagination: {
			page,
			itemsPerPage,
			total,
			totalPages,
			search,
			tipeFilter,
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
			return fail(400, { error: 'Hanya admin yang bisa menambah kategori' });
		}

		const formData = await request.formData();
		const kode = formData.get('kode')?.toString().trim().toUpperCase();
		const nama = formData.get('nama')?.toString().trim();
		const tipe = formData.get('tipe')?.toString().trim();
		const parent_id = parseInt(formData.get('parent_id')?.toString() || '0') || null;
		const urutan = parseInt(formData.get('urutan')?.toString() || '0');

		if (!nama || !tipe) {
			return fail(400, { error: 'Nama dan Tipe wajib diisi' });
		}
		if (!['pemasukan', 'pengeluaran'].includes(tipe)) {
			return fail(400, { error: 'Tipe tidak valid' });
		}
		if (kode) {
			const existing = await executeQuery('SELECT id FROM kategori_kas WHERE kode = ?', [kode]);
			if (existing.length > 0) {
				return fail(400, { error: 'Kode sudah digunakan' });
			}
		}
		if (parent_id) {
			// Cek parent tidak boleh sama tipe (optional, tapi best practice)
			const parent = await executeQuery('SELECT tipe FROM kategori_kas WHERE id = ?', [parent_id]);
			if (parent.length > 0 && parent[0].tipe !== tipe) {
				return fail(400, { error: 'Parent kategori harus tipe yang sama' });
			}
		}

		await executeQuery(
			'INSERT INTO kategori_kas (kode, nama, tipe, parent_id, urutan) VALUES (?, ?, ?, ?, ?)',
			[kode || null, nama, tipe, parent_id, urutan]
		);

		return { success: 'Kategori berhasil ditambahkan' };
	},

	update: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return fail(400, { error: 'Hanya admin yang bisa mengedit kategori' });
		}

		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() || '0');
		const kode = formData.get('kode')?.toString().trim().toUpperCase();
		const nama = formData.get('nama')?.toString().trim();
		const tipe = formData.get('tipe')?.toString().trim();
		const parent_id = parseInt(formData.get('parent_id')?.toString() || '0') || null;
		const urutan = parseInt(formData.get('urutan')?.toString() || '0');
		const is_active = formData.get('is_active') === 'on';

		if (!id || !nama || !tipe) {
			return fail(400, { error: 'Data tidak lengkap' });
		}
		if (!['pemasukan', 'pengeluaran'].includes(tipe)) {
			return fail(400, { error: 'Tipe tidak valid' });
		}
		if (kode) {
			const existing = await executeQuery('SELECT id FROM kategori_kas WHERE kode = ? AND id != ?', [kode, id]);
			if (existing.length > 0) {
				return fail(400, { error: 'Kode sudah digunakan' });
			}
		}
		if (parent_id && parent_id === id) {
			return fail(400, { error: 'Kategori tidak bisa menjadi parent dirinya sendiri' });
		}
		if (parent_id) {
			const parent = await executeQuery('SELECT tipe FROM kategori_kas WHERE id = ?', [parent_id]);
			if (parent.length > 0 && parent[0].tipe !== tipe) {
				return fail(400, { error: 'Parent kategori harus tipe yang sama' });
			}
		}

		await executeQuery(
			'UPDATE kategori_kas SET kode = ?, nama = ?, tipe = ?, parent_id = ?, urutan = ?, is_active = ? WHERE id = ?',
			[kode || null, nama, tipe, parent_id, urutan, is_active, id]
		);

		return { success: 'Kategori berhasil diupdate' };
	},

	delete: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return fail(400, { error: 'Hanya admin yang bisa menghapus kategori' });
		}

		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() || '0');

		if (!id) {
			return fail(400, { error: 'ID tidak valid' });
		}

		// Cek apakah punya children
		const children = await executeQuery('SELECT id FROM kategori_kas WHERE parent_id = ? LIMIT 1', [id]);
		if (children.length > 0) {
			return fail(400, { error: 'Kategori ini memiliki sub-kategori, hapus sub-kategori dulu' });
		}

		// Cek apakah masih dipakai di transaksi
		const used = await executeQuery('SELECT id FROM transaksi_kas WHERE kategori_id = ? LIMIT 1', [id]);
		if (used.length > 0) {
			return fail(400, { error: 'Kategori ini masih memiliki transaksi, tidak bisa dihapus' });
		}

		await executeQuery('DELETE FROM kategori_kas WHERE id = ?', [id]);

		return { success: 'Kategori berhasil dihapus' };
	}
};