<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let total = $derived(data?.total || { total_keluarga: 0, total_warga: 0 });
	let byJenisKelamin = $derived(data?.byJenisKelamin || { L: 0, P: 0 });
	let byStatusRumah = $derived(data?.byStatusRumah || {});
	let byHubKeluarga = $derived(data?.byHubKeluarga || []);
	let byBlok = $derived(data?.byBlok || []);
	let filter = $derived(data?.filter || { blokFilter: 'semua' });
	let blokRumah = $derived(data?.blokRumah || []);

	let toast = $state(null);

	function showToast(type, message) {
		toast = { type, message };
		setTimeout(() => { toast = null; }, 5000);
	}

	function formatNumber(num) {
		return new Intl.NumberFormat('id-ID').format(num);
	}

	function getHubLabel(hub) {
		const labels = { 'kepala': 'Kepala Keluarga', 'istri': 'Istri', 'anak': 'Anak', 'lainnya': 'Lainnya' };
		return labels[hub] || hub;
	}

	function getStatusLabel(status) {
		if (status === 'sendiri') return 'Rumah Sendiri';
		if (status === 'ngontrak') return 'Ngontrak';
		if (status === 'ikut_ortu_mertua') return 'Ikut Orang Tua/Mertua';
		return status;
	}

	function updateFilter(key, value) {
		const params = new URLSearchParams(page.url.search);
		if (value === 'semua' || value === '') params.delete(key);
		else params.set(key, value);
		goto(`?${params.toString()}`);
	}

	function onBlokChange(e) { updateFilter('blok', e.target.value); }
	function clearFilters() { goto('/laporan/kependudukan/statistik'); }

	async function handleExport(type) {
		try {
			const params = new URLSearchParams(page.url.search);
			const format = type === 'excel' ? 'excel' : 'pdf';
			const url = `/laporan/kependudukan/statistik/export?format=${format}&${params.toString()}`;

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
			a.download = `statistik-penduduk-${filter.blokFilter}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(blobUrl);
			showToast('success', `Export ${type.toUpperCase()} berhasil`);
		} catch (e) {
			console.error('Export error:', e);
			showToast('error', 'Gagal export file');
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
			<h1 class="text-2xl font-bold text-gray-900">Statistik Penduduk</h1>
			<p class="text-gray-500 text-sm">Ringkasan statistik data warga dan keluarga</p>
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
			<div class="w-full sm:w-48">
				<label for="blok-filter" class="block text-sm font-medium text-gray-700 mb-1">Blok Rumah</label>
				<select id="blok-filter" value={filter.blokFilter} onchange={onBlokChange} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
					<option value="semua">Semua Blok</option>
					{#each blokRumah as b}<option value={b.id}>{b.no_blok}</option>{/each}
				</select>
			</div>
			{#if filter.blokFilter !== 'semua'}
				<button type="button" onclick={clearFilters} class="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors h-fit">
					<i class="fa-solid fa-xmark mr-1"></i> Clear
				</button>
			{/if}
		</form>
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Total Keluarga (KK)</p>
			<p class="text-3xl font-bold text-blue-600">{formatNumber(total.total_keluarga)}</p>
		</div>
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Total Warga</p>
			<p class="text-3xl font-bold text-gray-900">{formatNumber(total.total_warga)}</p>
		</div>
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Jenis Kelamin</p>
			<div class="flex items-center justify-between gap-4 mt-2">
				<div class="text-center flex-1">
					<p class="text-2xl font-bold text-blue-600">{formatNumber(byJenisKelamin.L || 0)}</p>
					<p class="text-xs text-gray-400">Laki-laki</p>
				</div>
				<div class="w-px h-8 bg-gray-200"></div>
				<div class="text-center flex-1">
					<p class="text-2xl font-bold text-pink-600">{formatNumber(byJenisKelamin.P || 0)}</p>
					<p class="text-xs text-gray-400">Perempuan</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Charts/Tables -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
		<!-- Status Rumah -->
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Per Status Rumah</h3>
			<div class="space-y-3">
				{#each Object.entries(byStatusRumah) as [status, data]}
					<div>
						<div class="flex justify-between text-sm mb-1">
							<span class="font-medium">{getStatusLabel(status)}</span>
							<span class="text-gray-600">{formatNumber(data.keluarga)} KK / {formatNumber(data.warga)} warga</span>
						</div>
						<div class="w-full bg-gray-200 rounded-full h-2">
							<div class="bg-blue-600 h-2 rounded-full" style="width: {total.total_keluarga > 0 ? (data.keluarga / total.total_keluarga * 100) : 0}%"></div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Hubungan Keluarga -->
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Per Hubungan Keluarga</h3>
			<div class="space-y-3">
				{#each byHubKeluarga as item}
					<div>
						<div class="flex justify-between text-sm mb-1">
							<span class="font-medium">{getHubLabel(item.hub)}</span>
							<span class="text-gray-600">{formatNumber(item.jumlah)} orang</span>
						</div>
						<div class="w-full bg-gray-200 rounded-full h-2">
							<div class="bg-green-600 h-2 rounded-full" style="width: {total.total_warga > 0 ? (item.jumlah / total.total_warga * 100) : 0}%"></div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Per Blok -->
	<div class="bg-white rounded-lg border border-gray-200 p-4">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Per Blok Rumah</h3>
		<div class="overflow-x-auto">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Blok</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah KK</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah Warga</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Rata-rata Warga/KK</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each byBlok as item, index}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
							<td class="px-4 py-3 text-sm font-medium text-gray-900">{item.blok}</td>
							<td class="px-4 py-3 text-sm text-gray-600">{formatNumber(item.keluarga)}</td>
							<td class="px-4 py-3 text-sm text-gray-600">{formatNumber(item.warga)}</td>
							<td class="px-4 py-3 text-sm font-medium text-blue-600">{item.keluarga > 0 ? (item.warga / item.keluarga).toFixed(1) : '0'}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot class="bg-gray-50 border-t border-gray-200 font-bold">
					<tr>
						<td colspan="2" class="px-4 py-3 text-sm text-gray-900 text-right">TOTAL</td>
						<td class="px-4 py-3 text-sm">{formatNumber(total.total_keluarga)}</td>
						<td class="px-4 py-3 text-sm">{formatNumber(total.total_warga)}</td>
						<td class="px-4 py-3 text-sm font-medium text-blue-600">{total.total_keluarga > 0 ? (total.total_warga / total.total_keluarga).toFixed(1) : '0'}</td>
					</tr>
				</tfoot>
			</table>
		</div>
	</div>
</div>