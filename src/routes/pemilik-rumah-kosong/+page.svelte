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
	let currentPemilik = $state({ id: '', blok_rumah_id: '', nama: '', nik: '', no_hp: '' });
	let modalError = $state('');

	let toast = $state(null);

	function showToast(type, message) {
		toast = { type, message };
		setTimeout(() => { toast = null; }, 5000);
	}

	$effect(() => {
		if (data?.success) showToast('success', data.success);
		if (data?.error) showToast('error', data.error);
	});

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function openAddModal() {
		editMode = false;
		currentPemilik = { id: '', blok_rumah_id: '', nama: '', nik: '', no_hp: '' };
		modalError = '';
		showModal = true;
	}

	function openEditModal(p) {
		editMode = true;
		currentPemilik = { ...p };
		modalError = '';
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		currentPemilik = { id: '', blok_rumah_id: '', nama: '', nik: '', no_hp: '' };
		modalError = '';
	}

	function handleNikInput(e) {
		e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16);
		currentPemilik.nik = e.target.value;
	}

	function handleHpInput(e) {
		e.target.value = e.target.value.replace(/\D/g, '').slice(0, 13);
		currentPemilik.no_hp = e.target.value;
	}

	async function handleSubmit(e) {
			e.preventDefault();
			modalError = '';

			if (!currentPemilik.blok_rumah_id || !currentPemilik.nama || !currentPemilik.no_hp) {
				modalError = 'Blok Rumah, Nama, dan Nomor HP wajib diisi';
				return;
			}

			// NIK optional - if provided, validate 16 digits
			if (currentPemilik.nik && currentPemilik.nik.length !== 16) {
				modalError = 'NIK harus 16 digit';
				return;
			}

			if (currentPemilik.no_hp.length < 11 || currentPemilik.no_hp.length > 13) {
				modalError = 'Nomor HP 11-13 digit';
				return;
			}

			const formData = new FormData();
			formData.append('blok_rumah_id', currentPemilik.blok_rumah_id);
			formData.append('nama', currentPemilik.nama);
			formData.append('nik', currentPemilik.nik || '');
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

				if (!res.ok || result.error) {
					modalError = result.error || 'Gagal menyimpan';
					return;
				}

				showToast('success', result.success);
				closeModal();
				await invalidateAll();
			} catch (err) {
				console.error('Submit error:', err);
				modalError = 'Gagal menyimpan data';
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

			if (!res.ok || result.error) {
				showToast('error', result.error || 'Gagal hapus');
				return;
			}

			showToast('success', result.success);
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
		<button
			onclick={openAddModal}
			class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
		>
			<i class="fa-solid fa-plus mr-2"></i> Tambah Pemilik
		</button>
	</div>

	<!-- Search & Filters -->
	<div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
		<form onsubmit={handleSearch} class="flex flex-col sm:flex-row gap-4">
			<div class="flex items-center gap-2 flex-1">
				<label for="search" class="text-sm text-gray-700">Cari:</label>
				<input
					type="text"
					id="search"
					name="searchInput"
					value={pagination.search}
					placeholder="Nama / NIK / HP / No Blok"
					class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
				/>
				<button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
					<i class="fa-solid fa-search mr-1"></i> Cari
				</button>
				{#if pagination.search}
					<a href="?" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors">
						<i class="fa-solid fa-xmark mr-1"></i> Reset
					</a>
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
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onclick={() => changeSort('pr.created_at')}>
							Dibuat <i class="fa-solid {getSortIcon('pr.created_at')} ml-1 text-xs"></i>
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
							<td class="px-6 py-4 text-sm text-gray-600">{formatDate(p.created_at)}</td>
							<td class="px-6 py-4 text-right">
											<div class="flex items-center justify-end gap-1">
												<button
													onclick={() => openEditModal(p)}
													class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
													title="Edit"
													aria-label="Edit"
												>
													<i class="fa-regular fa-pen-to-square text-lg"></i>
												</button>
												<button
													onclick={() => handleDelete(p.id, p.blok_rumah_id)}
													class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
													title="Hapus"
													aria-label="Hapus"
												>
													<i class="fa-regular fa-trash-can text-lg"></i>
												</button>
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
							{#if modalError}
								<div class="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
									<i class="fa-solid fa-circle-exclamation mr-1"></i> {modalError}
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
												<input type="hidden" name="blok_rumah_id" value={currentPemilik.blok_rumah_id} />
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