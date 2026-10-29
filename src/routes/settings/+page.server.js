import { redirect, error } from '@sveltejs/kit';
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

		return {
			user: userData,
			stats: {
				blok: blokCount[0]?.total || 0,
				keluarga: keluargaCount[0]?.total || 0,
				penduduk: pendudukCount[0]?.total || 0,
				users: userCount[0]?.total || 0
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
	// Placeholder untuk aksi settings di masa depan
};