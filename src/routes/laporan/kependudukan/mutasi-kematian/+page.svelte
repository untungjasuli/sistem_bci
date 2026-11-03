<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let mutasi = $derived(data?.mutasi || []);
	let summary = $derived(data?.summary || { total: 0, pindah_keluar: 0, meninggal: 0 });
	let availableYears = $derived(data?.availableYears || []);
	let filter = $derived(data?.filter || { yearFilter: 'semua', jenisFilter: 'semua' });

	let toast = $state(null);

	function showToast(type, message) {
		toast = { type, message };
		setTimeout(() => { toast = null; }, 5000);
	}

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function getJenisLabel(jenis) {
		const labels = {
			'pindah_keluar': 'Pindah Keluar',
			'meninggal': 'Meninggal',
			'pindah_datang': 'Pindah Datang',
			'lahir': 'Lahir'
		};
		return labels[jenis] || jenis;
	}

	function getJkLabel(jk) {
		return jk === 'Laki-laki' ? 'Laki-laki' : 'Perempuan';
	}

	function getHubLabel(hub) {
		const labels = { 'kepala': 'Kepala Keluarga', 'istri': 'Istri', 'anak': 'Anak', 'lainnya': 'Lainnya' };
		return labels[hub] || hub;
	}

	function getJenisColor(jenis) {
		if (jenis === 'pindah_keluar') return 'bg-blue-100 text-blue-700';
		if (jenis === 'meninggal') return 'bg-red-100 text-red-700';
		if (jenis === 'pindah_datang') return 'bg-green-100 text-green-700';
		if (jenis === 'lahir') return 'bg-purple-100 text-purple-700';
		return 'bg-gray-100 text-gray-700';
	}

	function updateFilter(key, value) {
		const params = new URLSearchParams(page.url.search);
		if (value === 'semua' || value === '') params.delete(key);
		else params.set(key, value);
		goto(`?${params.toString()}`);
	}

	function onYearChange(e) { updateFilter('tahun', e.target.value); }
	function onJenisChange(e) { updateFilter('jenis', e.target.value); }

	async function handleExport(type) {
		try {
			const params = new URLSearchParams(page.url.search);
			const format = type === 'excel' ? 'excel' : 'pdf';
			const url = `/laporan/kependudukan/mutasi-kematian/export?format=${format}&${params.toString()}`;

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
			a.download = `mutasi-kematian-${filter.yearFilter}-${filter.jenisFilter}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
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
			<h1 class="text-2xl font-bold text-gray-900">Mutasi Penduduk & Kematian</h1>
			<p class="text-gray-500 text-sm">Laporan mutasi pindah keluar dan kematian penduduk</p>
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
			<div class="w-full sm:w-40">
				<select id="tahun-filter" value={filter.yearFilter} onchange={onYearChange} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors">
					<option value="semua">Semua Tahun</option>
					{#each availableYears as tahun}
						<option value={String(tahun)}>{tahun}</option>
					{/each}
				</select>
			</div>
			<div class="w-full sm:w-48">
				<select id="jenis-filter" value={filter.jenisFilter} onchange={onJenisChange} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors">
					<option value="semua">Semua Jenis</option>
					<option value="pindah_keluar">Pindah Keluar</option>
					<option value="meninggal">Meninggal</option>
				</select>
			</div>
		</form>
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Total Mutasi</p>
			<p class="text-3xl font-bold text-blue-600">{summary.total} orang</p>
		</div>
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Pindah Keluar</p>
			<p class="text-3xl font-bold text-blue-600">{summary.pindah_keluar} orang</p>
		</div>
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Meninggal</p>
			<p class="text-3xl font-bold text-red-600">{summary.meninggal} orang</p>
		</div>
	</div>

	<!-- Table -->
	<div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
		{#if mutasi.length > 0}
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
						<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl Mutasi</th>
						<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis</th>
						<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">NIK</th>
						<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
						<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">JK</th>
						<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Umur</th>
						<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Hub. Keluarga</th>
						<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">No. KK</th>
						<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Blok</th>
						<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Alasan</th>
						<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Alamat Tujuan</th>
						<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">No Surat Pindah</th>
						<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each mutasi as item, index}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-4 py-2 text-sm text-gray-600">{index + 1}</td>
							<td class="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">{formatDate(item.tanggal_mutasi)}</td>
							<td class="px-4 py-2 text-sm">
								<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full {getJenisColor(item.jenis_mutasi)}">
									{getJenisLabel(item.jenis_mutasi)}
								</span>
							</td>
							<td class="px-4 py-2 text-sm font-mono text-gray-900">{item.nik || '-'}</td>
							<td class="px-4 py-2 text-sm font-medium text-gray-900">{item.nama}</td>
							<td class="px-4 py-2 text-sm text-gray-600">{getJkLabel(item.jenis_kelamin)}</td>
							<td class="px-4 py-2 text-sm text-gray-600 text-center">{item.umur_saat_mutasi || '-'} thn</td>
							<td class="px-4 py-2 text-sm text-gray-600">{getHubLabel(item.hub_keluarga)}</td>
							<td class="px-4 py-2 text-sm font-mono text-gray-600">{item.no_kk}</td>
							<td class="px-4 py-2 text-sm text-gray-600 text-center">{item.no_blok}</td>
							<td class="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">{item.alasan || '-'}</td>
							<td class="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">
								{#if item.jenis_mutasi === 'pindah_keluar'}
									{item.alamat_tujuan || '-'}
									{#if item.rt_rw_tujuan} RT/RW {item.rt_rw_tujuan}{/if}
									{#if item.kelurahan_tujuan}, {item.kelurahan_tujuan}{/if}
									{#if item.kecamatan_tujuan}, {item.kecamatan_tujuan}{/if}
									{#if item.kota_tujuan}, {item.kota_tujuan}{/if}
									{#if item.provinsi_tujuan}, {item.provinsi_tujuan}{/if}
								{:else}
									-
								{/if}
							</td>
							<td class="px-4 py-2 text-sm text-gray-600">{item.no_surat_pindah || '-'}</td>
							<td class="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">{item.keterangan || '-'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<div class="p-12 text-center">
				<i class="fa-solid fa-right-left text-4xl text-gray-300 mb-4"></i>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Tidak ada data</h3>
				<p class="text-gray-500">Tidak ada data mutasi untuk filter ini.</p>
			</div>
		{/if}
	</div>
</div>