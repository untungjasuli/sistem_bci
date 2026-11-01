<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let saldoKas = $derived(data?.saldoKas || []);
	let grandTotal = $derived(data?.grandTotal || { saldo_awal: 0, total_debit: 0, total_kredit: 0, saldo_akhir: 0 });
	let filter = $derived(data?.filter || { periode: '', kasFilter: 'semua' });
	let kasAccounts = $derived(data?.kasAccounts || []);

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

	function onPeriodeChange(e) {
		updateFilter('periode', e.target.value);
	}

	function onKasChange(e) {
		updateFilter('kas', e.target.value);
	}

	function clearFilters() {
		goto('/laporan/keuangan/saldo-kas');
	}

	async function handleExport(type) {
		try {
			const params = new URLSearchParams(page.url.search);
			const format = type === 'excel' ? 'excel' : 'pdf';
			const url = `/laporan/keuangan/saldo-kas/export?format=${format}&${params.toString()}`;
			
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
			a.download = `saldo-kas-${filter.periode}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
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
			<h1 class="text-2xl font-bold text-gray-900">Laporan Saldo Kas</h1>
			<p class="text-gray-500 text-sm">Rekap saldo per rekening kas dan mutasi periode</p>
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
			<div class="flex-1 min-w-0">
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
		</form>
	</div>

	<!-- Summary Card -->
	<div class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
			<div class="p-4 bg-gray-50 rounded-lg">
				<p class="text-sm text-gray-500">Total Saldo Awal</p>
				<p class="text-xl font-bold text-gray-900">{formatRupiah(grandTotal.saldo_awal)}</p>
			</div>
			<div class="p-4 bg-green-50 rounded-lg">
				<p class="text-sm text-gray-500">Total Pemasukan</p>
				<p class="text-xl font-bold text-green-600">{formatRupiah(grandTotal.total_debit)}</p>
			</div>
			<div class="p-4 bg-red-50 rounded-lg">
				<p class="text-sm text-gray-500">Total Pengeluaran</p>
				<p class="text-xl font-bold text-red-600">{formatRupiah(grandTotal.total_kredit)}</p>
			</div>
			<div class="p-4 bg-blue-50 rounded-lg">
				<p class="text-sm text-gray-500">Total Saldo Akhir</p>
				<p class="text-xl font-bold text-blue-600">{formatRupiah(grandTotal.saldo_akhir)}</p>
			</div>
		</div>
	</div>

	<!-- Table -->
	<div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
		{#if saldoKas.length > 0}
			<table class="w-full text-left border-collapse min-w-full">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Kode</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Rekening Kas</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Awal</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Pemasukan</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Pengeluaran</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Akhir</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each saldoKas as item, index}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
							<td class="px-4 py-3 text-sm font-mono font-medium text-gray-900">{item.kode}</td>
							<td class="px-4 py-3 text-sm font-medium text-gray-900">{item.nama}</td>
							<td class="px-4 py-3 text-sm text-gray-900 font-mono font-medium">{formatRupiah(item.saldo_awal)}</td>
							<td class="px-4 py-3 text-sm text-green-600 font-mono font-medium">+{formatRupiah(item.total_debit)}</td>
							<td class="px-4 py-3 text-sm text-red-600 font-mono font-medium">-{formatRupiah(item.total_kredit)}</td>
							<td class="px-4 py-3 text-sm text-blue-600 font-mono font-medium font-bold">{formatRupiah(item.saldo_akhir)}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot class="bg-gray-50 border-t border-gray-200 font-bold">
					<tr>
						<td colspan="3" class="px-4 py-3 text-sm text-gray-900 text-right">GRAND TOTAL</td>
						<td class="px-4 py-3 text-sm font-mono">{formatRupiah(grandTotal.saldo_awal)}</td>
						<td class="px-4 py-3 text-sm text-green-600 font-mono">+{formatRupiah(grandTotal.total_debit)}</td>
						<td class="px-4 py-3 text-sm text-red-600 font-mono">-{formatRupiah(grandTotal.total_kredit)}</td>
						<td class="px-4 py-3 text-sm text-blue-600 font-mono">{formatRupiah(grandTotal.saldo_akhir)}</td>
					</tr>
				</tfoot>
			</table>
		{:else}
			<div class="p-12 text-center">
				<i class="fa-solid fa-wallet text-4xl text-gray-300 mb-4"></i>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Tidak ada data</h3>
				<p class="text-gray-500">Tidak ada rekening kas aktif.</p>
			</div>
		{/if}
	</div>
</div>