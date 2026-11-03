<script>
	import { page } from '$app/state';

	let { data } = $props();

	let users = $derived(data?.users || []);
	let toast = $state(null);

	// Modal state
	let showModal = $state(false);
	let isEditing = $state(false);
	let editingUser = $state(null);

	// Form state
	let formUsername = $state('');
	let formName = $state('');
	let formPassword = $state('');
	let formRole = $state('petugas');

	function showToast(type, message) {
		toast = { type, message };
		setTimeout(() => { toast = null; }, 5000);
	}

	if (data?.success) showToast('success', data.success);
	if (data?.error) showToast('error', data.error);

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

	function openAddModal() {
		isEditing = false;
		editingUser = null;
		formUsername = '';
		formName = '';
		formPassword = '';
		formRole = 'petugas';
		showModal = true;
	}

	function openEditModal(user) {
		isEditing = true;
		editingUser = user;
		formUsername = user.username;
		formName = user.name;
		formPassword = '';
		formRole = user.role;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		isEditing = false;
		editingUser = null;
		formUsername = '';
		formName = '';
		formPassword = '';
		formRole = 'petugas';
	}

	async function handleModalSubmit(action, formData) {
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
			closeModal();
			await page.refresh();
		} catch (e) {
			console.error('Save error:', e);
			showToast('error', 'Gagal menyimpan');
		}
	}

	async function handleModalDelete(formData) {
		try {
			const res = await fetch('?/delete', { method: 'POST', body: formData, credentials: 'include' });
			const result = await res.json();

			if (!res.ok || result.error) {
				showToast('error', result.error || 'Gagal menghapus');
				return;
			}

			showToast('success', result.success || 'Berhasil dihapus');
			closeModal();
			await page.refresh();
		} catch (e) {
			console.error('Delete error:', e);
			showToast('error', 'Gagal menghapus');
		}
	}

	function handleSubmit(e) {
		e.preventDefault();
		if (!formUsername || !formName || !formRole) {
			alert('Username, Nama, dan Role wajib diisi');
			return;
		}
		if (!isEditing && !formPassword) {
			alert('Password wajib diisi untuk pengguna baru');
			return;
		}
		if (formPassword && formPassword.length < 6) {
			alert('Password minimal 6 karakter');
			return;
		}

		const formData = new FormData();
		if (isEditing) formData.append('id', editingUser.id);
		formData.append('username', formUsername);
		formData.append('name', formName);
		formData.append('role', formRole);
		formData.append('password', formPassword);

		const action = isEditing ? 'update' : 'create';
		handleModalSubmit(action, formData);
	}

	function handleDelete(user) {
		if (!confirm(`Yakin ingin menghapus pengguna "${user.name}" (${user.username})?`)) return;

		const formData = new FormData();
		formData.append('id', user.id);
		handleModalDelete(formData);
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

<div class="px-4 sm:px-6 lg:px-8 py-8">
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Manajemen Pengguna</h1>
			<p class="text-gray-500 text-sm">Kelola akun pengguna dan hak akses</p>
		</div>
		<button onclick={openAddModal} class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
			<i class="fa-solid fa-plus"></i> Tambah Pengguna
		</button>
	</div>

	{#if users.length > 0}
		<div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
			<table class="w-full text-left border-collapse min-w-full">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Lengkap</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Dibuat</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each users as user, index}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
							<td class="px-6 py-4 text-sm font-mono text-gray-900">{user.username}</td>
							<td class="px-6 py-4 text-sm text-gray-900 font-medium">{user.name}</td>
							<td class="px-6 py-4">
								<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full {getRoleBadge(user.role)}">
									{getRoleName(user.role)}
								</span>
							</td>
							<td class="px-6 py-4 text-sm text-gray-600">
								{user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
							</td>
							<td class="px-6 py-4 text-right">
								<div class="flex items-center justify-end gap-1">
									<button onclick={() => openEditModal(user)} class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><i class="fa-regular fa-pen-to-square text-lg"></i></button>
									{#if user.id !== data?.user?.id}
										<button type="button" onclick={() => handleDelete(user)} class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus"><i class="fa-regular fa-trash-can text-lg"></i></button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
			<i class="fa-solid fa-users text-gray-300 text-4xl mb-4"></i>
			<h3 class="text-lg font-medium text-gray-900 mb-2">Belum ada pengguna</h3>
			<p class="text-gray-500">Klik tombol "Tambah Pengguna" untuk memulai</p>
		</div>
	{/if}

	<!-- Modal -->
	{#if showModal}
		<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={closeModal}>
			<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-200" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center justify-between mb-6">
					<h3 class="text-lg font-bold text-gray-900">{isEditing ? 'Edit' : 'Tambah'} Pengguna</h3>
					<button onclick={closeModal} class="text-gray-400 hover:text-gray-600 transition-colors"><i class="fa-solid fa-times text-xl"></i></button>
				</div>

				<form onsubmit={handleSubmit} class="space-y-4">
					{#if !isEditing}
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Username <span class="text-red-500">*</span></label>
							<input
								type="text"
								bind:value={formUsername}
								required
								class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
								placeholder="Username unik"
							/>
							<p class="text-xs text-gray-500 mt-1">Tidak bisa diubah setelah dibuat</p>
						</div>
					{:else}
						<input type="hidden" bind:value={formUsername} />
						<div class="text-sm text-gray-500">
							<span class="font-medium">Username: </span>{formUsername}
						</div>
					{/if}

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap <span class="text-red-500">*</span></label>
						<input
							type="text"
							bind:value={formName}
							required
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
							placeholder="Nama lengkap pengguna"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Role <span class="text-red-500">*</span></label>
						<select bind:value={formRole} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
							<option value="admin">Administrator (akses penuh)</option>
							<option value="bendahara">Bendahara (keuangan, tagihan, iuran)</option>
							<option value="sekretaris">Sekretaris (surat, kependudukan, data penduduk)</option>
							<option value="petugas">Petugas (hanya iuran bulanan)</option>
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">
							Password {isEditing ? '(kosongkan jika tidak diubah)' : '<span class="text-red-500">*</span>'}
						</label>
						<input
							type="password"
							bind:value={formPassword}
							required={!isEditing}
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
							placeholder={isEditing ? 'Biarkan kosong untuk mempertahankan password lama' : 'Minimal 6 karakter'}
						/>
						<p class="text-xs text-gray-500 mt-1">Minimal 6 karakter</p>
					</div>

					<div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
						<button type="button" onclick={closeModal} class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Batal</button>
						<button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2">
							<i class="fa-solid fa-save mr-2"></i> {isEditing ? 'Update' : 'Simpan'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>