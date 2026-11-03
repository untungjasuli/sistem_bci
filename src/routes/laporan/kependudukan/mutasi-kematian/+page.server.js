import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const load = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(303, '/login');
	}

	const yearFilter = url.searchParams.get('tahun') || new Date().getFullYear().toString();
	const jenisFilter = url.searchParams.get('jenis') || 'semua';

	let whereClause = 'WHERE 1=1';
	const params = [];

	// Filter tahun
	if (yearFilter !== 'semua') {
		whereClause += ' AND YEAR(mp.tanggal_mutasi) = ?';
		params.push(parseInt(yearFilter));
	}

	// Filter jenis mutasi (pindah_keluar, meninggal)
	if (jenisFilter !== 'semua') {
		whereClause += ' AND mp.jenis_mutasi = ?';
		params.push(jenisFilter);
	}

	// Get mutasi data with joined info
	const sql = `
		SELECT 
			mp.id,
			mp.jenis_mutasi,
			mp.tanggal_mutasi,
			mp.alasan,
			mp.alamat_asal,
			mp.alamat_tujuan,
			mp.rt_rw_tujuan,
			mp.kelurahan_tujuan,
			mp.kecamatan_tujuan,
			mp.kota_tujuan,
			mp.provinsi_tujuan,
			mp.no_surat_pindah,
			mp.keterangan,
			ak.nik,
			ak.nama,
			ak.jenis_kelamin,
			ak.tanggal_lahir,
			ak.hub_keluarga,
			ak.nomor_hp,
			k.no_kk,
			k.status_rumah,
			b.no_blok,
			TIMESTAMPDIFF(YEAR, ak.tanggal_lahir, mp.tanggal_mutasi) as umur_saat_mutasi
		FROM mutasi_penduduk mp
		JOIN anggota_keluarga ak ON mp.anggota_keluarga_id = ak.id
		JOIN keluarga k ON ak.keluarga_id = k.id
		JOIN blok_rumah b ON k.blok_rumah_id = b.id
		${whereClause}
		ORDER BY mp.tanggal_mutasi DESC, b.no_blok, ak.nama
	`;
	const rows = await executeQuery(sql, params);

	// Get available years for filter
	const yearsRows = await executeQuery(`
		SELECT DISTINCT YEAR(tanggal_mutasi) as tahun 
		FROM mutasi_penduduk 
		ORDER BY tahun DESC
	`);
	const availableYears = yearsRows.map(r => r.tahun);

	// Summary counts
	const summary = {
		total: rows.length,
		pindah_keluar: rows.filter(r => r.jenis_mutasi === 'pindah_keluar').length,
		meninggal: rows.filter(r => r.jenis_mutasi === 'meninggal').length
	};

	return {
		user,
		mutasi: rows,
		summary,
		availableYears,
		filter: { yearFilter, jenisFilter }
	};
};