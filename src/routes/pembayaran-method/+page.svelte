<script>
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';

	let { data } = $props();

	let methods = $derived(data?.methods || []);
	let kasAccounts = $derived(data?.kasAccounts || []);
	let pagination = $derived(data?.pagination || {
		page: 1,
		itemsPerPage: 10,
		total: 0,
		totalPages: 1,
		search: '',
		sortBy: 'kode',
		sort: 'asc'
	});
	let itemsPerPageOptions = $derived(data?.itemsPerPageOptions || [10, 25, 50, 100]);

	let showModal = $state(false);
	let editMode = $state(false);
	let currentMethod = $state({ id: '', kode: 'cash', nama: '', default_kas_account_id: '', is_active: true });
	let modalError = $state('');
	let modalFieldErrors = $state({});

	let openDropdownIndex = $state(-1);

	let toast = $state(null);

	function showToast(type, message) {
		// Extract message from object if needed
		let msg = message;
		if (typeof message === 'object' && message !== null) {
			msg = message.message || message.error || message.success || message.msg || JSON.stringify(message);
		}
		// Fallback if message is empty/undefined
		if (!msg) msg = type === 'success' ? 'Berhasil' : 'Terjadi kesalahan';
		
		toast = { type, message: msg };
		setTimeout(() => { toast = null; }, 5000);
	}

	$effect(() => {
		// Handle data from form action responses (after page reload)
		if (data?.success) {
			const msg = typeof data.success === 'string' ? data.success : 
				(data.success?.message || data.success?.success || data.success?.msg || JSON.stringify(data.success));
			showToast('success', msg);
		}
		if (data?.error) {
			const msg = typeof data.error === 'string' ? data.error : 
				(data.error?.message || data.error?.error || data.error?.msg || JSON.stringify(data.error));
			showToast('error', msg);
		}
	});

	function getKodeLabel(kode) {
		const labels = { cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer Bank' };
		return labels[kode] || kode;
	}

	function getKodeIcon(kode) {
		const icons = { cash: 'fa-money-bill-wave', qris: 'fa-qrcode', transfer: 'fa-money-bill-transfer' };
		return icons[kode] || 'fa-question';
	}

	function openAddModal() {
		editMode = false;
		currentMethod = { id: '', kode: 'cash', nama: '', default_kas_account_id: '', is_active: true };
		modalError = '';
		modalFieldErrors = {};
		showModal = true;
	}

	function openEditModal(m) {
		editMode = true;
		currentMethod = { ...m };
		modalError = '';
		modalFieldErrors = {};
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		currentMethod = { id: '', kode: 'cash', nama: '', default_kas_account_id: '', is_active: true };
		modalError = '';
		modalFieldErrors = {};
	}

	function validateField(field, value) {
		const errors = {};
		if (field === 'kode' && !value) errors.kode = 'Kode wajib dipilih';
		if (field === 'nama' && !value.trim()) errors.nama = 'Nama wajib diisi';
		if (field === 'default_kas_account_id' && !value) errors.default_kas_account_id = 'Rekening Kas wajib dipilih';
		modalFieldErrors = { ...modalFieldErrors, ...errors };
		return Object.keys(errors).length === 0;
	}

	async function handleSubmit(e) {
		e.preventDefault();
		modalError = '';
		modalFieldErrors = {};

		let valid = true;
		if (!currentMethod.kode) { modalFieldErrors.kode = 'Kode wajib dipilih'; valid = false; }
		if (!currentMethod.nama.trim()) { modalFieldErrors.nama = 'Nama wajib diisi'; valid = false; }
		if (!currentMethod.default_kas_account_id) { modalFieldErrors.default_kas_account_id = 'Rekening Kas wajib dipilih'; valid = false; }

		if (!valid) return;

		const formData = new FormData();
		formData.append('kode', currentMethod.kode);
		formData.append('nama', currentMethod.nama.trim());
		formData.append('default_kas_account_id', currentMethod.default_kas_account_id);
		if (editMode) {
			formData.append('id', currentMethod.id);
			formData.append('is_active', currentMethod.is_active ? 'on' : '');
		}

		const action = editMode ? 'update' : 'create';

		try {
			const res = await fetch(`?/${action}`, {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();

			// Parse SvelteKit form action response format (fail() returns data as JSON string array)
			let actionResult = result;
			if (result.data && typeof result.data === 'string') {
				try {
					const parsed = JSON.parse(result.data);
					if (Array.isArray(parsed) && parsed.length >= 2) {
						if (parsed[0]?.error) {
							actionResult = { error: parsed[1] };
						} else if (parsed[0]?.success) {
							actionResult = { success: parsed[1] };
						}
					} else if (typeof parsed === 'object') {
						actionResult = parsed;
					}
				} catch {}
			}

			if (!res.ok || actionResult.error) {
				if (actionResult.field_errors) {
					modalFieldErrors = actionResult.field_errors;
				} else {
					const serverError = actionResult.error || 'Gagal menyimpan';
					modalError = `Gagal menyimpan - ${serverError}`;
				}
				return;
			}

			showToast('success', actionResult.success);
			closeModal();
			await invalidateAll();
		} catch (err) {
			console.error('Submit error:', err);
			modalError = 'Gagal menyimpan data';
		}
	}

	async function handleDelete(id, kode) {
		if (!confirm(`Yakin hapus metode pembayaran "${getKodeLabel(kode)}"?`)) return;

		const formData = new FormData();
		formData.append('id', id);

		try {
			const res = await fetch('?/delete', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();

			// Parse SvelteKit form action response format (fail() returns data as JSON string array)
			let actionResult = result;
			if (result.data && typeof result.data === 'string') {
				try {
					const parsed = JSON.parse(result.data);
					if (Array.isArray(parsed) && parsed.length >= 2) {
						if (parsed[0]?.error) {
							actionResult = { error: parsed[1] };
						} else if (parsed[0]?.success) {
							actionResult = { success: parsed[1] };
						}
					} else if (typeof parsed === 'object') {
						actionResult = parsed;
					}
				} catch {}
			}

			if (!res.ok || actionResult.error) {
				const serverError = actionResult.error || 'Gagal hapus';
				showToast('error', `Gagal hapus - ${serverError}`);
				return;
			}

			showToast('success', actionResult.success);
			await invalidateAll();
		} catch (err) {
			console.error('Delete error:', err);
			showToast('error', 'Gagal hapus data');
		}
	}

	function updateUrl() {
		const params = new URLSearchParams();
		params.set('page', pagination.page.toString());
		params.set('itemsPerPage', pagination.itemsPerPage.toString());
		if (pagination.search) params.set('search', pagination.search);
		if (pagination.sortBy !== 'kode') params.set('sortBy', pagination.sortBy);
		if (pagination.sort !== 'asc') params.set('sort', pagination.sort);
		goto(`?${params.toString()}`);
	}

	function handleSearch(e) {
		e.preventDefault();
		pagination.page = 1;
		pagination.search = e.currentTarget.searchInput.value;
		updateUrl();
	}

	function changeSort(newSortBy) {
		if (pagination.sortBy === newSortBy) {
			pagination.sort = pagination.sort === 'asc' ? 'desc' : 'asc';
		} else {
			pagination.sortBy = newSortBy;
			pagination.sort = 'asc';
		}
		pagination.page = 1;
		updateUrl();
	}

	function changePage(newPage) {
		if (newPage < 1 || newPage > pagination.totalPages) return;
		pagination.page = newPage;
		updateUrl();
	}

	function onItemsPerPageChange() {
		pagination.page = 1;
		updateUrl();
	}

	function getSortIcon(col) {
		if (pagination.sortBy !== col) return 'fa-sort';
		return pagination.sort === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
	}

	// Close dropdown saat klik di luar
	$effect(() => {
		function handleClickOutside(e) {
			if (openDropdownIndex !== -1 && !e.target.closest('[data-dropdown-menu]')) {
				openDropdownIndex = -1;
			}
		}
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

{#if toast}
	<div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2"
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
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Metode Pembayaran</h1>
			<p class="text-gray-500 text-sm">Mapping metode pembayaran ke rekening kas</p>
		</div>
		<div class="flex items-center gap-3 w-full lg:w-auto">
			<form onsubmit={handleSearch} class="relative flex items-center flex-1 min-w-0">
				<label class="sr-only" for="search-method">Cari Kode / Nama / Kas</label>
				<div class="relative w-full">
					<input
						type="text"
						id="search-method"
						name="searchInput"
						value={pagination.search}
						placeholder="Kode / Nama / Kas..."
						class="w-full pl-10 pr-12 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						oninput={(e) => (pagination.search = e.currentTarget.value)}
					/>
					<i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
					{#if pagination.search}
						<button
							type="button"
							onclick={() => { pagination.search = ''; handleSearch(new Event('submit')); }}
							class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
							title="Hapus pencarian"
						>
							<i class="fa-solid fa-times text-xs"></i>
						</button>
					{:else}
						<button
							type="submit"
							class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
							title="Cari"
						>
							<i class="fa-solid fa-magnifying-glass text-xs"></i>
						</button>
					{/if}
				</div>
			</form>
			<button
				onclick={openAddModal}
				class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex-shrink-0"
				aria-label="Tambah Metode"
			>
				<i class="fa-solid fa-plus"></i>
				<span class="hidden lg:inline">Tambah Metode</span>
			</button>
		</div>
	</div>

	<!-- Table -->
	{#if methods.length > 0}
		<div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
			<table class="w-full text-left border-collapse min-w-full">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onclick={() => changeSort('kode')}>
							Kode <i class="fa-solid {getSortIcon('kode')} ml-1 text-xs"></i>
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onclick={() => changeSort('nama')}>
							Nama <i class="fa-solid {getSortIcon('nama')} ml-1 text-xs"></i>
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Rekening Kas</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onclick={() => changeSort('is_active')}>
							Status <i class="fa-solid {getSortIcon('is_active')} ml-1 text-xs"></i>
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each methods as m, index}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-6 py-4 text-sm text-gray-600">{(pagination.page - 1) * pagination.itemsPerPage + index + 1}</td>
							<td class="px-6 py-4 text-sm text-gray-900 font-medium">
								<span class="inline-flex items-center gap-2">
									<i class="fa-solid {getKodeIcon(m.kode)} text-blue-600"></i>
									{getKodeLabel(m.kode)} ({m.kode.toUpperCase()})
								</span>
							</td>
							<td class="px-6 py-4 text-sm text-gray-600">{m.nama}</td>
							<td class="px-6 py-4 text-sm text-gray-600">
								{#if m.kas_nama}
									<span class="font-mono">{m.kas_kode}</span> - {m.kas_nama}
									<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{m.kas_tipe}</span>
								{:else}
									<span class="text-gray-400">-</span>
								{/if}
							</td>
							<td class="px-6 py-4 text-sm">
								{#if m.is_active}
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktif</span>
								{:else}
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Nonaktif</span>
								{/if}
							</td>
							<td class="px-6 py-4 text-right">
								<div class="flex items-center justify-end gap-1 lg:gap-2">
									<!-- Desktop: Horizontal buttons -->
									<div class="hidden lg:flex items-center gap-1">
										<button
											onclick={() => openEditModal(m)}
											class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
											title="Edit"
											aria-label="Edit"
										>
											<i class="fa-regular fa-pen-to-square text-lg"></i>
										</button>
										<button
											type="button"
											onclick={() => handleDelete(m.id, m.kode)}
											class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
											title="Hapus"
											aria-label="Hapus"
										>
											<i class="fa-regular fa-trash-can text-lg"></i>
										</button>
									</div>

									<!-- Mobile: Dropdown -->
									<div class="lg:hidden relative" data-dropdown-menu>
										<button
											type="button"
											onclick={() => openDropdownIndex = openDropdownIndex === index ? -1 : index}
											class="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
											aria-expanded={openDropdownIndex === index}
											aria-haspopup="true"
										>
											<i class="fa-solid fa-ellipsis-v"></i>
										</button>
										{#if openDropdownIndex === index}
											<div class="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg animate-in fade-in zoom-in-95 z-50" role="menu">
												<button
													onclick={() => { openEditModal(m); openDropdownIndex = -1; }}
													class="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 rounded-t-lg flex items-center gap-2"
													role="menuitem"
												>
													<i class="fa-regular fa-pen-to-square text-blue-600 w-4"></i>
													<span class="text-blue-600">Edit</span>
												</button>
												<button
													type="button"
													onclick={() => { handleDelete(m.id, m.kode); openDropdownIndex = -1; }}
													class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg flex items-center gap-2"
													role="menuitem"
												>
													<i class="fa-regular fa-trash-can w-4"></i>
													<span class="text-red-600">Hapus</span>
												</button>
											</div>
										{/if}
									</div>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		<div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-4 py-3 bg-white border border-gray-200 rounded-lg">
			<div class="flex items-center gap-3">
				<label for="items-per-page" class="text-sm text-gray-700">Tampilkan</label>
				<select
					id="items-per-page"
					bind:value={pagination.itemsPerPage}
					onchange={onItemsPerPageChange}
					class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
				>
					{#each itemsPerPageOptions as opt}
						<option value={opt}>{opt} per halaman</option>
					{/each}
				</select>
			</div>
			<div class="flex items-center gap-2">
				<span class="text-sm text-gray-700">
					Halaman {pagination.page} dari {pagination.totalPages} (Total: {pagination.total} data)
				</span>
				<button
					onclick={() => changePage(pagination.page - 1)}
					disabled={pagination.page === 1}
					class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					<i class="fa-solid fa-chevron-left"></i>
				</button>
				<button
					onclick={() => changePage(pagination.page + 1)}
					disabled={pagination.page === pagination.totalPages}
					class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					<i class="fa-solid fa-chevron-right"></i>
				</button>
			</div>
		</div>
	{:else}
		<div class="bg-white rounded-lg border border-gray-200 p-12 text-center">
			<i class="fa-solid fa-credit-card text-4xl text-gray-300 mb-4"></i>
			<h3 class="text-lg font-medium text-gray-900 mb-2">Tidak ada metode pembayaran</h3>
			<p class="text-gray-500 mb-4">Belum ada metode pembayaran yang terdaftar.</p>
			<button onclick={openAddModal} class="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
				<i class="fa-solid fa-plus mr-2"></i> Tambah Metode Pertama
			</button>
		</div>
	{/if}

	<!-- Modal Add/Edit -->
	{#if showModal}
		<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onclick={closeModal} role="button" aria-label="Tutup modal"></div>
		<div class="fixed inset-0 z-50 flex items-center justify-center">
			<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-200" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center justify-between mb-6">
					<h3 class="text-lg font-bold text-gray-900">{editMode ? 'Edit' : 'Tambah'} Metode Pembayaran</h3>
					<button onclick={closeModal} class="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Tutup">
						<i class="fa-solid fa-times text-xl"></i>
					</button>
				</div>

				<form onsubmit={handleSubmit} class="space-y-4">
					{#if modalError}
						<div class="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
							<i class="fa-solid fa-circle-exclamation mr-1"></i> {modalError}
						</div>
					{/if}

					<div>
						<label for="kode" class="block text-sm font-medium text-gray-700 mb-2">Kode <span class="text-red-500">*</span></label>
						<select
							id="kode"
							bind:value={currentMethod.kode}
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors {modalFieldErrors.kode ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}"
							onblur={() => validateField('kode', currentMethod.kode)}
							disabled={editMode}
						>
							<option value="cash">cash - Tunai</option>
							<option value="qris">qris - QRIS</option>
							<option value="transfer">transfer - Transfer Bank</option>
						</select>
						{#if modalFieldErrors.kode}
							<p class="mt-1 text-sm text-red-600">{modalFieldErrors.kode}</p>
						{/if}
						{#if editMode}
							<p class="mt-1 text-xs text-gray-500">Kode tidak bisa diubah saat edit</p>
						{/if}
					</div>

					<div>
						<label for="nama" class="block text-sm font-medium text-gray-700 mb-2">Nama <span class="text-red-500">*</span></label>
						<input
							type="text"
							id="nama"
							bind:value={currentMethod.nama}
							placeholder="Nama metode pembayaran"
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors {modalFieldErrors.nama ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}"
							onblur={() => validateField('nama', currentMethod.nama)}
						/>
						{#if modalFieldErrors.nama}
							<p class="mt-1 text-sm text-red-600">{modalFieldErrors.nama}</p>
						{/if}
					</div>

					<div>
						<label for="default_kas_account_id" class="block text-sm font-medium text-gray-700 mb-2">Rekening Kas Default <span class="text-red-500">*</span></label>
						<select
							id="default_kas_account_id"
							bind:value={currentMethod.default_kas_account_id}
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors {modalFieldErrors.default_kas_account_id ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}"
							onblur={() => validateField('default_kas_account_id', currentMethod.default_kas_account_id)}
						>
							<option value="">-- Pilih Rekening Kas --</option>
							{#each kasAccounts as ka}
								<option value={ka.id}>{ka.kode} - {ka.nama} ({ka.tipe})</option>
							{/each}
						</select>
						{#if modalFieldErrors.default_kas_account_id}
							<p class="mt-1 text-sm text-red-600">{modalFieldErrors.default_kas_account_id}</p>
						{/if}
					</div>

					{#if editMode}
						<div class="flex items-center">
							<input
								type="checkbox"
								id="is_active"
								bind:checked={currentMethod.is_active}
								class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
							/>
							<label for="is_active" class="ml-2 block text-sm text-gray-700">Aktif</label>
						</div>
					{/if}

					<div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
						<button type="button" onclick={closeModal} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
							Batal
						</button>
						<button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
							<i class="fa-solid fa-save mr-2"></i>{editMode ? 'Update' : 'Simpan'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>