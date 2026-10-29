import mysql from 'mysql2/promise';
import { redirect } from '@sveltejs/kit';

const dbConfig = {
	host: '172.17.0.1',
	port: 3306,
	user: 'victor',
	password: 'VictorAI2026!',
	database: 'sistem_bci'
};

async function getConnection() {
	return mysql.createConnection(dbConfig);
}

export const load = async ({ cookies, url }) => {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login');
	}

	const search = url.searchParams.get('search')?.trim() || '';
	const sort = url.searchParams.get('sort') || 'asc';

	const conn = await getConnection();
	try {
		let sql = `
			SELECT a.id, a.nik, a.nama, a.jenis_kelamin, a.tanggal_lahir,
			a.hub_keluarga, a.keluarga_id, a.nomor_hp,
			k.no_kk, k.blok_rumah_id, k.status_rumah,
			b.no_blok
			FROM anggota_keluarga a
			JOIN keluarga k ON a.keluarga_id = k.id
			LEFT JOIN blok_rumah b ON k.blok_rumah_id = b.id
		`;
		const params = [];

		if (search) {
			sql += ' WHERE a.nik LIKE ? OR a.nama LIKE ? OR k.no_kk LIKE ? OR b.no_blok LIKE ?';
			const searchTerm = `%${search}%`;
			params.push(searchTerm, searchTerm, searchTerm, searchTerm);
		}

		sql += ` ORDER BY a.nama ${sort === 'desc' ? 'DESC' : 'ASC'}`;

		const [rows] = await conn.execute(sql, params);

		const [blokRumah] = await conn.execute('SELECT id, no_blok FROM blok_rumah ORDER BY no_blok ASC');

		return {
			penduduk: rows,
			blokRumah,
			search,
			sort
		};
	} finally {
		await conn.end();
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
			return { error: 'No. KK wajib diisi' };
		}
		if (!nikRegex.test(noKk)) {
			return { error: 'No. KK harus berupa 16 digit angka' };
		}
		if (!blokRumahId) {
			return { error: 'Blok Rumah wajib dipilih' };
		}

		const niks = form.getAll('nik[]')?.map((v) => v.toString().trim()) || [];
		const namas = form.getAll('nama[]')?.map((v) => v.toString().trim()) || [];
		const jks = form.getAll('jenis_kelamin[]')?.map((v) => v.toString()) || [];
		const tglLahir = form.getAll('tanggal_lahir[]')?.map((v) => v.toString()) || [];
		const hubs = form.getAll('hub_keluarga[]')?.map((v) => v.toString()) || [];
		const nomorHps = form.getAll('nomor_hp[]')?.map((v) => v.toString().trim()) || [];

		if (niks.length === 0) {
			return { error: 'Minimal harus ada 1 anggota keluarga' };
		}

		for (let i = 0; i < niks.length; i++) {
			if (!niks[i]) return { error: `NIK anggota ke-${i + 1} wajib diisi` };
			if (!nikRegex.test(niks[i])) return { error: `NIK anggota ke-${i + 1} harus berupa 16 digit angka` };
			if (!namas[i]) return { error: `Nama anggota ke-${i + 1} wajib diisi` };
			if (!jks[i]) return { error: `Jenis kelamin anggota ke-${i + 1} wajib diisi` };
			if (!tglLahir[i]) return { error: `Tanggal lahir anggota ke-${i + 1} wajib diisi` };
			if (!hubs[i]) return { error: `Hubungan keluarga anggota ke-${i + 1} wajib diisi` };
			if (nomorHps[i] && !hpRegex.test(nomorHps[i])) return { error: `Nomor HP anggota ke-${i + 1} harus berupa 11-13 digit angka` };
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
								`INSERT INTO anggota_keluarga (nik, nama, jenis_kelamin, tanggal_lahir, hub_keluarga, nomor_hp, keluarga_id)
								 VALUES (?, ?, ?, ?, ?, ?, ?)`,
								[niks[i], namas[i], jks[i], tglLahir[i], hubs[i], nomorHps[i] || null, keluargaId]
							);
						} catch (insertError) {
							await conn.rollback();
							if (insertError.code === 'ER_DUP_ENTRY') {
								const namaInfo = namas[i] ? ` (${namas[i]})` : '';
								return { error: `NIK anggota ke-${i + 1}${namaInfo} sudah terdaftar` };
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
					return { error: 'No. KK sudah terdaftar' };
				}
			}
			return { error: 'Gagal menyimpan data: ' + e.message };
		} finally {
			await conn.end();
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
		const tanggal_lahir = form.get('tanggal_lahir')?.toString() || null;
		const nomor_hp = form.get('nomor_hp')?.toString().trim() || null;

		const nikRegex = /^\d{16}$/;
		const hpRegex = /^\d{11,13}$/;

		if (!id || !nik || !nama || !jenis_kelamin) {
			return { error: 'Data tidak lengkap' };
		}
		if (!nikRegex.test(nik)) {
			return { error: 'NIK harus berupa 16 digit angka' };
		}
		if (nomor_hp && !hpRegex.test(nomor_hp)) {
			return { error: 'Nomor HP harus berupa 11-13 digit angka' };
		}

		const conn = await getConnection();
		try {
			const [result] = await conn.execute(
				'UPDATE anggota_keluarga SET nik = ?, nama = ?, jenis_kelamin = ?, tanggal_lahir = ?, nomor_hp = ? WHERE id = ?',
				[nik, nama, jenis_kelamin, tanggal_lahir, nomor_hp, id]
			);

			console.log("nilai:", result.affectedRows);
			if (result.affectedRows === 0) {
				return { error: 'Anggota tidak ditemukan' };
			}

			return { success: 'Data penduduk berhasil diperbarui' };
		} catch (e) {
			console.error('UPDATE anggota error:', e);
			if (e.code === 'ER_DUP_ENTRY') {
				return { error: 'NIK sudah terdaftar' };
			}
			return { error: 'Gagal memperbarui data: ' + e.message };
		} finally {
			await conn.end();
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
			return { error: 'ID anggota tidak valid' };
		}

		const conn = await getConnection();
		try {
			const [anggota] = await conn.execute(
				'SELECT hub_keluarga FROM anggota_keluarga WHERE id = ?',
				[id]
			);

			if (anggota.length === 0) {
				return { error: 'Anggota tidak ditemukan' };
			}

			if (anggota[0].hub_keluarga === 'Kepala Keluarga') {
				return { error: 'Kepala Keluarga tidak bisa dihapus. Silahkan hapus dari form edit keluarga' };
			}

			await conn.execute('DELETE FROM anggota_keluarga WHERE id = ?', [id]);
			return { success: 'Data anggota berhasil dihapus' };
		} catch (e) {
			console.error('DELETE anggota error:', e);
			return { error: 'Gagal menghapus data: ' + e.message };
		} finally {
			await conn.end();
		}
	}
};
