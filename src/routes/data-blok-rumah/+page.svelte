<script>
	import { page } from '$app/state';
	import { enhance } from '$app/forms';

	let { data } = $props();

	// State klien untuk sorting dan pencarian tanpa reload
	let items = $derived(data.blokRumah || []);
	let search = $state(data.search || '');
	let sort = $state(data.sort || 'asc');
	let sortBy = $state(data.sortBy || 'no_blok');

	let showModal = $state(false);
	let isEdit = $state(false);
	let editingId = $state('');
	let noBlok = $state('');

	let toast = $state(null); // { type: 'success'|'error', message: string }

	function openAddModal() {
		isEdit = false;
		editingId = '';
		noBlok = '';
		showModal = true;
	}

	function openEditModal(id, blok) {
		isEdit = true;
		editingId = id;
		noBlok = blok;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		isEdit = false;
		editingId = '';
		noBlok = '';
	}

	function showToast(type, message) {
		toast = { type, message };
		setTimeout(() => {
			toast = null;
		}, 5000); // durasi 5 detik konsisten
	}

	// Dropdown state untuk mobile
	let openDropdownIndex = $state(-1);

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

	// Tampilkan toast dari pesan server
	if (data?.success) {
		showToast('success', data.success);
	}
	if (data?.error) {
		showToast('error', data.error);
	}

	// Data terurut dan difilter di sisi klien
	let sortedItems = $derived(
		items
			.filter((b) => !search || b.no_blok.toLowerCase().includes(search.toLowerCase()))
			.slice()
			.sort((a, b) => {
				const field = sortBy === 'status' ? 'status' : 'no_blok';
				const na = (a[field] || '').toLowerCase();
				const nb = (b[field] || '').toLowerCase();
				return sort === 'asc' ? na.localeCompare(nb) : nb.localeCompare(na);
			})
	);

	function updateUrl() {
		const params = new URLSearchParams();
		if (search) params.set('search', search);
		params.set('sort', sort);
		params.set('sortBy', sortBy);
		window.history.pushState(null, '', `?${params.toString()}`);
	}

	function onSearchInput(e) {
		search = e.target.value;
		updateUrl();
	}

	function onSortClick(column) {
		if (sortBy === column) {
			sort = sort === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = column;
			sort = 'asc';
		}
		updateUrl();
	}

	function onClearSearch() {
		search = '';
		updateUrl();
	}

	function handleFormSubmit() {
		return async ({ update }) => {
			await update();
			if (page.form?.success) {
				showToast('success', page.form.success);
				closeModal();
			}
			if (page.form?.error) {
				showToast('error', page.form.error);
			}
		};
	}

	async function handleDeleteBlok(id) {
		if (!confirm('Hapus blok rumah ini?')) return;

		const formData = new FormData();
		formData.append('id', id);

		try {
			const res = await fetch('?/delete', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();
			if (!res.ok || result.error) {
				showToast('error', result.error || 'Gagal menghapus data');
				return;
			}
			showToast('success', result.success || 'Data blok rumah berhasil dihapus');
			// Hapus dari local state tanpa reload
			items = items.filter((b) => b.id !== id);
		} catch (e) {
			console.error('Delete blok error:', e);
			showToast('error', 'Gagal menghapus data');
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
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Data Blok Rumah</h1>
			<p class="text-gray-500 text-sm">Kelola data blok rumah dalam sistem</p>
		</div>
		<div class="flex items-center gap-3">
			<form
				onsubmit={(e) => e.preventDefault()}
				class="relative flex items-center"
			>
				<label class="sr-only">Cari No. Blok</label>
				<div class="relative w-64">
					<input
						type="text"
						name="search"
						value={search}
						placeholder="Cari No. Blok..."
						class="w-full pl-10 pr-12 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						oninput={onSearchInput}
					/>
					<i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
					{#if search}
						<button
							type="button"
							onclick={onClearSearch}
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
				class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
			>
				<i class="fa-solid fa-plus"></i>
				<span>Tambah Blok</span>
			</button>
		</div>
	</div>

	{#if sortedItems.length > 0}
		<div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
			<table class="w-full text-left border-collapse min-w-full">
				<thead>
								<tr class="bg-gray-50 border-b border-gray-200">
									<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
									<th
															class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
															onclick={() => onSortClick('no_blok')}
														>
															<div class="flex items-center gap-1">
																<span>No. Blok</span>
																<i class="fa-solid text-xs text-gray-400" class:fa-sort-up={sort === 'asc' && sortBy === 'no_blok'} class:fa-sort-down={sort === 'desc' && sortBy === 'no_blok'}></i>
															</div>
														</th>
									<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors" onclick={() => onSortClick('status')}>
						<div class="flex items-center gap-1">
							<span>Status</span>
							<i class="fa-solid text-xs text-gray-400" class:fa-sort-up={sort === 'asc' && sortBy === 'status'} class:fa-sort-down={sort === 'desc' && sortBy === 'status'}></i>
						</div>
					</th>
									<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Aksi</th>
								</tr>
							</thead>
				<tbody class="divide-y divide-gray-100">
							{#each sortedItems as blok, index}
								<tr class="hover:bg-gray-50 transition-colors">
									<td class="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
									<td class="px-6 py-4 text-sm text-gray-900 font-medium">{blok.no_blok}</td>
									<td class="px-6 py-4">
										<span
											class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
												blok.status === 'Dihuni'
													? 'bg-green-100 text-green-800'
													: 'bg-gray-100 text-gray-800'
											}`}
										>
											{blok.status}
										</span>
									</td>
									<td class="px-6 py-4 text-right">
														<div class="flex items-center justify-end gap-1 lg:gap-2">
															<!-- Desktop: Horizontal buttons -->
															<div class="hidden lg:flex items-center gap-1">
																<button
																	onclick={() => openEditModal(blok.id, blok.no_blok)}
																	class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
																	title="Edit"
																>
																	<i class="fa-solid fa-pen-to-square"></i>
																</button>
																<button
																	type="button"
																	onclick={() => handleDeleteBlok(blok.id)}
																	class="px-3 py-1.5 text-xs font-medium text-white bg-red-600 border border-transparent rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors"
																	title="Hapus"
																>
																	<i class="fa-solid fa-trash"></i>
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
																			onclick={() => { openEditModal(blok.id, blok.no_blok); openDropdownIndex = -1; }}
																			class="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
																			role="menuitem"
																		>
																			<i class="fa-solid fa-pen-to-square text-blue-600 w-4"></i>
																			<span>Edit</span>
																		</button>
																		<button
																			type="button"
																			onclick={() => { handleDeleteBlok(blok.id); openDropdownIndex = -1; }}
																			class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg flex items-center gap-2"
																			role="menuitem"
																		>
																			<i class="fa-solid fa-trash w-4"></i>
																			<span>Hapus</span>
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
	{:else}
		<div class="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3">
			<i class="fa-solid fa-circle-exclamation text-red-500"></i>
			<div>
				<h3 class="text-sm font-medium text-red-800">Tidak ada data</h3>
				<p class="text-sm text-red-600">Belum ada data blok rumah yang cocok.</p>
			</div>
		</div>
	{/if}

	<!-- Modal Add/Edit -->
	{#if showModal}
		<div
			class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
			onclick={closeModal}
			role="button"
			aria-label="Tutup modal"
		></div>
		<div class="fixed inset-0 z-50 flex items-center justify-center">
			<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-200" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center justify-between mb-6">
					<h3 class="text-lg font-bold text-gray-900">
						{isEdit ? 'Edit Blok Rumah' : 'Tambah Blok Rumah'}
					</h3>
					<button
						onclick={closeModal}
						class="text-gray-400 hover:text-gray-600 transition-colors"
						aria-label="Tutup"
					>
						<i class="fa-solid fa-times text-xl"></i>
					</button>
				</div>

				<form method="POST" action={isEdit ? '?/update' : '?/create'} use:enhance={handleFormSubmit} class="space-y-4">
					<input type="hidden" name="id" value={editingId} />
					<div>
						<label for="no_blok_input" class="block text-sm font-medium text-gray-700 mb-2">No. Blok</label>
						<input
							id="no_blok_input"
							type="text"
							name="no_blok"
							bind:value={noBlok}
							placeholder="Contoh: U-10"
							required
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						/>
					</div>
					<div class="flex items-center justify-end gap-3 pt-4">
						<button
							type="button"
							onclick={closeModal}
							class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
						>
							Batal
						</button>
						<button
							type="submit"
							class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
						>
							{isEdit ? 'Perbarui' : 'Simpan'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
