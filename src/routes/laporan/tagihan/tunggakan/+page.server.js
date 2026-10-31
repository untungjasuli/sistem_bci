import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const load = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(303, '/login');
	}

	const periode = url.searchParams.get('periode') || new Date().toISOString().slice(0, 7);
	const blokFilter = url.searchParams.get('blok') || 'semua';

	let whereClause = 'WHERE t.status = "belum_bayar"';
	const params = [];

	if (periode) {
		whereClause += ' AND t.periode <= ?';
		params.push(periode);
	}
	if (blokFilter !== 'semua') {
		whereClause += ' AND t.blok_rumah_id = ?';
		params.push(parseInt(blokFilter));
	}

	// Query tunggakan per penghuni
	const sql = `
		SELECT 
			t.id,
			t.periode,
			t.nominal,
			t.status,
			t.blok_rumah_id,
			br.no_blok AS blok,
			COALESCE(ak.nama, pr.nama) as penghuni_nama,
			COALESCE(ak.nomor_hp, pr.no_hp) as penghuni_hp
		FROM tagihan_iuran t
		JOIN blok_rumah br ON t.blok_rumah_id = br.id
		LEFT JOIN keluarga k ON br.id = k.blok_rumah_id
		LEFT JOIN anggota_keluarga ak ON k.id = ak.keluarga_id AND ak.hub_keluarga = 'Kepala Keluarga'
		LEFT JOIN pemilik_rumah pr ON br.id = pr.blok_rumah_id
		${whereClause}
		ORDER BY br.no_blok, t.periode
	`;
	const rows = await executeQuery(sql, params);

	// Group by blok_rumah for summary
	const grouped = {};
	for (const row of rows) {
		const key = row.blok_rumah_id;
		if (!grouped[key]) {
			grouped[key] = {
				blok_rumah_id: key,
				blok: row.blok,
				penghuni_nama: row.penghuni_nama,
				penghuni_hp: row.penghuni_hp,
				bulan_tunggak: 0,
				total_tunggakan: 0,
				detail: []
			};
		}
		grouped[key].bulan_tunggak++;
		grouped[key].total_tunggakan += parseFloat(row.nominal || 0);
		grouped[key].detail.push(row);
	}

	const tunggakanList = Object.values(grouped).sort((a, b) => {
		return a.blok.localeCompare(b.blok);
	});

	// Grand total
	const grandTotal = tunggakanList.reduce((acc, t) => ({
		jumlah_penghuni: acc.jumlah_penghuni + 1,
		total_bulan: acc.total_bulan + t.bulan_tunggak,
		total_nominal: acc.total_nominal + t.total_tunggakan
	}), { jumlah_penghuni: 0, total_bulan: 0, total_nominal: 0 });

	const blokRumah = await executeQuery('SELECT id, no_blok as label FROM blok_rumah ORDER BY no_blok');

	return {
		user,
		tunggakan: tunggakanList,
		grandTotal,
		filter: { periode, blokFilter },
		blokRumah
	};
};