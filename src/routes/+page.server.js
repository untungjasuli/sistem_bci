import { redirect, error } from '@sveltejs/kit';
import { getConnection } from '#lib/server/db';

export const load = async ({ cookies }) => {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login');
	}

	const conn = await getConnection();
	try {
		// Total blok rumah
		const [blokRows] = await conn.execute('SELECT COUNT(*) as total FROM blok_rumah');
		const totalBlok = blokRows[0]?.total || 0;

		// Total keluarga (hanya aktif)
		const [keluargaRows] = await conn.execute('SELECT COUNT(*) as total FROM keluarga WHERE status_keluarga = "aktif"');
		const totalKeluarga = keluargaRows[0]?.total || 0;

		// Total penduduk (hanya aktif)
		const [pendudukRows] = await conn.execute('SELECT COUNT(*) as total FROM anggota_keluarga WHERE status_kependudukan = "aktif"');
		const totalPenduduk = pendudukRows[0]?.total || 0;

		// Blok dihuni (blok yang punya keluarga aktif)
		const [dihuniRows] = await conn.execute(`
			SELECT COUNT(DISTINCT b.id) as total 
			FROM blok_rumah b 
			JOIN keluarga k ON k.blok_rumah_id = b.id AND k.status_keluarga = 'aktif'
		`);
		const blokDihuni = dihuniRows[0]?.total || 0;

		// Blok kosong
		const blokKosong = totalBlok - blokDihuni;

		// Penduduk per jenis kelamin (hanya aktif)
		const [jkRows] = await conn.execute(`
			SELECT jenis_kelamin, COUNT(*) as total 
			FROM anggota_keluarga 
			WHERE status_kependudukan = 'aktif'
			GROUP BY jenis_kelamin
		`);
		const jkStats = { laki: 0, perempuan: 0 };
		jkRows.forEach((r) => {
			if (r.jenis_kelamin === 'Laki-laki') jkStats.laki = r.total;
			else if (r.jenis_kelamin === 'Perempuan') jkStats.perempuan = r.total;
		});

		// Penduduk per hubungan keluarga (hanya aktif)
		const [hubRows] = await conn.execute(`
			SELECT hub_keluarga, COUNT(*) as total 
			FROM anggota_keluarga 
			WHERE status_kependudukan = 'aktif'
			GROUP BY hub_keluarga
		`);
		const hubStats = { kepala: 0, istri: 0, anak: 0 };
		hubRows.forEach((r) => {
			if (r.hub_keluarga === 'Kepala Keluarga') hubStats.kepala = r.total;
			else if (r.hub_keluarga === 'Istri') hubStats.istri = r.total;
			else if (r.hub_keluarga === 'Anak') hubStats.anak = r.total;
		});

		// Penduduk per kelompok umur (berdasarkan tanggal_lahir, hanya aktif)
		const [umurRows] = await conn.execute(`
			SELECT 
				SUM(CASE WHEN TIMESTAMPDIFF(YEAR, tanggal_lahir, CURDATE()) < 1 THEN 1 ELSE 0 END) as bayi,
				SUM(CASE WHEN TIMESTAMPDIFF(YEAR, tanggal_lahir, CURDATE()) BETWEEN 1 AND 4 THEN 1 ELSE 0 END) as balita,
				SUM(CASE WHEN TIMESTAMPDIFF(YEAR, tanggal_lahir, CURDATE()) BETWEEN 5 AND 9 THEN 1 ELSE 0 END) as anak_anak,
				SUM(CASE WHEN TIMESTAMPDIFF(YEAR, tanggal_lahir, CURDATE()) BETWEEN 10 AND 18 THEN 1 ELSE 0 END) as remaja,
				SUM(CASE WHEN TIMESTAMPDIFF(YEAR, tanggal_lahir, CURDATE()) BETWEEN 19 AND 44 THEN 1 ELSE 0 END) as dewasa,
				SUM(CASE WHEN TIMESTAMPDIFF(YEAR, tanggal_lahir, CURDATE()) BETWEEN 45 AND 59 THEN 1 ELSE 0 END) as pra_lansia,
				SUM(CASE WHEN TIMESTAMPDIFF(YEAR, tanggal_lahir, CURDATE()) >= 60 THEN 1 ELSE 0 END) as lansia
			FROM anggota_keluarga
			WHERE tanggal_lahir IS NOT NULL AND status_kependudukan = 'aktif'
		`);
		const umurStats = umurRows[0] || {
			bayi: 0, balita: 0, anak_anak: 0, remaja: 0, dewasa: 0, pra_lansia: 0, lansia: 0
		};

		// 5 keluarga terbaru (hanya aktif)
		const [recentKeluarga] = await conn.execute(`
			SELECT k.id, k.no_kk, k.blok_rumah_id, k.status_rumah, k.created_at, b.no_blok,
			       (SELECT COUNT(*) FROM anggota_keluarga WHERE keluarga_id = k.id AND status_kependudukan = 'aktif') as jumlah_anggota
			FROM keluarga k
			LEFT JOIN blok_rumah b ON k.blok_rumah_id = b.id
			WHERE k.status_keluarga = 'aktif'
			ORDER BY k.created_at DESC
			LIMIT 5
		`);

		return {
			stats: {
				totalBlok,
				totalKeluarga,
				totalPenduduk,
				blokDihuni,
				blokKosong,
				jkStats,
				hubStats,
				umurStats
			},
			recentKeluarga
		};
	} catch (e) {
		console.error('LOAD dashboard error:', e);
		throw error(500, 'Gagal memuat dashboard');
	} finally {
		conn.release();
	}
};