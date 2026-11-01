import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const load = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(303, '/login');
	}

	const blokFilter = url.searchParams.get('blok') || 'semua';

	let whereClause = 'WHERE k.status_keluarga = \'aktif\' AND ak.status_kependudukan = \'aktif\'';
	const params = [];

	if (blokFilter !== 'semua') {
		whereClause += ' AND b.id = ?';
		params.push(parseInt(blokFilter));
	}

	// Total keluarga & warga
	const totalSql = `
		SELECT 
			COUNT(DISTINCT k.id) as total_keluarga,
			COUNT(ak.id) as total_warga
		FROM keluarga k
		JOIN blok_rumah b ON k.blok_rumah_id = b.id
		LEFT JOIN anggota_keluarga ak ON k.id = ak.keluarga_id
		${whereClause}
	`;
	const totalRows = await executeQuery(totalSql, params);
	const total = totalRows[0] || { total_keluarga: 0, total_warga: 0 };

	// Per jenis kelamin
	const jkSql = `
		SELECT 
			ak.jenis_kelamin,
			COUNT(*) as jumlah
		FROM anggota_keluarga ak
		JOIN keluarga k ON ak.keluarga_id = k.id
		JOIN blok_rumah b ON k.blok_rumah_id = b.id
		${whereClause}
		GROUP BY ak.jenis_kelamin
	`;
		const jkRows = await executeQuery(jkSql, params);
		const byJenisKelamin = { L: 0, P: 0 };
		for (const row of jkRows) {
			const jk = row.jenis_kelamin === 'Laki-laki' ? 'L' : row.jenis_kelamin === 'Perempuan' ? 'P' : row.jenis_kelamin;
			byJenisKelamin[jk] = (byJenisKelamin[jk] || 0) + parseInt(row.jumlah);
		}

	// Per status rumah
	const statusSql = `
		SELECT 
			k.status_rumah,
			COUNT(DISTINCT k.id) as jml_keluarga,
			COUNT(ak.id) as jml_warga
		FROM keluarga k
		JOIN blok_rumah b ON k.blok_rumah_id = b.id
		LEFT JOIN anggota_keluarga ak ON k.id = ak.keluarga_id
		${whereClause}
		GROUP BY k.status_rumah
	`;
	const statusRows = await executeQuery(statusSql, params);
	const byStatusRumah = {};
	for (const row of statusRows) {
		byStatusRumah[row.status_rumah] = {
			keluarga: parseInt(row.jml_keluarga),
			warga: parseInt(row.jml_warga)
		};
	}

	// Per hub keluarga
	const hubSql = `
		SELECT 
			ak.hub_keluarga,
			COUNT(*) as jumlah
		FROM anggota_keluarga ak
		JOIN keluarga k ON ak.keluarga_id = k.id
		JOIN blok_rumah b ON k.blok_rumah_id = b.id
		${whereClause}
		GROUP BY ak.hub_keluarga
		ORDER BY jumlah DESC
	`;
	const hubRows = await executeQuery(hubSql, params);
	const byHubKeluarga = hubRows.map(r => ({
		hub: r.hub_keluarga,
		jumlah: parseInt(r.jumlah)
	}));

	// Per blok
	const blokSql = `
		SELECT 
			b.no_blok,
			COUNT(DISTINCT k.id) as jml_keluarga,
			COUNT(ak.id) as jml_warga
		FROM blok_rumah b
		LEFT JOIN keluarga k ON b.id = k.blok_rumah_id
		LEFT JOIN anggota_keluarga ak ON k.id = ak.keluarga_id
		${whereClause}
		GROUP BY b.id, b.no_blok
		ORDER BY b.no_blok
	`;
	const blokRows = await executeQuery(blokSql, params);
	const byBlok = blokRows.map(r => ({
		blok: r.no_blok,
		keluarga: parseInt(r.jml_keluarga),
		warga: parseInt(r.jml_warga)
	}));

	const blokRumah = await executeQuery('SELECT id, no_blok FROM blok_rumah ORDER BY no_blok');

	return {
		user,
		total: { total_keluarga: parseInt(total.total_keluarga), total_warga: parseInt(total.total_warga) },
		byJenisKelamin,
		byStatusRumah,
		byHubKeluarga,
		byBlok,
		filter: { blokFilter },
		blokRumah
	};
};