<script>
	let { data } = $props();

	let stats = $derived(data?.stats || { blok: 0, keluarga: 0, penduduk: 0, users: 0 });
	let user = $derived(data?.user);
	let toast = $state(null);

	function showToast(type, message) {
		toast = { type, message };
		setTimeout(() => {
			toast = null;
		}, 5000);
	}

	$effect(() => {
		if (data?.success) showToast('success', data.success);
		if (data?.error) showToast('error', data.error);
	});
</script>

{#if toast}
	<div
		class="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2"
		class:bg-green-50={toast.type === 'success'}
		class:text-green-700={toast.type === 'success'}
		class:border-green-200={toast.type === 'success'}
		class:bg-red-50={toast.type === 'error'}
		class:text-red-700={toast.type === 'error'}
		class:border-red-200={toast.type === 'error'}
	>
		{#if toast.type === 'success'}
			<i class="fa-solid fa-circle-check"></i>
		{:else}
			<i class="fa-solid fa-circle-exclamation"></i>
		{/if}
		<span>{toast.message}</span>
	</div>
{/if}

<div class="px-4 sm:px-6 lg:px-8 py-8">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900">Pengaturan Sistem</h1>
		<p class="text-gray-500 text-sm">Konfigurasi umum dan informasi sistem</p>
	</div>

	<!-- System Info -->
	<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<i class="fa-solid fa-server text-blue-600"></i> Informasi Sistem
		</h2>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="bg-gray-50 p-4 rounded-lg">
				<p class="text-sm text-gray-500">Total Blok Rumah</p>
				<p class="text-2xl font-bold text-gray-900 mt-1">{stats.blok}</p>
			</div>
			<div class="bg-gray-50 p-4 rounded-lg">
				<p class="text-sm text-gray-500">Total Keluarga (KK)</p>
				<p class="text-2xl font-bold text-gray-900 mt-1">{stats.keluarga}</p>
			</div>
			<div class="bg-gray-50 p-4 rounded-lg">
				<p class="text-sm text-gray-500">Total Penduduk</p>
				<p class="text-2xl font-bold text-gray-900 mt-1">{stats.penduduk}</p>
			</div>
			<div class="bg-gray-50 p-4 rounded-lg">
				<p class="text-sm text-gray-500">Total Pengguna</p>
				<p class="text-2xl font-bold text-gray-900 mt-1">{stats.users}</p>
			</div>
		</div>
	</div>

	<!-- Database Info -->
	<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<i class="fa-solid fa-database text-green-600"></i> Database
		</h2>
		<div class="space-y-3 text-sm">
			<div class="flex justify-between py-2 border-b border-gray-100">
				<span class="text-gray-600">Host</span>
				<span class="font-medium text-gray-900">172.17.0.1:3306</span>
			</div>
			<div class="flex justify-between py-2 border-b border-gray-100">
				<span class="text-gray-600">Database</span>
				<span class="font-medium text-gray-900">sistem_bci</span>
			</div>
			<div class="flex justify-between py-2 border-b border-gray-100">
				<span class="text-gray-600">User</span>
				<span class="font-medium text-gray-900">victor</span>
			</div>
			<div class="flex justify-between py-2">
				<span class="text-gray-600">Engine</span>
				<span class="font-medium text-gray-900">MySQL 8.0+ (Docker)</span>
			</div>
		</div>
	</div>

	<!-- Application Info -->
	<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<i class="fa-solid fa-code text-purple-600"></i> Aplikasi
		</h2>
		<div class="space-y-3 text-sm">
			<div class="flex justify-between py-2 border-b border-gray-100">
				<span class="text-gray-600">Framework</span>
				<span class="font-medium text-gray-900">SvelteKit 5 (Svelte 5 + Runes)</span>
			</div>
			<div class="flex justify-between py-2 border-b border-gray-100">
				<span class="text-gray-600">Styling</span>
				<span class="font-medium text-gray-900">Tailwind CSS v3</span>
			</div>
			<div class="flex justify-between py-2 border-b border-gray-100">
				<span class="text-gray-600">Build Tool</span>
				<span class="font-medium text-gray-900">Vite 8</span>
			</div>
			<div class="flex justify-between py-2 border-b border-gray-100">
				<span class="text-gray-600">Database Driver</span>
				<span class="font-medium text-gray-900">mysql2 (Connection Pool)</span>
			</div>
			<div class="flex justify-between py-2 border-b border-gray-100">
				<span class="text-gray-600">Authentication</span>
				<span class="font-medium text-gray-900">Session Cookie + MD5</span>
			</div>
			<div class="flex justify-between py-2">
				<span class="text-gray-600">Deployment</span>
				<span class="font-medium text-gray-900">Docker Container</span>
			</div>
		</div>
	</div>

	<!-- Account Info -->
	<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<i class="fa-solid fa-user-circle text-indigo-600"></i> Akun Saat Ini
		</h2>
		<div class="flex items-center gap-4">
			<div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl">
				{user?.name?.charAt(0).toUpperCase() || 'U'}
			</div>
			<div>
				<p class="font-medium text-gray-900">{user?.name || 'Administrator'}</p>
				<p class="text-sm text-gray-500">@{user?.username || 'admin'}</p>
				<p class="text-xs text-gray-400 mt-1">Role: <span class="capitalize">{user?.role || 'admin'}</span></p>
			</div>
		</div>
		<div class="mt-4 pt-4 border-t border-gray-100">
			<a href="/profile" class="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
				<i class="fa-solid fa-user-edit"></i> Kelola Profil
			</a>
		</div>
	</div>
</div>