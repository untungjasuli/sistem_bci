<script>
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let stats = $derived(data?.stats || { blok: 0, keluarga: 0, penduduk: 0, users: 0 });
	let user = $derived(data?.user);
	
	// Local form state (initialized from server data)
	let jatuh_tempo = $state(data?.iuranSettings?.jatuh_tempo || 10);
	let nominal_penuh = $state(data?.iuranSettings?.nominal_penuh || 50000);
	let nominal_keamanan = $state(data?.iuranSettings?.nominal_keamanan || 25000);

	let toast = $state(null);
	let saving = $state(false);

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

	async function handleSaveIuranSettings(e) {
		e.preventDefault();
		
		// Validasi client-side
		if (jatuh_tempo < 1 || jatuh_tempo > 28) {
			showToast('error', 'Jatuh tempo harus antara 1-28');
			return;
		}
		if (nominal_penuh < 0 || nominal_keamanan < 0) {
			showToast('error', 'Nominal tidak boleh negatif');
			return;
		}

		saving = true;

		const formData = new FormData();
		formData.append('iuran_jatuh_tempo', jatuh_tempo.toString());
		formData.append('iuran_nominal_penuh', nominal_penuh.toString());
		formData.append('iuran_nominal_keamanan', nominal_keamanan.toString());

		try {
			const res = await fetch('?/updateIuranSettings', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();

			if (!res.ok || result.error) {
				showToast('error', result.error || 'Gagal menyimpan pengaturan');
				return;
			}

			showToast('success', result.success || 'Pengaturan iuran berhasil disimpan');
			await invalidateAll(); // Refresh data from server
		} catch (err) {
			console.error('Save iuran settings error:', err);
			showToast('error', 'Gagal menyimpan pengaturan');
		} finally {
			saving = false;
		}
	}
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

	<!-- Pengaturan Iuran Bulanan (Paling Atas) -->
	<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<i class="fa-solid fa-money-bill-wave text-orange-600"></i> Pengaturan Iuran Bulanan
		</h2>
		<form onsubmit={handleSaveIuranSettings} class="space-y-6">
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
				<div>
					<label for="iuran_jatuh_tempo" class="block text-sm font-medium text-gray-700 mb-2">Tanggal Jatuh Tempo</label>
					<div class="relative">
						<input
							type="number"
							id="iuran_jatuh_tempo"
							name="iuran_jatuh_tempo"
							bind:value={jatuh_tempo}
							min="1"
							max="28"
							class="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
							required
						/>
						<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
							<i class="fa-solid fa-calendar-day"></i>
						</div>
					</div>
					<p class="mt-1 text-xs text-gray-500">Tanggal jatuh tempo pembayaran iuran (1-28)</p>
				</div>
				<div>
					<label for="iuran_nominal_penuh" class="block text-sm font-medium text-gray-700 mb-2">Nominal Iuran Penuh</label>
					<div class="relative">
						<span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">Rp</span>
						<input
							type="number"
							id="iuran_nominal_penuh"
							name="iuran_nominal_penuh"
							bind:value={nominal_penuh}
							min="0"
							step="1000"
							class="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
							required
						/>
					</div>
					<p class="mt-1 text-xs text-gray-500">Untuk keluarga penghuni (keamanan + kematian + sampah + lampu)</p>
				</div>
				<div>
					<label for="iuran_nominal_keamanan" class="block text-sm font-medium text-gray-700 mb-2">Nominal Iuran Keamanan</label>
					<div class="relative">
						<span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">Rp</span>
						<input
							type="number"
							id="iuran_nominal_keamanan"
							name="iuran_nominal_keamanan"
							bind:value={nominal_keamanan}
							min="0"
							step="1000"
							class="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
							required
						/>
					</div>
					<p class="mt-1 text-xs text-gray-500">Untuk pemilik rumah kosong (hanya keamanan)</p>
				</div>
			</div>
			<div class="flex justify-end pt-4 border-t border-gray-100">
				<button
					type="submit"
					disabled={saving}
					class="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if saving}
						<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...
					{:else}
						<i class="fa-solid fa-save mr-2"></i> Simpan Pengaturan
					{/if}
				</button>
			</div>
		</form>
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