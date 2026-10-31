import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const load = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(303, '/login');
	}

	const blokFilter = url.searchParams.get('blok') || 'semua';
	const search = url.searchParams.get('search')?.trim() || '';

	let whereClause = 'WHERE ak.nomor_hp IS NOT NULL AND ak.nomor_hp != ""';
	const params = [];

	if (blokFilter !== 'semua') {
		whereClause += ' AND b.id = ?';
		params.push(parseInt(blokFilter));
	}
	if (search) {
		whereClause += ' AND (ak.nama LIKE ? OR ak.nomor_hp LIKE ? OR k.no_kk LIKE ?)';
		const searchTerm = `%${search}%`;
		params.push(searchTerm, searchTerm, searchTerm);
	}

	// Query kontak warga
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
		ORDER BY b.no_blok, k.status_rumah, ak.hub_keluarga, ak.nama
	`;
	const rows = await executeQuery(sql, params);

	// Group by blok
	const grouped = {};
	for (const row of rows) {
		const key = row.no_blok;
		if (!grouped[key]) {
			grouped[key] = { blok: key, kontak: [], total: 0 };
		}
		grouped[key].kontak.push(row);
		grouped[key].total++;
	}

	const kontakPerBlok = Object.values(grouped).sort((a, b) => a.blok.localeCompare(b.blok));

	// Grand total
	const grandTotal = rows.length;

	// Stats: warga dengan HP vs tanpa HP
	const statsSql = `
		SELECT 
			COUNT(*) as total_warga,
			SUM(CASE WHEN ak.nomor_hp IS NOT NULL AND ak.nomor_hp != '' THEN 1 ELSE 0 END) as ada_hp,
			SUM(CASE WHEN ak.nomor_hp IS NULL OR ak.nomor_hp = '' THEN 1 ELSE 0 END) as tanpa_hp
		FROM anggota_keluarga ak
		JOIN keluarga k ON ak.keluarga_id = k.id
		JOIN blok_rumah b ON k.blok_rumah_id = b.id
		${blokFilter !== 'semua' ? 'WHERE b.id = ?' : ''}
	`;
	const statsParams = blokFilter !== 'semua' ? [parseInt(blokFilter)] : [];
	const statsRows = await executeQuery(statsSql, statsParams);
	const stats = statsRows[0] || { total_warga: 0, ada_hp: 0, tanpa_hp: 0 };

	const blokRumah = await executeQuery('SELECT id, no_blok FROM blok_rumah ORDER BY no_blok');

	return {
		user,
		kontakPerBlok,
		grandTotal,
		stats: {
			total_warga: parseInt(stats.total_warga),
			ada_hp: parseInt(stats.ada_hp),
			tanpa_hp: parseInt(stats.tanpa_hp)
		},
		filter: { blokFilter, search },
		blokRumah
	};
};