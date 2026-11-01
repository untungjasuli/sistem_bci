import { redirect, error } from '@sveltejs/kit';

/**
 * Role-based access control configuration
 * Define which roles can access which routes
 */
const routePermissions = {
	// Public routes (no auth required)
	public: ['/login', '/logout'],

	// Admin only routes
	admin: [
		'/data-blok-rumah',
		'/data-penduduk',
		'/surat-rt',
		'/profile',      // own profile
		'/settings'      // only admin
	],

	// Petugas only routes
	petugas: [
		'/iuran-bulanan'
	],

	// Both admin and petugas (shared routes)
	shared: [
		'/iuran-bulanan'
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
			if (roleKey === 'shared') {
				// Special handling for shared routes - allow both admin and petugas
				allowedRoles.add('admin');
				allowedRoles.add('petugas');
			} else {
				// Split by comma for roles like 'admin,petugas'
				roleKey.split(',').forEach(r => allowedRoles.add(r.trim()));
			}
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
		url.pathname.startsWith('/api/')) {
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
		// Logged in but not authorized -> redirect based on role
		if (user.role === 'petugas') {
			throw redirect(303, '/iuran-bulanan');
		} else {
			throw redirect(303, '/');
		}
	}

	return resolve(event);
}