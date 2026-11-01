import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const load = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(303, '/login');
	}

	const blokFilter = url.searchParams.get('blok') || 'semua';
	const jkFilter = url.searchParams.get('jk') || 'semua';

	let whereClause = 'WHERE ak.tanggal_lahir IS NOT NULL AND k.status_keluarga = \'aktif\' AND ak.status_kependudukan = \'aktif\'';
	const params = [];

	if (blokFilter !== 'semua') {
		whereClause += ' AND b.id = ?';
		params.push(parseInt(blokFilter));
	}
	if (jkFilter !== 'semua') {
		// Convert L/P to full text for DB
		const jkValue = jkFilter === 'L' ? 'Laki-laki' : 'Perempuan';
		whereClause += ' AND ak.jenis_kelamin = ?';
		params.push(jkValue);
	}

	// Query warga dengan umur & kelompok usia
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
			b.no_blok,
			TIMESTAMPDIFF(YEAR, ak.tanggal_lahir, CURDATE()) as umur,
			CASE 
				WHEN TIMESTAMPDIFF(YEAR, ak.tanggal_lahir, CURDATE()) < 1 THEN 'Bayi (0-1 th)'
				WHEN TIMESTAMPDIFF(YEAR, ak.tanggal_lahir, CURDATE()) < 5 THEN 'Balita (1-5 th)'
				WHEN TIMESTAMPDIFF(YEAR, ak.tanggal_lahir, CURDATE()) < 10 THEN 'Anak-Anak (5-10 th)'
				WHEN TIMESTAMPDIFF(YEAR, ak.tanggal_lahir, CURDATE()) < 19 THEN 'Remaja (10-19 th)'
				WHEN TIMESTAMPDIFF(YEAR, ak.tanggal_lahir, CURDATE()) < 45 THEN 'Dewasa (19-44 th)'
				WHEN TIMESTAMPDIFF(YEAR, ak.tanggal_lahir, CURDATE()) < 60 THEN 'Pra-Lansia (45-59 th)'
				ELSE 'Lansia (60+ th)'
			END as kelompok_usia
		FROM anggota_keluarga ak
		JOIN keluarga k ON ak.keluarga_id = k.id
		JOIN blok_rumah b ON k.blok_rumah_id = b.id
		${whereClause}
		ORDER BY kelompok_usia, ak.tanggal_lahir
	`;
	const rows = await executeQuery(sql, params);

	// Group by kelompok usia
	const kelompokOrder = [
		'Bayi (0-1 th)',
		'Balita (1-5 th)',
		'Anak-Anak (5-10 th)',
		'Remaja (10-19 th)',
		'Dewasa (19-44 th)',
		'Pra-Lansia (45-59 th)',
		'Lansia (60+ th)'
	];

	const grouped = {};
	for (const row of rows) {
		const key = row.kelompok_usia;
		if (!grouped[key]) {
			grouped[key] = { kelompok: key, warga: [], total: 0, laki: 0, perempuan: 0 };
		}
		grouped[key].warga.push(row);
		grouped[key].total++;
		if (row.jenis_kelamin === 'Laki-laki') grouped[key].laki++;
		else grouped[key].perempuan++;
	}

	const kelompokList = kelompokOrder
		.map(k => grouped[k])
		.filter(Boolean);

	// Grand total
	const grandTotal = rows.length;

	const blokRumah = await executeQuery('SELECT id, no_blok FROM blok_rumah ORDER BY no_blok');

	return {
		user,
		kelompokList,
		grandTotal,
		filter: { blokFilter, jkFilter },
		blokRumah
	};
};