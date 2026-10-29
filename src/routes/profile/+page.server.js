import { redirect, error, fail } from '@sveltejs/kit';
import { getConnection } from '#lib/server/db';

export const load = async ({ cookies }) => {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login');
	}

	const conn = await getConnection();
	try {
		const userData = JSON.parse(user);
		const [rows] = await conn.execute('SELECT id, username, name, role, created_at FROM users WHERE id = ?', [userData.id]);
		if (rows.length === 0) {
			throw error(404, 'User tidak ditemukan');
		}
		return { user: rows[0] };
	} catch (e) {
		console.error('LOAD profile error:', e);
		throw error(500, 'Gagal memuat profil');
	} finally {
		conn.release();
	}
};

export const actions = {
	updateProfile: async ({ request, cookies }) => {
		const user = cookies.get('session_user');
		if (!user) {
			throw redirect(303, '/login');
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim() || '';
		const username = formData.get('username')?.toString().trim() || '';

		if (!name || !username) {
			return fail(400, { error: 'Nama dan username wajib diisi' });
		}

		const userData = JSON.parse(user);
		const conn = await getConnection();
		try {
			// Cek username sudah dipakai user lain
			const [existing] = await conn.execute('SELECT id FROM users WHERE username = ? AND id != ?', [username, userData.id]);
			if (existing.length > 0) {
				return fail(400, { error: 'Username sudah digunakan' });
			}

			await conn.execute('UPDATE users SET name = ?, username = ? WHERE id = ?', [name, username, userData.id]);

			// Update cookie session
			cookies.set('session_user', JSON.stringify({ ...userData, name, username, role: userData.role }), {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: false
			});

			return { success: 'Profil berhasil diperbarui' };
		} catch (e) {
			console.error('UPDATE profile error:', e);
			return fail(500, { error: 'Gagal memperbarui profil: ' + e.message });
		} finally {
			conn.release();
		}
	},

	changePassword: async ({ request, cookies }) => {
		const user = cookies.get('session_user');
		if (!user) {
			throw redirect(303, '/login');
		}

		const formData = await request.formData();
		const currentPassword = formData.get('currentPassword')?.toString() || '';
		const newPassword = formData.get('newPassword')?.toString() || '';
		const confirmPassword = formData.get('confirmPassword')?.toString() || '';

		if (!currentPassword || !newPassword || !confirmPassword) {
			return fail(400, { error: 'Semua field password wajib diisi' });
		}
		if (newPassword.length < 6) {
			return fail(400, { error: 'Password baru minimal 6 karakter' });
		}
		if (newPassword !== confirmPassword) {
			return fail(400, { error: 'Konfirmasi password tidak cocok' });
		}

		const userData = JSON.parse(user);
		const conn = await getConnection();
		try {
			// Verifikasi password lama
			const [rows] = await conn.execute('SELECT * FROM users WHERE id = ? AND password = MD5(?)', [userData.id, currentPassword]);
			if (rows.length === 0) {
				return fail(400, { error: 'Password saat ini salah' });
			}

			await conn.execute('UPDATE users SET password = MD5(?) WHERE id = ?', [newPassword, userData.id]);

			return { success: 'Password berhasil diubah' };
		} catch (e) {
			console.error('CHANGE password error:', e);
			return fail(500, { error: 'Gagal mengubah password: ' + e.message });
		} finally {
			conn.release();
		}
	}
};