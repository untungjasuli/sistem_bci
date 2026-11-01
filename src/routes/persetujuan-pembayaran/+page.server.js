import { redirect, error, fail } from '@sveltejs/kit';
import { executeQuery, executeTransaction } from '#lib/server/db';

export const load = async ({ locals, url }) => {
	const user = locals.user;
	if (!user || user.role !== 'admin') {
		throw redirect(303, '/login');
	}

	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const itemsPerPage = parseInt(url.searchParams.get('itemsPerPage') || '10', 10);
	const search = url.searchParams.get('search') || '';
	const statusFilter = url.searchParams.get('status') || 'pending_approval';
	const metodeFilter = url.searchParams.get('metode') || 'semua';
	const sortBy = url.searchParams.get('sortBy') || 'created_at';
	const sort = url.searchParams.get('sort') || 'asc';

	const allowedSortColumns = ['created_at', 'tanggal_bayar', 'nominal_bayar', 'metode_bayar'];
	const allowedSortOrders = ['asc', 'desc'];
	const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
	const safeSort = allowedSortOrders.includes(sort) ? sort : 'asc';

	const offset = (page - 1) * itemsPerPage;

	let whereClause = '';
	const params = [];

	const conditions = [];
	// Default: hanya pending_approval
	conditions.push('pi.status = ?');
	params.push(statusFilter);

	if (search) {
		conditions.push('(pi.catatan LIKE ? OR kk.nama LIKE ? OR br.no_blok LIKE ? OR pr.nama LIKE ?)');
		const searchTerm = `%${search}%`;
		params.push(searchTerm, searchTerm, searchTerm, searchTerm);
	}
	if (metodeFilter !== 'semua') {
		conditions.push('pi.metode_bayar = ?');
		params.push(metodeFilter);
	}

	if (conditions.length > 0) {
		whereClause = ' WHERE ' + conditions.join(' AND ');
	}

	// Total count
	const countSql = `
		SELECT COUNT(*) as total 
		FROM pembayaran_iuran pi
		LEFT JOIN tagihan_iuran ti ON pi.tagihan_id = ti.id
		LEFT JOIN blok_rumah br ON ti.blok_rumah_id = br.id
		LEFT JOIN keluarga k ON ti.keluarga_id = k.id
		LEFT JOIN anggota_keluarga kk ON kk.keluarga_id = k.id AND kk.hub_keluarga = 'Kepala Keluarga'
		LEFT JOIN pemilik_rumah pr ON ti.pemilik_rumah_id = pr.id
		${whereClause}
	`;
	const countRows = await executeQuery(countSql, params);
	const total = countRows[0]?.total || 0;
	const totalPages = Math.ceil(total / itemsPerPage) || 1;

	// Data
	const dataSql = `
		SELECT 
			pi.*,
			ti.periode, ti.nominal as tagihan_nominal, ti.tipe_pembayar,
			br.no_blok,
			k.no_kk,
			kk.nama as kepala_keluarga_nama,
			kk.nomor_hp as kepala_keluarga_hp,
			pr.nama as pemilik_nama,
			pr.no_hp as pemilik_hp,
			petugas.name as petugas_nama,
			ap.name as approved_by_nama
		FROM pembayaran_iuran pi
		LEFT JOIN tagihan_iuran ti ON pi.tagihan_id = ti.id
		LEFT JOIN blok_rumah br ON ti.blok_rumah_id = br.id
		LEFT JOIN keluarga k ON ti.keluarga_id = k.id
		LEFT JOIN anggota_keluarga kk ON kk.keluarga_id = k.id AND kk.hub_keluarga = 'Kepala Keluarga'
		LEFT JOIN pemilik_rumah pr ON ti.pemilik_rumah_id = pr.id
		LEFT JOIN users petugas ON pi.petugas_id = petugas.id
		LEFT JOIN users ap ON pi.approved_by = ap.id
		${whereClause}
		ORDER BY ${safeSortBy} ${safeSort.toUpperCase()}
		LIMIT ? OFFSET ?
	`;
	params.push(itemsPerPage, offset);
	const rows = await executeQuery(dataSql, params);

	// Summary stats for pending
	const summarySql = `
		SELECT 
			COUNT(*) as total_pending,
			SUM(nominal_bayar) as nominal_pending
		FROM pembayaran_iuran
		WHERE status = 'pending_approval'
	`;
	const summaryRows = await executeQuery(summarySql);
	const summary = summaryRows[0] || { total_pending: 0, nominal_pending: 0 };

	const itemsPerPageOptions = [10, 25, 50, 100];

	return {
		user,
		pembayaran: rows,
		summary,
		pagination: {
			page,
			itemsPerPage,
			total,
			totalPages,
			search,
			statusFilter,
			metodeFilter,
			sortBy: safeSortBy,
			sort: safeSort
		},
		itemsPerPageOptions
	};
};

export const actions = {
	approve: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return fail(400, { error: 'Hanya admin yang bisa approve pembayaran' });
		}

		const formData = await request.formData();
		const ids = formData.getAll('ids').map(id => parseInt(id)).filter(id => !isNaN(id));
		const singleId = parseInt(formData.get('id')?.toString() || '0');

		const targetIds = singleId ? [singleId] : ids;

		if (targetIds.length === 0) {
			return fail(400, { error: 'Pilih minimal satu pembayaran' });
		}

		// Pre-generate nomor_bukti for all approvals to avoid duplicate key in sequential transactions
		// (MySQL REPEATABLE READ isolation prevents seeing commits from previous transactions in loop)
		const today = new Date();
		const yearMonth = today.getFullYear().toString() + String(today.getMonth() + 1).padStart(2, '0');
		
		// Get current max sequence for this month (outside transaction for initial estimate)
		const lastKwRows = await executeQuery(
			`SELECT nomor_bukti FROM transaksi_kas WHERE nomor_bukti LIKE ? ORDER BY id DESC LIMIT 1`,
			[`KW-${yearMonth}-%`]
		);
		let nextNum = 1;
		if (lastKwRows.length > 0 && lastKwRows[0].nomor_bukti) {
			const parts = lastKwRows[0].nomor_bukti.split('-');
			nextNum = parseInt(parts[parts.length - 1]) + 1;
		}
		
		// Generate nomor_bukti for each targetId
		const nomorBuktiMap = new Map();
		for (const id of targetIds) {
			nomorBuktiMap.set(id, `KW-${yearMonth}-${String(nextNum).padStart(4, '0')}`);
			nextNum++;
		}

		// Process each approval in transaction
		for (const id of targetIds) {
			let retryCount = 0;
			const maxRetries = 3;
			let nomor_bukti = nomorBuktiMap.get(id);
			
			while (retryCount < maxRetries) {
				try {
					await executeTransaction(async (conn) => {
						// Get pembayaran detail
						const [payRows] = await conn.execute('SELECT * FROM pembayaran_iuran WHERE id = ? AND status = "pending_approval"', [id]);
						if (payRows.length === 0) return; // Skip if not pending

						const pay = payRows[0];

						// Get tagihan detail
						const [tagRows] = await conn.execute('SELECT * FROM tagihan_iuran WHERE id = ?', [pay.tagihan_id]);
						if (tagRows.length === 0) return;
						const tagihan = tagRows[0];

						// Get default kas_account from metode_bayar
						const [methodRows] = await conn.execute('SELECT default_kas_account_id FROM pembayaran_method WHERE kode = ? AND is_active = 1', [pay.metode_bayar]);
						if (methodRows.length === 0) {
							throw new Error(`Metode pembayaran ${pay.metode_bayar} tidak memiliki mapping ke rekening kas`);
						}
						const kas_account_id = methodRows[0].default_kas_account_id;

						// Get kategori iuran
						const [katRows] = await conn.execute('SELECT id FROM kategori_kas WHERE kode = "PMS-IURAN" AND is_active = 1 LIMIT 1');
						if (katRows.length === 0) {
							throw new Error('Kategori Iuran Bulanan (PMS-IURAN) tidak ditemukan');
						}
						const kategori_id = katRows[0].id;

						// Verify nomor_bukti doesn't exist, if it does find next available
						let checkNomor = nomor_bukti;
						let checkCount = 0;
						while (checkCount < 10) {
							const [existing] = await conn.execute(
								'SELECT 1 FROM transaksi_kas WHERE nomor_bukti = ? LIMIT 1',
								[checkNomor]
							);
							if (existing.length === 0) break;
							const parts = checkNomor.split('-');
							const num = parseInt(parts[parts.length - 1]) + 1;
							checkNomor = `${parts[0]}-${parts[1]}-${String(num).padStart(4, '0')}`;
							checkCount++;
						}
						nomor_bukti = checkNomor;
						nomorBuktiMap.set(id, nomor_bukti);

						// 1. Update pembayaran_iuran status
						await conn.execute(
							'UPDATE pembayaran_iuran SET status = "approved", approved_by = ?, approved_at = NOW() WHERE id = ?',
							[user.id, id]
						);

						// 2. Update existing transaksi_kas (status=pending) to posted with nomor_bukti
						await conn.execute(
							`UPDATE transaksi_kas SET status = "posted", nomor_bukti = ?, approved_by = ?, approved_at = NOW() WHERE ref_type = "iuran" AND ref_id = ? AND status = "pending"`,
							[nomor_bukti, user.id, id]
						);

						// 3. Update saldo kas_account
						await conn.execute(
							'UPDATE kas_account SET saldo_current = saldo_current + ? WHERE id = ?',
							[pay.nominal_bayar, kas_account_id]
						);
					});
					break; // Success, exit retry loop
				} catch (e) {
					retryCount++;
					// If duplicate entry error, increment nomor_bukti and retry
					if (e.code === 'ER_DUP_ENTRY' && retryCount < maxRetries) {
						const parts = nomor_bukti.split('-');
						const num = parseInt(parts[parts.length - 1]) + 1;
						nomor_bukti = `${parts[0]}-${parts[1]}-${String(num).padStart(4, '0')}`;
						nomorBuktiMap.set(id, nomor_bukti);
						continue;
					}
					throw e; // Re-throw if max retries or different error
				}
			}
		}

		return { success: `Berhasil approve ${targetIds.length} pembayaran` };
	},

	reject: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return fail(400, { error: 'Hanya admin yang bisa reject pembayaran' });
		}

		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() || '0');
		const reject_reason = formData.get('reject_reason')?.toString().trim() || '';

		if (!id) {
			return fail(400, { error: 'ID tidak valid' });
		}
		if (!reject_reason) {
			return fail(400, { error: 'Alasan penolakan wajib diisi' });
		}

		const pay = await executeQuery('SELECT * FROM pembayaran_iuran WHERE id = ? AND status = "pending_approval"', [id]);
		if (pay.length === 0) {
			return fail(400, { error: 'Pembayaran tidak ditemukan atau sudah diproses' });
		}

		// Reject: update pembayaran, revert tagihan to belum_bayar, update transaksi_kas to rejected
		await executeTransaction(async (conn) => {
			await conn.execute(
				'UPDATE pembayaran_iuran SET status = "rejected", approved_by = ?, approved_at = NOW(), reject_reason = ? WHERE id = ?',
				[user.id, reject_reason, id]
			);

			// Revert tagihan to belum_bayar
			await conn.execute('UPDATE tagihan_iuran SET status = "belum_bayar" WHERE id = ?', [pay[0].tagihan_id]);

			// Update transaksi_kas to rejected
			await conn.execute(
				'UPDATE transaksi_kas SET status = "rejected", approved_by = ?, approved_at = NOW() WHERE ref_type = "iuran" AND ref_id = ? AND status = "pending"',
				[user.id, id]
			);
		});

		return { success: 'Pembayaran ditolak, tagihan kembali ke status Belum Bayar' };
	}
};