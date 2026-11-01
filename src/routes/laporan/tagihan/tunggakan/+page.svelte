<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let tunggakan = $derived(data?.tunggakan || []);
	let grandTotal = $derived(data?.grandTotal || { jumlah_penghuni: 0, total_bulan: 0, total_nominal: 0 });
	let filter = $derived(data?.filter || { periode: '', blokFilter: 'semua' });
	let blokRumah = $derived(data?.blokRumah || []);

	let toast = $state(null);
		let expandedRows = $state([]);

	function showToast(type, message) {
		toast = { type, message };
		setTimeout(() => { toast = null; }, 5000);
	}

	function formatRupiah(num) {
		if (num === null || num === undefined) return 'Rp 0';
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
	}

	function updateFilter(key, value) {
		const params = new URLSearchParams(page.url.search);
		if (value === 'semua' || value === '') params.delete(key);
		else params.set(key, value);
		goto(`?${params.toString()}`);
	}

	function onPeriodeChange(e) { updateFilter('periode', e.target.value); }
	function onBlokChange(e) { updateFilter('blok', e.target.value); }
	function clearFilters() { goto('/laporan/tagihan/tunggakan'); }

		async function handleExport(type) {
			try {
				const params = new URLSearchParams(page.url.search);
				const format = type === 'excel' ? 'excel' : 'pdf';
				const url = `/laporan/tagihan/tunggakan/export?format=${format}&${params.toString()}`;
			
				const res = await fetch(url, {
					method: 'GET',
					credentials: 'include'
				});

				if (!res.ok) {
					let errMsg = `Gagal export ${type.toUpperCase()}`;
					try {
						const err = await res.json();
						errMsg = err.error || err.message || errMsg;
					} catch {
						if (res.redirected || res.url.includes('/login')) {
							errMsg = 'Session habis, silakan login ulang';
						}
					}
					showToast('error', errMsg);
					return;
				}

				const blob = await res.blob();
				const blobUrl = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = blobUrl;
				a.download = `tunggakan-tagihan-${filter.periode || 'all'}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
				document.body.appendChild(a);
				a.click();
				a.remove();
				window.URL.revokeObjectURL(blobUrl);
				showToast('success', `Export ${type.toUpperCase()} berhasil`);
			} catch (err) {
				console.error('Export error:', err);
				showToast('error', `Gagal export ${type.toUpperCase()}`);
			}
		}

			function toggleExpand(id) {
			if (expandedRows.includes(id)) {
				expandedRows = expandedRows.filter(x => x !== id);
			} else {
				expandedRows = [...expandedRows, id];
			}
		}

		function expandAll() {
			expandedRows = tunggakan.map(t => t.blok_rumah_id);
		}

		function collapseAll() {
			expandedRows = [];
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
			<h1 class="text-2xl font-bold text-gray-900">Tunggakan Tagihan</h1>
			<p class="text-gray-500 text-sm">Daftar penghuni yang memiliki tagihan iuran belum lunas</p>
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
							<button
								onclick={() => handleExport('excel')}
								class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex-shrink-0"
							>
								<i class="fa-solid fa-file-excel"></i>
								<span class="hidden lg:inline">Export Excel</span>
							</button>
							<button
								onclick={() => handleExport('pdf')}
								class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors flex-shrink-0"
							>
								<i class="fa-solid fa-file-pdf"></i>
								<span class="hidden lg:inline">Export PDF</span>
							</button>
						</div>
	</div>

	<!-- Filter Bar -->
	<div class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
		<form onsubmit={(e) => e.preventDefault()} class="flex flex-col sm:flex-row gap-4 items-end">
			<div class="flex-1 min-w-0">
				<input type="month" id="periode" value={filter.periode} onchange={onPeriodeChange} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" />
			</div>
			<div class="w-full sm:w-48">
				<select id="blok-filter" value={filter.blokFilter} onchange={onBlokChange} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
					<option value="semua">Semua Blok</option>
					{#each blokRumah as br}<option value={br.id}>{br.label}</option>{/each}
				</select>
			</div>
		</form>
	</div>

	<!-- Summary Cards -->
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
			<div class="bg-white rounded-lg border border-gray-200 p-4">
				<p class="text-sm text-gray-500">Jumlah Penghuni/Pemilik Tunggak</p>
				<p class="text-2xl font-bold text-red-600">{grandTotal.jumlah_penghuni}</p>
			</div>
			<div class="bg-white rounded-lg border border-gray-200 p-4">
				<p class="text-sm text-gray-500">Total Bulan Tunggak</p>
				<p class="text-2xl font-bold text-orange-600">{grandTotal.total_bulan}</p>
			</div>
			<div class="bg-white rounded-lg border border-red-200 p-4">
				<p class="text-sm text-gray-500">Total Tunggakan</p>
				<p class="text-2xl font-bold text-red-600">{formatRupiah(grandTotal.total_nominal)}</p>
			</div>
		</div>

	<!-- Table -->
	<div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
		{#if tunggakan.length > 0}
			<table class="w-full text-left border-collapse min-w-full">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Blok</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Penghuni/Pemilik</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">No HP</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Bulan Tunggak</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tunggakan</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each tunggakan as item, index}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
							<td class="px-4 py-3 text-sm font-medium text-gray-900">{item.blok}</td>
							<td class="px-4 py-3 text-sm font-medium text-gray-900">{item.penghuni_nama || '-'}</td>
							<td class="px-4 py-3 text-sm text-gray-600">{item.penghuni_hp || '-'}</td>
							<td class="px-4 py-3 text-sm text-orange-600 font-bold">{item.bulan_tunggak} bulan</td>
							<td class="px-4 py-3 text-sm text-red-600 font-mono font-bold">{formatRupiah(item.total_tunggakan)}</td>
							<td class="px-4 py-3 text-sm">
								<button
									onclick={() => toggleExpand(item.blok_rumah_id)}
									class="text-blue-600 hover:text-blue-800 font-medium"
														aria-expanded={expandedRows.includes(item.blok_rumah_id)}
								>
										<i class="fa-solid {expandedRows.includes(item.blok_rumah_id) ? 'fa-chevron-up' : 'fa-chevron-down'}"></i> Detail
								</button>
							</td>
						</tr>
											{#if expandedRows.includes(item.blok_rumah_id)}
							<tr class="bg-gray-50">
								<td colspan="7" class="px-4 py-2">
									<table class="w-full text-sm border-t border-gray-200">
										<thead>
											<tr class="bg-gray-100">
												<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Periode</th>
												<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Nominal</th>
												<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Status</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-gray-100">
											{#each item.detail as d}
												<tr>
													<td class="px-4 py-2 text-gray-600">{d.periode}</td>
													<td class="px-4 py-2 text-red-600 font-mono">{formatRupiah(d.nominal)}</td>
													<td class="px-4 py-2">
														<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
															<i class="fa-solid fa-circle-exclamation"></i> Belum Bayar
														</span>
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
				<tfoot class="bg-gray-50 border-t border-gray-200 font-bold">
					<tr>
						<td colspan="4" class="px-4 py-3 text-sm text-gray-900 text-right">GRAND TOTAL</td>
						<td class="px-4 py-3 text-sm text-orange-600">{grandTotal.total_bulan} bulan</td>
						<td class="px-4 py-3 text-sm text-red-600 font-mono">{formatRupiah(grandTotal.total_nominal)}</td>
						<td></td>
					</tr>
				</tfoot>
			</table>
		{:else}
			<div class="p-12 text-center">
				<i class="fa-solid fa-exclamation-triangle text-4xl text-gray-300 mb-4"></i>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Tidak ada tunggakan</h3>
				<p class="text-gray-500">Semua tagihan sudah lunas untuk filter ini.</p>
			</div>
		{/if}
	</div>
</div>