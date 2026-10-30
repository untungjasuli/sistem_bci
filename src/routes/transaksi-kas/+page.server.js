import { redirect, error, fail } from '@sveltejs/kit';
import { executeQuery, executeTransaction } from '#lib/server/db';

export const load = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(303, '/login');
	}

	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const itemsPerPage = parseInt(url.searchParams.get('itemsPerPage') || '10', 10);
	const search = url.searchParams.get('search') || '';
	const statusFilter = url.searchParams.get('status') || 'semua';
	const kasFilter = url.searchParams.get('kas') || 'semua';
	const kategoriFilter = url.searchParams.get('kategori') || 'semua';
	const tipeFilter = url.searchParams.get('tipe') || 'semua';
	const sortBy = url.searchParams.get('sortBy') || 'tanggal';
	const sort = url.searchParams.get('sort') || 'desc';

	const allowedSortColumns = ['tanggal', 'nominal', 'status', 'nomor_bukti', 'created_at'];
	const allowedSortOrders = ['asc', 'desc'];
	const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'tanggal';
	const safeSort = allowedSortOrders.includes(sort) ? sort : 'desc';

	const offset = (page - 1) * itemsPerPage;

	let whereClause = '';
	const params = [];

	const conditions = [];
	if (search) {
		conditions.push('(tk.nomor_bukti LIKE ? OR tk.keterangan LIKE ? OR ka.nama LIKE ? OR kk.nama LIKE ?)');
		const searchTerm = `%${search}%`;
		params.push(searchTerm, searchTerm, searchTerm, searchTerm);
	}
	if (statusFilter !== 'semua') {
		conditions.push('tk.status = ?');
		params.push(statusFilter);
	}
	if (kasFilter !== 'semua') {
		conditions.push('tk.kas_account_id = ?');
		params.push(parseInt(kasFilter));
	}
	if (kategoriFilter !== 'semua') {
		conditions.push('tk.kategori_id = ?');
		params.push(parseInt(kategoriFilter));
	}
	if (tipeFilter !== 'semua') {
		conditions.push('tk.tipe = ?');
		params.push(tipeFilter);
	}
	if (conditions.length > 0) {
		whereClause = ' WHERE ' + conditions.join(' AND ');
	}

	// Total count
	const countSql = `
		SELECT COUNT(*) as total 
		FROM transaksi_kas tk
		LEFT JOIN kas_account ka ON tk.kas_account_id = ka.id
		LEFT JOIN kategori_kas kk ON tk.kategori_id = kk.id
		${whereClause}
	`;
	const countRows = await executeQuery(countSql, params);
	const total = countRows[0]?.total || 0;
	const totalPages = Math.ceil(total / itemsPerPage) || 1;

	// Data
	const dataSql = `
		SELECT 
			tk.*, 
			ka.kode as kas_kode, ka.nama as kas_nama, ka.tipe as kas_tipe,
			kk.kode as kategori_kode, kk.nama as kategori_nama, kk.tipe as kategori_tipe,
			u.name as created_by_nama,
			ap.name as approved_by_nama
		FROM transaksi_kas tk
		LEFT JOIN kas_account ka ON tk.kas_account_id = ka.id
		LEFT JOIN kategori_kas kk ON tk.kategori_id = kk.id
		LEFT JOIN users u ON tk.created_by = u.id
		LEFT JOIN users ap ON tk.approved_by = ap.id
		${whereClause}
		ORDER BY ${safeSortBy} ${safeSort.toUpperCase()}
		LIMIT ? OFFSET ?
	`;
	params.push(itemsPerPage, offset);
	const rows = await executeQuery(dataSql, params);

	// Summary stats
	const summarySql = `
		SELECT 
			SUM(CASE WHEN tk.tipe = 'debit' AND tk.status = 'posted' THEN tk.nominal ELSE 0 END) as total_debit,
			SUM(CASE WHEN tk.tipe = 'kredit' AND tk.status = 'posted' THEN tk.nominal ELSE 0 END) as total_kredit,
			SUM(CASE WHEN tk.status = 'pending' THEN 1 ELSE 0 END) as total_pending,
			SUM(CASE WHEN tk.status = 'rejected' THEN 1 ELSE 0 END) as total_rejected
		FROM transaksi_kas tk
		LEFT JOIN kas_account ka ON tk.kas_account_id = ka.id
		LEFT JOIN kategori_kas kk ON tk.kategori_id = kk.id
		${whereClause}
	`;
	const summaryRows = await executeQuery(summarySql, params);
	const summary = summaryRows[0] || { total_debit: 0, total_kredit: 0, total_pending: 0, total_rejected: 0 };

	// Get filter options
	const kasAccounts = await executeQuery('SELECT id, kode, nama, tipe FROM kas_account WHERE is_active = 1 ORDER BY kode');
	const kategoriKas = await executeQuery('SELECT id, kode, nama, tipe FROM kategori_kas WHERE is_active = 1 ORDER BY tipe, urutan, nama');

	const itemsPerPageOptions = [10, 25, 50, 100];

	return {
		user,
		transaksi: rows,
		kasAccounts,
		kategoriKas,
		summary,
		pagination: {
			page,
			itemsPerPage,
			total,
			totalPages,
			search,
			statusFilter,
			kasFilter,
			kategoriFilter,
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
			return fail(400, { error: 'Hanya admin yang bisa menambah transaksi manual' });
		}

		const formData = await request.formData();
		const kas_account_id = parseInt(formData.get('kas_account_id')?.toString() || '0');
		const kategori_id = parseInt(formData.get('kategori_id')?.toString() || '0');
		const tipe = formData.get('tipe')?.toString().trim();
		const nominal = parseFloat(formData.get('nominal')?.toString() || '0');
		const tanggal = formData.get('tanggal')?.toString().trim();
		const keterangan = formData.get('keterangan')?.toString().trim() || '';
		const nomor_bukti = formData.get('nomor_bukti')?.toString().trim() || null;

		if (!kas_account_id || !kategori_id || !tipe || !nominal || !tanggal) {
			return fail(400, { error: 'Semua field wajib diisi' });
		}
		if (!['debit', 'kredit'].includes(tipe)) {
			return fail(400, { error: 'Tipe tidak valid' });
		}
		if (nominal <= 0) {
			return fail(400, { error: 'Nominal harus lebih dari 0' });
		}

		// Cek kategori tipe sesuai transaksi tipe
		const kat = await executeQuery('SELECT tipe FROM kategori_kas WHERE id = ?', [kategori_id]);
		if (kat.length === 0) {
			return fail(400, { error: 'Kategori tidak ditemukan' });
		}
		const expectedTipe = kat[0].tipe === 'pemasukan' ? 'debit' : 'kredit';
		if (tipe !== expectedTipe) {
			return fail(400, { error: `Kategori ${kat[0].nama} hanya untuk ${expectedTipe === 'debit' ? 'Pemasukan (Debit)' : 'Pengeluaran (Kredit)'}` });
		}

		// Auto generate nomor_bukti if not provided
		let finalNomorBukti = nomor_bukti;
		if (!finalNomorBukti) {
			const prefix = tipe === 'debit' ? 'BM' : 'BK'; // Bukti Masuk / Bukti Keluar
			const today = new Date();
			const yearMonth = today.getFullYear().toString() + String(today.getMonth() + 1).padStart(2, '0');
			const last = await executeQuery(
				`SELECT nomor_bukti FROM transaksi_kas WHERE nomor_bukti LIKE ? ORDER BY id DESC LIMIT 1`,
				[`${prefix}-${yearMonth}-%`]
			);
			let nextNum = 1;
			if (last.length > 0 && last[0].nomor_bukti) {
				const parts = last[0].nomor_bukti.split('-');
				nextNum = parseInt(parts[parts.length - 1]) + 1;
			}
			finalNomorBukti = `${prefix}-${yearMonth}-${String(nextNum).padStart(4, '0')}`;
		}

		// Insert transaksi (admin manual = posted langsung)
		await executeQuery(
			`INSERT INTO transaksi_kas (kas_account_id, kategori_id, tipe, nominal, tanggal, keterangan, status, nomor_bukti, ref_type, created_by, approved_by, approved_at)
			VALUES (?, ?, ?, ?, ?, ?, 'posted', ?, 'manual', ?, ?, NOW())`,
			[kas_account_id, kategori_id, tipe, nominal, tanggal, keterangan, finalNomorBukti, user.id, user.id]
		);

		// Update saldo kas_account
		const saldoChange = tipe === 'debit' ? nominal : -nominal;
		await executeQuery(
			'UPDATE kas_account SET saldo_current = saldo_current + ? WHERE id = ?',
			[saldoChange, kas_account_id]
		);

		return { success: 'Transaksi manual berhasil dicatat' };
	},

	update: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return fail(400, { error: 'Hanya admin yang bisa mengedit transaksi manual' });
		}

		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() || '0');
		const kas_account_id = parseInt(formData.get('kas_account_id')?.toString() || '0');
		const kategori_id = parseInt(formData.get('kategori_id')?.toString() || '0');
		const tipe = formData.get('tipe')?.toString().trim();
		const nominal = parseFloat(formData.get('nominal')?.toString() || '0');
		const tanggal = formData.get('tanggal')?.toString().trim();
		const keterangan = formData.get('keterangan')?.toString().trim() || '';
		const nomor_bukti = formData.get('nomor_bukti')?.toString().trim() || null;

		if (!id || !kas_account_id || !kategori_id || !tipe || !nominal || !tanggal) {
			return fail(400, { error: 'Semua field wajib diisi' });
		}
		if (!['debit', 'kredit'].includes(tipe)) {
			return fail(400, { error: 'Tipe tidak valid' });
		}
		if (nominal <= 0) {
			return fail(400, { error: 'Nominal harus lebih dari 0' });
		}

		// Cek transaksi existing
		const rows = await executeQuery('SELECT * FROM transaksi_kas WHERE id = ?', [id]);

		// Safety check
		if (!rows || rows.length === 0) {
			return fail(400, { error: 'Transaksi tidak ditemukan' });
		}

		const transaksi = rows[0];

		// Additional safety check
		if (!transaksi) {
			return fail(400, { error: 'Transaksi data tidak valid' });
		}

		// Hanya boleh edit transaksi manual (ref_type = 'manual')
		if (transaksi.ref_type !== 'manual') {
			return fail(400, { error: 'Transaksi ini tidak bisa diedit (bukan transaksi manual)' });
		}

		// Hanya boleh edit jika status draft atau posted
		if (!['draft', 'posted'].includes(transaksi.status)) {
			return fail(400, { error: 'Transaksi dengan status ini tidak bisa diedit' });
		}

		// Cek kategori tipe sesuai transaksi tipe
		const kat = await executeQuery('SELECT tipe FROM kategori_kas WHERE id = ?', [kategori_id]);
		if (kat.length === 0) {
			return fail(400, { error: 'Kategori tidak ditemukan' });
		}
		const expectedTipe = kat[0].tipe === 'pemasukan' ? 'debit' : 'kredit';
		if (tipe !== expectedTipe) {
			return fail(400, { error: `Kategori ${kat[0].nama} hanya untuk ${expectedTipe === 'debit' ? 'Pemasukan (Debit)' : 'Pengeluaran (Kredit)'}` });
		}

		// Use transaction for atomicity (saldo reverse + new saldo + transaksi update)
		await executeTransaction(async (conn) => {
			// Reverse old saldo
			const oldSaldoChange = transaksi.tipe === 'debit' ? -transaksi.nominal : transaksi.nominal;
			await conn.execute(
				'UPDATE kas_account SET saldo_current = saldo_current + ? WHERE id = ?',
				[oldSaldoChange, transaksi.kas_account_id]
			);

			// Apply new saldo
			const newSaldoChange = tipe === 'debit' ? nominal : -nominal;
			await conn.execute(
				'UPDATE kas_account SET saldo_current = saldo_current + ? WHERE id = ?',
				[newSaldoChange, kas_account_id]
			);

			// Update transaksi
			const [result] = await conn.execute(
				`UPDATE transaksi_kas SET 
					kas_account_id = ?, kategori_id = ?, tipe = ?, nominal = ?, 
					tanggal = ?, keterangan = ?, nomor_bukti = ?
				WHERE id = ?`,
				[kas_account_id, kategori_id, tipe, nominal, tanggal, keterangan, nomor_bukti, id]
			);

			if (result.affectedRows === 0) {
				throw new Error('Transaksi tidak ditemukan atau tidak ada perubahan');
			}
		});

		return { success: 'Transaksi manual berhasil diupdate' };
	},

	delete: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return fail(400, { error: 'Hanya admin yang bisa menghapus transaksi manual' });
		}

		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() || '0');

		if (!id) {
			return fail(400, { error: 'ID tidak valid' });
		}

		// Cek transaksi existing
		const [existing] = await executeQuery('SELECT * FROM transaksi_kas WHERE id = ?', [id]);

		// Safety check
		if (!existing || !Array.isArray(existing) || existing.length === 0) {
			return fail(400, { error: 'Transaksi tidak ditemukan' });
		}

		const transaksi = existing[0];

		// Additional safety check
		if (!transaksi) {
			return fail(400, { error: 'Transaksi data tidak valid' });
		}

		// Hanya boleh hapus transaksi manual (ref_type = 'manual')
		if (transaksi.ref_type !== 'manual') {
			return fail(400, { error: 'Transaksi ini tidak bisa dihapus (bukan transaksi manual)' });
		}

		// Hanya boleh hapus jika status draft atau posted
		if (!['draft', 'posted'].includes(transaksi.status)) {
			return fail(400, { error: 'Transaksi dengan status ini tidak bisa dihapus' });
		}

		// Use transaction for atomicity
		await executeTransaction(async (conn) => {
			// Reverse saldo
			const saldoChange = transaksi.tipe === 'debit' ? -transaksi.nominal : transaksi.nominal;
			await conn.execute(
				'UPDATE kas_account SET saldo_current = saldo_current + ? WHERE id = ?',
				[saldoChange, transaksi.kas_account_id]
			);

			// Delete transaksi
			const [result] = await conn.execute('DELETE FROM transaksi_kas WHERE id = ?', [id]);

			if (result.affectedRows === 0) {
				throw new Error('Transaksi tidak ditemukan atau sudah dihapus');
			}
		});

		return { success: 'Transaksi manual berhasil dihapus' };
	}
};