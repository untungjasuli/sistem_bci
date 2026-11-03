<script>
	import { page } from '$app/state';

	let { data } = $props();

	let userData = $derived(data?.userData);
	let user = $derived(data?.user);
	let toast = $state(null);

	let formName = $state(userData?.name || '');
	let formCurrentPassword = $state('');
	let formNewPassword = $state('');
	let formConfirmPassword = $state('');
	let showPassword = $state(false);

	function showToast(type, message) {
		toast = { type, message };
		setTimeout(() => { toast = null; }, 5000);
	}

	if (data?.success) showToast('success', data.success);
	if (data?.error) showToast('error', data.error);

	async function handleSubmit(action, formData) {
		try {
			const res = await fetch(`?/${action}`, { method: 'POST', body: formData, credentials: 'include' });
			const result = await res.json();

			let actionResult = result;
			if (result.data && typeof result.data === 'string') {
				try {
					const parsed = JSON.parse(result.data);
					if (Array.isArray(parsed) && parsed.length >= 2) {
						if (parsed[0]?.error) actionResult = { error: parsed[1] };
						else if (parsed[0]?.success) actionResult = { success: parsed[1] };
					} else if (typeof parsed === 'object') actionResult = parsed;
				} catch {}
			}

			if (!res.ok || actionResult.error) {
				showToast('error', actionResult.error || 'Gagal menyimpan');
				return;
			}

			showToast('success', actionResult.success || 'Berhasil disimpan');
			formCurrentPassword = '';
			formNewPassword = '';
			formConfirmPassword = '';
		} catch (e) {
			console.error('Save error:', e);
			showToast('error', 'Gagal menyimpan');
		}
	}

	function handleUpdateProfile(e) {
		e.preventDefault();
		const formData = new FormData();
		formData.append('name', formName);
		formData.append('currentPassword', formCurrentPassword);
		formData.append('newPassword', formNewPassword);
		formData.append('confirmPassword', formConfirmPassword);
		handleSubmit('updateProfile', formData);
	}

	function getRoleName(role) {
		const roles = {
			'admin': 'Administrator',
			'bendahara': 'Bendahara',
			'sekretaris': 'Sekretaris',
			'petugas': 'Petugas'
		};
		return roles[role] || role;
	}

	function getRoleBadge(role) {
		const badges = {
			'admin': 'bg-purple-100 text-purple-700',
			'bendahara': 'bg-green-100 text-green-700',
			'sekretaris': 'bg-blue-100 text-blue-700',
			'petugas': 'bg-orange-100 text-orange-700'
		};
		return badges[role] || 'bg-gray-100 text-gray-700';
	}
</script>

{#if toast}
	<div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2"
		class:bg-green-50={toast.type === 'success'}
		class:text-green-700={toast.type === 'success'}
		class:border-green-200={toast.type === 'success'}
		class:bg-red-50={toast.type === 'error'}
		class:text-red-700={toast.type === 'error'}
	>
		{#if toast.type === 'success'}<i class="fa-solid fa-circle-check"></i>
		{:else}<i class="fa-solid fa-circle-exclamation"></i>{/if}
		<span>{toast.message}</span>
	</div>
{/if}

<div class="px-4 sm:px-6 lg:px-8 py-8 max-w-2xl mx-auto">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900">Profil Saya</h1>
		<p class="text-gray-500 text-sm">Kelola informasi akun dan password Anda</p>
	</div>

	<!-- User Info Card -->
	<div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
		<div class="flex items-center gap-4">
			<div class="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
				{userData?.name?.charAt(0)?.toUpperCase() || 'U'}
			</div>
			<div>
				<h2 class="text-xl font-bold text-gray-900">{userData?.name || '-'}</h2>
				<p class="text-gray-500">@{userData?.username || '-'}</p>
				<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 {getRoleBadge(userData?.role)}">
					{getRoleName(userData?.role)}
				</span>
			</div>
		</div>
		<div class="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
			<div>
				<p class="text-gray-500">Dibuat pada</p>
				<p class="font-medium">{userData?.created_at ? new Date(userData.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}</p>
			</div>
			<div>
				<p class="text-gray-500">ID User</p>
				<p class="font-medium font-mono">#{userData?.id || '-'}</p>
			</div>
		</div>
	</div>

	<!-- Update Profile Form -->
	<div class="bg-white rounded-lg border border-gray-200 p-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Informasi Akun</h3>
		<form onsubmit={handleUpdateProfile} class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap <span class="text-red-500">*</span></label>
				<input
					type="text"
					bind:value={formName}
					required
					class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors"
				/>
			</div>

			<div class="border-t border-gray-200 pt-4">
				<h4 class="text-sm font-medium text-gray-700 mb-3">Ubah Password (opsional)</h4>
				<p class="text-xs text-gray-500 mb-3">Isi hanya jika ingin mengubah password. Kosongkan untuk mempertahankan password lama.</p>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Password Lama</label>
						<input
							type={showPassword ? 'text' : 'password'}
							bind:value={formCurrentPassword}
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors"
							placeholder="Masukkan password saat ini"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
						<input
							type={showPassword ? 'text' : 'password'}
							bind:value={formNewPassword}
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors"
							placeholder="Minimal 6 karakter"
						/>
					</div>
				</div>
				<div class="mt-4">
					<label class="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
					<input
						type={showPassword ? 'text' : 'password'}
						bind:value={formConfirmPassword}
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors"
						placeholder="Ulangi password baru"
					/>
				</div>

				<div class="flex items-center gap-2 mt-2">
					<input type="checkbox" bind:checked={showPassword} id="showPassword" class="text-blue-600 focus:ring-green-500 rounded" />
					<label for="showPassword" class="text-sm text-gray-700 cursor-pointer">Tampilkan password</label>
				</div>
			</div>

			<div class="flex justify-end pt-4 border-t border-gray-200">
				<button type="submit" class="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2">
					<i class="fa-solid fa-save"></i> Simpan Perubahan
				</button>
			</div>
		</form>
	</div>
</div>