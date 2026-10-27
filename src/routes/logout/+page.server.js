import { redirect } from '@sveltejs/kit';

export const actions = {
	default: async ({ cookies }) => {
		cookies.set('session_user', '', {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			expires: new Date(0)
		});

		throw redirect(303, '/login');
	}
};
