import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const load = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(303, '/login');
	}

	const blokFilter = url.searchParams.get('blok') || 'semua';
	const statusFilter = url.searchParams.get('status') || 'semua';

	let whereClause = 'WHERE 1=1';
	const params = [];

	if (blokFilter !== 'semua') {
		whereClause += ' AND k.blok_rumah_id = ?';
		params.push(parseInt(blokFilter));
	}
	if (statusFilter !== 'semua') {
		whereClause += ' AND k.status_rumah = ?';
		params.push(statusFilter);
	}

	// Query warga per blok - join blok_rumah, keluarga, anggota_keluarga
	const sql = `
		SELECT 
			ak.id,
			ak.nik,
			ak.nama,
			ak.jenis_kelamin,
			ak.tanggal_lahir,
			ak.hub_keluarga,
			ak.nomor_hp,
			k.no_kk,
			k.status_rumah,
			b.no_blok,
			TIMESTAMPDIFF(YEAR, ak.tanggal_lahir, CURDATE()) as umur
		FROM anggota_keluarga ak
		JOIN keluarga k ON ak.keluarga_id = k.id
		JOIN blok_rumah b ON k.blok_rumah_id = b.id
		${whereClause}
		ORDER BY b.no_blok, k.no_kk, ak.hub_keluarga, ak.nama
	`;
	const rows = await executeQuery(sql, params);

	// Group by blok
	const grouped = {};
	for (const row of rows) {
		const key = row.no_blok;
		if (!grouped[key]) {
			grouped[key] = { blok: key, warga: [], total: 0 };
		}
		grouped[key].warga.push(row);
		grouped[key].total++;
	}

	const wargaPerBlok = Object.values(grouped).sort((a, b) => a.blok.localeCompare(b.blok));

	// Grand total
	const grandTotal = rows.length;

	const blokRumah = await executeQuery('SELECT id, no_blok FROM blok_rumah ORDER BY no_blok');

	return {
		user,
		wargaPerBlok,
		grandTotal,
		filter: { blokFilter, statusFilter },
		blokRumah
	};
};