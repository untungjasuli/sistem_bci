import { redirect, error, fail } from '@sveltejs/kit';
import { getConnection } from '#lib/server/db';

export const load = async ({ cookies }) => {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login');
	}

	const userData = JSON.parse(user);
	// Hanya admin yang bisa akses settings
	if (userData.role !== 'admin') {
		throw error(403, 'Akses ditolak');
	}

	const conn = await getConnection();
	try {
		// Ambil statistik sistem
		const [blokCount] = await conn.execute('SELECT COUNT(*) as total FROM blok_rumah');
		const [keluargaCount] = await conn.execute('SELECT COUNT(*) as total FROM keluarga');
		const [pendudukCount] = await conn.execute('SELECT COUNT(*) as total FROM anggota_keluarga');
		const [userCount] = await conn.execute('SELECT COUNT(*) as total FROM users');

		// Ambil settings iuran
		const [iuranSettings] = await conn.execute('SELECT `key`, `value` FROM settings WHERE `key` LIKE "iuran_%"');
		const settingsMap = {};
		iuranSettings.forEach(s => { settingsMap[s.key] = s.value; });

		return {
			user: userData,
			stats: {
				blok: blokCount[0]?.total || 0,
				keluarga: keluargaCount[0]?.total || 0,
				penduduk: pendudukCount[0]?.total || 0,
				users: userCount[0]?.total || 0
			},
			iuranSettings: {
				jatuh_tempo: parseInt(settingsMap.iuran_jatuh_tempo || '10'),
				nominal_penuh: parseInt(settingsMap.iuran_nominal_penuh || '50000'),
				nominal_keamanan: parseInt(settingsMap.iuran_nominal_keamanan || '25000')
			}
		};
	} catch (e) {
		console.error('LOAD settings error:', e);
		throw error(500, 'Gagal memuat pengaturan');
	} finally {
		conn.release();
	}
};

export const actions = {
	updateIuranSettings: async ({ request, cookies }) => {
		const user = cookies.get('session_user');
		if (!user) {
			throw redirect(303, '/login');
		}

		const userData = JSON.parse(user);
		if (userData.role !== 'admin') {
			return fail(403, { error: 'Akses ditolak' });
		}

		const formData = await request.formData();
		const jatuh_tempo = parseInt(formData.get('iuran_jatuh_tempo')?.toString() || '10');
		const nominal_penuh = parseInt(formData.get('iuran_nominal_penuh')?.toString() || '50000');
		const nominal_keamanan = parseInt(formData.get('iuran_nominal_keamanan')?.toString() || '25000');

		// Validasi
		if (jatuh_tempo < 1 || jatuh_tempo > 28) {
			return fail(400, { error: 'Jatuh tempo harus antara 1-28' });
		}
		if (nominal_penuh < 0 || nominal_keamanan < 0) {
			return fail(400, { error: 'Nominal tidak boleh negatif' });
		}

		const conn = await getConnection();
		try {
			await conn.execute('UPDATE settings SET `value` = ?, updated_at = CURRENT_TIMESTAMP WHERE `key` = ?', [jatuh_tempo.toString(), 'iuran_jatuh_tempo']);
			await conn.execute('UPDATE settings SET `value` = ?, updated_at = CURRENT_TIMESTAMP WHERE `key` = ?', [nominal_penuh.toString(), 'iuran_nominal_penuh']);
			await conn.execute('UPDATE settings SET `value` = ?, updated_at = CURRENT_TIMESTAMP WHERE `key` = ?', [nominal_keamanan.toString(), 'iuran_nominal_keamanan']);

			return { success: 'Pengaturan iuran berhasil disimpan' };
		} catch (e) {
			console.error('UPDATE iuran settings error:', e);
			return fail(500, { error: 'Gagal menyimpan pengaturan: ' + e.message });
		} finally {
			conn.release();
		}
	}
};