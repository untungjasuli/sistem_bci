import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const load = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(303, '/login');
	}

	const periode = url.searchParams.get('periode') || new Date().toISOString().slice(0, 7);
	const blokFilter = url.searchParams.get('blok') || 'semua';
	const statusFilter = url.searchParams.get('status') || 'semua';

	let whereClause = 'WHERE t.periode = ?';
	const params = [periode];

	if (blokFilter !== 'semua') {
		whereClause += ' AND t.blok_rumah_id = ?';
		params.push(parseInt(blokFilter));
	}
	if (statusFilter !== 'semua') {
		whereClause += ' AND t.status = ?';
		params.push(statusFilter);
	}

	// Query tagihan per blok rumah + join keluarga + anggota_keluarga (kepala keluarga)
	const sql = `
		SELECT 
			t.id,
			t.periode,
			t.nominal,
			t.status,
			t.tipe_pembayar,
						br.no_blok AS blok,
			ak.nama as penghuni_nama,
			pi.tanggal_bayar,
			pi.metode_bayar
		FROM tagihan_iuran t
		JOIN blok_rumah br ON t.blok_rumah_id = br.id
		LEFT JOIN keluarga k ON br.id = k.blok_rumah_id
		LEFT JOIN anggota_keluarga ak ON k.id = ak.keluarga_id AND ak.hub_keluarga = 'Kepala Keluarga'
		LEFT JOIN pembayaran_iuran pi ON t.id = pi.tagihan_id
		${whereClause}
		ORDER BY br.no_blok, t.periode
	`;
	const rows = await executeQuery(sql, params);

	// Summary per status
	const summarySql = `
		SELECT 
			t.status,
			COUNT(*) as jumlah,
			SUM(t.nominal) as total_nominal
		FROM tagihan_iuran t
		${whereClause}
		GROUP BY t.status
	`;
	const summaryRows = await executeQuery(summarySql, params);
	const summary = { lunas: { jumlah: 0, total: 0 }, belum_bayar: { jumlah: 0, total: 0 } };
	for (const row of summaryRows) {
		if (summary[row.status]) {
			summary[row.status] = { jumlah: parseInt(row.jumlah), total: parseFloat(row.total_nominal || 0) };
		}
	}

	// Grand total
	const grandTotal = rows.reduce((acc, r) => ({
		jumlah: acc.jumlah + 1,
		total_nominal: acc.total_nominal + parseFloat(r.nominal || 0)
	}), { jumlah: 0, total_nominal: 0 });

	const blokRumah = await executeQuery('SELECT id, no_blok as label FROM blok_rumah ORDER BY no_blok');

	return {
		user,
		tagihan: rows,
		summary,
		grandTotal,
		filter: { periode, blokFilter, statusFilter },
		blokRumah
	};
};