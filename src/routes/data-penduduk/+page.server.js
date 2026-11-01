import { redirect, error, fail } from '@sveltejs/kit';
import { getConnection, executeQuery } from '#lib/server/db';

export const load = async ({ cookies, url }) => {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login');
	}

	const search = url.searchParams.get('search')?.trim() || '';
	const sort = url.searchParams.get('sort') || 'asc';
	const sortBy = url.searchParams.get('sortBy') || 'nama';
	const page = parseInt(url.searchParams.get('page') || '1');
	const itemsPerPage = parseInt(url.searchParams.get('itemsPerPage') || '10');

	// Validasi sortBy untuk mencegah SQL injection
	const allowedSortBy = ['nama', 'no_blok', 'nik', 'no_kk'];
	const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'nama';

	const conn = await getConnection();
	try {
		let whereSql = ' WHERE a.status_kependudukan = \"aktif\"';
		const params = [];

		if (search) {
			whereSql += ' AND (a.nik LIKE ? OR a.nama LIKE ? OR k.no_kk LIKE ? OR b.no_blok LIKE ?)';
			const searchTerm = `%${search}%`;
			params.push(searchTerm, searchTerm, searchTerm, searchTerm);
		}

		const orderField = safeSortBy === 'no_blok' ? 'b.no_blok' : 'a.nama';

		// Hitung total untuk pagination
		const [countRows] = await conn.execute(
			`SELECT COUNT(*) as total FROM anggota_keluarga a JOIN keluarga k ON a.keluarga_id = k.id LEFT JOIN blok_rumah b ON k.blok_rumah_id = b.id ${whereSql}`,
			params
		);
		const total = countRows[0]?.total || 0;

		// Data dengan pagination
					const offset = (page - 1) * itemsPerPage;
					params.push(itemsPerPage, offset);
					const [rows] = await conn.execute(
						`SELECT a.id, a.nik, a.nama, a.jenis_kelamin, a.tempat_lahir, a.tanggal_lahir,
						 a.hub_keluarga, a.status_kependudukan, a.keluarga_id, a.nomor_hp, a.agama, a.pekerjaan, a.status_perkawinan,
						 k.no_kk, k.blok_rumah_id, k.status_rumah, k.status_keluarga,
						 b.no_blok,
						 (SELECT COUNT(*) FROM anggota_keluarga ak2 WHERE ak2.keluarga_id = k.id AND ak2.status_kependudukan = 'aktif') as jumlah_anggota
						 FROM anggota_keluarga a
						 JOIN keluarga k ON a.keluarga_id = k.id
						 LEFT JOIN blok_rumah b ON k.blok_rumah_id = b.id
						 ${whereSql}
						 ORDER BY ${orderField} ${sort === 'desc' ? 'DESC' : 'ASC'}
						 LIMIT ? OFFSET ?`,
						params
					);

		const [blokRumah] = await conn.execute('SELECT id, no_blok FROM blok_rumah ORDER BY no_blok ASC');

		return {
			penduduk: rows,
			blokRumah,
			search,
			sort,
			sortBy: safeSortBy,
			page,
			itemsPerPage,
			total
		};
	} catch (e) {
		console.error('LOAD data-penduduk error:', e);
		throw error(500, 'Gagal memuat data penduduk');
	} finally {
		conn.release();
	}
};

export const actions = {
	create: async ({ request, cookies }) => {
		const user = cookies.get('session_user');
		if (!user) {
			throw redirect(303, '/login');
		}

		const form = await request.formData();
		const id = form.get('id')?.toString().trim() || '';
		const noKk = form.get('no_kk')?.toString().trim() || '';
		const blokRumahId = form.get('blok_rumah_id')?.toString() || '';
		const statusRumah = form.get('status_rumah')?.toString() || 'sendiri';

		const nikRegex = /^\d{16}$/;
		const hpRegex = /^\d{11,13}$/;

		if (!noKk) {
			return fail(400, { error: 'No. KK wajib diisi' });
		}
		if (!nikRegex.test(noKk)) {
			return fail(400, { error: 'No. KK harus berupa 16 digit angka' });
		}
		if (!blokRumahId) {
			return fail(400, { error: 'Blok Rumah wajib dipilih' });
		}

		const niks = form.getAll('nik[]')?.map((v) => v.toString().trim()) || [];
		const namas = form.getAll('nama[]')?.map((v) => v.toString().trim()) || [];
		const jks = form.getAll('jenis_kelamin[]')?.map((v) => v.toString()) || [];
		const tempatLahirs = form.getAll('tempat_lahir[]')?.map((v) => v.toString().trim()) || [];
		const tglLahir = form.getAll('tanggal_lahir[]')?.map((v) => v.toString()) || [];
		const hubs = form.getAll('hub_keluarga[]')?.map((v) => v.toString()) || [];
		const nomorHps = form.getAll('nomor_hp[]')?.map((v) => v.toString().trim()) || [];
		const agamas = form.getAll('agama[]')?.map((v) => v.toString()) || [];
		const pekerjaans = form.getAll('pekerjaan[]')?.map((v) => v.toString()) || [];
		const statusPerkawinans = form.getAll('status_perkawinan[]')?.map((v) => v.toString()) || [];

		if (niks.length === 0) {
			return fail(400, { error: 'Minimal harus ada 1 anggota keluarga' });
		}

		for (let i = 0; i < niks.length; i++) {
			if (!niks[i]) return fail(400, { error: `NIK anggota ke-${i + 1} wajib diisi` });
			if (!nikRegex.test(niks[i])) return fail(400, { error: `NIK anggota ke-${i + 1} harus berupa 16 digit angka` });
			if (!namas[i]) return fail(400, { error: `Nama anggota ke-${i + 1} wajib diisi` });
			if (!jks[i]) return fail(400, { error: `Jenis kelamin anggota ke-${i + 1} wajib diisi` });
			if (!tglLahir[i]) return fail(400, { error: `Tanggal lahir anggota ke-${i + 1} wajib diisi` });
			if (!hubs[i]) return fail(400, { error: `Hubungan keluarga anggota ke-${i + 1} wajib diisi` });
			if (nomorHps[i] && !hpRegex.test(nomorHps[i])) return fail(400, { error: `Nomor HP anggota ke-${i + 1} harus berupa 11-13 digit angka` });
		}

		const conn = await getConnection();
		try {
			await conn.beginTransaction();

			let keluargaId;
			if (id) {
				// Update existing keluarga
				await conn.execute(
					'UPDATE keluarga SET no_kk = ?, blok_rumah_id = ?, status_rumah = ? WHERE id = ?',
					[noKk, blokRumahId, statusRumah, id]
				);
				keluargaId = parseInt(id);

				// Hapus anggota lama, sisipkan baru
				await conn.execute('DELETE FROM anggota_keluarga WHERE keluarga_id = ?', [keluargaId]);
			} else {
				// Insert new keluarga
				const [result] = await conn.execute(
					'INSERT INTO keluarga (no_kk, blok_rumah_id, status_rumah) VALUES (?, ?, ?)',
					[noKk, blokRumahId, statusRumah]
				);
				keluargaId = result.insertId;
			}

			// Insert semua anggota
					for (let i = 0; i < niks.length; i++) {
						try {
							await conn.execute(
								`INSERT INTO anggota_keluarga (nik, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, hub_keluarga, nomor_hp, agama, pekerjaan, status_perkawinan, keluarga_id)
								VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
								[niks[i], namas[i], jks[i], tempatLahirs[i] || null, tglLahir[i], hubs[i], nomorHps[i] || null, agamas[i] || null, pekerjaans[i] || null, statusPerkawinans[i] || null, keluargaId]
							);
				} catch (insertError) {
					await conn.rollback();
					if (insertError.code === 'ER_DUP_ENTRY') {
						const namaInfo = namas[i] ? ` (${namas[i]})` : '';
						return fail(400, { error: `NIK anggota ke-${i + 1}${namaInfo} sudah terdaftar` });
					}
					throw insertError;
				}
			}

			await conn.commit();
			return { success: id ? 'Data keluarga dan anggota berhasil diperbarui' : 'Data keluarga dan anggota berhasil disimpan' };
		} catch (e) {
			await conn.rollback();
			if (e.code === 'ER_DUP_ENTRY') {
				if (e.message.includes('no_kk')) {
					return fail(400, { error: 'No. KK sudah terdaftar' });
				}
			}
			return fail(400, { error: 'Gagal menyimpan data: ' + e.message });
		} finally {
			conn.release();
		}
	},

	updateAnggota: async ({ request, cookies }) => {
		const user = cookies.get('session_user');
		if (!user) {
			throw redirect(303, '/login');
		}

		const form = await request.formData();
		const id = form.get('id')?.toString();
		const nik = form.get('nik')?.toString().trim();
		const nama = form.get('nama')?.toString().trim();
		const jenis_kelamin = form.get('jenis_kelamin')?.toString();
		const tempat_lahir = form.get('tempat_lahir')?.toString().trim() || null;
		const tanggal_lahir = form.get('tanggal_lahir')?.toString() || null;
		const nomor_hp = form.get('nomor_hp')?.toString().trim() || null;
		const agama = form.get('agama')?.toString() || null;
		const pekerjaan = form.get('pekerjaan')?.toString() || null;
		const status_perkawinan = form.get('status_perkawinan')?.toString() || null;

		const nikRegex = /^\d{16}$/;
		const hpRegex = /^\d{11,13}$/;

		if (!id || !nik || !nama || !jenis_kelamin) {
			return fail(400, { error: 'Data tidak lengkap' });
		}
		if (!nikRegex.test(nik)) {
			return fail(400, { error: 'NIK harus berupa 16 digit angka' });
		}
		if (nomor_hp && !hpRegex.test(nomor_hp)) {
			return fail(400, { error: 'Nomor HP harus berupa 11-13 digit angka' });
		}

		const conn = await getConnection();
		try {
			const [result] = await conn.execute(
				'UPDATE anggota_keluarga SET nik = ?, nama = ?, jenis_kelamin = ?, tempat_lahir = ?, tanggal_lahir = ?, nomor_hp = ?, agama = ?, pekerjaan = ?, status_perkawinan = ? WHERE id = ?',
				[nik, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, nomor_hp, agama, pekerjaan, status_perkawinan, id]
			);

			console.log("nilai:", result.affectedRows);
			if (result.affectedRows === 0) {
				return fail(400, { error: 'Anggota tidak ditemukan' });
			}

			return { success: 'Data penduduk berhasil diperbarui' };
		} catch (e) {
			console.error('UPDATE anggota error:', e);
			if (e.code === 'ER_DUP_ENTRY') {
				return fail(400, { error: 'NIK sudah terdaftar' });
			}
			return fail(400, { error: 'Gagal memperbarui data: ' + e.message });
		} finally {
			conn.release();
		}
	},

	deleteAnggota: async ({ request, cookies }) => {
		const user = cookies.get('session_user');
		if (!user) {
			throw redirect(303, '/login');
		}

		const form = await request.formData();
		const id = form.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'ID anggota tidak valid' });
		}

		const conn = await getConnection();
		try {
			const [anggota] = await conn.execute(
				'SELECT hub_keluarga FROM anggota_keluarga WHERE id = ?',
				[id]
			);

			if (anggota.length === 0) {
				return fail(400, { error: 'Anggota tidak ditemukan' });
			}

			if (anggota[0].hub_keluarga === 'Kepala Keluarga') {
				return fail(400, { error: 'Kepala Keluarga tidak bisa dihapus. Silahkan hapus dari form edit keluarga' });
			}

			await conn.execute('DELETE FROM anggota_keluarga WHERE id = ?', [id]);
			return { success: 'Data anggota berhasil dihapus' };
		} catch (e) {
			console.error('DELETE anggota error:', e);
			return fail(400, { error: 'Gagal menghapus data: ' + e.message });
		} finally {
			conn.release();
		}
	},

	pindahKeluarAnggota: async ({ request, cookies }) => {
		const user = cookies.get('session_user');
		if (!user) {
			throw redirect(303, '/login');
		}

		const form = await request.formData();
		const id = form.get('id')?.toString();
		const tanggalMutasi = form.get('tanggal_mutasi')?.toString();
		const alasan = form.get('alasan')?.toString().trim() || null;
		const alamatTujuan = form.get('alamat_tujuan')?.toString().trim() || null;
		const rtRwTujuan = form.get('rt_rw_tujuan')?.toString().trim() || null;
		const kelurahanTujuan = form.get('kelurahan_tujuan')?.toString().trim() || null;
		const kecamatanTujuan = form.get('kecamatan_tujuan')?.toString().trim() || null;
		const kotaTujuan = form.get('kota_tujuan')?.toString().trim() || null;
		const provinsiTujuan = form.get('provinsi_tujuan')?.toString().trim() || null;
		const noSuratPindah = form.get('no_surat_pindah')?.toString().trim() || null;
		const keterangan = form.get('keterangan')?.toString().trim() || null;

		if (!id || !tanggalMutasi || !alamatTujuan) {
			return fail(400, { error: 'ID anggota, tanggal, dan alamat tujuan wajib diisi' });
		}

		const conn = await getConnection();
		try {
			await conn.beginTransaction();

			// Get anggota info
			const [anggotaRows] = await conn.execute(
				'SELECT id, nama, keluarga_id FROM anggota_keluarga WHERE id = ? AND status_kependudukan = \"aktif\"',
				[id]
			);

			if (anggotaRows.length === 0) {
				await conn.rollback();
				return fail(400, { error: 'Anggota tidak ditemukan atau sudah tidak aktif' });
			}

			const anggota = anggotaRows[0];

			// Update status anggota
			await conn.execute(
				'UPDATE anggota_keluarga SET status_kependudukan = \"pindah_keluar\" WHERE id = ?',
				[id]
			);

			// Insert mutasi_penduduk
			await conn.execute(
				`INSERT INTO mutasi_penduduk 
				(anggota_keluarga_id, jenis_mutasi, tanggal_mutasi, alasan, alamat_tujuan, rt_rw_tujuan, kelurahan_tujuan, kecamatan_tujuan, kota_tujuan, provinsi_tujuan, no_surat_pindah, keterangan, dibuat_oleh)
				VALUES (?, 'pindah_keluar', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[id, tanggalMutasi, alasan, alamatTujuan, rtRwTujuan, kelurahanTujuan, kecamatanTujuan, kotaTujuan, provinsiTujuan, noSuratPindah, keterangan, parseInt(user)]
			);

			await conn.commit();
			return { success: `${anggota.nama} berhasil dipindahkan keluar` };
		} catch (e) {
			await conn.rollback();
			console.error('PINDAH KELUAR ANGGOTA error:', e);
			return fail(400, { error: 'Gagal pindah keluar: ' + e.message });
		} finally {
			conn.release();
		}
	},

	pindahKeluarKeluarga: async ({ request, cookies }) => {
		const user = cookies.get('session_user');
		if (!user) {
			throw redirect(303, '/login');
		}

		const form = await request.formData();
		const keluargaId = form.get('keluarga_id')?.toString();
		const tanggalMutasi = form.get('tanggal_mutasi')?.toString();
		const alamatTujuan = form.get('alamat_tujuan')?.toString().trim() || null;
		const rtRwTujuan = form.get('rt_rw_tujuan')?.toString().trim() || null;
		const kelurahanTujuan = form.get('kelurahan_tujuan')?.toString().trim() || null;
		const kecamatanTujuan = form.get('kecamatan_tujuan')?.toString().trim() || null;
		const kotaTujuan = form.get('kota_tujuan')?.toString().trim() || null;
		const provinsiTujuan = form.get('provinsi_tujuan')?.toString().trim() || null;
		const noSuratPindah = form.get('no_surat_pindah')?.toString().trim() || null;
		const alasan = form.get('alasan')?.toString().trim() || null;
		const keterangan = form.get('keterangan')?.toString().trim() || null;

		if (!keluargaId || !tanggalMutasi || !alamatTujuan) {
			return fail(400, { error: 'Keluarga ID, tanggal, dan alamat tujuan wajib diisi' });
		}

		const conn = await getConnection();
		try {
			await conn.beginTransaction();

			// Get keluarga info
			const [keluargaRows] = await conn.execute(
				'SELECT id, no_kk FROM keluarga WHERE id = ? AND status_keluarga = \"aktif\"',
				[keluargaId]
			);

			if (keluargaRows.length === 0) {
				await conn.rollback();
				return fail(400, { error: 'Keluarga tidak ditemukan atau sudah pindah' });
			}

			const keluarga = keluargaRows[0];

			// Get all aktif anggota
			const [anggotaRows] = await conn.execute(
				'SELECT id, nama FROM anggota_keluarga WHERE keluarga_id = ? AND status_kependudukan = \"aktif\"',
				[keluargaId]
			);

			if (anggotaRows.length === 0) {
				await conn.rollback();
				return fail(400, { error: 'Tidak ada anggota aktif di keluarga ini' });
			}

			const jumlahAnggota = anggotaRows.length;

			// Update status keluarga
			await conn.execute(
				'UPDATE keluarga SET status_keluarga = \"pindah_keluar\", tanggal_pindah_keluar = ?, alamat_tujuan_keluarga = ? WHERE id = ?',
				[tanggalMutasi, alamatTujuan, keluargaId]
			);

			// Update all anggota status
			await conn.execute(
				'UPDATE anggota_keluarga SET status_kependudukan = \"pindah_keluar\" WHERE keluarga_id = ? AND status_kependudukan = \"aktif\"',
				[keluargaId]
			);

			// Insert mutasi_penduduk for each anggota
			for (const anggota of anggotaRows) {
				await conn.execute(
					`INSERT INTO mutasi_penduduk 
					(anggota_keluarga_id, jenis_mutasi, tanggal_mutasi, alasan, alamat_tujuan, rt_rw_tujuan, kelurahan_tujuan, kecamatan_tujuan, kota_tujuan, provinsi_tujuan, no_surat_pindah, keterangan, dibuat_oleh)
					VALUES (?, 'pindah_keluar', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					[anggota.id, tanggalMutasi, alasan, alamatTujuan, rtRwTujuan, kelurahanTujuan, kecamatanTujuan, kotaTujuan, provinsiTujuan, noSuratPindah, keterangan, parseInt(user)]
				);
			}

			// Insert mutasi_keluarga (1 record per KK)
			await conn.execute(
				`INSERT INTO mutasi_keluarga 
				(keluarga_id, jenis_mutasi, tanggal_mutasi, alamat_tujuan, no_surat_pindah, jumlah_anggota, keterangan, dibuat_oleh)
				VALUES (?, 'pindah_keluar', ?, ?, ?, ?, ?, ?)`,
				[keluargaId, tanggalMutasi, alamatTujuan, noSuratPindah, jumlahAnggota, keterangan, parseInt(user)]
			);

			await conn.commit();
			return { success: `Keluarga ${keluarga.no_kk} (${jumlahAnggota} anggota) berhasil dipindahkan keluar` };
		} catch (e) {
			await conn.rollback();
			console.error('PINDAH KELUAR KELUARGA error:', e);
			return fail(400, { error: 'Gagal pindah keluar keluarga: ' + e.message });
		} finally {
			conn.release();
		}
	},

	meninggalAnggota: async ({ request, cookies }) => {
		const user = cookies.get('session_user');
		if (!user) {
			throw redirect(303, '/login');
		}

		const form = await request.formData();
		const id = form.get('id')?.toString();
		const tanggalMutasi = form.get('tanggal_mutasi')?.toString();
		const alasan = form.get('alasan')?.toString().trim() || null;
		const noSuratMeninggal = form.get('no_surat_meninggal')?.toString().trim() || null;
		const keterangan = form.get('keterangan')?.toString().trim() || null;

		if (!id || !tanggalMutasi) {
			return fail(400, { error: 'ID anggota dan tanggal meninggal wajib diisi' });
		}

		const conn = await getConnection();
		try {
			await conn.beginTransaction();

			// Get anggota info
			const [anggotaRows] = await conn.execute(
				'SELECT id, nama FROM anggota_keluarga WHERE id = ? AND status_kependudukan = \"aktif\"',
				[id]
			);

			if (anggotaRows.length === 0) {
				await conn.rollback();
				return fail(400, { error: 'Anggota tidak ditemukan atau sudah tidak aktif' });
			}

			const anggota = anggotaRows[0];

			// Update status anggota
			await conn.execute(
				'UPDATE anggota_keluarga SET status_kependudukan = \"meninggal\" WHERE id = ?',
				[id]
			);

			// Insert mutasi_penduduk (alamat_tujuan NULL untuk meninggal)
			await conn.execute(
				`INSERT INTO mutasi_penduduk 
				(anggota_keluarga_id, jenis_mutasi, tanggal_mutasi, alasan, alamat_tujuan, no_surat_pindah, keterangan, dibuat_oleh)
				VALUES (?, 'meninggal', ?, ?, NULL, ?, ?, ?)`,
				[id, tanggalMutasi, alasan, noSuratMeninggal, keterangan, parseInt(user)]
			);

			await conn.commit();
			return { success: `${anggota.nama} berhasil dicatat meninggal` };
		} catch (e) {
			await conn.rollback();
			console.error('MENINGGAL ANGGOTA error:', e);
			return fail(400, { error: 'Gagal mencatat meninggal: ' + e.message });
		} finally {
			conn.release();
		}
	}
};