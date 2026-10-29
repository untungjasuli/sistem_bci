import { getConnection } from '#lib/server/db';

export const GET = async ({ url, cookies }) => {
	const user = cookies.get('session_user');
	if (!user) {
		return new Response(JSON.stringify({ error: 'Sesi tidak valid' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const keluargaId = url.searchParams.get('keluarga_id');

	if (!keluargaId) {
		return new Response(JSON.stringify({ error: 'ID keluarga tidak valid' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const conn = await getConnection();
	try {
		const [anggota] = await conn.execute(
			`SELECT id, nik, nama, jenis_kelamin, tanggal_lahir, hub_keluarga, nomor_hp, keluarga_id
			 FROM anggota_keluarga
			 WHERE keluarga_id = ?
			 ORDER BY FIELD(hub_keluarga, 'Kepala Keluarga', 'Istri', 'Anak'), nama ASC`,
			[keluargaId]
		);

		const cleanAnggota = JSON.parse(JSON.stringify(anggota));
		return new Response(JSON.stringify({ data: cleanAnggota }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		console.error('GET anggota keluarga error:', e);
		return new Response(
			JSON.stringify({ error: 'Gagal mengambil data anggota: ' + e.message }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	} finally {
		conn.release();
	}
};
