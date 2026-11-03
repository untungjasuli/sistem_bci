import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const load = async ({ locals, cookies }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(303, '/login');
	}

	// Get fresh user data from DB
	const rows = await executeQuery('SELECT id, username, name, role, created_at FROM users WHERE id = ?', [user.id]);
	const userData = rows[0];

	return {
		user,
		userData
	};
};

export const actions = {
	updateProfile: async ({ request, locals, cookies }) => {
		const user = locals.user;
		if (!user) {
			return { error: 'Unauthorized' };
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim() || '';
		const currentPassword = formData.get('currentPassword')?.toString() || '';
		const newPassword = formData.get('newPassword')?.toString() || '';
		const confirmPassword = formData.get('confirmPassword')?.toString() || '';

		if (!name) {
			return { error: 'Nama tidak boleh kosong' };
		}

		try {
			// Verify current password if changing password
			if (newPassword) {
				if (!currentPassword) {
					return { error: 'Password lama harus diisi untuk mengubah password' };
				}
				if (newPassword !== confirmPassword) {
					return { error: 'Konfirmasi password tidak cocok' };
				}
				if (newPassword.length < 6) {
					return { error: 'Password minimal 6 karakter' };
				}

				// Verify current password
				const rows = await executeQuery(
					'SELECT id FROM users WHERE id = ? AND password = MD5(?)',
					[user.id, currentPassword]
				);
				if (!rows.length) {
					return { error: 'Password lama salah' };
				}

				// Update name and password
				await executeQuery(
					'UPDATE users SET name = ?, password = MD5(?) WHERE id = ?',
					[name, newPassword, user.id]
				);
			} else {
				// Update name only
				await executeQuery(
					'UPDATE users SET name = ? WHERE id = ?',
					[name, user.id]
				);
			}

			// Update session cookie
			const updatedRows = await executeQuery('SELECT id, username, name, role FROM users WHERE id = ?', [user.id]);
			const updatedUser = updatedRows[0];
			
			cookies.set('session_user', JSON.stringify({
				id: updatedUser.id,
				username: updatedUser.username,
				name: updatedUser.name,
				role: updatedUser.role
			}), {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: false
			});

			return { success: 'Profil berhasil diperbarui' };
		} catch (e) {
			console.error('Update profile error:', e);
			return { error: 'Gagal memperbarui profil: ' + e.message };
		}
	}
};