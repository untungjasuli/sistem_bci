import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const load = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(303, '/login');
	}

	// Filter dari URL
	const periode = url.searchParams.get('periode') || new Date().toISOString().slice(0, 7); // YYYY-MM
	const kasFilter = url.searchParams.get('kas') || 'semua';

	// Build where clause untuk periode
	let whereClause = 'WHERE DATE_FORMAT(tk.tanggal, "%Y-%m") = ?';
	const params = [periode];

	if (kasFilter !== 'semua') {
		whereClause += ' AND tk.kas_account_id = ?';
		params.push(parseInt(kasFilter));
	}

	whereClause += " AND tk.status = 'posted'";

	// Get all kas accounts
	const kasAccounts = await executeQuery('SELECT id, kode, nama, saldo_current FROM kas_account WHERE is_active = 1 ORDER BY kode');

	// Get mutasi per kas account untuk periode ini
	const mutasiSql = `
		SELECT 
			tk.kas_account_id,
			SUM(CASE WHEN tk.tipe = 'debit' THEN tk.nominal ELSE 0 END) as total_debit,
			SUM(CASE WHEN tk.tipe = 'kredit' THEN tk.nominal ELSE 0 END) as total_kredit
		FROM transaksi_kas tk
		${whereClause}
		GROUP BY tk.kas_account_id
	`;
	const mutasiRows = await executeQuery(mutasiSql, params);

	// Build mutasi map
	const mutasiMap = {};
	for (const row of mutasiRows) {
		mutasiMap[row.kas_account_id] = {
			total_debit: parseFloat(row.total_debit || 0),
			total_kredit: parseFloat(row.total_kredit || 0)
		};
	}

	// Calculate saldo per kas
	const saldoPerKas = kasAccounts.map(ka => {
		const mutasi = mutasiMap[ka.id] || { total_debit: 0, total_kredit: 0 };
		const saldoAwal = parseFloat(ka.saldo_current || 0) - mutasi.total_debit + mutasi.total_kredit;
		const saldoAkhir = parseFloat(ka.saldo_current || 0);
		
		return {
			...ka,
			saldo_awal: saldoAwal,
			total_debit: mutasi.total_debit,
			total_kredit: mutasi.total_kredit,
			saldo_akhir: saldoAkhir
		};
	});

	// Grand totals
	const grandTotal = saldoPerKas.reduce((acc, ka) => ({
		saldo_awal: acc.saldo_awal + ka.saldo_awal,
		total_debit: acc.total_debit + ka.total_debit,
		total_kredit: acc.total_kredit + ka.total_kredit,
		saldo_akhir: acc.saldo_akhir + ka.saldo_akhir
	}), { saldo_awal: 0, total_debit: 0, total_kredit: 0, saldo_akhir: 0 });

	return {
		user,
		saldoKas: saldoPerKas,
		grandTotal,
		filter: { periode, kasFilter },
		kasAccounts
	};
};