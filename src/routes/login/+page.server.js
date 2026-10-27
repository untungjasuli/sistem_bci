import mysql from 'mysql2/promise';
import { redirect } from '@sveltejs/kit';

const dbConfig = {
	host: '172.17.0.1',
	port: 3306,
	user: 'victor',
	password: 'VictorAI2026!',
	database: 'sistem_bci'
};

export const actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username');
		const password = formData.get('password');

		if (!username || !password) {
			return { error: 'Username dan password harus diisi' };
		}

		let connection;
		let loginOk = false;

		try {
			connection = await mysql.createConnection(dbConfig);
			const [rows] = await connection.execute(
				'SELECT * FROM users WHERE username = ? AND password = MD5(?)',
				[String(username), String(password)]
			);

			if (rows.length === 0) {
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
		} catch (err) {
			console.error('Login error:', err);
			return { error: 'Terjadi kesalahan pada server' };
		} finally {
			if (connection) {
				await connection.end();
			}
		}

		if (loginOk) {
			redirect(303, '/');
		}
	}
};
