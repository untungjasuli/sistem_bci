import { redirect, error, fail } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const load = async ({ locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const [jenisSurat] = await executeQuery('SELECT * FROM jenis_surat ORDER BY urutan, id');

    return { user, jenisSurat };
};

export const actions = {
    create: async ({ request, locals }) => {
        const user = locals.user;
        if (!user || user.role !== 'admin') return fail(400, { error: 'Hanya admin' });

        const formData = await request.formData();
        const kode = formData.get('kode')?.toString().trim().toUpperCase() || '';
        const nama = formData.get('nama')?.toString().trim() || '';
        const deskripsi = formData.get('deskripsi')?.toString().trim() || '';
        const template_html = formData.get('template_html')?.toString() || '';
        const variabel_default = formData.get('variabel_default')?.toString() || '{}';
        const urutan = parseInt(formData.get('urutan') || '0');

        if (!kode || !nama) return fail(400, { error: 'Kode dan Nama wajib diisi' });
        if (!/^[A-Z]{2,10}$/.test(kode)) return fail(400, { error: 'Kode harus 2-10 huruf kapital' });

        try {
            await executeQuery(
                `INSERT INTO jenis_surat (kode, nama, deskripsi, template_html, variabel_default, urutan, aktif) VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
                [kode, nama, deskripsi, template_html, variabel_default, urutan]
            );
            return { success: 'Jenis surat berhasil ditambahkan' };
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') return fail(400, { error: 'Kode sudah terdaftar' });
            return fail(400, { error: 'Gagal: ' + e.message });
        }
    },

    update: async ({ request, locals }) => {
        const user = locals.user;
        if (!user || user.role !== 'admin') return fail(400, { error: 'Hanya admin' });

        const formData = await request.formData();
        const id = parseInt(formData.get('id') || '0');
        const kode = formData.get('kode')?.toString().trim().toUpperCase() || '';
        const nama = formData.get('nama')?.toString().trim() || '';
        const deskripsi = formData.get('deskripsi')?.toString().trim() || '';
        const template_html = formData.get('template_html')?.toString() || '';
        const variabel_default = formData.get('variabel_default')?.toString() || '{}';
        const urutan = parseInt(formData.get('urutan') || '0');
        const aktif = formData.get('aktif') === 'on';

        if (!id || !kode || !nama) return fail(400, { error: 'Data tidak lengkap' });

        try {
            await executeQuery(
                `UPDATE jenis_surat SET kode = ?, nama = ?, deskripsi = ?, template_html = ?, variabel_default = ?, urutan = ?, aktif = ? WHERE id = ?`,
                [kode, nama, deskripsi, template_html, variabel_default, urutan, aktif, id]
            );
            return { success: 'Jenis surat berhasil diperbarui' };
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') return fail(400, { error: 'Kode sudah terdaftar' });
            return fail(400, { error: 'Gagal: ' + e.message });
        }
    },

    delete: async ({ request, locals }) => {
        const user = locals.user;
        if (!user || user.role !== 'admin') return fail(400, { error: 'Hanya admin' });

        const formData = await request.formData();
        const id = parseInt(formData.get('id') || '0');

        if (!id) return fail(400, { error: 'ID tidak valid' });

        // Check if used in surat
        const [used] = await executeQuery('SELECT COUNT(*) as cnt FROM surat WHERE jenis_surat_id = ?', [id]);
        if (used[0]?.cnt > 0) {
            return fail(400, { error: 'Jenis surat ini masih digunakan, tidak bisa dihapus' });
        }

        try {
            await executeQuery('DELETE FROM jenis_surat WHERE id = ?', [id]);
            return { success: 'Jenis surat berhasil dihapus' };
        } catch (e) {
            return fail(400, { error: 'Gagal: ' + e.message });
        }
    }
};