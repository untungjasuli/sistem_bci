<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let wargaPerBlok = $derived(data?.wargaPerBlok || []);
	let grandTotal = $derived(data?.grandTotal || 0);
	let filter = $derived(data?.filter || { blokFilter: 'semua', statusFilter: 'semua' });
	let blokRumah = $derived(data?.blokRumah || []);

	let toast = $state(null);
	let expandedBloks = $state([]);

	function showToast(type, message) {
		toast = { type, message };
		setTimeout(() => { toast = null; }, 5000);
	}

	function formatRupiah(num) {
		if (num === null || num === undefined) return 'Rp 0';
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
	}

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function getHubLabel(hub) {
		const labels = { 'kepala': 'Kepala Keluarga', 'istri': 'Istri', 'anak': 'Anak', 'lainnya': 'Lainnya' };
		return labels[hub] || hub;
	}

	function getStatusLabel(status) {
		return status === 'sendiri' ? 'Milik Sendiri' : status === 'kontrak' ? 'Kontrak/Sewa' : status;
	}

	function getJkLabel(jk) {
		return jk === 'L' ? 'Laki-laki' : 'Perempuan';
	}

	function updateFilter(key, value) {
		const params = new URLSearchParams(page.url.search);
		if (value === 'semua' || value === '') params.delete(key);
		else params.set(key, value);
		goto(`?${params.toString()}`);
	}

	function onBlokChange(e) { updateFilter('blok', e.target.value); }
	function onStatusChange(e) { updateFilter('status', e.target.value); }
	function clearFilters() { goto('/laporan/kependudukan/warga-blok'); }
	function handleExport() { showToast('info', 'Export menyusul'); }

		function toggleExpand(blok) {
			if (expandedBloks.includes(blok)) {
				expandedBloks = expandedBloks.filter(b => b !== blok);
			} else {
				expandedBloks = [...expandedBloks, blok];
			}
		}

		function expandAll() {
			expandedBloks = wargaPerBlok.map(b => b.blok);
		}

		function collapseAll() {
			expandedBloks = [];
		}
</script>

{#if toast}
	<div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2"
		class:bg-green-50={toast.type === 'success'}
		class:text-green-700={toast.type === 'success'}
		class:border-green-200={toast.type === 'success'}
		class:bg-red-50={toast.type === 'error'}
		class:text-red-700={toast.type === 'error'}
		class:bg-blue-50={toast.type === 'info'}
		class:text-blue-700={toast.type === 'info'}
		class:border-blue-200={toast.type === 'info'}
	>
		{#if toast.type === 'success'}<i class="fa-solid fa-circle-check"></i>
		{:else if toast.type === 'error'}<i class="fa-solid fa-circle-exclamation"></i>
		{:else}<i class="fa-solid fa-circle-info"></i>{/if}
		<span>{toast.message}</span>
	</div>
{/if}

<div class="px-4 sm:px-6 lg:px-8 py-8">
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Daftar Warga per Blok</h1>
			<p class="text-gray-500 text-sm">Daftar nama warga dikelompokkan per blok rumah</p>
		</div>
				<div class="flex items-center gap-3 w-full lg:w-auto">
					<button onclick={expandAll} class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex-shrink-0">
						<i class="fa-solid fa-expand-arrows-alt"></i>
						<span class="hidden lg:inline">Expand All</span>
					</button>
					<button onclick={collapseAll} class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex-shrink-0">
						<i class="fa-solid fa-compress-arrows-alt"></i>
						<span class="hidden lg:inline">Collapse All</span>
					</button>
					<button onclick={handleExport} class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex-shrink-0">
						<i class="fa-solid fa-download"></i>
						<span class="hidden lg:inline">Export</span>
					</button>
				</div>
	</div>

	<!-- Filter Bar -->
	<div class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
		<form onsubmit={(e) => e.preventDefault()} class="flex flex-col sm:flex-row gap-4 items-end">
			<div class="w-full sm:w-48">
				<label for="blok-filter" class="block text-sm font-medium text-gray-700 mb-1">Blok Rumah</label>
				<select id="blok-filter" value={filter.blokFilter} onchange={onBlokChange} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
					<option value="semua">Semua Blok</option>
					{#each blokRumah as b}<option value={b.id}>{b.no_blok}</option>{/each}
				</select>
			</div>
			<div class="w-full sm:w-48">
				<label for="status-filter" class="block text-sm font-medium text-gray-700 mb-1">Status Rumah</label>
				<select id="status-filter" value={filter.statusFilter} onchange={onStatusChange} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
					<option value="semua">Semua</option>
					<option value="sendiri">Milik Sendiri</option>
					<option value="ngontrak">Kontrak/Sewa</option>
				</select>
			</div>
			{#if filter.blokFilter !== 'semua' || filter.statusFilter !== 'semua'}
				<button type="button" onclick={clearFilters} class="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors h-fit">
					<i class="fa-solid fa-xmark mr-1"></i> Clear
				</button>
			{/if}
		</form>
	</div>

	<!-- Summary Card -->
	<div class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
		<p class="text-sm text-gray-500">Total Warga</p>
		<p class="text-3xl font-bold text-blue-600">{grandTotal} orang</p>
	</div>

	<!-- Table per Blok -->
	<div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
		{#if wargaPerBlok.length > 0}
			{#each wargaPerBlok as blokData, blokIndex}
				<div class="border-b border-gray-100 last:border-0">
					<!-- Blok Header -->
					<div class="bg-gray-50 px-4 py-3 flex items-center justify-between">
						<div class="flex items-center gap-3">
							<button
								onclick={() => toggleExpand(blokData.blok)}
								class="text-blue-600 hover:text-blue-800 font-medium"
							>
								<i class="fa-solid {expandedBloks.includes(blokData.blok) ? 'fa-chevron-up' : 'fa-chevron-down'}"></i>
							</button>
							<h3 class="text-lg font-bold text-gray-900">Blok {blokData.blok}</h3>
							<span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">{blokData.total} warga</span>
						</div>
					</div>
					<!-- Warga Table -->
					{#if expandedBloks.includes(blokData.blok)}
						<table class="w-full text-left border-collapse">
							<thead>
								<tr class="bg-gray-50 border-b border-gray-200">
									<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
									<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">NIK</th>
									<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
									<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis Kelamin</th>
									<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl Lahir</th>
									<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Hub. Keluarga</th>
									<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">No. KK</th>
									<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Status Rumah</th>
									<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">No HP</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-100">
								{#each blokData.warga as item, index}
									<tr class="hover:bg-gray-50 transition-colors">
										<td class="px-4 py-2 text-sm text-gray-600">{index + 1}</td>
										<td class="px-4 py-2 text-sm font-mono text-gray-900">{item.nik || '-'}</td>
										<td class="px-4 py-2 text-sm font-medium text-gray-900">{item.nama}</td>
										<td class="px-4 py-2 text-sm text-gray-600">{getJkLabel(item.jenis_kelamin)}</td>
										<td class="px-4 py-2 text-sm text-gray-600">{formatDate(item.tanggal_lahir)}</td>
										<td class="px-4 py-2 text-sm text-gray-600">{getHubLabel(item.hub_keluarga)}</td>
										<td class="px-4 py-2 text-sm font-mono text-gray-600">{item.no_kk}</td>
										<td class="px-4 py-2 text-sm">
											<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {item.status_rumah === 'sendiri' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
												{getStatusLabel(item.status_rumah)}
											</span>
										</td>
										<td class="px-4 py-2 text-sm text-gray-600">{item.nomor_hp || '-'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</div>
			{/each}
		{:else}
			<div class="p-12 text-center">
				<i class="fa-solid fa-house text-4xl text-gray-300 mb-4"></i>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Tidak ada data</h3>
				<p class="text-gray-500">Tidak ada warga untuk filter ini.</p>
			</div>
		{/if}
	</div>
</div>