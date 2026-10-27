import { redirect } from '@sveltejs/kit';

export const load = (event) => {
	const cookies = event.cookies;
	const session = cookies ? cookies.get('session_user') : null;

	if (!session) {
		throw redirect(302, '/login');
	}

	return { session: JSON.parse(session) };
};
