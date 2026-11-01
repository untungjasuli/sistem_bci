<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let transaksiKategori = $derived(data?.transaksiKategori || []);
	let summaryByTipe = $derived(data?.summaryByTipe || {});
	let grandTotal = $derived(data?.grandTotal || { total_debit: 0, total_kredit: 0, jumlah_transaksi: 0 });
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

	function updateFilter(key, value) {
		const params = new URLSearchParams(page.url.search);
		if (value === 'semua' || value === '') {
			params.delete(key);
		} else {
			params.set(key, value);
		}
		goto(`?${params.toString()}`);
	}

	function onPeriodeChange(e) { updateFilter('periode', e.target.value); }
	function onKasChange(e) { updateFilter('kas', e.target.value); }
	function onKategoriChange(e) { updateFilter('kategori', e.target.value); }
	function onTipeChange(e) { updateFilter('tipe', e.target.value); }

	function clearFilters() { goto('/laporan/keuangan/transaksi-kategori'); }

	async function handleExport(type) {
		try {
			const params = new URLSearchParams(page.url.search);
			const format = type === 'excel' ? 'excel' : 'pdf';
			const url = `/laporan/keuangan/transaksi-kategori/export?format=${format}&${params.toString()}`;
			
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
			a.download = `transaksi-kategori-${filter.periode}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
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

	function getTipeLabel(tipe) {
		return tipe === 'pemasukan' ? 'Pemasukan' : tipe === 'pengeluaran' ? 'Pengeluaran' : 'Lainnya';
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
			<h1 class="text-2xl font-bold text-gray-900">Transaksi per Kategori</h1>
			<p class="text-gray-500 text-sm">Rekap nominal transaksi dikelompokkan per kategori</p>
		</div>
		<div class="flex items-center gap-3 w-full lg:w-auto">
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
			<div class="w-full">
				<input type="month" id="periode" value={filter.periode} onchange={onPeriodeChange} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" required />
			</div>
			<div class="w-full sm:w-48">
				<select id="kas-filter" value={filter.kasFilter} onchange={onKasChange} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
					<option value="semua">Semua Kas</option>
					{#each kasAccounts as ka}<option value={ka.id}>{ka.kode} - {ka.nama}</option>{/each}
				</select>
			</div>
			<div class="w-full sm:w-60">
				<select id="kategori-filter" value={filter.kategoriFilter} onchange={onKategoriChange} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
					<option value="semua">Semua Kategori</option>
					{#each kategoriKas as kk}<option value={kk.id}>{kk.kode} - {kk.nama}</option>{/each}
				</select>
			</div>
			<div class="w-full sm:w-48">
				<select id="tipe-filter" value={filter.tipeFilter} onchange={onTipeChange} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
					<option value="semua">Semua Tipe</option>
					<option value="debit">Masuk (Debit)</option>
					<option value="kredit">Keluar (Kredit)</option>
				</select>
			</div>
		</form>
	</div>

	<!-- Summary by Tipe -->
	<div class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Ringkasan per Tipe Kategori</h3>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each ['pemasukan', 'pengeluaran', 'lainnya'] as tipe}
				{#if summaryByTipe[tipe]}
					<div class="p-4 rounded-lg border {tipe === 'pemasukan' ? 'bg-green-50 border-green-200' : tipe === 'pengeluaran' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}">
						<p class="text-sm font-medium text-gray-500 capitalize">{getTipeLabel(tipe)}</p>
						<p class="text-lg font-bold text-green-600">+{formatRupiah(summaryByTipe[tipe].total_debit)}</p>
						<p class="text-lg font-bold text-red-600">-{formatRupiah(summaryByTipe[tipe].total_kredit)}</p>
						<p class="text-sm font-bold {summaryByTipe[tipe].total_debit - summaryByTipe[tipe].total_kredit >= 0 ? 'text-green-600' : 'text-red-600'} mt-1">
							Net: {formatRupiah(summaryByTipe[tipe].total_debit - summaryByTipe[tipe].total_kredit)}
						</p>
					</div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Table -->
	<div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
		{#if transaksiKategori.length > 0}
			<table class="w-full text-left border-collapse min-w-full">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Kode</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah Transaksi</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Pemasukan</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Pengeluaran</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Net</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each transaksiKategori as item, index}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
							<td class="px-4 py-3 text-sm font-mono font-medium text-gray-900">{item.kategori_kode || '-'}</td>
							<td class="px-4 py-3 text-sm font-medium text-gray-900">{item.kategori_nama || '-'}</td>
							<td class="px-4 py-3 text-sm">
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {item.kategori_tipe === 'pemasukan' ? 'bg-green-100 text-green-700' : item.kategori_tipe === 'pengeluaran' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}">
									{getTipeLabel(item.kategori_tipe)}
								</span>
							</td>
							<td class="px-4 py-3 text-sm text-gray-600 text-center">{item.jumlah_transaksi}</td>
							<td class="px-4 py-3 text-sm text-green-600 font-mono font-medium">+{formatRupiah(item.total_debit)}</td>
							<td class="px-4 py-3 text-sm text-red-600 font-mono font-medium">-{formatRupiah(item.total_kredit)}</td>
							<td class="px-4 py-3 text-sm font-bold {item.total_debit - item.total_kredit >= 0 ? 'text-green-600' : 'text-red-600'} font-mono">{formatRupiah(item.total_debit - item.total_kredit)}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot class="bg-gray-50 border-t border-gray-200 font-bold">
					<tr>
						<td colspan="4" class="px-4 py-3 text-sm text-gray-900 text-right">GRAND TOTAL</td>
						<td class="px-4 py-3 text-sm text-gray-900 text-center">{grandTotal.jumlah_transaksi}</td>
						<td class="px-4 py-3 text-sm text-green-600 font-mono">+{formatRupiah(grandTotal.total_debit)}</td>
						<td class="px-4 py-3 text-sm text-red-600 font-mono">-{formatRupiah(grandTotal.total_kredit)}</td>
						<td class="px-4 py-3 text-sm font-bold {grandTotal.total_debit - grandTotal.total_kredit >= 0 ? 'text-green-600' : 'text-red-600'} font-mono">{formatRupiah(grandTotal.total_debit - grandTotal.total_kredit)}</td>
					</tr>
				</tfoot>
			</table>
		{:else}
			<div class="p-12 text-center">
				<i class="fa-solid fa-layer-group text-4xl text-gray-300 mb-4"></i>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Tidak ada data</h3>
				<p class="text-gray-500">Tidak ada transaksi untuk filter ini.</p>
			</div>
		{/if}
	</div>
</div>