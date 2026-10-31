<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let tagihan = $derived(data?.tagihan || []);
	let summary = $derived(data?.summary || { lunas: { jumlah: 0, total: 0 }, belum_bayar: { jumlah: 0, total: 0 } });
	let grandTotal = $derived(data?.grandTotal || { jumlah: 0, total_nominal: 0 });
	let filter = $derived(data?.filter || { periode: '', blokFilter: 'semua', statusFilter: 'semua' });
	let blokRumah = $derived(data?.blokRumah || []);

	let toast = $state(null);

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

	function getStatusBadge(status) {
		return status === 'lunas'
			? { class: 'bg-green-100 text-green-700', label: 'Lunas', icon: 'fa-circle-check' }
			: { class: 'bg-red-100 text-red-700', label: 'Belum Bayar', icon: 'fa-circle-exclamation' };
	}

	function updateFilter(key, value) {
		const params = new URLSearchParams(page.url.search);
		if (value === 'semua' || value === '') params.delete(key);
		else params.set(key, value);
		goto(`?${params.toString()}`);
	}

	function onPeriodeChange(e) { updateFilter('periode', e.target.value); }
	function onBlokChange(e) { updateFilter('blok', e.target.value); }
	function onStatusChange(e) { updateFilter('status', e.target.value); }
	function clearFilters() { goto('/laporan/tagihan/rekap-periode'); }
	function handleExport() { showToast('info', 'Export menyusul'); }
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
			<h1 class="text-2xl font-bold text-gray-900">Rekap Tagihan per Periode</h1>
			<p class="text-gray-500 text-sm">Rekap tagihan iuran bulanan per periode</p>
		</div>
		<div class="flex items-center gap-3 w-full lg:w-auto">
			<button onclick={handleExport} class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex-shrink-0">
				<i class="fa-solid fa-download"></i>
				<span class="hidden lg:inline">Export</span>
			</button>
		</div>
	</div>

	<!-- Filter Bar -->
	<div class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
		<form onsubmit={(e) => e.preventDefault()} class="flex flex-col sm:flex-row gap-4 items-end">
			<div class="flex-1 min-w-0">
				<label for="periode" class="block text-sm font-medium text-gray-700 mb-1">Periode <span class="text-red-500">*</span></label>
				<input type="month" id="periode" value={filter.periode} onchange={onPeriodeChange} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" required />
			</div>
			<div class="w-full sm:w-48">
				<label for="blok-filter" class="block text-sm font-medium text-gray-700 mb-1">Blok Rumah</label>
				<select id="blok-filter" value={filter.blokFilter} onchange={onBlokChange} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
					<option value="semua">Semua Blok</option>
					{#each blokRumah as br}<option value={br.id}>{br.label}</option>{/each}
				</select>
			</div>
			<div class="w-full sm:w-40">
				<label for="status-filter" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
				<select id="status-filter" value={filter.statusFilter} onchange={onStatusChange} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
					<option value="semua">Semua</option>
					<option value="lunas">Lunas</option>
					<option value="belum_bayar">Belum Bayar</option>
				</select>
			</div>
			{#if filter.blokFilter !== 'semua' || filter.statusFilter !== 'semua'}
				<button type="button" onclick={clearFilters} class="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors h-fit">
					<i class="fa-solid fa-xmark mr-1"></i> Clear
				</button>
			{/if}
		</form>
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Total Tagihan</p>
			<p class="text-2xl font-bold text-gray-900">{formatRupiah(grandTotal.total_nominal)}</p>
			<p class="text-xs text-gray-400 mt-1">{grandTotal.jumlah} tagihan</p>
		</div>
		<div class="bg-white rounded-lg border border-green-200 p-4">
			<p class="text-sm text-gray-500">Lunas</p>
			<p class="text-2xl font-bold text-green-600">{formatRupiah(summary.lunas?.total || 0)}</p>
			<p class="text-xs text-gray-400 mt-1">{summary.lunas?.jumlah || 0} tagihan</p>
		</div>
		<div class="bg-white rounded-lg border border-red-200 p-4">
			<p class="text-sm text-gray-500">Belum Bayar</p>
			<p class="text-2xl font-bold text-red-600">{formatRupiah(summary.belum_bayar?.total || 0)}</p>
			<p class="text-xs text-gray-400 mt-1">{summary.belum_bayar?.jumlah || 0} tagihan</p>
		</div>
	</div>

	<!-- Table -->
	<div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
		{#if tagihan.length > 0}
			<table class="w-full text-left border-collapse min-w-full">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Blok - No Rumah</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Penghuni/Pemilik</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Periode</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nominal</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl Bayar</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Metode</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each tagihan as item, index}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
							<td class="px-4 py-3 text-sm font-medium text-gray-900">{item.blok}</td>
							<td class="px-4 py-3 text-sm text-gray-600">{item.penghuni_nama || '-'}</td>
							<td class="px-4 py-3 text-sm text-gray-600">{item.periode}</td>
							<td class="px-4 py-3 text-sm text-gray-900 font-mono font-medium">{formatRupiah(item.nominal)}</td>
							<td class="px-4 py-3 text-sm">
								<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusBadge(item.status).class}">
									<i class="fa-solid {getStatusBadge(item.status).icon}"></i>
									{getStatusBadge(item.status).label}
								</span>
							</td>
							<td class="px-4 py-3 text-sm text-gray-600">{formatDate(item.tanggal_bayar)}</td>
							<td class="px-4 py-3 text-sm text-gray-600">{item.metode_bayar || '-'}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot class="bg-gray-50 border-t border-gray-200 font-bold">
					<tr>
						<td colspan="4" class="px-4 py-3 text-sm text-gray-900 text-right">TOTAL</td>
						<td class="px-4 py-3 text-sm font-mono">{formatRupiah(grandTotal.total_nominal)}</td>
						<td colspan="3"></td>
					</tr>
				</tfoot>
			</table>
		{:else}
			<div class="p-12 text-center">
				<i class="fa-solid fa-file-invoice-dollar text-4xl text-gray-300 mb-4"></i>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Tidak ada data</h3>
				<p class="text-gray-500">Tidak ada tagihan untuk filter ini.</p>
			</div>
		{/if}
	</div>
</div>