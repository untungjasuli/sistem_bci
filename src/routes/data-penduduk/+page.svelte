<script>
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import KeluargaModal from './KeluargaModal.svelte';
	import EditIndividuModal from './EditIndividuModal.svelte';
	import PindahKeluarAnggotaModal from './PindahKeluarAnggotaModal.svelte';
	import PindahKeluarKeluargaModal from './PindahKeluarKeluargaModal.svelte';
	import MeninggalAnggotaModal from './MeninggalAnggotaModal.svelte';

	let { data } = $props();

	// Data dari server sudah dipaginasi, difilter, dan diurutkan
	// Client hanya tampilkan langsung
	let items = $derived(data.penduduk || []);
	let blokRumahItems = $derived(data.blokRumah || []);

	// Pagination state - sinkron dengan URL via page store
	let currentPage = $derived(parseInt(page.url.searchParams.get('page') || '1', 10));
	let itemsPerPage = $state(data.itemsPerPage || 10);
	const itemsPerPageOptions = [10, 25, 50, 100];

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
	let editTempatLahir = $state('');
	let editTanggalLahir = $state('');
	let editNomorHp = $state('');
	let editAgama = $state('');
	let editPekerjaan = $state('');
	let editStatusPerkawinan = $state('');

	let showPindahKeluarAnggota = $state(false);
	let pindahKeluarAnggotaData = $state({ id: '', nama: '', nik: '' });

	let showPindahKeluarKeluarga = $state(false);
	let pindahKeluarKeluargaData = $state({ keluarga_id: '', no_kk: '', jumlah_anggota: 0 });

	let showMeninggalAnggota = $state(false);
	let meninggalAnggotaData = $state({ id: '', nama: '', nik: '' });

	let toast = $state(null);

	// Dropdown state untuk mobile
	let openDropdownIndex = $state(-1);

	// Close dropdown saat klik di luar
	$effect(() => {
		function handleClickOutside(e) {
			if (openDropdownIndex !== -1 && !e.target.closest('[data-dropdown-menu]')) {
				openDropdownIndex = -1;
			}
		}
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	function showToast(type, message) {
		toast = { type, message };
		setTimeout(() => {
			toast = null;
		}, 5000); // durasi 5 detik
	}

	if (data?.success) {
		showToast('success', data.success);
	}
	if (data?.error) {
		showToast('error', data.error);
	}

	// Search state - hanya update saat submit, bukan tiap ketik
	let search = $state(data.search || '');
	let pendingSearch = $state(data.search || ''); // untuk input sebelum submit
	let blokFilter = $state(data.blokFilter || 'semua');

	// Sort state
	let sort = $state(data.sort || 'asc');
	let sortBy = $state(data.sortBy || 'nama');

	let totalPages = $derived(Math.ceil((data.total || items.length) / itemsPerPage) || 1);

	let displayItems = $derived(items);

	// Submit search - hanya saat Enter atau klik tombol cari
	function handleSearchSubmit(e) {
		e.preventDefault();
		search = pendingSearch;
		const params = new URLSearchParams();
		if (search) params.set('search', search);
		if (blokFilter !== 'semua') params.set('blok', blokFilter);
		params.set('sort', sort);
		params.set('sortBy', sortBy);
		params.set('page', '1');
		params.set('itemsPerPage', itemsPerPage.toString());
		goto(`?${params.toString()}`);
	}

	function onClearSearch() {
		search = '';
		pendingSearch = '';
		blokFilter = 'semua';
		const params = new URLSearchParams();
		params.set('sort', sort);
		params.set('sortBy', sortBy);
		params.set('page', '1');
		params.set('itemsPerPage', itemsPerPage.toString());
		goto(`?${params.toString()}`);
	}

	function onSortClick(column) {
		if (sortBy === column) {
			sort = sort === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = column;
			sort = 'asc';
		}
		const params = new URLSearchParams();
		if (search) params.set('search', search);
		params.set('sort', sort);
		params.set('sortBy', sortBy);
		params.set('page', '1');
		params.set('itemsPerPage', itemsPerPage.toString());
		goto(`?${params.toString()}`);
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
			if (Array.isArray(result.data) && result.data.length > 0) {
				anggotaFormRaw = result.data.map((a) => ({
					nik: a.nik || '',
					nama: a.nama || '',
					jenis_kelamin: a.jenis_kelamin || 'Laki-laki',
					tempat_lahir: a.tempat_lahir || '',
					tanggal_lahir: a.tanggal_lahir ? new Date(a.tanggal_lahir).toISOString().split('T')[0] : '',
					hub_keluarga: a.hub_keluarga || 'Anak',
					nomor_hp: a.nomor_hp || '',
					agama: a.agama || '',
					pekerjaan: a.pekerjaan || '',
					status_perkawinan: a.status_perkawinan || ''
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

	async function onKeluargaSave(success, message) {
		if (success) {
			showToast('success', message);
			await invalidateAll();
		} else {
			showToast('error', message);
			await invalidateAll();
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

	function openEditIndividu(id, nik, nama, jenisKelamin, tempatLahir, tanggalLahir, nomorHp, agama, pekerjaan, statusPerkawinan) {
		try {
			editingIndividuId = id;
			editNIK = nik || '';
			editNama = nama || '';
			editJenisKelamin = jenisKelamin || 'Laki-laki';
			editTempatLahir = tempatLahir || '';
			editTanggalLahir = toWibDateString(tanggalLahir);
			editNomorHp = nomorHp || '';
			editAgama = agama || '';
			editPekerjaan = pekerjaan || '';
			editStatusPerkawinan = statusPerkawinan || '';
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
		editTempatLahir = '';
		editTanggalLahir = '';
		editNomorHp = '';
		editAgama = '';
		editPekerjaan = '';
		editStatusPerkawinan = '';
	}

	async function handleSaveIndividu(success, message) {
		if (success) {
			showToast('success', message);
			await invalidateAll();
		} else {
			showToast('error', message);
			await invalidateAll();
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
			await invalidateAll();
		} catch (e) {
			console.error('Delete individu error:', e);
			showToast('error', 'Gagal menghapus data');
		}
	}

	// Mutasi handlers - panggil invalidateAll setelah sukses
	async function onMutasiSuccess(success, message) {
		if (success) {
			showToast('success', message);
			await invalidateAll();
		} else {
			showToast('error', message);
			await invalidateAll();
		}
	}

	function openPindahKeluarAnggota(id, nama, nik) {
		pindahKeluarAnggotaData = { id, nama, nik };
		showPindahKeluarAnggota = true;
	}

	function openPindahKeluarKeluarga(keluarga_id, no_kk, jumlah_anggota) {
		pindahKeluarKeluargaData = { keluarga_id, no_kk, jumlah_anggota };
		showPindahKeluarKeluarga = true;
	}

	function openMeninggalAnggota(id, nama, nik) {
		meninggalAnggotaData = { id, nama, nik };
		showMeninggalAnggota = true;
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
		<div class="flex items-center gap-3 w-full lg:w-auto">
			<button
				onclick={openAddModal}
				class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex-shrink-0"
				aria-label="Tambah Keluarga"
			>
				<i class="fa-solid fa-plus"></i>
				<span class="hidden lg:inline">Tambah Keluarga</span>
			</button>
		</div>
	</div>

	<!-- Search & Filter Card (mirip Surat RT) -->
	<div class="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
		<form onsubmit={handleSearchSubmit} class="flex flex-col sm:flex-row gap-4">
			<div class="relative flex-1 min-w-0">
				<label class="sr-only">Cari NIK / Nama / KK / Blok</label>
				<input type="text" name="search" value={pendingSearch} placeholder="Cari NIK / Nama / KK / Blok..."
					class="w-full pl-10 pr-12 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					oninput={(e) => (pendingSearch = e.currentTarget.value)}
					enterkeyhint="go" />
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
				{/if}
			</div>
			<select bind:value={blokFilter} onchange={handleSearchSubmit} class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
				<option value="semua">Semua Blok</option>
				{#each blokRumahItems as b}
					<option value={b.id}>{b.no_blok}</option>
				{/each}
			</select>
		</form>
	</div>

	{#if displayItems.length > 0}
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
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Nomor HP</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each displayItems as p, index}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-6 py-4 text-sm text-gray-600">{(currentPage - 1) * itemsPerPage + index + 1}</td>
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
							<td class="px-6 py-4 text-sm text-gray-600">{p.nomor_hp || '-'}</td>
							<td class="px-6 py-4 text-right">
								<div class="flex items-center justify-end gap-1 lg:gap-2">
									<!-- Desktop: Horizontal buttons -->
									<div class="hidden lg:flex items-center gap-1">
										<button
											onclick={() => openKeluargaFromTable(p.keluarga_id, p.no_kk, p.blok_rumah_id, p.status_rumah)}
											class="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
											title="Lihat Keluarga"
											aria-label="Lihat Keluarga"
										>
											<i class="fa-solid fa-users text-lg"></i>
										</button>
										<button
											onclick={() => openEditIndividu(p.id, p.nik, p.nama, p.jenis_kelamin, p.tempat_lahir, p.tanggal_lahir, p.nomor_hp, p.agama, p.pekerjaan, p.status_perkawinan)}
											class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
											title="Edit"
											aria-label="Edit"
										>
											<i class="fa-regular fa-pen-to-square text-lg"></i>
										</button>
										<button
											type="button"
											onclick={() => handleDeleteIndividu(p.id)}
											class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
											title="Hapus"
											aria-label="Hapus"
										>
											<i class="fa-regular fa-trash-can text-lg"></i>
										</button>
										{#if p.status_kependudukan === 'aktif' && p.hub_keluarga === 'Kepala Keluarga'}
											<button
												onclick={() => openPindahKeluarKeluarga(p.keluarga_id, p.no_kk, p.jumlah_anggota || 0)}
												class="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
												title="Pindah Keluar Keluarga"
												aria-label="Pindah Keluar Keluarga"
											>
												<i class="fa-solid fa-users-slash text-lg"></i>
											</button>
										{/if}
										{#if p.status_kependudukan === 'aktif'}
											<button
												onclick={() => openPindahKeluarAnggota(p.id, p.nama, p.nik)}
												class="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
												title="Pindah Keluar Individu"
												aria-label="Pindah Keluar Individu"
											>
												<i class="fa-solid fa-arrow-right-from-bracket text-lg"></i>
											</button>
											<button
												onclick={() => openMeninggalAnggota(p.id, p.nama, p.nik)}
												class="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
												title="Catat Meninggal"
												aria-label="Catat Meninggal"
											>
												<i class="fa-solid fa-cross text-lg"></i>
											</button>
										{/if}
									</div>

									<!-- Mobile: Dropdown -->
									<div class="lg:hidden relative" data-dropdown-menu>
										<button
											type="button"
											onclick={() => openDropdownIndex = openDropdownIndex === index ? -1 : index}
											class="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
											aria-expanded={openDropdownIndex === index}
											aria-haspopup="true"
										>
											<i class="fa-solid fa-ellipsis-v"></i>
										</button>
										{#if openDropdownIndex === index}
											<div class="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg animate-in fade-in zoom-in-95 z-50" role="menu">
												<button
													onclick={() => { openKeluargaFromTable(p.keluarga_id, p.no_kk, p.blok_rumah_id, p.status_rumah); openDropdownIndex = -1; }}
													class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
													role="menuitem"
												>
													<i class="fa-solid fa-users text-indigo-600 w-4"></i>
													<span class="text-indigo-600">Lihat Keluarga</span>
												</button>
												<button
													onclick={() => { openEditIndividu(p.id, p.nik, p.nama, p.jenis_kelamin, p.tempat_lahir, p.tanggal_lahir, p.nomor_hp, p.agama, p.pekerjaan, p.status_perkawinan); openDropdownIndex = -1; }}
													class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
													role="menuitem"
												>
													<i class="fa-regular fa-pen-to-square text-blue-600 w-4"></i>
													<span class="text-blue-600">Edit</span>
												</button>
												{#if p.status_kependudukan === 'aktif' && p.hub_keluarga === 'Kepala Keluarga'}
													<button
														onclick={() => { openPindahKeluarKeluarga(p.keluarga_id, p.no_kk, p.jumlah_anggota || 0); openDropdownIndex = -1; }}
														class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
														role="menuitem"
													>
														<i class="fa-solid fa-users-slash text-orange-600 w-4"></i>
														<span class="text-orange-600">Pindah Keluar KK</span>
													</button>
												{/if}
												{#if p.status_kependudukan === 'aktif'}
													<button
														onclick={() => { openPindahKeluarAnggota(p.id, p.nama, p.nik); openDropdownIndex = -1; }}
														class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
														role="menuitem"
													>
														<i class="fa-solid fa-arrow-right-from-bracket text-amber-600 w-4"></i>
														<span class="text-amber-600">Pindah Keluar</span>
													</button>
													<button
														onclick={() => { openMeninggalAnggota(p.id, p.nama, p.nik); openDropdownIndex = -1; }}
														class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
														role="menuitem"
													>
														<i class="fa-solid fa-cross text-gray-600 w-4"></i>
														<span class="text-gray-600">Catat Meninggal</span>
													</button>
												{/if}
												<button
													onclick={() => { handleDeleteIndividu(p.id); openDropdownIndex = -1; }}
													type="button"
													class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg flex items-center gap-2"
													role="menuitem"
												>
													<i class="fa-regular fa-trash-can w-4"></i>
													<span class="text-red-600">Hapus</span>
												</button>
											</div>
										{/if}
									</div>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination Controls -->
		<div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-4 py-3 bg-white border border-gray-200 rounded-lg">
			<div class="flex items-center gap-3">
				<label for="items-per-page-penduduk" class="text-sm text-gray-700">Tampilkan</label>
				<select
					id="items-per-page-penduduk"
					bind:value={itemsPerPage}
					onchange={() => {
						const params = new URLSearchParams();
						if (search) params.set('search', search);
						params.set('sort', sort);
						params.set('sortBy', sortBy);
						params.set('page', '1');
						params.set('itemsPerPage', itemsPerPage.toString());
						goto(`?${params.toString()}`);
					}}
					class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
				>
					{#each itemsPerPageOptions as opt}
						<option value={opt}>{opt} per halaman</option>
					{/each}
				</select>
			</div>
			<div class="flex items-center gap-2">
				<span class="text-sm text-gray-700">
					Halaman {currentPage} dari {totalPages} (Total: {data.total ?? displayItems.length} data)
				</span>
				<button
					onclick={() => {
						if (currentPage > 1) {
							const params = new URLSearchParams();
							if (search) params.set('search', search);
							params.set('sort', sort);
							params.set('sortBy', sortBy);
							params.set('page', (currentPage - 1).toString());
							params.set('itemsPerPage', itemsPerPage.toString());
							goto(`?${params.toString()}`);
						}
					}}
					disabled={currentPage === 1}
					class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					aria-label="Halaman sebelumnya"
				>
					<i class="fa-solid fa-chevron-left"></i>
				</button>
				<button
					onclick={() => {
						if (currentPage < totalPages) {
							const params = new URLSearchParams();
							if (search) params.set('search', search);
							params.set('sort', sort);
							params.set('sortBy', sortBy);
							params.set('page', (currentPage + 1).toString());
							params.set('itemsPerPage', itemsPerPage.toString());
							goto(`?${params.toString()}`);
						}
					}}
					disabled={currentPage === totalPages}
					class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					aria-label="Halaman selanjutnya"
				>
					<i class="fa-solid fa-chevron-right"></i>
				</button>
			</div>
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
		{editNomorHp}
		onClose={closeEditIndividu}
		onSave={handleSaveIndividu}
	/>

	<PindahKeluarAnggotaModal
		{showPindahKeluarAnggota}
		{pindahKeluarAnggotaData}
		onClose={() => { showPindahKeluarAnggota = false; pindahKeluarAnggotaData = { id: '', nama: '', nik: '' }; }}
		onSubmit={onMutasiSuccess}
	/>

	<PindahKeluarKeluargaModal
		{showPindahKeluarKeluarga}
		{pindahKeluarKeluargaData}
		onClose={() => { showPindahKeluarKeluarga = false; pindahKeluarKeluargaData = { keluarga_id: '', no_kk: '', jumlah_anggota: 0 }; }}
		onSubmit={onMutasiSuccess}
	/>

	<MeninggalAnggotaModal
		{showMeninggalAnggota}
		{meninggalAnggotaData}
		onClose={() => { showMeninggalAnggota = false; meninggalAnggotaData = { id: '', nama: '', nik: '' }; }}
		onSubmit={onMutasiSuccess}
	/>
</div>