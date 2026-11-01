<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let kelompokList = $derived(data?.kelompokList || []);
	let grandTotal = $derived(data?.grandTotal || 0);
	let filter = $derived(data?.filter || { blokFilter: 'semua', jkFilter: 'semua' });
	let blokRumah = $derived(data?.blokRumah || []);

	let toast = $state(null);
	let expandedKelompok = $state([]);

	const kelompokOrder = [
		'Bayi (0-1 th)',
		'Balita (1-5 th)',
		'Anak-Anak (5-10 th)',
		'Remaja (10-19 th)',
		'Dewasa (19-44 th)',
		'Pra-Lansia (45-59 th)',
		'Lansia (60+ th)'
	];

	let orderedKelompok = $derived(
		kelompokOrder
			.map(nama => kelompokList.find(k => k.kelompok === nama))
			.filter(Boolean)
	);

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

	function getJkLabel(jk) {
		return jk === 'Laki-laki' ? 'L' : 'P';
	}

	function updateFilter(key, value) {
		const params = new URLSearchParams(page.url.search);
		if (value === 'semua' || value === '') params.delete(key);
		else params.set(key, value);
		goto(`?${params.toString()}`);
	}

	function onBlokChange(e) { updateFilter('blok', e.target.value); }
	function onJkChange(e) { updateFilter('jk', e.target.value); }
	function clearFilters() { goto('/laporan/kependudukan/kelompok-usia'); }
	function handleExport(format) {
		const baseUrl = '/laporan/kependudukan/kelompok-usia/export';
		const params = new URLSearchParams();
		params.set('format', format);
		if (filter.blokFilter !== 'semua') params.set('blok', filter.blokFilter);
		if (filter.jkFilter !== 'semua') params.set('jk', filter.jkFilter);
		
		fetch(`${baseUrl}?${params.toString()}`, {
			method: 'GET',
			credentials: 'include'
		})
		.then(res => {
			if (!res.ok) throw new Error('Export gagal');
			return res.blob();
		})
		.then(blob => {
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `warga-kelompok-usia-${filter.blokFilter}-${filter.jkFilter}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			a.remove();
			showToast('success', `Export ${format.toUpperCase()} berhasil`);
		})
		.catch(err => {
			console.error(err);
			showToast('error', 'Export gagal: ' + err.message);
		});
	}

		function toggleExpand(kelompok) {
			if (expandedKelompok.includes(kelompok)) {
				expandedKelompok = expandedKelompok.filter(k => k !== kelompok);
			} else {
				expandedKelompok = [...expandedKelompok, kelompok];
			}
		}

		function expandAll() {
			expandedKelompok = orderedKelompok.map(k => k.kelompok);
		}

		function collapseAll() {
			expandedKelompok = [];
		}

	function getKelompokColor(kelompok) {
		const colors = {
			'Bayi (0-1 th)': 'bg-pink-100 text-pink-700',
			'Balita (1-5 th)': 'bg-yellow-100 text-yellow-700',
			'Anak-Anak (5-10 th)': 'bg-orange-100 text-orange-700',
			'Remaja (10-19 th)': 'bg-blue-100 text-blue-700',
			'Dewasa (19-44 th)': 'bg-green-100 text-green-700',
			'Pra-Lansia (45-59 th)': 'bg-indigo-100 text-indigo-700',
			'Lansia (60+ th)': 'bg-purple-100 text-purple-700'
		};
		return colors[kelompok] || 'bg-gray-100 text-gray-700';
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
			<h1 class="text-2xl font-bold text-gray-900">Warga per Kelompok Usia</h1>
			<p class="text-gray-500 text-sm">Distribusi warga berdasarkan kelompok usia</p>
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
			<div class="w-full sm:w-48">
				<select id="blok-filter" value={filter.blokFilter} onchange={onBlokChange} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
					<option value="semua">Semua Blok</option>
					{#each blokRumah as b}<option value={b.id}>{b.no_blok}</option>{/each}
				</select>
			</div>
			<div class="w-full sm:w-40">
				<select id="jk-filter" value={filter.jkFilter} onchange={onJkChange} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
					<option value="semua">Semua Jenis Kelamin</option>
					<option value="L">Laki-laki</option>
					<option value="P">Perempuan</option>
				</select>
			</div>
		</form>
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Total Warga</p>
			<p class="text-3xl font-bold text-gray-900">{formatNumber(grandTotal)}</p>
		</div>
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Laki-laki</p>
			<p class="text-3xl font-bold text-blue-600">{formatNumber(kelompokList.reduce((s, k) => s + k.laki, 0))}</p>
		</div>
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Perempuan</p>
			<p class="text-3xl font-bold text-pink-600">{formatNumber(kelompokList.reduce((s, k) => s + k.perempuan, 0))}</p>
		</div>
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Jumlah Kelompok</p>
			<p class="text-3xl font-bold text-purple-600">{kelompokList.length}</p>
		</div>
	</div>

	<!-- Table per Kelompok Usia -->
	<div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
		{#if kelompokList.length > 0}
			{#each orderedKelompok as item}
				<div class="border-b border-gray-100 last:border-0">
					<!-- Kelompok Header -->
					<div class="bg-gray-50 px-4 py-3 flex items-center justify-between">
						<div class="flex items-center gap-3">
							<button
								onclick={() => toggleExpand(item.kelompok)}
								class="text-blue-600 hover:text-blue-800 font-medium"
							>
								<i class="fa-solid {expandedKelompok.includes(item.kelompok) ? 'fa-chevron-up' : 'fa-chevron-down'}"></i>
							</button>
							<span class="px-3 py-1 text-sm font-bold rounded-full {getKelompokColor(item.kelompok)}">{item.kelompok}</span>
							<div class="flex items-center gap-4 text-sm text-gray-600">
								<span>Total: <span class="font-bold text-gray-900">{item.total}</span></span>
								<span>L: <span class="font-bold text-blue-600">{item.laki}</span></span>
								<span>P: <span class="font-bold text-pink-600">{item.perempuan}</span></span>
								<span>%: <span class="font-bold text-gray-900">{grandTotal > 0 ? ((item.total / grandTotal) * 100).toFixed(1) : 0}%</span></span>
							</div>
						</div>
					</div>
					<!-- Warga Table -->
					{#if expandedKelompok.includes(item.kelompok)}
						<table class="w-full text-left border-collapse">
							<thead>
								<tr class="bg-gray-50 border-b border-gray-200">
									<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
									<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">NIK</th>
									<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
									<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">JK</th>
									<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Umur</th>
									<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Hub. Keluarga</th>
									<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Blok</th>
									<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">No. KK</th>
									<th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">No HP</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-100">
								{#each item.warga as w, index}
									<tr class="hover:bg-gray-50 transition-colors">
										<td class="px-4 py-2 text-sm text-gray-600">{index + 1}</td>
										<td class="px-4 py-2 text-sm font-mono text-gray-900">{w.nik || '-'}</td>
										<td class="px-4 py-2 text-sm font-medium text-gray-900">{w.nama}</td>
										<td class="px-4 py-2 text-sm text-center">
											<span class="px-2 py-0.5 rounded-full text-xs font-medium {w.jenis_kelamin === 'Laki-laki' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}">
												{getJkLabel(w.jenis_kelamin)}
											</span>
										</td>
										<td class="px-4 py-2 text-sm text-gray-600">{w.umur} thn</td>
										<td class="px-4 py-2 text-sm text-gray-600">{getHubLabel(w.hub_keluarga)}</td>
										<td class="px-4 py-2 text-sm font-medium text-gray-900">{w.no_blok}</td>
										<td class="px-4 py-2 text-sm font-mono text-gray-600">{w.no_kk}</td>
										<td class="px-4 py-2 text-sm text-gray-600">{w.nomor_hp || '-'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</div>
			{/each}
		{:else}
			<div class="p-12 text-center">
				<i class="fa-solid fa-user-group text-4xl text-gray-300 mb-4"></i>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Tidak ada data</h3>
				<p class="text-gray-500">Tidak ada warga untuk filter ini.</p>
			</div>
		{/if}
	</div>
</div>