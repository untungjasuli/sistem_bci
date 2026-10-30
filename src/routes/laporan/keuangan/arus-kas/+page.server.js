import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const load = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(303, '/login');
	}

	// Filter dari URL (match frontend param names)
	const periode = url.searchParams.get('periode') || new Date().toISOString().slice(0, 7); // YYYY-MM
	const kasFilter = url.searchParams.get('kas') || 'semua';
	const kategoriFilter = url.searchParams.get('kategori') || 'semua';
	const tipeFilter = url.searchParams.get('tipe') || 'semua';

	// Build where clause
	let whereClause = 'WHERE DATE_FORMAT(tk.tanggal, "%Y-%m") = ?';
	const params = [periode];

	if (kasFilter !== 'semua') {
		whereClause += ' AND tk.kas_account_id = ?';
		params.push(parseInt(kasFilter));
	}
	if (kategoriFilter !== 'semua') {
		whereClause += ' AND tk.kategori_id = ?';
		params.push(parseInt(kategoriFilter));
	}
	if (tipeFilter !== 'semua') {
		whereClause += ' AND tk.tipe = ?';
		params.push(tipeFilter);
	}

	// Hanya transaksi posted (valid untuk laporan arus kas)
	whereClause += " AND tk.status = 'posted'";

	// Query data: join transaksi_kas + kas_account + kategori_kas
	const sql = `
		SELECT 
			tk.id,
			tk.tanggal,
			tk.tipe,
			tk.nominal,
			tk.keterangan,
			tk.nomor_bukti,
			ka.kode as kas_kode,
			ka.nama as kas_nama,
			kk.kode as kategori_kode,
			kk.nama as kategori_nama,
			kk.tipe as kategori_tipe
		FROM transaksi_kas tk
		LEFT JOIN kas_account ka ON tk.kas_account_id = ka.id
		LEFT JOIN kategori_kas kk ON tk.kategori_id = kk.id
		${whereClause}
		ORDER BY tk.tanggal ASC, tk.id ASC
	`;

	const rows = await executeQuery(sql, params);

	// Summary: hitung total debit & kredit
	const summarySql = `
		SELECT 
			SUM(CASE WHEN tk.tipe = 'debit' THEN tk.nominal ELSE 0 END) as total_debit,
			SUM(CASE WHEN tk.tipe = 'kredit' THEN tk.nominal ELSE 0 END) as total_kredit
		FROM transaksi_kas tk
		${whereClause}
	`;
	const summaryRows = await executeQuery(summarySql, params);
	const summary = summaryRows[0] || { total_debit: 0, total_kredit: 0 };

	// Filter options
	const kasAccounts = await executeQuery('SELECT id, kode, nama FROM kas_account WHERE is_active = 1 ORDER BY kode');
	const kategoriKas = await executeQuery('SELECT id, kode, nama, tipe FROM kategori_kas WHERE is_active = 1 ORDER BY tipe, urutan, nama');

	return {
		user,
		arusKas: rows,
		summary,
		filter: {
			periode,
			kasFilter,
			kategoriFilter,
			tipeFilter
		},
		kasAccounts,
		kategoriKas
	};
};