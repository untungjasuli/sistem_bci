import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const load = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(303, '/login');
	}

	const periode = url.searchParams.get('periode') || new Date().toISOString().slice(0, 7);
	const kasFilter = url.searchParams.get('kas') || 'semua';
	const statusFilter = url.searchParams.get('status') || 'semua';

	let whereClause = 'WHERE DATE_FORMAT(tak.tanggal, "%Y-%m") = ?';
	const params = [periode];

	if (kasFilter !== 'semua') {
		whereClause += ' AND (tak.dari_kas_id = ? OR tak.ke_kas_id = ?)';
		params.push(parseInt(kasFilter), parseInt(kasFilter));
	}
	if (statusFilter !== 'semua') {
		whereClause += ' AND tak.status = ?';
		params.push(statusFilter);
	}

	// Query from transfer_antar_kas (1 row = 1 transfer)
	const sql = `
		SELECT 
			tak.*,
			ka.kode as dari_kode, ka.nama as dari_nama,
			kka.kode as ke_kode, kka.nama as ke_nama,
			u.name as created_by_nama,
			ap.name as approved_by_nama
		FROM transfer_antar_kas tak
		JOIN kas_account ka ON tak.dari_kas_id = ka.id
		JOIN kas_account kka ON tak.ke_kas_id = kka.id
		LEFT JOIN users u ON tak.created_by = u.id
		LEFT JOIN users ap ON tak.approved_by = ap.id
		${whereClause}
		ORDER BY tak.tanggal ASC, tak.id ASC
	`;
	const rows = await executeQuery(sql, params);

	// Summary (hanya posted)
	const summarySql = `
		SELECT 
			SUM(tak.nominal) as total_nominal,
			COUNT(*) as jumlah_transfer
		FROM transfer_antar_kas tak
		${whereClause}
		AND tak.status = 'posted'
	`;
	const summaryRows = await executeQuery(summarySql, params);
	const summary = summaryRows[0] || { total_nominal: 0, jumlah_transfer: 0 };

	const kasAccounts = await executeQuery('SELECT id, kode, nama FROM kas_account WHERE is_active = 1 ORDER BY kode');

	return {
		user,
		transfers: rows,
		summary: {
			total_nominal: parseFloat(summary.total_nominal || 0),
			jumlah_transfer: parseInt(summary.jumlah_transfer || 0)
		},
		filter: { periode, kasFilter, statusFilter },
		kasAccounts
	};
};