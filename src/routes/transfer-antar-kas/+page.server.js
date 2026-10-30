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
	const statusFilter = url.searchParams.get('status') || 'semua';
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
		conditions.push('(tak.nomor_bukti LIKE ? OR tak.keterangan LIKE ? OR kad.nama LIKE ? OR kak.nama LIKE ?)');
		const searchTerm = `%${search}%`;
		params.push(searchTerm, searchTerm, searchTerm, searchTerm);
	}
	if (statusFilter !== 'semua') {
		conditions.push('tak.status = ?');
		params.push(statusFilter);
	}
	if (conditions.length > 0) {
		whereClause = ' WHERE ' + conditions.join(' AND ');
	}

	// Total count
	const countSql = `SELECT COUNT(*) as total FROM transfer_antar_kas tak LEFT JOIN kas_account kad ON tak.dari_kas_id = kad.id LEFT JOIN kas_account kak ON tak.ke_kas_id = kak.id${whereClause}`;
	const countRows = await executeQuery(countSql, params);
	const total = countRows[0]?.total || 0;
	const totalPages = Math.ceil(total / itemsPerPage) || 1;

	// Data
	const dataSql = `
		SELECT 
			tak.*,
			kad.kode as dari_kode, kad.nama as dari_nama,
			kak.kode as ke_kode, kak.nama as ke_nama,
			u.name as created_by_nama,
			ap.name as approved_by_nama
		FROM transfer_antar_kas tak
		LEFT JOIN kas_account kad ON tak.dari_kas_id = kad.id
		LEFT JOIN kas_account kak ON tak.ke_kas_id = kak.id
		LEFT JOIN users u ON tak.created_by = u.id
		LEFT JOIN users ap ON tak.approved_by = ap.id
		${whereClause}
		ORDER BY ${safeSortBy} ${safeSort.toUpperCase()}
		LIMIT ? OFFSET ?
	`;
	params.push(itemsPerPage, offset);
	const rows = await executeQuery(dataSql, params);

	// Get kas accounts for dropdown
	const kasAccounts = await executeQuery('SELECT id, kode, nama, saldo_current FROM kas_account WHERE is_active = 1 ORDER BY kode');

	const itemsPerPageOptions = [10, 25, 50, 100];

	return {
		user,
		transfers: rows,
		kasAccounts,
		pagination: {
			page,
			itemsPerPage,
			total,
			totalPages,
			search,
			statusFilter,
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
			return fail(400, { error: 'Hanya admin yang bisa transfer antar kas' });
		}

		const formData = await request.formData();
		const dari_kas_id = parseInt(formData.get('dari_kas_id')?.toString() || '0');
		const ke_kas_id = parseInt(formData.get('ke_kas_id')?.toString() || '0');
		const nominal = parseFloat(formData.get('nominal')?.toString() || '0');
		const tanggal = formData.get('tanggal')?.toString().trim();
		const keterangan = formData.get('keterangan')?.toString().trim() || '';

		if (!dari_kas_id || !ke_kas_id || !nominal || !tanggal) {
			return fail(400, { error: 'Semua field wajib diisi' });
		}
		if (dari_kas_id === ke_kas_id) {
			return fail(400, { error: 'Rekening asal dan tujuan tidak boleh sama' });
		}
		if (nominal <= 0) {
			return fail(400, { error: 'Nominal harus lebih dari 0' });
		}

		// Cek saldo asal
		const dariKas = await executeQuery('SELECT saldo_current FROM kas_account WHERE id = ?', [dari_kas_id]);
		if (dariKas.length === 0) {
			return fail(400, { error: 'Rekening asal tidak ditemukan' });
		}
		if (parseFloat(dariKas[0].saldo_current) < nominal) {
			return fail(400, { error: `Saldo rekening asal tidak mencukupi (tersedia: ${new Intl.NumberFormat('id-ID', {style:'currency',currency:'IDR'}).format(dariKas[0].saldo_current)})` });
		}

		// Auto generate nomor_bukti
		const today = new Date();
		const yearMonth = today.getFullYear().toString() + String(today.getMonth() + 1).padStart(2, '0');
		const last = await executeQuery(
			`SELECT nomor_bukti FROM transfer_antar_kas WHERE nomor_bukti LIKE ? ORDER BY id DESC LIMIT 1`,
			[`TF-${yearMonth}-%`]
		);
		let nextNum = 1;
		if (last.length > 0 && last[0].nomor_bukti) {
			const parts = last[0].nomor_bukti.split('-');
			nextNum = parseInt(parts[parts.length - 1]) + 1;
		}
		const nomor_bukti = `TF-${yearMonth}-${String(nextNum).padStart(4, '0')}`;

		// Insert transfer (status pending, perlu approval)
		await executeQuery(
			`INSERT INTO transfer_antar_kas (dari_kas_id, ke_kas_id, nominal, tanggal, keterangan, nomor_bukti, status, created_by)
			VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
			[dari_kas_id, ke_kas_id, nominal, tanggal, keterangan, nomor_bukti, user.id]
		);

		return { success: 'Transfer antar kas berhasil diajukan, menunggu persetujuan' };
	},

	approve: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return fail(400, { error: 'Hanya admin yang bisa approve transfer' });
		}

		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() || '0');

		if (!id) {
			return fail(400, { error: 'ID tidak valid' });
		}

		const transfer = await executeQuery('SELECT * FROM transfer_antar_kas WHERE id = ?', [id]);
		if (transfer.length === 0) {
			return fail(400, { error: 'Transfer tidak ditemukan' });
		}
		const t = transfer[0];
		if (t.status !== 'pending') {
			return fail(400, { error: 'Transfer ini tidak bisa di-approve (status: ' + t.status + ')' });
		}

		// Cek saldo asal lagi sebelum approve
		const dariKas = await executeQuery('SELECT saldo_current FROM kas_account WHERE id = ?', [t.dari_kas_id]);
		if (parseFloat(dariKas[0].saldo_current) < parseFloat(t.nominal)) {
			return fail(400, { error: 'Saldo rekening asal tidak mencukupi saat approve' });
		}

		// Execute in transaction: update transfer status + create 2 transaksi_kas + update saldo
		try {
			await executeTransaction(async (conn) => {
			// 1. Update transfer status
			await conn.execute(
				'UPDATE transfer_antar_kas SET status = "posted", approved_by = ?, approved_at = NOW() WHERE id = ?',
				[user.id, id]
			);

			// 2. Get kategori for transfer (use first pengeluaran for keluar, first pemasukan for masuk)
					const [katKeluar] = await conn.execute('SELECT id FROM kategori_kas WHERE tipe = "pengeluaran" AND is_active = 1 ORDER BY urutan LIMIT 1');
					const [katMasuk] = await conn.execute('SELECT id FROM kategori_kas WHERE tipe = "pemasukan" AND is_active = 1 ORDER BY urutan LIMIT 1');

					const kategoriKeluarId = katKeluar[0]?.id;
					const kategoriMasukId = katMasuk[0]?.id;

					if (!kategoriKeluarId || !kategoriMasukId) {
						throw new Error('Kategori transfer tidak ditemukan, silakan setup kategori pemasukan/pengeluaran dulu');
					}

					// Generate unique nomor_bukti for each transaksi_kas entry
					const baseNomorBukti = t.nomor_bukti; // e.g., TF-202610-0002
					const nomorBuktiKeluar = `${baseNomorBukti}-K`; // TF-202610-0002-K
					const nomorBuktiMasuk = `${baseNomorBukti}-M`; // TF-202610-0002-M

					// 3. Insert transaksi_kas keluar (dari kas)
					await conn.execute(
						`INSERT INTO transaksi_kas (kas_account_id, kategori_id, tipe, nominal, tanggal, keterangan, status, nomor_bukti, ref_type, ref_id, created_by, approved_by, approved_at)
						VALUES (?, ?, 'kredit', ?, ?, ?, 'posted', ?, 'transfer_antar_kas', ?, ?, ?, NOW())`,
						[t.dari_kas_id, kategoriKeluarId, t.nominal, t.tanggal, `Transfer ke ${t.ke_nama || 'Kas Tujuan'} - ${t.keterangan}`, nomorBuktiKeluar, id, user.id, user.id]
					);

					// 4. Insert transaksi_kas masuk (ke kas)
					await conn.execute(
						`INSERT INTO transaksi_kas (kas_account_id, kategori_id, tipe, nominal, tanggal, keterangan, status, nomor_bukti, ref_type, ref_id, created_by, approved_by, approved_at)
						VALUES (?, ?, 'debit', ?, ?, ?, 'posted', ?, 'transfer_antar_kas', ?, ?, ?, NOW())`,
						[t.ke_kas_id, kategoriMasukId, t.nominal, t.tanggal, `Transfer dari ${t.dari_nama || 'Kas Asal'} - ${t.keterangan}`, nomorBuktiMasuk, id, user.id, user.id]
					);

			// 5. Update saldo kas_account
						await conn.execute('UPDATE kas_account SET saldo_current = saldo_current - ? WHERE id = ?', [t.nominal, t.dari_kas_id]);
						await conn.execute('UPDATE kas_account SET saldo_current = saldo_current + ? WHERE id = ?', [t.nominal, t.ke_kas_id]);
					});
				} catch (e) {
					console.error('Approve transfer error:', e);
					return fail(400, { error: 'Gagal approve transfer: ' + e.message });
				}

				return { success: 'Transfer antar kas berhasil di-approve dan diposting' };
	},

	reject: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return fail(400, { error: 'Hanya admin yang bisa reject transfer' });
		}

		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() || '0');
		const reject_reason = formData.get('reject_reason')?.toString().trim() || '';

		if (!id) {
			return fail(400, { error: 'ID tidak valid' });
		}

		const transfer = await executeQuery('SELECT * FROM transfer_antar_kas WHERE id = ?', [id]);
		if (transfer.length === 0) {
			return fail(400, { error: 'Transfer tidak ditemukan' });
		}
		if (transfer[0].status !== 'pending') {
			return fail(400, { error: 'Transfer ini tidak bisa di-reject (status: ' + transfer[0].status + ')' });
		}

		await executeQuery(
			'UPDATE transfer_antar_kas SET status = "rejected", approved_by = ?, approved_at = NOW() WHERE id = ?',
			[user.id, id]
		);

		return { success: 'Transfer antar kas ditolak' };
	},

	delete: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return fail(400, { error: 'Hanya admin yang bisa menghapus transfer' });
		}

		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() || '0');

		if (!id) {
			return fail(400, { error: 'ID tidak valid' });
		}

		const transfer = await executeQuery('SELECT status FROM transfer_antar_kas WHERE id = ?', [id]);
		if (transfer.length === 0) {
			return fail(400, { error: 'Transfer tidak ditemukan' });
		}
		if (transfer[0].status === 'posted') {
			return fail(400, { error: 'Transfer yang sudah di-posting tidak bisa dihapus' });
		}

		await executeQuery('DELETE FROM transfer_antar_kas WHERE id = ?', [id]);

		return { success: 'Transfer antar kas berhasil dihapus' };
	}
};