<script>
	import { page } from '$app/state';
	import KeluargaModal from './KeluargaModal.svelte';
	import EditIndividuModal from './EditIndividuModal.svelte';

	let { data } = $props();

	let pendudukItems = $derived(data.penduduk || []);
	let blokRumahItems = $derived(data.blokRumah || []);
	let search = $state(data.search || '');
	let sort = $state(data.sort || 'asc');
	let sortBy = $state(data.sortBy || 'nama');

	let showModal = $state(false);
	let isEditKeluarga = $state(false);
	let editingKeluargaId = $state('');
	let anggotaFormRaw = $state([]);
	let noKk = $state('');
	let blokRumahId = $state('');
	let statusRumah = $state('sendiri');

	let showEditIndividu = $state(false);
	let editingIndividuId = $state('');
	let editNIK = $state('');
	let editNama = $state('');
	let editJenisKelamin = $state('Laki-laki');
	let editTanggalLahir = $state('');

	let toast = $state(null);

	function showToast(type, message) {
		toast = { type, message };
		setTimeout(() => {
			toast = null;
		}, 4000);
	}

	if (data?.success) {
		showToast('success', data.success);
	}
	if (data?.error) {
		showToast('error', data.error);
	}

	let sortedPenduduk = $derived(
		pendudukItems
			.filter((p) => !search || p.nik.toLowerCase().includes(search.toLowerCase()) || p.nama.toLowerCase().includes(search.toLowerCase()) || (p.no_kk && p.no_kk.toLowerCase().includes(search.toLowerCase())) || (p.no_blok && p.no_blok.toLowerCase().includes(search.toLowerCase())))
			.slice()
			.sort((a, b) => {
				const na = sortBy === 'no_blok' ? (a.no_blok || '').toLowerCase() : a.nama.toLowerCase();
				const nb = sortBy === 'no_blok' ? (b.no_blok || '').toLowerCase() : b.nama.toLowerCase();
				return sort === 'asc' ? na.localeCompare(nb) : nb.localeCompare(na);
			})
	);

	function updateUrl() {
		const params = new URLSearchParams();
		if (search) params.set('search', search);
		params.set('sort', sort);
		params.set('sortBy', sortBy);
		window.history.pushState(null, '', `?${params.toString()}`);
	}

	function onSearchInput(e) {
		search = e.target.value;
		updateUrl();
	}

	function onSortClick(column) {
		if (sortBy === column) {
			sort = sort === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = column;
			sort = 'asc';
		}
		updateUrl();
	}

	function onClearSearch() {
		search = '';
		updateUrl();
	}

	function openAddModal() {
		isEditKeluarga = false;
		editingKeluargaId = '';
		noKk = '';
		blokRumahId = '';
		statusRumah = 'sendiri';
		showModal = true;
	}

	function closeModal(success = false) {
		showModal = false;
		isEditKeluarga = false;
		editingKeluargaId = '';
		anggotaFormRaw = [];
		noKk = '';
		blokRumahId = '';
		statusRumah = 'sendiri';
	}

	async function openKeluargaFromTable(keluargaId, noKkVal, blokRumahIdVal, statusVal) {
		isEditKeluarga = true;
		editingKeluargaId = keluargaId;
		noKk = noKkVal || '';
		blokRumahId = blokRumahIdVal || '';
		statusRumah = statusVal || 'sendiri';

		// Fetch anggota keluarga dari server
		try {
			const res = await fetch(`/data-penduduk/anggota?keluarga_id=${encodeURIComponent(keluargaId)}`, {
				method: 'GET',
				credentials: 'include'
			});

			if (!res.ok) {
				showToast('error', `Server error: ${res.status}`);
				return;
			}

			const result = await res.json();

			if (result.error) {
				showToast('error', result.error);
				return;
			}
			console.log(result.data);
			if (Array.isArray(result.data) && result.data.length > 0) {
				anggotaFormRaw = result.data.map((a) => ({
					nik: a.nik || '',
					nama: a.nama || '',
					jenis_kelamin: a.jenis_kelamin || 'Laki-laki',
					tanggal_lahir: a.tanggal_lahir ? new Date(a.tanggal_lahir).toISOString().split('T')[0] : '',
					hub_keluarga: a.hub_keluarga || 'Anak'
				}));
			} else {
				anggotaFormRaw = [];
			}

			showModal = true;
		} catch (e) {
			console.error('Fetch anggota keluarga error:', e);
			showToast('error', 'Gagal mengambil data anggota keluarga');
		}
	}

	function onKeluargaSave(success) {
		if (success) {
			window.location.reload();
		}
	}

	// Konversi tanggal ke format YYYY-MM-DD dalam timezone GMT+7 (WIB)
	function toWibDateString(dateVal) {
		if (!dateVal) return '';
		const d = new Date(dateVal);
		if (isNaN(d.getTime())) return '';
		// Offset GMT+7 = 7 * 60 menit
		const offsetMs = 7 * 60 * 60 * 1000;
		const wib = new Date(d.getTime() + offsetMs);
		const y = wib.getUTCFullYear();
		const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
		const day = String(wib.getUTCDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	function openEditIndividu(id, nik, nama, jenisKelamin, tanggalLahir) {
		try {
			editingIndividuId = id;
			editNIK = nik || '';
			editNama = nama || '';
			editJenisKelamin = jenisKelamin || 'Laki-laki';
			editTanggalLahir = toWibDateString(tanggalLahir);
		} catch (e) {
			console.error('openEditIndividu error:', e);
		}
		showEditIndividu = true;
	}

	function closeEditIndividu() {
		showEditIndividu = false;
		editingIndividuId = '';
		editNIK = '';
		editNama = '';
		editJenisKelamin = 'Laki-laki';
		editTanggalLahir = '';
	}

	async function handleSaveIndividu(success) {
		if (success) {
			window.location.reload();
		}
	}

	async function handleDeleteIndividu(id) {
		if (!confirm('Yakin ingin menghapus data penduduk ini?')) return;

		const formData = new FormData();
		formData.append('id', id);

		try {
			const res = await fetch('?/deleteAnggota', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();
			if (!res.ok || result.error) {
				showToast('error', result.error || 'Gagal menghapus data');
				return;
			}
			showToast('success', result.success || 'Data penduduk berhasil dihapus');
			window.location.reload();
		} catch (e) {
			console.error('Delete individu error:', e);
			showToast('error', 'Gagal menghapus data');
		}
	}
</script>

{#if toast}
	<div
		class="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2"
		class:bg-green-50={toast.type === 'success'}
		class:text-green-700={toast.type === 'success'}
		class:border-green-200={toast.type === 'success'}
		class:bg-red-50={toast.type === 'error'}
		class:text-red-700={toast.type === 'error'}
		class:border-red-200={toast.type === 'error'}
	>
		{#if toast.type === 'success'}
			<i class="fa-solid fa-circle-check"></i>
		{:else}
			<i class="fa-solid fa-circle-exclamation"></i>
		{/if}
		<span>{toast.message}</span>
	</div>
{/if}

<div class="px-4 sm:px-6 lg:px-8 py-8">
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Data Penduduk</h1>
			<p class="text-gray-500 text-sm">Kelola data anggota penduduk secara individual</p>
		</div>
		<div class="flex items-center gap-3">
			<form
				onsubmit={(e) => e.preventDefault()}
				class="relative flex items-center"
			>
				<label class="sr-only">Cari NIK / Nama / KK / Blok</label>
				<div class="relative w-64">
					<input
						type="text"
						name="search"
						value={search}
						placeholder="Cari NIK / Nama / KK / Blok..."
						class="w-full pl-10 pr-12 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						oninput={onSearchInput}
					/>
					<i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
					{#if search}
						<button
							type="button"
							onclick={onClearSearch}
							class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
							title="Hapus pencarian"
						>
							<i class="fa-solid fa-times text-xs"></i>
						</button>
					{:else}
						<button
							type="submit"
							class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
							title="Cari"
						>
							<i class="fa-solid fa-magnifying-glass text-xs"></i>
						</button>
					{/if}
				</div>
			</form>
			<button
				onclick={openAddModal}
				class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
			>
				<i class="fa-solid fa-plus"></i>
				<span>Tambah Keluarga</span>
			</button>
		</div>
	</div>

	{#if sortedPenduduk.length > 0}
		<div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
			<table class="w-full text-left border-collapse min-w-full">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">KK</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">NIK</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors" onclick={() => onSortClick('nama')}>
							<div class="flex items-center gap-1">
								<span>Nama</span>
								<i class="fa-solid text-xs text-gray-400" class:fa-sort-up={sort === 'asc' && sortBy === 'nama'} class:fa-sort-down={sort === 'desc' && sortBy === 'nama'}></i>
							</div>
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis Kelamin</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl Lahir</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors" onclick={() => onSortClick('no_blok')}>
							<div class="flex items-center gap-1">
								<span>Blok</span>
								<i class="fa-solid text-xs text-gray-400" class:fa-sort-up={sort === 'asc' && sortBy === 'no_blok'} class:fa-sort-down={sort === 'desc' && sortBy === 'no_blok'}></i>
							</div>
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each sortedPenduduk as p, index}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
							<td class="px-6 py-4 text-sm text-gray-900 font-medium">{p.no_kk || '-'}</td>
							<td class="px-6 py-4 text-sm text-gray-900">{p.nik || '-'}</td>
							<td class="px-6 py-4 text-sm text-gray-900 font-medium">{p.nama}</td>
							<td class="px-6 py-4 text-sm text-gray-600">{p.jenis_kelamin}</td>
							<td class="px-6 py-4 text-sm text-gray-600">
								{#if p.tanggal_lahir}
									{new Date(p.tanggal_lahir).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
								{:else}
									-
								{/if}
							</td>
							<td class="px-6 py-4 text-sm text-gray-600">{p.no_blok || '-'}</td>
							<td class="px-6 py-4 text-right">
								<button
									onclick={() => openKeluargaFromTable(p.keluarga_id, p.no_kk, p.blok_rumah_id, p.status_rumah)}
									class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
									title="Lihat Keluarga"
								>
									<i class="fa-solid fa-users"></i>
								</button>
								<button
									onclick={() => openEditIndividu(p.id, p.nik, p.nama, p.jenis_kelamin, p.tanggal_lahir)}
									class="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 border border-transparent rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-colors"
									title="Edit"
								>
									<i class="fa-solid fa-pen-to-square"></i>
								</button>
								<button
									onclick={() => handleDeleteIndividu(p.id)}
									class="px-3 py-1.5 text-xs font-medium text-white bg-red-600 border border-transparent rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors"
									title="Hapus"
								>
									<i class="fa-solid fa-trash"></i>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3">
			<i class="fa-solid fa-circle-exclamation text-red-500"></i>
			<div>
				<h3 class="text-sm font-medium text-red-800">Tidak ada data</h3>
				<p class="text-sm text-red-600">Belum ada data penduduk yang terdaftar.</p>
			</div>
		</div>
	{/if}

	<KeluargaModal
		{showModal}
		{isEditKeluarga}
		{editingKeluargaId}
		{noKk}
		{blokRumahItems}
		{blokRumahId}
		{statusRumah}
		{anggotaFormRaw}
		onClose={closeModal}
		onSave={onKeluargaSave}
	/>

	<EditIndividuModal
		{showEditIndividu}
		{editingIndividuId}
		{editNIK}
		{editNama}
		{editJenisKelamin}
		{editTanggalLahir}
		onClose={closeEditIndividu}
		onSave={handleSaveIndividu}
	/>
</div>
