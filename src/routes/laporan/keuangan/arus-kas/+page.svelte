<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let arusKas = $derived(data?.arusKas || []);
	let summary = $derived(data?.summary || { total_debit: 0, total_kredit: 0 });
	let filter = $derived(data?.filter || { periode: '', kasFilter: 'semua', kategoriFilter: 'semua', tipeFilter: 'semua' });
	let kasAccounts = $derived(data?.kasAccounts || []);
	let kategoriKas = $derived(data?.kategoriKas || []);

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

	function getTipeBadge(tipe) {
		return tipe === 'debit'
			? { class: 'bg-green-100 text-green-700', label: 'Masuk', icon: 'fa-arrow-down' }
			: { class: 'bg-red-100 text-red-700', label: 'Keluar', icon: 'fa-arrow-up' };
	}

	function updateFilter(key, value) {
		const params = new URLSearchParams(page.url.search);
		if (value === 'semua' || value === '') {
			params.delete(key);
		} else {
			params.set(key, value);
		}
		goto(`?${params.toString()}`);
	}

	function onPeriodeChange(e) {
		updateFilter('periode', e.target.value);
	}

	function onKasChange(e) {
		updateFilter('kas', e.target.value);
	}

	function onKategoriChange(e) {
		updateFilter('kategori', e.target.value);
	}

	function onTipeChange(e) {
		updateFilter('tipe', e.target.value);
	}

	function clearFilters() {
		goto('/laporan/keuangan/arus-kas');
	}

	function handleExport() {
		// TODO: Implement export Excel/PDF
		showToast('info', 'Export menyusul');
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
			<h1 class="text-2xl font-bold text-gray-900">Laporan Arus Kas</h1>
			<p class="text-gray-500 text-sm">Laporan pemasukan dan pengeluaran kas per periode</p>
		</div>
		<div class="flex items-center gap-3 w-full lg:w-auto">
			<button
				onclick={handleExport}
				class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex-shrink-0"
			>
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
				<input
					type="month"
					id="periode"
					value={filter.periode}
					onchange={onPeriodeChange}
					class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					required
				/>
			</div>
			<div class="w-full sm:w-48">
				<label for="kas-filter" class="block text-sm font-medium text-gray-700 mb-1">Rekening Kas</label>
				<select
					id="kas-filter"
					value={filter.kasFilter}
					onchange={onKasChange}
					class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
				>
					<option value="semua">Semua Kas</option>
					{#each kasAccounts as ka}
						<option value={ka.id}>{ka.kode} - {ka.nama}</option>
					{/each}
				</select>
			</div>
			<div class="w-full sm:w-48">
				<label for="kategori-filter" class="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
				<select
					id="kategori-filter"
					value={filter.kategoriFilter}
					onchange={onKategoriChange}
					class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
				>
					<option value="semua">Semua Kategori</option>
					{#each kategoriKas as kk}
						<option value={kk.id}>{kk.kode} - {kk.nama}</option>
					{/each}
				</select>
			</div>
			<div class="w-full sm:w-40">
				<label for="tipe-filter" class="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
				<select
					id="tipe-filter"
					value={filter.tipeFilter}
					onchange={onTipeChange}
					class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
				>
					<option value="semua">Semua</option>
					<option value="debit">Masuk (Debit)</option>
					<option value="kredit">Keluar (Kredit)</option>
				</select>
			</div>
			{#if filter.kasFilter !== 'semua' || filter.kategoriFilter !== 'semua' || filter.tipeFilter !== 'semua'}
				<button
					type="button"
					onclick={clearFilters}
					class="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors h-fit"
				>
					<i class="fa-solid fa-xmark mr-1"></i> Clear
				</button>
			{/if}
		</form>
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Total Pemasukan (Debit)</p>
			<p class="text-2xl font-bold text-green-600">{formatRupiah(summary.total_debit)}</p>
		</div>
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Total Pengeluaran (Kredit)</p>
			<p class="text-2xl font-bold text-red-600">{formatRupiah(summary.total_kredit)}</p>
		</div>
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Saldo Bersih</p>
			<p class="text-2xl font-bold {summary.total_debit - summary.total_kredit >= 0 ? 'text-green-600' : 'text-red-600'}">{formatRupiah(summary.total_debit - summary.total_kredit)}</p>
		</div>
	</div>

	<!-- Table -->
	<div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
		{#if arusKas.length > 0}
			<table class="w-full text-left border-collapse min-w-full">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">No. Bukti</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Rekening Kas</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nominal</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each arusKas as item, index}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
							<td class="px-4 py-3 text-sm text-gray-600">{formatDate(item.tanggal)}</td>
							<td class="px-4 py-3 text-sm text-gray-900 font-mono font-medium">{item.nomor_bukti || '-'}</td>
							<td class="px-4 py-3 text-sm">
								<div class="font-medium text-gray-900">{item.kas_kode} - {item.kas_nama}</div>
							</td>
							<td class="px-4 py-3 text-sm">
								<div class="font-medium text-gray-900">{item.kategori_kode} - {item.kategori_nama}</div>
							</td>
							<td class="px-4 py-3 text-sm">
								{#if getTipeBadge(item.tipe).class}
									<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium {getTipeBadge(item.tipe).class}">
										<i class="fa-solid {getTipeBadge(item.tipe).icon}"></i>
										{getTipeBadge(item.tipe).label}
									</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-sm text-gray-900 font-mono font-medium {item.tipe === 'debit' ? 'text-green-600' : 'text-red-600'}">
								{item.tipe === 'debit' ? '+' : '-'}{formatRupiah(item.nominal)}
							</td>
							<td class="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={item.keterangan || '-'}>
								{item.keterangan || '-'}
							</td>
						</tr>
					{/each}
				</tbody>
				<!-- Summary Row -->
				<tfoot class="bg-gray-50 border-t border-gray-200">
					<tr>
						<td colspan="6" class="px-4 py-3 text-sm font-medium text-gray-700 text-right">TOTAL</td>
						<td class="px-4 py-3 text-sm font-bold text-green-600">{formatRupiah(summary.total_debit)}</td>
						<td colspan="1"></td>
					</tr>
					<tr>
						<td colspan="6" class="px-4 py-3 text-sm font-medium text-gray-700 text-right">TOTAL</td>
						<td class="px-4 py-3 text-sm font-bold text-red-600">{formatRupiah(summary.total_kredit)}</td>
						<td colspan="1"></td>
					</tr>
					<tr>
						<td colspan="6" class="px-4 py-3 text-sm font-bold text-gray-900 text-right">SALDO BERSIH</td>
						<td class="px-4 py-3 text-sm font-bold {summary.total_debit - summary.total_kredit >= 0 ? 'text-green-600' : 'text-red-600'}">{formatRupiah(summary.total_debit - summary.total_kredit)}</td>
						<td colspan="1"></td>
					</tr>
				</tfoot>
			</table>
		{:else}
			<div class="p-12 text-center">
				<i class="fa-solid fa-receipt text-4xl text-gray-300 mb-4"></i>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Tidak ada data</h3>
				<p class="text-gray-500">Tidak ada transaksi arus kas untuk filter ini.</p>
			</div>
		{/if}
	</div>
</div>