import { redirect } from '@sveltejs/kit';
import { getConnection } from '#lib/server/db';

export const actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username');
		const password = formData.get('password');

		if (!username || !password) {
			return { error: 'Username dan password harus diisi' };
		}

		let loginOk = false;

		try {
			const conn = await getConnection();
			const [rows] = await conn.execute(
				'SELECT * FROM users WHERE username = ? AND password = MD5(?)',
				[String(username), String(password)]
			);

			if (!rows || rows.length === 0) {
				conn.release();
				return { error: 'Username atau password salah' };
			}

			const user = rows[0];

			cookies.set('session_user', JSON.stringify({
				id: user.id,
				username: user.username,
				name: user.name
			}), {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: false
			});

			loginOk = true;
			conn.release();
		} catch (err) {
			console.error('Login error:', err);
			return { error: 'Terjadi kesalahan pada server' };
		}

		if (loginOk) {
			redirect(303, '/');
		}
	}
};