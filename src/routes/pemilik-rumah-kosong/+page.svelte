<script>
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';

	let { data } = $props();

	let pemilik = $derived(data?.pemilik || []);
	let emptyBlocks = $derived(data?.emptyBlocks || []);
	let pagination = $derived(data?.pagination || {
		page: 1,
		itemsPerPage: 10,
		total: 0,
		totalPages: 1,
		search: '',
		sortBy: 'br.no_blok',
		sort: 'asc'
	});

	const itemsPerPageOptions = [10, 25, 50, 100];

	let showModal = $state(false);
	let editMode = $state(false);
	let currentPemilik = $state({ id: '', blok_rumah_id: '', nama: '', nik: '', no_hp: '', no_blok: '' });

	// Error state untuk validasi client-side per field
	let formErrors = $state({
		blok_rumah_id: '',
		nama: '',
		nik: '',
		no_hp: ''
	});

	// Error dari server (misal blok sudah punya pemilik, NIK duplikat)
	let serverError = $state('');

	let openDropdownIndex = $state(-1);

	let toast = $state(null);

	function showToast(type, message) {
		toast = { type, message };
		setTimeout(() => { toast = null; }, 5000);
	}

	$effect(() => {
		if (data?.success) showToast('success', data.success);
		if (data?.error) showToast('error', data.error);
	});

	// Bersihkan error server saat modal dibuka agar tidak muncul lagi saat dibuka ulang
	$effect(() => {
		if (showModal) {
			serverError = '';
			formErrors = {
				blok_rumah_id: '',
				nama: '',
				nik: '',
				no_hp: ''
			};
		}
	});

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function openAddModal() {
		editMode = false;
		currentPemilik = { id: '', blok_rumah_id: '', nama: '', nik: '', no_hp: '', no_blok: '' };
		showModal = true;
	}

	function openEditModal(p) {
		editMode = true;
		currentPemilik = { ...p };
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		currentPemilik = { id: '', blok_rumah_id: '', nama: '', nik: '', no_hp: '', no_blok: '' };
		formErrors = {
			blok_rumah_id: '',
			nama: '',
			nik: '',
			no_hp: ''
		};
		serverError = '';
	}

	function handleNikInput(e) {
		e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16);
		currentPemilik.nik = e.target.value;
	}

	function handleHpInput(e) {
		e.target.value = e.target.value.replace(/\D/g, '').slice(0, 13);
		currentPemilik.no_hp = e.target.value;
	}

	function validateForm() {
		const nikRegex = /^\d{16}$/;
		const hpRegex = /^\d{11,13}$/;

		let valid = true;

		// Reset errors
		formErrors.blok_rumah_id = '';
		formErrors.nama = '';
		formErrors.nik = '';
		formErrors.no_hp = '';

		if (!editMode && !currentPemilik.blok_rumah_id) {
			formErrors.blok_rumah_id = 'Blok Rumah wajib dipilih';
			valid = false;
		}

		if (!currentPemilik.nama) {
			formErrors.nama = 'Nama wajib diisi';
			valid = false;
		}

		if (currentPemilik.nik && !nikRegex.test(currentPemilik.nik)) {
			formErrors.nik = 'NIK harus 16 digit angka';
			valid = false;
		}

		if (!currentPemilik.no_hp) {
			formErrors.no_hp = 'Nomor HP wajib diisi';
			valid = false;
		} else if (!hpRegex.test(currentPemilik.no_hp)) {
			formErrors.no_hp = 'Nomor HP harus 11-13 digit angka';
			valid = false;
		}

		return valid;
	}

	async function handleSubmit(e) {
		e.preventDefault();

		if (!validateForm()) return;

		const formData = new FormData();
		formData.append('blok_rumah_id', currentPemilik.blok_rumah_id);
		formData.append('nama', currentPemilik.nama);
		if (currentPemilik.nik) {
			formData.append('nik', currentPemilik.nik);
		}
		formData.append('no_hp', currentPemilik.no_hp);

		if (editMode) {
			formData.append('id', currentPemilik.id);
		}

		const action = editMode ? 'update' : 'create';

		try {
			const res = await fetch(`?/${action}`, {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();

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
				serverError = errorMessage || result.error || 'Gagal menyimpan';
				return;
			}

			// Fallback message jika result.success undefined
			const msg = successMessage || result.success || (editMode ? 'Data berhasil diupdate' : 'Data berhasil disimpan');
			showToast('success', msg);
			closeModal();
			await invalidateAll();
		} catch (err) {
			console.error('Submit error:', err);
			serverError = 'Gagal menyimpan data';
		}
	}

	async function handleDelete(id, blok_rumah_id) {
		if (!confirm('Yakin hapus pemilik ini?')) return;

		const formData = new FormData();
		formData.append('id', id);
		formData.append('blok_rumah_id', blok_rumah_id);

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

			showToast('success', actionResult.success || 'Data berhasil dihapus');
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
		if (pagination.sortBy !== 'br.no_blok') params.set('sortBy', pagination.sortBy);
		if (pagination.sort !== 'asc') params.set('sort', pagination.sort);
		goto(`?${params.toString()}`);
	}

	function handleSearch(e) {
		e.preventDefault();
		pagination.page = 1;
		pagination.search = e.currentTarget.searchInput.value;
		updateUrl();
	}

	function clearSearch() {
		pagination.search = '';
		pagination.page = 1;
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
			<h1 class="text-2xl font-bold text-gray-900">Pemilik Rumah Kosong</h1>
			<p class="text-gray-500 text-sm">Kelola data pemilik rumah dengan status Kosong</p>
		</div>
		<div class="flex items-center gap-3 w-full lg:w-auto">
			<button
				onclick={openAddModal}
				class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex-shrink-0"
				aria-label="Tambah Pemilik"
			>
				<i class="fa-solid fa-plus"></i>
				<span class="hidden lg:inline">Tambah Pemilik</span>
			</button>
		</div>
	</div>

	<!-- Search & Filter Card (mirip Surat RT) -->
	<div class="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
		<form onsubmit={handleSearch} class="flex flex-col sm:flex-row gap-4">
			<div class="relative flex-1 min-w-0">
				<label class="sr-only">Cari Nama / NIK / HP / No Blok</label>
				<input type="text" name="searchInput" value={pagination.search} placeholder="Nama / NIK / HP / No Blok..."
					class="w-full pl-10 pr-12 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					oninput={(e) => pagination.search = e.currentTarget.value}
					enterkeyhint="go" />
				<i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
				{#if pagination.search}
					<button
						type="button"
						onclick={clearSearch}
						class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
						title="Hapus pencarian"
					>
						<i class="fa-solid fa-times text-xs"></i>
					</button>
				{/if}
			</div>
		</form>
	</div>

	<!-- Table -->
	{#if pemilik.length > 0}
		<div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
			<table class="w-full text-left border-collapse min-w-full">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onclick={() => changeSort('br.no_blok')}>
							No Blok <i class="fa-solid {getSortIcon('br.no_blok')} ml-1 text-xs"></i>
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onclick={() => changeSort('pr.nama')}>
							Nama <i class="fa-solid {getSortIcon('pr.nama')} ml-1 text-xs"></i>
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onclick={() => changeSort('pr.nik')}>
							NIK <i class="fa-solid {getSortIcon('pr.nik')} ml-1 text-xs"></i>
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onclick={() => changeSort('pr.no_hp')}>
									No HP <i class="fa-solid {getSortIcon('pr.no_hp')} ml-1 text-xs"></i>
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each pemilik as p, index}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-6 py-4 text-sm text-gray-600">{(pagination.page - 1) * pagination.itemsPerPage + index + 1}</td>
							<td class="px-6 py-4 text-sm text-gray-900 font-medium">{p.no_blok}</td>
							<td class="px-6 py-4 text-sm text-gray-600">{p.nama}</td>
							<td class="px-6 py-4 text-sm text-gray-600 font-mono">{p.nik}</td>
							<td class="px-6 py-4 text-sm text-gray-600">{p.no_hp}</td>
							<td class="px-6 py-4 text-right">
								<div class="flex items-center justify-end gap-1 lg:gap-2">
									<!-- Desktop: Horizontal buttons -->
									<div class="hidden lg:flex items-center gap-1">
										<button
											onclick={() => openEditModal(p)}
											class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
											title="Edit"
											aria-label="Edit"
										>
											<i class="fa-regular fa-pen-to-square text-lg"></i>
										</button>
										<button
											type="button"
											onclick={() => handleDelete(p.id, p.blok_rumah_id)}
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
													onclick={() => { openEditModal(p); openDropdownIndex = -1; }}
													class="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 rounded-t-lg flex items-center gap-2"
													role="menuitem"
												>
													<i class="fa-regular fa-pen-to-square text-blue-600 w-4"></i>
													<span class="text-blue-600">Edit</span>
												</button>
												<button
													type="button"
													onclick={() => { handleDelete(p.id, p.blok_rumah_id); openDropdownIndex = -1; }}
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
			<i class="fa-solid fa-user-plus text-4xl text-gray-300 mb-4"></i>
			<h3 class="text-lg font-medium text-gray-900 mb-2">Tidak ada data pemilik rumah kosong</h3>
			<p class="text-gray-500 mb-4">Belum ada pemilik yang terdaftar untuk blok dengan status Kosong.</p>
			<button onclick={openAddModal} class="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
				<i class="fa-solid fa-plus mr-2"></i> Tambah Pemilik Pertama
			</button>
		</div>
	{/if}

	<!-- Modal Add/Edit -->
	{#if showModal}
		<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onclick={closeModal} role="button" aria-label="Tutup modal"></div>
		<div class="fixed inset-0 z-50 flex items-center justify-center">
			<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-200" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center justify-between mb-6">
					<h3 class="text-lg font-bold text-gray-900">{editMode ? 'Edit' : 'Tambah'} Pemilik Rumah Kosong</h3>
					<button onclick={closeModal} class="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Tutup">
						<i class="fa-solid fa-times text-xl"></i>
					</button>
				</div>

				<form onsubmit={handleSubmit} class="space-y-4">
					{#if serverError}
						<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
							{serverError}
						</div>
					{/if}

					<div>
						<label for="blok_rumah_id" class="block text-sm font-medium text-gray-700 mb-2">Blok Rumah (Kosong) <span class="text-red-500">*</span></label>
						{#if editMode}
							<!-- Edit mode: read-only text input showing block number -->
							<input
								type="text"
								value={currentPemilik.no_blok || ''}
								readonly
								class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
							/>
							<input type="hidden" name="blok_rumah_id" bind:value={currentPemilik.blok_rumah_id} />
							<p class="text-xs text-gray-500 mt-1">Blok tidak bisa diubah saat edit</p>
						{:else}
							<select
								id="blok_rumah_id"
								bind:value={currentPemilik.blok_rumah_id}
								name="blok_rumah_id"
								required
								class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
							>
								<option value="">-- Pilih Blok Kosong --</option>
								{#each emptyBlocks as b}
									<option value={b.id}>{b.no_blok}</option>
								{/each}
							</select>
						{/if}
						{#if formErrors.blok_rumah_id}
							<p class="text-red-500 text-xs mt-1">{formErrors.blok_rumah_id}</p>
						{/if}
					</div>

					<div>
						<label for="nama" class="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap <span class="text-red-500">*</span></label>
						<input
							type="text"
							id="nama"
							bind:value={currentPemilik.nama}
							placeholder="Nama pemilik"
							required
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						/>
						{#if formErrors.nama}
							<p class="text-red-500 text-xs mt-1">{formErrors.nama}</p>
						{/if}
					</div>

					<div>
						<label for="nik" class="block text-sm font-medium text-gray-700 mb-2">NIK <span class="text-gray-400">(Opsional)</span></label>
						<input
							type="text"
							id="nik"
							bind:value={currentPemilik.nik}
							oninput={handleNikInput}
							placeholder="16 digit angka (opsional)"
							maxlength="16"
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						/>
						{#if formErrors.nik}
							<p class="text-red-500 text-xs mt-1">{formErrors.nik}</p>
						{/if}
					</div>

					<div>
						<label for="no_hp" class="block text-sm font-medium text-gray-700 mb-2">Nomor HP <span class="text-red-500">*</span></label>
						<input
							type="text"
							id="no_hp"
							bind:value={currentPemilik.no_hp}
							oninput={handleHpInput}
							placeholder="11-13 digit angka"
							maxlength="13"
							required
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						/>
						{#if formErrors.no_hp}
							<p class="text-red-500 text-xs mt-1">{formErrors.no_hp}</p>
						{/if}
					</div>

					<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
						<button type="button" onclick={closeModal} class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors">
							<i class="fa-solid fa-xmark mr-1"></i> Batal
						</button>
						<button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
							<i class="fa-solid fa-save mr-1"></i> {editMode ? 'Update' : 'Simpan'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>