<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let transfers = $derived(data?.transfers || []);
	let summary = $derived(data?.summary || { total_nominal: 0, jumlah_transfer: 0 });
	let filter = $derived(data?.filter || { periode: '', kasFilter: 'semua', statusFilter: 'semua' });
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

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function getStatusBadge(status) {
		return status === 'posted'
			? { class: 'bg-green-100 text-green-700', label: 'Posted', icon: 'fa-circle-check' }
			: status === 'pending'
				? { class: 'bg-yellow-100 text-yellow-700', label: 'Pending', icon: 'fa-clock' }
				: { class: 'bg-red-100 text-red-700', label: 'Rejected', icon: 'fa-circle-xmark' };
	}

	function updateFilter(key, value) {
		const params = new URLSearchParams(page.url.search);
		if (value === 'semua' || value === '') params.delete(key);
		else params.set(key, value);
		goto(`?${params.toString()}`);
	}

	function onPeriodeChange(e) { updateFilter('periode', e.target.value); }
	function onKasChange(e) { updateFilter('kas', e.target.value); }
	function onStatusChange(e) { updateFilter('status', e.target.value); }
	function clearFilters() { goto('/laporan/keuangan/transfer-kas'); }

	async function handleExport(type) {
		try {
			const params = new URLSearchParams(page.url.search);
			const format = type === 'excel' ? 'excel' : 'pdf';
			const url = `/laporan/keuangan/transfer-kas/export?format=${format}&${params.toString()}`;
			
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
			a.download = `transfer-kas-${filter.periode}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
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
			<h1 class="text-2xl font-bold text-gray-900">Transfer Antar Kas</h1>
			<p class="text-gray-500 text-sm">Rekap transfer antar rekening kas</p>
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
			<div class="w-full sm:w-48">
				<select id="status-filter" value={filter.statusFilter} onchange={onStatusChange} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
					<option value="semua">Semua Status</option>
					<option value="posted">Posted</option>
					<option value="pending">Pending</option>
					<option value="rejected">Rejected</option>
				</select>
			</div>
		</form>
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Jumlah Transfer (Posted)</p>
			<p class="text-2xl font-bold text-blue-600">{summary.jumlah_transfer}</p>
		</div>
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Total Nominal (Posted)</p>
			<p class="text-2xl font-bold text-gray-900">{formatRupiah(summary.total_nominal)}</p>
		</div>
	</div>

	<!-- Table -->
	<div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
		{#if transfers.length > 0}
			<table class="w-full text-left border-collapse min-w-full">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">No. Bukti</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Dari Kas</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ke Kas</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nominal</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Dibuat Oleh</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Diapprove Oleh</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each transfers as item, index}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
							<td class="px-4 py-3 text-sm text-gray-600">{formatDate(item.tanggal)}</td>
							<td class="px-4 py-3 text-sm text-gray-900 font-mono font-medium">{item.nomor_bukti || '-'}</td>
							<td class="px-4 py-3 text-sm">
								<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusBadge(item.status).class}">
									<i class="fa-solid {getStatusBadge(item.status).icon}"></i>
									{getStatusBadge(item.status).label}
								</span>
							</td>
							<td class="px-4 py-3 text-sm">
								<div class="font-medium text-gray-900">{item.dari_kode} - {item.dari_nama}</div>
								<div class="text-xs text-gray-500"><i class="fa-solid fa-arrow-up text-red-500 mr-1"></i>Keluar</div>
							</td>
							<td class="px-4 py-3 text-sm">
								<div class="font-medium text-gray-900">{item.ke_kode} - {item.ke_nama}</div>
								<div class="text-xs text-gray-500"><i class="fa-solid fa-arrow-down text-green-500 mr-1"></i>Masuk</div>
							</td>
							<td class="px-4 py-3 text-sm text-gray-900 font-mono font-medium">{formatRupiah(item.nominal)}</td>
							<td class="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={item.keterangan || '-'}>{item.keterangan || '-'}</td>
							<td class="px-4 py-3 text-sm text-gray-600">{item.created_by_nama || '-'}</td>
							<td class="px-4 py-3 text-sm text-gray-600">{item.approved_by_nama || '-'}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot class="bg-gray-50 border-t border-gray-200 font-bold">
					<tr>
						<td colspan="6" class="px-4 py-3 text-sm text-gray-900 text-right">TOTAL (Posted)</td>
						<td class="px-4 py-3 text-sm font-mono">{formatRupiah(summary.total_nominal)}</td>
						<td colspan="3"></td>
					</tr>
				</tfoot>
			</table>
		{:else}
			<div class="p-12 text-center">
				<i class="fa-solid fa-arrow-right-arrow-left text-4xl text-gray-300 mb-4"></i>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Tidak ada data</h3>
				<p class="text-gray-500">Tidak ada transfer untuk filter ini.</p>
			</div>
		{/if}
	</div>
</div>