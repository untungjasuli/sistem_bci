<script>
	let { data } = $props();

	let user = $derived(data?.user);
	let activeTab = $state('profile'); // 'profile' | 'security'
	let toast = $state(null);

	// Initialize with user data from props
	let editName = $state(user?.name || '');
	let editUsername = $state(user?.username || '');
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');

	let serverError = $state('');
	let serverSuccess = $state('');

	// Update state when user data changes (e.g., after successful update)
	$effect(() => {
		if (user) {
			editName = user.name || '';
			editUsername = user.username || '';
		}
	});

	function showToast(type, message) {
		toast = { type, message };
		setTimeout(() => {
			toast = null;
		}, 5000);
	}

	$effect(() => {
		if (user) {
			editName = user.name || '';
			editUsername = user.username || '';
		}
	});

	$effect(() => {
		if (data?.success) showToast('success', data.success);
		if (data?.error) showToast('error', data.error);
	});

	// Handle form submit for profile update
	async function handleProfileUpdate(e) {
		e.preventDefault();
		serverError = '';
		serverSuccess = '';

		if (!editName.trim() || !editUsername.trim()) {
			serverError = 'Nama dan username wajib diisi';
			return;
		}

		const formData = new FormData();
		formData.append('name', editName.trim());
		formData.append('username', editUsername.trim());

		try {
			const res = await fetch('?/updateProfile', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();

			// Parse SvelteKit form action response
			let errorMessage = '';
			let successMessage = '';
			if (result.data) {
				try {
					const parsed = JSON.parse(result.data);
					if (Array.isArray(parsed) && parsed[1]) {
						if (parsed[0]?.error) {
							errorMessage = parsed[1];
						} else if (parsed[0]?.success) {
							successMessage = parsed[1];
						}
					}
				} catch {}
			}

			const hasError = !res.ok || result.error || errorMessage;
			if (hasError) {
				serverError = errorMessage || result.error || 'Gagal memperbarui profil';
				return;
			}

			serverSuccess = successMessage || result.success || 'Profil berhasil diperbarui';
			showToast('success', serverSuccess);
		} catch (e) {
			console.error('Update profile error:', e);
			serverError = 'Gagal memperbarui profil';
		}
	}

	// Handle form submit for password change
	async function handlePasswordChange(e) {
		e.preventDefault();
		serverError = '';
		serverSuccess = '';

		if (!currentPassword || !newPassword || !confirmPassword) {
			serverError = 'Semua field password wajib diisi';
			return;
		}
		if (newPassword.length < 6) {
			serverError = 'Password baru minimal 6 karakter';
			return;
		}
		if (newPassword !== confirmPassword) {
			serverError = 'Konfirmasi password tidak cocok';
			return;
		}

		const formData = new FormData();
		formData.append('currentPassword', currentPassword);
		formData.append('newPassword', newPassword);
		formData.append('confirmPassword', confirmPassword);

		try {
			const res = await fetch('?/changePassword', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();

			// Parse SvelteKit form action response
			let errorMessage = '';
			let successMessage = '';
			if (result.data) {
				try {
					const parsed = JSON.parse(result.data);
					if (Array.isArray(parsed) && parsed[1]) {
						if (parsed[0]?.error) {
							errorMessage = parsed[1];
						} else if (parsed[0]?.success) {
							successMessage = parsed[1];
						}
					}
				} catch {}
			}

			const hasError = !res.ok || result.error || errorMessage;
			if (hasError) {
				serverError = errorMessage || result.error || 'Gagal mengubah password';
				return;
			}

			serverSuccess = successMessage || result.success || 'Password berhasil diubah';
			showToast('success', serverSuccess);
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		} catch (e) {
			console.error('Change password error:', e);
			serverError = 'Gagal mengubah password';
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
		<h1 class="text-2xl font-bold text-gray-900">Profil Saya</h1>
		<p class="text-gray-500 text-sm">Kelola informasi akun dan keamanan</p>
	</div>

	<!-- Tabs -->
	<div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
		<div class="border-b border-gray-200">
			<nav class="flex gap-0 -mb-px" aria-label="Tabs">
				<button
					onclick={() => activeTab = 'profile'}
					class={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
						activeTab === 'profile'
							? 'border-blue-600 text-blue-600'
							: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
					}`}
				>
					<i class="fa-solid fa-user mr-2"></i> Profil
				</button>
				<button
					onclick={() => activeTab = 'security'}
					class={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
						activeTab === 'security'
							? 'border-blue-600 text-blue-600'
							: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
					}`}
				>
					<i class="fa-solid fa-shield mr-2"></i> Keamanan
				</button>
			</nav>
		</div>

		<div class="p-6">
			{#if activeTab === 'profile'}
				<!-- Profil Tab -->
				<form onsubmit={handleProfileUpdate} class="space-y-6 max-w-md">
					<div>
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Informasi Akun</h3>
					</div>

					<div>
						<label for="username" class="block text-sm font-medium text-gray-700 mb-1">Username</label>
						<input
							id="username"
							type="text"
							name="username"
							bind:value={editUsername}
							required
							class="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						/>
					</div>

					<div>
						<label for="name" class="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
						<input
							id="name"
							type="text"
							name="name"
							bind:value={editName}
							required
							class="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						/>
					</div>

					<div class="bg-gray-50 p-4 rounded-lg">
						<p class="text-sm text-gray-600">
							<i class="fa-solid fa-info-circle mr-1"></i>
							Role: <span class="font-medium capitalize">{user?.role || 'admin'}</span> • 
							Bergabung: <span class="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}</span>
						</p>
					</div>

					{#if serverError}
						<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
							{serverError}
						</div>
					{/if}
					{#if serverSuccess && activeTab === 'profile'}
						<div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
							{serverSuccess}
						</div>
					{/if}

					<div class="flex justify-end pt-4 border-t border-gray-100">
						<button type="submit" class="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
							<i class="fa-solid fa-save mr-2"></i> Simpan Perubahan
						</button>
					</div>
				</form>

			{:else}
				<!-- Keamanan Tab -->
				<form onsubmit={handlePasswordChange} class="space-y-6 max-w-md">
					<div>
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Ubah Password</h3>
						<p class="text-sm text-gray-500">Masukkan password lama dan password baru (minimal 6 karakter)</p>
					</div>

					<div>
						<label for="current_password" class="block text-sm font-medium text-gray-700 mb-1">Password Saat Ini</label>
						<input
							id="current_password"
							type="password"
							name="currentPassword"
							bind:value={currentPassword}
							required
							autocomplete="current-password"
							class="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						/>
					</div>

					<div>
						<label for="new_password" class="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
						<input
							id="new_password"
							type="password"
							name="newPassword"
							bind:value={newPassword}
							required
							minlength="6"
							autocomplete="new-password"
							class="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						/>
					</div>

					<div>
						<label for="confirm_password" class="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
						<input
							id="confirm_password"
							type="password"
							name="confirmPassword"
							bind:value={confirmPassword}
							required
							autocomplete="new-password"
							class="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						/>
					</div>

					{#if serverError}
						<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
							{serverError}
						</div>
					{/if}
					{#if serverSuccess && activeTab === 'security'}
						<div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
							{serverSuccess}
						</div>
					{/if}

					<div class="flex justify-end pt-4 border-t border-gray-100">
						<button type="submit" class="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
							<i class="fa-solid fa-key mr-2"></i> Ubah Password
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
</div>