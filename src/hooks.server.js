import { redirect, error } from '@sveltejs/kit';

/**
 * Role-based access control configuration
 * Define which roles can access which routes
 */
const routePermissions = {
	// Public routes (no auth required)
	public: ['/login', '/logout'],

	// Admin only routes - full access
	admin: [
		'/data-blok-rumah',
		'/denah-blok-rumah',
		'/data-penduduk',
		'/pemilik-rumah-kosong',
		'/surat-rt',
		'/iuran-bulanan',
		'/persetujuan-pembayaran',
		'/kas-account',
		'/kategori-kas',
		'/pembayaran-method',
		'/transaksi-kas',
		'/transfer-antar-kas',
		'/laporan/keuangan',
		'/laporan/tagihan',
		'/laporan/kependudukan',
		'/pengguna',           // user management
		'/settings',           // system settings
		'/profile'             // own profile
	],

	// Bendahara routes - keuangan focused
	bendahara: [
		'/data-blok-rumah',
		'/denah-blok-rumah',
		'/data-penduduk',
		'/pemilik-rumah-kosong',
		'/iuran-bulanan',
		'/persetujuan-pembayaran',
		'/kas-account',
		'/kategori-kas',
		'/pembayaran-method',
		'/transaksi-kas',
		'/transfer-antar-kas',
		'/laporan/keuangan',
		'/laporan/tagihan',
		'/profile'             // own profile
	],

	// Sekretaris routes - surat & kependudukan focused
	sekretaris: [
		'/data-blok-rumah',
		'/denah-blok-rumah',
		'/data-penduduk',
		'/pemilik-rumah-kosong',
		'/surat-rt',
		'/laporan/kependudukan',
		'/profile'             // own profile
	],

	// Petugas routes - iuran only
	petugas: [
		'/iuran-bulanan',
		'/profile'             // own profile
	]
};

/**
 * Check if a path matches a route pattern
 */
function matchRoute(path, patterns) {
	return patterns.some(pattern => {
		if (pattern.endsWith('*')) {
			return path.startsWith(pattern.slice(0, -1));
		}
		return path === pattern || path.startsWith(pattern + '/');
	});
}

/**
 * Get allowed roles for a route
 */
function getAllowedRoles(path) {
	const allowedRoles = new Set();

	// Check all permission categories
	for (const [roleKey, routes] of Object.entries(routePermissions)) {
		if (roleKey === 'public') continue; // handled separately
		if (matchRoute(path, routes)) {
			allowedRoles.add(roleKey);
		}
	}

	// Default: admin only for unknown routes
	if (allowedRoles.size === 0) {
		allowedRoles.add('admin');
	}

	return Array.from(allowedRoles);
}

/**
 * Server hooks for authentication and authorization
 */
export async function handle({ event, resolve }) {
	const { url, cookies } = event;

	// Skip for static assets and API routes that handle their own auth
	if (url.pathname.startsWith('/_app/') || 
		url.pathname.startsWith('/favicon') ||
		url.pathname.startsWith('/api/') ||
		url.pathname.startsWith('/surat-rt/preview')) { // surat preview endpoint only
		return resolve(event);
	}

	// Get session from cookie
	const sessionCookie = cookies.get('session_user');
	let user = null;

	if (sessionCookie) {
		try {
			user = JSON.parse(sessionCookie);
		} catch {
			// Invalid cookie, clear it
			cookies.delete('session_user', { path: '/' });
		}
	}

	// Make user available in locals
	event.locals.user = user;

	// Check authentication
	const isPublic = routePermissions.public.includes(url.pathname);
	const allowedRoles = getAllowedRoles(url.pathname);
	const isAllowed = user && allowedRoles.includes(user.role);

	// Redirect logic
	if (!isPublic && !user) {
		// Not logged in -> redirect to login
		throw redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	if (!isPublic && user && !isAllowed) {
		// Logged in but not authorized -> redirect to default route for role
		const defaultRoutes = {
			admin: '/',
			bendahara: '/iuran-bulanan',
			sekretaris: '/surat-rt',
			petugas: '/iuran-bulanan'
		};
		throw redirect(303, defaultRoutes[user.role] || '/');
	}

	return resolve(event);
}