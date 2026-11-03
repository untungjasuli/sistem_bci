import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const load = async ({ locals }) => {
	const user = locals.user;
	if (!user || user.role !== 'admin') {
		throw redirect(303, '/');
	}

	const users = await executeQuery(
		'SELECT id, username, name, role, created_at FROM users ORDER BY created_at DESC'
	);

	return {
		user,
		users
	};
};

export const actions = {
	create: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return { error: 'Hanya admin yang bisa menambah pengguna' };
		}

		const formData = await request.formData();
		const username = formData.get('username')?.toString().trim() || '';
		const name = formData.get('name')?.toString().trim() || '';
		const password = formData.get('password')?.toString() || '';
		const role = formData.get('role')?.toString() || '';

		if (!username || !name || !password || !role) {
			return { error: 'Semua field wajib diisi' };
		}
		if (password.length < 6) {
			return { error: 'Password minimal 6 karakter' };
		}
		if (!['admin', 'bendahara', 'sekretaris', 'petugas'].includes(role)) {
			return { error: 'Role tidak valid' };
		}

		try {
			// Check username unique
			const existing = await executeQuery('SELECT id FROM users WHERE username = ?', [username]);
			if (existing.length) {
				return { error: 'Username sudah digunakan' };
			}

			await executeQuery(
				'INSERT INTO users (username, password, name, role) VALUES (?, MD5(?), ?, ?)',
				[username, password, name, role]
			);

			return { success: `Pengguna ${name} berhasil ditambahkan` };
		} catch (e) {
			console.error('Create user error:', e);
			return { error: 'Gagal menambah pengguna: ' + e.message };
		}
	},

	update: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return { error: 'Hanya admin yang bisa mengubah pengguna' };
		}

		const formData = await request.formData();
		const id = parseInt(formData.get('id') || '0');
		const name = formData.get('name')?.toString().trim() || '';
		const role = formData.get('role')?.toString() || '';
		const password = formData.get('password')?.toString() || '';

		if (!id || !name || !role) {
			return { error: 'Data tidak lengkap' };
		}
		if (!['admin', 'bendahara', 'sekretaris', 'petugas'].includes(role)) {
			return { error: 'Role tidak valid' };
		}
		if (password && password.length < 6) {
			return { error: 'Password minimal 6 karakter' };
		}

		// Prevent admin from demoting themselves
		if (id === user.id && role !== 'admin') {
			return { error: 'Tidak bisa mengubah role sendiri' };
		}

		try {
			if (password) {
				await executeQuery(
					'UPDATE users SET name = ?, role = ?, password = MD5(?) WHERE id = ?',
					[name, role, password, id]
				);
			} else {
				await executeQuery(
					'UPDATE users SET name = ?, role = ? WHERE id = ?',
					[name, role, id]
				);
			}

			return { success: 'Pengguna berhasil diperbarui' };
		} catch (e) {
			console.error('Update user error:', e);
			return { error: 'Gagal memperbarui pengguna: ' + e.message };
		}
	},

	delete: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return { error: 'Hanya admin yang bisa menghapus pengguna' };
		}

		const formData = await request.formData();
		const id = parseInt(formData.get('id') || '0');

		if (!id) {
			return { error: 'ID tidak valid' };
		}

		// Prevent deleting self
		if (id === user.id) {
			return { error: 'Tidak bisa menghapus akun sendiri' };
		}

		try {
			await executeQuery('DELETE FROM users WHERE id = ?', [id]);
			return { success: 'Pengguna berhasil dihapus' };
		} catch (e) {
			console.error('Delete user error:', e);
			return { error: 'Gagal menghapus pengguna: ' + e.message };
		}
	}
};