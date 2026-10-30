import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const load = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(303, '/login');
	}

	const periode = url.searchParams.get('periode') || new Date().toISOString().slice(0, 7);
	const kasFilter = url.searchParams.get('kas') || 'semua';
	const kategoriFilter = url.searchParams.get('kategori') || 'semua';
	const tipeFilter = url.searchParams.get('tipe') || 'semua';

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
	whereClause += " AND tk.status = 'posted'";

	// Group by kategori
	const sql = `
		SELECT 
			kk.id as kategori_id,
			kk.kode as kategori_kode,
			kk.nama as kategori_nama,
			kk.tipe as kategori_tipe,
			SUM(CASE WHEN tk.tipe = 'debit' THEN tk.nominal ELSE 0 END) as total_debit,
			SUM(CASE WHEN tk.tipe = 'kredit' THEN tk.nominal ELSE 0 END) as total_kredit,
			COUNT(*) as jumlah_transaksi
		FROM transaksi_kas tk
		LEFT JOIN kategori_kas kk ON tk.kategori_id = kk.id
		${whereClause}
		GROUP BY kk.id, kk.kode, kk.nama, kk.tipe
		ORDER BY kk.tipe, kk.urutan, kk.nama
	`;
	const rows = await executeQuery(sql, params);

	// Summary per tipe
	const summarySql = `
		SELECT 
			kk.tipe,
			SUM(CASE WHEN tk.tipe = 'debit' THEN tk.nominal ELSE 0 END) as total_debit,
			SUM(CASE WHEN tk.tipe = 'kredit' THEN tk.nominal ELSE 0 END) as total_kredit
		FROM transaksi_kas tk
		LEFT JOIN kategori_kas kk ON tk.kategori_id = kk.id
		${whereClause}
		GROUP BY kk.tipe
	`;
	const summaryRows = await executeQuery(summarySql, params);
	const summaryByTipe = {};
	for (const row of summaryRows) {
		summaryByTipe[row.tipe || 'lainnya'] = {
			total_debit: parseFloat(row.total_debit || 0),
			total_kredit: parseFloat(row.total_kredit || 0)
		};
	}

	// Grand total
	const grandTotal = rows.reduce((acc, r) => ({
		total_debit: acc.total_debit + parseFloat(r.total_debit || 0),
		total_kredit: acc.total_kredit + parseFloat(r.total_kredit || 0),
		jumlah_transaksi: acc.jumlah_transaksi + parseInt(r.jumlah_transaksi || 0)
	}), { total_debit: 0, total_kredit: 0, jumlah_transaksi: 0 });

	const kasAccounts = await executeQuery('SELECT id, kode, nama FROM kas_account WHERE is_active = 1 ORDER BY kode');
	const kategoriKas = await executeQuery('SELECT id, kode, nama, tipe FROM kategori_kas WHERE is_active = 1 ORDER BY tipe, urutan, nama');

	return {
		user,
		transaksiKategori: rows,
		summaryByTipe,
		grandTotal,
		filter: { periode, kasFilter, kategoriFilter, tipeFilter },
		kasAccounts,
		kategoriKas
	};
};