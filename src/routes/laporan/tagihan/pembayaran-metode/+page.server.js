import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const load = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(303, '/login');
	}

	const periode = url.searchParams.get('periode') || new Date().toISOString().slice(0, 7);
	const metodeFilter = url.searchParams.get('metode') || 'semua';

	let whereClause = 'WHERE t.periode = ? AND t.status = "lunas"';
	const params = [periode];

	if (metodeFilter !== 'semua') {
		whereClause += ' AND pi.metode_bayar = ?';
		params.push(metodeFilter);
	}

	// Query pembayaran per metode (join via pembayaran_iuran)
	const sql = `
		SELECT 
			t.id,
			t.periode,
			t.nominal,
			pi.tanggal_bayar,
			pi.metode_bayar,
			br.no_blok AS blok,
			COALESCE(ak.nama, pr.nama) as penghuni_nama
		FROM tagihan_iuran t
		JOIN blok_rumah br ON t.blok_rumah_id = br.id
		LEFT JOIN keluarga k ON br.id = k.blok_rumah_id
		LEFT JOIN anggota_keluarga ak ON k.id = ak.keluarga_id AND ak.hub_keluarga = 'Kepala Keluarga'
		LEFT JOIN pemilik_rumah pr ON br.id = pr.blok_rumah_id
		JOIN pembayaran_iuran pi ON t.id = pi.tagihan_id
		${whereClause}
		ORDER BY pi.metode_bayar, pi.tanggal_bayar, t.id
	`;
	const rows = await executeQuery(sql, params);

	// Summary per metode
	const summarySql = `
		SELECT 
			pi.metode_bayar,
			COUNT(*) as jumlah,
			SUM(t.nominal) as total_nominal
		FROM tagihan_iuran t
		JOIN pembayaran_iuran pi ON t.id = pi.tagihan_id
		${whereClause}
		GROUP BY pi.metode_bayar
		ORDER BY pi.metode_bayar
	`;
	const summaryRows = await executeQuery(summarySql, params);
	const summaryByMetode = summaryRows.map(r => ({
		metode_bayar: r.metode_bayar,
		jumlah: parseInt(r.jumlah),
		total_nominal: parseFloat(r.total_nominal || 0)
	}));

	// Grand total
	const grandTotal = rows.reduce((acc, r) => ({
		jumlah: acc.jumlah + 1,
		total_nominal: acc.total_nominal + parseFloat(r.nominal || 0)
	}), { jumlah: 0, total_nominal: 0 });

	// Get available metode from pembayaran_method for dropdown (for reference)
	const metodePembayaran = await executeQuery('SELECT kode, nama FROM pembayaran_method WHERE is_active = 1 ORDER BY kode');

	return {
		user,
		pembayaran: rows,
		summaryByMetode,
		grandTotal,
		filter: { periode, metodeFilter },
		metodePembayaran
	};
};