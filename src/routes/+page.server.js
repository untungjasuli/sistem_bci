import { redirect } from '@sveltejs/kit';
import { getConnection } from '#lib/server/db';

export const load = async (event) => {
	const cookies = event.cookies;
	const session = cookies ? cookies.get('session_user') : null;

	if (!session) {
		throw redirect(302, '/login');
	}

	const conn = await getConnection();
	try {
		const [totalPenduduk] = await conn.execute('SELECT COUNT(*) as count FROM anggota_keluarga');
		const [totalKeluarga] = await conn.execute('SELECT COUNT(*) as count FROM keluarga');
		const [totalBlokRumah] = await conn.execute('SELECT COUNT(*) as count FROM blok_rumah');
		const [recentKeluarga] = await conn.execute(
			`SELECT k.id, k.no_kk, k.blok_rumah_id, k.status_rumah, b.no_blok, k.created_at
			FROM keluarga k
			LEFT JOIN blok_rumah b ON k.blok_rumah_id = b.id
			ORDER BY k.created_at DESC LIMIT 5`
		);

		return {
			session: JSON.parse(session),
			stats: {
				totalPenduduk: totalPenduduk[0]?.count || 0,
				totalKeluarga: totalKeluarga[0]?.count || 0,
				totalBlokRumah: totalBlokRumah[0]?.count || 0
			},
			recentKeluarga: recentKeluarga || []
		};
	} finally {
		await conn.end();
	}
};
