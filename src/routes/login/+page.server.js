import { redirect, fail } from '@sveltejs/kit';
import { getConnection } from '#lib/server/db';

export const actions = {
	default: async ({ request, cookies, locals }) => {
		const formData = await request.formData();
			const username = formData.get('username');
			const password = formData.get('password');
			const remember = formData.get('remember') === 'on';

			if (!username || !password) {
				return fail(400, { error: 'Username dan password harus diisi' });
			}

			let redirectTo = '/';

			try {
				const conn = await getConnection();
				const [rows] = await conn.execute(
					'SELECT * FROM users WHERE username = ? AND password = MD5(?)',
					[String(username), String(password)]
				);

				if (!rows || rows.length === 0) {
					conn.release();
					return fail(400, { error: 'Username atau password salah' });
				}

				const user = rows[0];

				// Tentukan redirect berdasarkan role
				if (user.role === 'petugas') {
					redirectTo = '/iuran-bulanan';
				} else {
					redirectTo = '/';
				}

				// Cookie options - secure cookie kalau HTTPS (Cloudflare)
				const isHTTPS = locals.isHTTPS === true;
				const cookieOptions = {
					path: '/',
					httpOnly: true,
					sameSite: 'lax',
					secure: isHTTPS,
					...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}) // 30 hari kalau remember me
				};

				cookies.set('session_user', JSON.stringify({
					id: user.id,
					username: user.username,
					name: user.name,
					role: user.role
				}), cookieOptions);

				conn.release();
			} catch (err) {
				console.error('Login error:', err);
				return fail(400, { error: 'Terjadi kesalahan pada server' });
			}

			throw redirect(303, redirectTo);
	}
};