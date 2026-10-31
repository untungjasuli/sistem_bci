import { executeQuery } from '#lib/server/db';

export const GET = async ({ url, cookies }) => {
	const user = cookies.get('session_user');
	if (!user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const blokId = url.searchParams.get('id');
	if (!blokId) {
		return new Response(JSON.stringify({ error: 'ID blok rumah diperlukan' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		// 1. Info blok
		const blokIdNum = parseInt(blokId, 10);
		const blokRows = await executeQuery(
			`SELECT id, no_blok, pos_x, pos_y, width, height,
				CASE WHEN EXISTS (SELECT 1 FROM keluarga k WHERE k.blok_rumah_id = b.id) THEN 'Dihuni' ELSE 'Kosong' END as status,
				(SELECT COUNT(*) FROM keluarga WHERE blok_rumah_id = b.id) as kk_count
			FROM blok_rumah b WHERE id = ?`,
			[blokId]
		);

		if (!blokRows.length) {
			return new Response(JSON.stringify({ error: 'Blok rumah tidak ditemukan' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const blok = blokRows[0];

		// 2. Daftar KK di blok ini
		const kkRows = await executeQuery(
			`SELECT k.id, k.no_kk, k.status_rumah,
				(SELECT COUNT(*) FROM anggota_keluarga WHERE keluarga_id = k.id) as anggota_count
			FROM keluarga k WHERE k.blok_rumah_id = ? ORDER BY k.no_kk`,
			[blokId]
		);

		// 3. Anggota keluarga per KK + status iuran 12 periode terakhir
		const keluargaIds = kkRows.map(k => k.id);
		let anggotaByKk = {};
		let iuranByKk = {};

		if (keluargaIds.length > 0) {
			const placeholders = keluargaIds.map(() => '?').join(',');

			// Anggota
			const anggotaRows = await executeQuery(
				`SELECT ak.*, k.no_kk FROM anggota_keluarga ak
				JOIN keluarga k ON ak.keluarga_id = k.id
				WHERE ak.keluarga_id IN (${placeholders})
				ORDER BY k.no_kk, ak.hub_keluarga`,
				keluargaIds
			);

			// Group by KK
			for (const a of anggotaRows) {
				if (!anggotaByKk[a.no_kk]) anggotaByKk[a.no_kk] = [];
				anggotaByKk[a.no_kk].push(a);
			}

			// Iuran status 12 periode terakhir
			const iuranRows = await executeQuery(
				`SELECT ti.*, k.no_kk, p.nama as metode_nama
				FROM tagihan_iuran ti
				JOIN keluarga k ON ti.keluarga_id = k.id
				LEFT JOIN pembayaran_iuran pi ON pi.tagihan_id = ti.id AND pi.status = 'approved'
				LEFT JOIN pembayaran_method p ON pi.metode_pembayaran_id = p.id
				WHERE ti.keluarga_id IN (${placeholders})
				AND ti.periode >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
				ORDER BY ti.periode DESC, k.no_kk`,
				keluargaIds
			);

			// Group by KK
			for (const i of iuranRows) {
				if (!iuranByKk[i.no_kk]) iuranByKk[i.no_kk] = [];
				iuranByKk[i.no_kk].push(i);
			}
		}

		// Format response
		const response = {
			blok,
			keluarga: kkRows.map(k => ({
				...k,
				anggota: anggotaByKk[k.no_kk] || [],
				iuran: iuranByKk[k.no_kk] || []
			}))
		};

		return new Response(JSON.stringify(response), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		console.error('Get detail error:', e);
		return new Response(JSON.stringify({ error: 'Gagal memuat detail' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};