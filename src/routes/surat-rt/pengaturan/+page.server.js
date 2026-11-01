import { redirect, error, fail } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

const SETTING_KEYS = [
    { key: 'rt_no', label: 'Nomor RT', type: 'text', placeholder: 'Contoh: 001', required: true },
    { key: 'rw_no', label: 'Nomor RW', type: 'text', placeholder: 'Contoh: 002', required: true },
    { key: 'rt_alamat', label: 'Alamat Lengkap RT', type: 'textarea', placeholder: 'Contoh: Jl. Mawar No. 10, Kel. Melati, Kec. Mawar, Kota Bandung', required: true },
    { key: 'rt_nama', label: 'Nama RT', type: 'text', placeholder: 'Contoh: Bpk. Ahmad Susanto', required: true },
    { key: 'rt_nip', label: 'NIP RT', type: 'text', placeholder: 'Contoh: 197001012000121001', required: true },
    { key: 'rw_nama', label: 'Nama RW', type: 'text', placeholder: 'Contoh: Bpk. Surya Wijaya', required: false },
    { key: 'rw_nip', label: 'NIP RW', type: 'text', placeholder: 'Contoh: 196502022000121002', required: false }
];

export const load = async ({ locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const [rows] = await executeQuery('SELECT `key`, `value` FROM settings WHERE `key` IN (?)', [SETTING_KEYS.map(s => s.key)]);
    
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });

    return { user, settingKeys: SETTING_KEYS, settings };
};

export const actions = {
    update: async ({ request, locals }) => {
        const user = locals.user;
        if (!user || user.role !== 'admin') return fail(400, { error: 'Hanya admin' });

        const formData = await request.formData();
        
        for (const setting of SETTING_KEYS) {
            const value = formData.get(setting.key)?.toString().trim() || '';
            if (setting.required && !value) {
                return fail(400, { error: `${setting.label} wajib diisi` });
            }
            
            await executeQuery(
                'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
                [setting.key, value]
            );
        }

        return { success: 'Pengaturan RT/RW berhasil disimpan' };
    }
};