import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { writeFileSync, existsSync, cpSync, readdirSync } from 'fs';

export default defineConfig({
	plugins: [
		sveltekit({
				compilerOptions: {
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},
				adapter: adapter({ out: 'build' }),
				csrf: {
					trustedOrigins: ['http://localhost:3100', 'http://127.0.0.1:3100', 'https://demo.untungjasuli.my.id']
				}
			}),
		VitePWA({
			registerType: 'autoUpdate',
			scope: '/',
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
				cleanupOutdatedCaches: true,
				clientsClaim: true,
				skipWaiting: true,
			},
			manifest: {
				name: 'Aplikasi BCI',
				short_name: 'BCI',
				description: 'Sistem Informasi Perumahan BCI - Aplikasi manajemen data warga, iuran, surat, dan keuangan RT/RW',
				theme_color: '#2563eb',
				background_color: '#f9fafb',
				display: 'standalone',
				orientation: 'portrait-primary',
				scope: '/',
				start_url: '/',
				lang: 'id',
				icons: [
					{
						src: '/icons/icon-72x72.png',
						sizes: '72x72',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icons/icon-96x96.png',
						sizes: '96x96',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icons/icon-128x128.png',
						sizes: '128x128',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icons/icon-144x144.png',
						sizes: '144x144',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icons/icon-152x152.png',
						sizes: '152x152',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icons/icon-192x192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icons/icon-384x384.png',
						sizes: '384x384',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icons/icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icons/icon-maskable-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				],
				categories: ['productivity', 'business'],
				shortcuts: [
					{
						name: 'Surat RT',
						short_name: 'Surat',
						description: 'Buat dan kelola surat RT',
						url: '/surat-rt',
						icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
					},
					{
						name: 'Data Penduduk',
						short_name: 'Penduduk',
						description: 'Kelola data warga',
						url: '/data-penduduk',
						icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
					},
					{
						name: 'Iuran Bulanan',
						short_name: 'Iuran',
						description: 'Kelola iuran warga',
						url: '/iuran-bulanan',
						icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					{
						urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'fontawesome-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					}
				]
			},
			devOptions: {
				enabled: true,
				type: 'module'
			}
		}),
		// Plugin custom: Copy SW ke static/ setelah build
		{
			name: 'copy-sw-to-static',
			closeBundle() {
				const src = 'dist/sw.js';
				
				if (existsSync('dist/sw.js')) {
					cpSync('dist/sw.js', 'static/sw.js');
					console.log('✅ Copied sw.js to static/');
				}
				
				// Copy workbox files
				try {
					const files = readdirSync('dist');
					files.filter(f => f.startsWith('workbox-')).forEach(f => {
						cpSync(`dist/${f}`, `static/${f}`);
						console.log(`✅ Copied ${f} to static/`);
					});
				} catch (e) {
					console.log('No workbox files to copy');
				}
			}
		},
	],
	server: {
		host: '0.0.0.0',
		port: 5173,
		allowedHosts: true
	},
	csrf: {
		trustedOrigins: ['http://localhost:3100', 'http://127.0.0.1:3100', 'https://demo.untungjasuli.my.id']
	}
});