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
		let whereSql = '';
		const params = [];

		if (search) {
			whereSql = ' WHERE a.nik LIKE ? OR a.nama LIKE ? OR k.no_kk LIKE ? OR b.no_blok LIKE ?';
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
					 a.hub_keluarga, a.keluarga_id, a.nomor_hp, a.agama, a.pekerjaan, a.status_perkawinan,
					 k.no_kk, k.blok_rumah_id, k.status_rumah,
					 b.no_blok
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
	}
};