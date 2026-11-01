<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let pembayaran = $derived(data?.pembayaran || []);
	let summaryByMetode = $derived(data?.summaryByMetode || []);
	let grandTotal = $derived(data?.grandTotal || { jumlah: 0, total_nominal: 0 });
	let filter = $derived(data?.filter || { periode: '', metodeFilter: 'semua' });
	let metodePembayaran = $derived(data?.metodePembayaran || []);

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

	function getMetodeIcon(metode) {
		const icons = {
			cash: 'fa-money-bill-wave',
			qris: 'fa-qrcode',
			transfer: 'fa-money-bill-transfer'
		};
		return icons[metode?.toLowerCase()] || 'fa-credit-card';
	}

	function updateFilter(key, value) {
		const params = new URLSearchParams(page.url.search);
		if (value === 'semua' || value === '') params.delete(key);
		else params.set(key, value);
		goto(`?${params.toString()}`);
	}

	function onPeriodeChange(e) { updateFilter('periode', e.target.value); }
	function onMetodeChange(e) { updateFilter('metode', e.target.value); }
	function clearFilters() { goto('/laporan/tagihan/pembayaran-metode'); }

	async function handleExport(type) {
		try {
			const params = new URLSearchParams(page.url.search);
			const format = type === 'excel' ? 'excel' : 'pdf';
			const url = `/laporan/tagihan/pembayaran-metode/export?format=${format}&${params.toString()}`;
			
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
			a.download = `pembayaran-metode-${filter.periode}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
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
			<h1 class="text-2xl font-bold text-gray-900">Pembayaran per Metode</h1>
			<p class="text-gray-500 text-sm">Rekap pembayaran iuran lunas dikelompokkan per metode pembayaran</p>
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
				<select id="metode-filter" value={filter.metodeFilter} onchange={onMetodeChange} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
					<option value="semua">Semua Metode</option>
					<option value="transfer">Transfer</option>
					<option value="qris">QRIS</option>
					<option value="cash">Cash</option>
				</select>
			</div>
		</form>
	</div>

	<!-- Summary by Metode -->
	<div class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Ringkasan per Metode Pembayaran</h3>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each summaryByMetode as m}
				<div class="p-4 rounded-lg border bg-blue-50 border-blue-200">
					<p class="text-sm font-medium text-gray-500">{m.metode_bayar}</p>
					<p class="text-xl font-bold text-blue-600">{formatRupiah(m.total_nominal)}</p>
					<p class="text-sm text-gray-500 mt-1">{m.jumlah} transaksi</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- Table -->
	<div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
		{#if pembayaran.length > 0}
			<table class="w-full text-left border-collapse min-w-full">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl Bayar</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Blok</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Penghuni/Pemilik</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Periode</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Metode</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nominal</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each pembayaran as item, index}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
							<td class="px-4 py-3 text-sm text-gray-600">{formatDate(item.tanggal_bayar)}</td>
							<td class="px-4 py-3 text-sm font-medium text-gray-900">{item.blok}</td>
							<td class="px-4 py-3 text-sm text-gray-600">{item.penghuni_nama || '-'}</td>
							<td class="px-4 py-3 text-sm text-gray-600">{item.periode}</td>
														<td class="px-4 py-3 text-sm">
															<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
																<i class="fa-solid {getMetodeIcon(item.metode_bayar)}"></i>
																{item.metode_bayar}
															</span>
														</td>
							<td class="px-4 py-3 text-sm text-green-600 font-mono font-medium">+{formatRupiah(item.nominal)}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot class="bg-gray-50 border-t border-gray-200 font-bold">
					<tr>
						<td colspan="6" class="px-4 py-3 text-sm text-gray-900 text-right">TOTAL</td>
						<td class="px-4 py-3 text-sm text-green-600 font-mono">+{formatRupiah(grandTotal.total_nominal)}</td>
					</tr>
				</tfoot>
			</table>
		{:else}
			<div class="p-12 text-center">
				<i class="fa-solid fa-credit-card text-4xl text-gray-300 mb-4"></i>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Tidak ada data</h3>
				<p class="text-gray-500">Tidak ada pembayaran lunas untuk filter ini.</p>
			</div>
		{/if}
	</div>
</div>