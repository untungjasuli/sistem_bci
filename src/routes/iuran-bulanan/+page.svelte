<script>
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';

	let { data } = $props();

	// Derived state from server data
	let tagihan = $derived(data?.tagihan || []);
	let summary = $derived(data?.summary || { total_tagihan: 0, total_lunas: 0, total_belum_bayar: 0, total_nominal: 0, nominal_lunas: 0 });
	let periods = $derived(data?.periods || []);
	let settings = $derived(data?.settings || { jatuh_tempo: 10, nominal_penuh: 50000, nominal_keamanan: 25000 });

	// Local filter state
	let periode = $state(data?.periode || new Date().toISOString().slice(0, 7));
	let statusFilter = $state(data?.statusFilter || 'semua');
	let tipeFilter = $state(data?.tipeFilter || 'semua');
	let currentPage = $derived(parseInt(page.url.searchParams.get('page') || '1', 10));
	let itemsPerPage = $state(data?.itemsPerPage || 10);
	const itemsPerPageOptions = [10, 25, 50, 100];
	let totalPages = $derived(data?.totalPages || 1);

	// Expandable rows state (mobile)
	let expandedRows = $state({});

	// Modal state
	let showBayarModal = $state(false);
	let bayarTagihanId = $state(0);
	let bayarTanggal = $state(new Date().toISOString().split('T')[0]);
	let bayarMetode = $state('cash');
	let bayarCatatan = $state('');
	let bayarLoading = $state(false);

	// Error state untuk validasi client-side per field (Bayar Modal)
	let formErrors = $state({
		bayar_tanggal: '',
		bayar_metode: ''
	});

	// Error dari server (Bayar Modal)
	let serverError = $state('');

	// Derived: selected tagihan for modal
	let selectedTagihan = $derived(tagihan.find(t => t.id === bayarTagihanId));

	// Toast
	let toast = $state(null);

	function showToast(type, message) {
		toast = { type, message };
		setTimeout(() => { toast = null; }, 5000);
	}

	$effect(() => {
		if (data?.success) showToast('success', data.success);
		if (data?.error) showToast('error', data.error);
	});

	// Format rupiah
	function formatRupiah(angka) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
	}

	// Format date
	function formatDate(dateStr) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	// Status badge
	function getStatusBadge(status) {
		if (status === 'lunas') return { class: 'bg-green-100 text-green-800', label: 'Lunas' };
		return { class: 'bg-yellow-100 text-yellow-800', label: 'Belum Bayar' };
	}

	// Tipe badge
	function getTipeBadge(tipe) {
		if (tipe === 'keluarga') return { class: 'bg-blue-100 text-blue-800', label: 'Keluarga (50k)' };
		return { class: 'bg-gray-100 text-gray-800', label: 'Pemilik Kosong (25k)' };
	}

	// Update URL & navigate
	function updateFilters() {
		const params = new URLSearchParams();
		params.set('periode', periode);
		if (statusFilter !== 'semua') params.set('status', statusFilter);
		if (tipeFilter !== 'semua') params.set('tipe', tipeFilter);
		params.set('page', '1');
		params.set('itemsPerPage', itemsPerPage.toString());
		goto(`?${params.toString()}`);
	}

	function changePage(newPage) {
		if (newPage < 1 || newPage > totalPages) return;
		const params = new URLSearchParams();
		params.set('periode', periode);
		if (statusFilter !== 'semua') params.set('status', statusFilter);
		if (tipeFilter !== 'semua') params.set('tipe', tipeFilter);
		params.set('page', newPage.toString());
		params.set('itemsPerPage', itemsPerPage.toString());
		goto(`?${params.toString()}`);
	}

	function onItemsPerPageChange() {
		const params = new URLSearchParams();
		params.set('periode', periode);
		if (statusFilter !== 'semua') params.set('status', statusFilter);
		if (tipeFilter !== 'semua') params.set('tipe', tipeFilter);
		params.set('page', '1');
		params.set('itemsPerPage', itemsPerPage.toString());
		goto(`?${params.toString()}`);
	}

	// Generate tagihan (admin only)
	async function handleGenerate() {
		if (!confirm(`Generate tagihan untuk periode ${periode}?`)) return;

		const formData = new FormData();
		formData.append('periode', periode);

		try {
			const res = await fetch('?/generateTagihan', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();

			if (!res.ok || result.error) {
				showToast('error', result.error || 'Gagal generate tagihan');
				return;
			}

			showToast('success', result.success);
			await invalidateAll();
		} catch (e) {
					console.error('Generate error:', e);
					showToast('error', 'Gagal generate tagihan');
				}
			}

			// Generate Missing tagihan (admin only)
			async function handleGenerateMissing() {
				if (!confirm(`Generate tagihan missing untuk periode ${periode}?`)) return;

				const formData = new FormData();
				formData.append('periode', periode);

				try {
					const res = await fetch('?/generateMissing', {
						method: 'POST',
						body: formData,
						credentials: 'include'
					});
					const result = await res.json();

					if (!res.ok || result.error) {
						showToast('error', result.error || 'Gagal generate missing');
						return;
					}

					showToast('success', result.success);
					await invalidateAll();
				} catch (e) {
					console.error('Generate missing error:', e);
					showToast('error', 'Gagal generate missing');
				}
			}

			// Open bayar modal
	function openBayarModal(tagihan) {
		bayarTagihanId = tagihan.id;
		bayarTanggal = new Date().toISOString().split('T')[0];
		bayarMetode = 'cash';
		bayarCatatan = '';
		showBayarModal = true;
	}

	function closeBayarModal() {
		showBayarModal = false;
		bayarTagihanId = 0;
		bayarTanggal = new Date().toISOString().split('T')[0];
		bayarMetode = 'cash';
		bayarCatatan = '';
		bayarLoading = false;
	}

	// Handle bayar submit
	async function handleBayarSubmit(e) {
		e.preventDefault();

		if (!validateBayarForm()) return;

		bayarLoading = true;

		const formData = new FormData();
		formData.append('tagihan_id', bayarTagihanId.toString());
		formData.append('tanggal_bayar', bayarTanggal);
		formData.append('metode_bayar', bayarMetode);
		formData.append('catatan', bayarCatatan);

		try {
			const res = await fetch('?/bayarTagihan', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();

			if (!res.ok || result.error) {
				showToast('error', result.error || 'Gagal bayar');
				return;
			}

			showToast('success', result.success);
			closeBayarModal();
			await invalidateAll();
		} catch (e) {
			console.error('Bayar error:', e);
			showToast('error', 'Gagal bayar');
		} finally {
			bayarLoading = false;
		}
	}

	// Check if user is admin
	function isAdmin() {
		return data?.user?.role === 'admin';
	}

	// Toggle expanded row (mobile)
	function toggleExpand(tagihanId) {
		if (expandedRows[tagihanId]) {
			delete expandedRows[tagihanId];
		} else {
			expandedRows[tagihanId] = true;
		}
		// Force reactivity by reassigning
		expandedRows = { ...expandedRows };
	}

	function isExpanded(tagihanId) {
		return !!expandedRows[tagihanId];
	}

	// Bersihkan error saat bayar modal dibuka
	$effect(() => {
		if (showBayarModal) {
			serverError = '';
			formErrors = {
				bayar_tanggal: '',
				bayar_metode: ''
			};
		}
	});

	function validateBayarForm() {
		let valid = true;

		formErrors.bayar_tanggal = '';
		formErrors.bayar_metode = '';

		if (!bayarTanggal) {
			formErrors.bayar_tanggal = 'Tanggal bayar wajib diisi';
			valid = false;
		}

		if (!bayarMetode) {
			formErrors.bayar_metode = 'Metode bayar wajib dipilih';
			valid = false;
		}

		return valid;
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
			<h1 class="text-2xl font-bold text-gray-900">Iuran Bulanan</h1>
			<p class="text-gray-500 text-sm">Kelola tagihan dan pembayaran iuran bulanan warga</p>
		</div>
		<!-- Periode Selector & Actions - Mobile: dropdown full width, buttons below horizontal; Desktop: all horizontal -->
		<div class="w-full lg:flex lg:items-center lg:gap-4">
			<!-- Periode Selector -->
			<div class="flex items-center gap-2 w-full lg:w-auto">
				<label for="periode" class="text-sm text-gray-700 whitespace-nowrap">Periode:</label>
				<select
					id="periode"
					bind:value={periode}
					onchange={updateFilters}
					class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors flex-1"
				>
					{#each periods as p}
						<option value={p}>{p}</option>
					{/each}
					{#if !periods.includes(periode)}
						<option value={periode} selected>{periode} (Belum generate)</option>
					{/if}
				</select>
			</div>

			<!-- Generate Buttons (Admin only) -->
			{#if isAdmin()}
				<div class="flex gap-2 w-full lg:w-auto mt-3 lg:mt-0 lg:ml-auto">
					<button
						onclick={handleGenerate}
						disabled={periods.includes(periode)}
						class="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<i class="fa-solid fa-plus mr-2"></i> Generate Tagihan
					</button>
					<!-- Generate Missing Button (Admin only) - hanya tampil jika periode sudah generate -->
					{#if periods.includes(periode)}
						<button
							onclick={handleGenerateMissing}
							class="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
						>
							<i class="fa-solid fa-rotate-left mr-2"></i> Generate Missing
						</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Summary Cards - Mobile: Combined horizontal cards like dashboard age groups -->
	{#if true}
		<!-- Mobile: Summary cards wrapped in single card -->
		<div class="lg:hidden -mx-4 px-4 mb-4">
			<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
				<!-- Row 1: 3 columns -->
				<div class="grid grid-cols-3 gap-2 mb-3">
					<div class="text-center p-3 bg-green-50 rounded-lg">
						<p class="text-xl font-bold text-green-600">{summary.total_tagihan || 0}</p>
						<p class="text-xs text-gray-500 mt-1">Total Tagihan</p>
					</div>
					<div class="text-center p-3 bg-emerald-50 rounded-lg">
						<p class="text-xl font-bold text-emerald-600">{summary.total_lunas || 0}</p>
						<p class="text-xs text-gray-500 mt-1">Lunas</p>
					</div>
					<div class="text-center p-3 bg-amber-50 rounded-lg">
						<p class="text-xl font-bold text-amber-600">{summary.total_belum_bayar || 0}</p>
						<p class="text-xs text-gray-500 mt-1">Belum Bayar</p>
					</div>
				</div>
				<!-- Row 2: 2 columns -->
				<div class="grid grid-cols-2 gap-2">
					<div class="text-center p-3 bg-blue-50 rounded-lg">
						<p class="text-lg font-bold text-blue-600">{formatRupiah(summary.total_nominal)}</p>
						<p class="text-xs text-gray-500 mt-1">Total Nominal</p>
					</div>
					<div class="text-center p-3 bg-indigo-50 rounded-lg">
						<p class="text-lg font-bold text-indigo-600">{formatRupiah(summary.nominal_lunas)}</p>
						<p class="text-xs text-gray-500 mt-1">Terkumpul</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Desktop: Original 5-card grid -->
	<div class="hidden lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
		<div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
			<p class="text-sm text-gray-500">Total Tagihan</p>
			<p class="text-2xl font-bold text-gray-900 mt-1">{summary.total_tagihan || 0}</p>
		</div>
		<div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
			<p class="text-sm text-gray-500">Lunas</p>
			<p class="text-2xl font-bold text-green-600 mt-1">{summary.total_lunas || 0}</p>
		</div>
		<div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
			<p class="text-sm text-gray-500">Belum Bayar</p>
			<p class="text-2xl font-bold text-yellow-600 mt-1">{summary.total_belum_bayar || 0}</p>
		</div>
		<div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
			<p class="text-sm text-gray-500">Total Nominal</p>
			<p class="text-2xl font-bold text-gray-900 mt-1">{formatRupiah(summary.total_nominal)}</p>
		</div>
		<div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
			<p class="text-sm text-gray-500">Terkumpul</p>
			<p class="text-2xl font-bold text-blue-600 mt-1">{formatRupiah(summary.nominal_lunas)}</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
		<div class="flex flex-col sm:flex-row gap-4">
			<!-- Mobile: Dropdown only, no label -->
			<div class="flex-1 lg:w-auto">
				<select
					id="status-filter"
					bind:value={statusFilter}
					onchange={updateFilters}
					class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
				>
					<option value="semua">Semua Status</option>
					<option value="belum_bayar">Belum Bayar</option>
					<option value="lunas">Lunas</option>
				</select>
			</div>
			<div class="flex-1 lg:w-auto">
				<select
					id="tipe-filter"
					bind:value={tipeFilter}
					onchange={updateFilters}
					class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
				>
					<option value="semua">Semua Tipe</option>
					<option value="keluarga">Keluarga (50k)</option>
					<option value="pemilik_kosong">Pemilik Kosong (25k)</option>
				</select>
			</div>
		</div>
	</div>

	<!-- Table -->
	{#if tagihan.length > 0}
		<!-- Desktop Table -->
		<div class="hidden lg:block bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
			<table class="w-full text-left border-collapse min-w-full">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">No Blok</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Pemilik</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Nominal</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Jatuh Tempo</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each tagihan as t, index}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-6 py-4 text-sm text-gray-600">{(currentPage - 1) * itemsPerPage + index + 1}</td>
							<td class="px-6 py-4 text-sm text-gray-900 font-medium">{t.no_blok}</td>
							<td class="px-6 py-4 text-sm text-gray-600">
								{#if t.tipe_pembayar === 'keluarga'}
									{t.keluarga_nama || '-'}<br>
									<span class="text-xs text-gray-400">{t.keluarga_hp || '-'}</span>
								{:else}
									{t.pemilik_nama || '-'}<br>
									<span class="text-xs text-gray-400">{t.pemilik_hp || '-'}</span>
								{/if}
							</td>
							<td class="px-6 py-4">
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getTipeBadge(t.tipe_pembayar).class}">
									{getTipeBadge(t.tipe_pembayar).label}
								</span>
							</td>
							<td class="px-6 py-4 text-sm text-gray-900 font-medium">{formatRupiah(t.nominal)}</td>
							<td class="px-6 py-4 text-sm text-gray-600">{formatDate(t.jatuh_tempo)}</td>
							<td class="px-6 py-4">
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusBadge(t.status).class}">
									{getStatusBadge(t.status).label}
								</span>
							</td>
							<td class="px-6 py-4 text-right">
											{#if t.status === 'belum_bayar'}
												<button
													onclick={() => openBayarModal(t)}
													class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
													title="Bayar"
													aria-label="Bayar"
												>
													<i class="fa-solid fa-money-bill-wave text-lg"></i>
												</button>
											{:else}
												<span class="text-xs text-gray-400">Sudah lunas</span>
											{/if}
										</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Mobile Expandable Cards -->
		<div class="lg:hidden space-y-3 -mx-4 px-4">
			{#each tagihan as t, index}
				<div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
					<!-- Card Header (always visible) -->
					<button
						type="button"
						onclick={() => toggleExpand(t.id)}
						class="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 flex-wrap">
								<span class="text-sm font-medium text-gray-900">{t.no_blok}</span>
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {getTipeBadge(t.tipe_pembayar).class}">
									{getTipeBadge(t.tipe_pembayar).label}
								</span>
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {getStatusBadge(t.status).class}">
									{getStatusBadge(t.status).label}
								</span>
							</div>
							<div class="mt-1 text-sm text-gray-600">
								{#if t.tipe_pembayar === 'keluarga'}
									{t.keluarga_nama || '-'}
								{:else}
									{t.pemilik_nama || '-'}
								{/if}
							</div>
						</div>
						<div class="flex items-center gap-3 shrink-0">
							<div class="text-right hidden sm:block">
								<div class="text-sm font-bold text-gray-900">{formatRupiah(t.nominal)}</div>
								<div class="text-xs text-gray-500">{formatDate(t.jatuh_tempo)}</div>
							</div>
							<i class="fa-solid fa-chevron-down text-gray-400 transition-transform duration-200"
								class:rotate-180={isExpanded(t.id)}></i>
						</div>
					</button>

					<!-- Expanded Content -->
					{#if isExpanded(t.id)}
						<div class="border-t border-gray-100 p-4 space-y-3 bg-gray-50">
							<div class="grid grid-cols-2 gap-3 text-sm">
								<div>
									<span class="text-gray-500">Pemilik</span>
									<div class="font-medium text-gray-900">
										{#if t.tipe_pembayar === 'keluarga'}
											{t.keluarga_nama || '-'}
										{:else}
											{t.pemilik_nama || '-'}
										{/if}
									</div>
								</div>
								<div>
									<span class="text-gray-500">No HP</span>
									<div class="font-medium text-gray-900">
										{#if t.tipe_pembayar === 'keluarga'}
											{t.keluarga_hp || '-'}
										{:else}
											{t.pemilik_hp || '-'}
										{/if}
									</div>
								</div>
								<div>
									<span class="text-gray-500">Nominal</span>
									<div class="font-bold text-gray-900">{formatRupiah(t.nominal)}</div>
								</div>
								<div>
									<span class="text-gray-500">Jatuh Tempo</span>
									<div class="font-medium text-gray-900">{formatDate(t.jatuh_tempo)}</div>
								</div>
							</div>
							{#if t.status === 'belum_bayar'}
											<button
												type="button"
												onclick={() => openBayarModal(t)}
												class="w-full p-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-600 transition-colors text-center"
												title="Bayar Tagihan"
												aria-label="Bayar Tagihan"
											>
												<i class="fa-solid fa-money-bill-wave "></i>
												Bayar Tagihan
											</button>
										{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Pagination -->
		<div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-4 py-3 bg-white border border-gray-200 rounded-lg">
			<div class="flex items-center gap-3">
				<label for="items-per-page" class="text-sm text-gray-700">Tampilkan</label>
				<select
					id="items-per-page"
					bind:value={itemsPerPage}
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
					Halaman {currentPage} dari {totalPages} (Total: {data?.total ?? tagihan.length} data)
				</span>
				<button
					onclick={() => changePage(currentPage - 1)}
					disabled={currentPage === 1}
					class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					<i class="fa-solid fa-chevron-left"></i>
				</button>
				<button
					onclick={() => changePage(currentPage + 1)}
					disabled={currentPage === totalPages}
					class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					<i class="fa-solid fa-chevron-right"></i>
				</button>
			</div>
		</div>
	{:else}
		<div class="bg-white rounded-lg border border-gray-200 p-12 text-center">
			<i class="fa-solid fa-inbox text-4xl text-gray-300 mb-4"></i>
			<h3 class="text-lg font-medium text-gray-900 mb-2">Tidak ada data tagihan</h3>
			<p class="text-gray-500 mb-4">Belum ada tagihan untuk periode {periode}.</p>
			{#if isAdmin() && !periods.includes(periode)}
				<button onclick={handleGenerate} class="px-6 py-2.5 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors">
					<i class="fa-solid fa-plus mr-2"></i> Generate Tagihan Periode Ini
				</button>
			{/if}
		</div>
	{/if}

	<!-- Modal Bayar -->
	{#if showBayarModal}
		<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onclick={closeBayarModal} role="button" aria-label="Tutup modal"></div>
		<div class="fixed inset-0 z-50 flex items-center justify-center">
			<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-200" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center justify-between mb-6">
					<h3 class="text-lg font-bold text-gray-900">Bayar Tagihan</h3>
					<button onclick={closeBayarModal} class="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Tutup">
						<i class="fa-solid fa-times text-xl"></i>
					</button>
				</div>

				<form onsubmit={handleBayarSubmit} class="space-y-4">
					{#if serverError}
						<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
							{serverError}
						</div>
					{/if}
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Nominal Tagihan</label>
						{#if selectedTagihan}
							<p class="text-xl font-bold text-gray-900">{formatRupiah(selectedTagihan.nominal)}</p>
							<p class="text-sm text-gray-500 mt-1">Blok: {selectedTagihan.no_blok} • {getTipeBadge(selectedTagihan.tipe_pembayar).label}</p>
						{/if}
					</div>

					<div>
						<label for="bayar_tanggal" class="block text-sm font-medium text-gray-700 mb-2">Tanggal Bayar <span class="text-red-500">*</span></label>
						<input
							type="date"
							id="bayar_tanggal"
							bind:value={bayarTanggal}
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
							required
						/>
						{#if formErrors.bayar_tanggal}
							<p class="text-red-500 text-xs mt-1">{formErrors.bayar_tanggal}</p>
						{/if}
					</div>

					<div>
						<label for="bayar_metode" class="block text-sm font-medium text-gray-700 mb-2">Metode Bayar <span class="text-red-500">*</span></label>
						<select
							id="bayar_metode"
							bind:value={bayarMetode}
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
							required
						>
							<option value="cash">Cash</option>
							<option value="transfer">Transfer</option>
							<option value="qris">QRIS</option>
						</select>
						{#if formErrors.bayar_metode}
							<p class="text-red-500 text-xs mt-1">{formErrors.bayar_metode}</p>
						{/if}
					</div>

					<div>
						<label for="bayar_catatan" class="block text-sm font-medium text-gray-700 mb-2">Catatan (opsional)</label>
						<textarea
							id="bayar_catatan"
							bind:value={bayarCatatan}
							rows="3"
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
							placeholder="Catatan tambahan..."
						></textarea>
					</div>

					<div class="flex items-center justify-end gap-3 pt-4">
						<button type="button" onclick={closeBayarModal} class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" disabled={bayarLoading}>
							Batal
						</button>
						<button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors" disabled={bayarLoading}>
							{#if bayarLoading}
								<i class="fa-solid fa-spinner fa-spin mr-2"></i> Memproses...
							{:else}
								<i class="fa-solid fa-save mr-2"></i> Bayar
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>