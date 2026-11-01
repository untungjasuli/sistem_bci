import { json } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const GET = async ({ url, cookies }) => {
    const user = cookies.get('session_user');
    if (!user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const blokId = url.searchParams.get('blok_id');
    if (!blokId) {
        return json({ error: 'Blok ID diperlukan' }, { status: 400 });
    }

    try {
        const [rows] = await executeQuery(
            `SELECT ak.id, ak.nik, ak.nama, ak.jenis_kelamin, ak.tanggal_lahir, ak.hub_keluarga,
                    k.no_kk, k.status_rumah, b.no_blok
             FROM anggota_keluarga ak
             JOIN keluarga k ON ak.keluarga_id = k.id
             JOIN blok_rumah b ON k.blok_rumah_id = b.id
             WHERE b.id = ? AND k.status_keluarga = 'aktif' AND ak.status_kependudukan = 'aktif'
             ORDER BY ak.hub_keluarga, ak.nama`,
            [parseInt(blokId)]
        );

        return json({ data: rows });
    } catch (e) {
        console.error('Warga by blok error:', e);
        return json({ error: 'Gagal memuat data warga' }, { status: 500 });
    }
};