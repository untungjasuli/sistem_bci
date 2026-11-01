<script>
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';

	let { data } = $props();

	let transaksi = $derived(data?.transaksi || []);
	let kasAccounts = $derived(data?.kasAccounts || []);
	let kategoriKas = $derived(data?.kategoriKas || []);
	let summary = $derived(data?.summary || { total_debit: 0, total_kredit: 0, total_pending: 0, total_rejected: 0 });
	let pagination = $derived(data?.pagination || {
		page: 1,
		itemsPerPage: 10,
		total: 0,
		totalPages: 1,
		search: '',
		statusFilter: 'semua',
		kasFilter: 'semua',
		kategoriFilter: 'semua',
		tipeFilter: 'semua',
		sortBy: 'tanggal',
		sort: 'desc'
	});
	let itemsPerPageOptions = $derived(data?.itemsPerPageOptions || [10, 25, 50, 100]);

	let showModal = $state(false);
	let editMode = $state(false);
	let currentTransaksi = $state({ id: '', kas_account_id: '', kategori_id: '', tipe: 'debit', nominal: 0, tanggal: '', keterangan: '', nomor_bukti: '' });
	let modalError = $state('');
	let modalFieldErrors = $state({});

	let openDropdownIndex = $state(-1);

	let toast = $state(null);

	function showToast(type, message) {
		// Extract message from object if needed
		let msg = message;
		if (typeof message === 'object' && message !== null) {
			msg = message.message || message.error || message.success || message.msg || JSON.stringify(message);
		}
		// Fallback if message is empty/undefined
		if (!msg) msg = type === 'success' ? 'Berhasil' : 'Terjadi kesalahan';
		
		toast = { type, message: msg };
		setTimeout(() => { toast = null; }, 5000);
	}

	$effect(() => {
		// Handle data from form action responses (after page reload)
		if (data?.success) {
			const msg = typeof data.success === 'string' ? data.success : 
				(data.success?.message || data.success?.success || data.success?.msg || JSON.stringify(data.success));
			showToast('success', msg);
		}
		if (data?.error) {
			const msg = typeof data.error === 'string' ? data.error : 
				(data.error?.message || data.error?.error || data.error?.msg || JSON.stringify(data.error));
			showToast('error', msg);
		}
	});

	function formatRupiah(num) {
		if (num === null || num === undefined) return 'Rp 0';
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
	}

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function getStatusBadge(status) {
		const badges = {
			draft: 'bg-gray-100 text-gray-700',
			pending: 'bg-yellow-100 text-yellow-700',
			posted: 'bg-green-100 text-green-700',
			rejected: 'bg-red-100 text-red-700'
		};
		const labels = { draft: 'Draft', pending: 'Menunggu', posted: 'Diposting', rejected: 'Ditolak' };
		return { class: badges[status] || badges.draft, label: labels[status] || status };
	}

	function getTipeBadge(tipe) {
		return tipe === 'debit' 
			? { class: 'bg-green-100 text-green-700', label: 'Masuk (Debit)', icon: 'fa-arrow-down' }
			: { class: 'bg-red-100 text-red-700', label: 'Keluar (Kredit)', icon: 'fa-arrow-up' };
	}

	function getRefTypeLabel(ref_type) {
		const labels = {
			iuran: 'Iuran',
			transfer_antar_kas: 'Transfer Antar Kas',
			manual: 'Manual',
			adjustment: 'Adjustment'
		};
		return labels[ref_type] || ref_type;
	}

	function openAddModal() {
		editMode = false;
		currentTransaksi = { 
			id: '',
			kas_account_id: kasAccounts[0]?.id || '', 
			kategori_id: '', 
			tipe: 'debit', 
			nominal: 0, 
			tanggal: new Date().toISOString().split('T')[0], 
			keterangan: '', 
			nomor_bukti: '' 
		};
		modalError = '';
		modalFieldErrors = {};
		showModal = true;
	}

	function openEditModal(t) {
		editMode = true;
		// Convert tanggal to YYYY-MM-DD in local timezone (GMT+7)
		let tanggalValue = '';
		if (t.tanggal) {
			const date = new Date(t.tanggal);
			// Adjust to GMT+7
			date.setMinutes(date.getMinutes() + 7 * 60);
			tanggalValue = date.toISOString().split('T')[0];
		}
		currentTransaksi = { 
			id: t.id,
			kas_account_id: t.kas_account_id, 
			kategori_id: t.kategori_id, 
			tipe: t.tipe, 
			nominal: t.nominal, 
			tanggal: tanggalValue, 
			keterangan: t.keterangan || '', 
			nomor_bukti: t.nomor_bukti || '' 
		};
		modalError = '';
		modalFieldErrors = {};
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editMode = false;
		currentTransaksi = { id: '', kas_account_id: '', kategori_id: '', tipe: 'debit', nominal: 0, tanggal: '', keterangan: '', nomor_bukti: '' };
		modalError = '';
		modalFieldErrors = {};
	}

	async function handleDelete(id) {
		if (!confirm('Yakin hapus transaksi manual ini?')) return;

		const formData = new FormData();
		formData.append('id', id);

		try {
			const res = await fetch('?/delete', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();

			// Parse SvelteKit form action response format
			// fail() returns: { type: 'failure', status: 400, data: '[{"error":1},"pesan error"]' }
			let actionResult = result;
			if (result.data && typeof result.data === 'string') {
				try {
					const parsed = JSON.parse(result.data);
					if (Array.isArray(parsed) && parsed.length >= 2) {
						actionResult = { error: parsed[1] };
					} else if (typeof parsed === 'object') {
						actionResult = parsed;
					}
				} catch {}
			}

			if (!res.ok || actionResult.error) {
				const serverError = actionResult.error || 'Gagal hapus';
				showToast('error', `Gagal hapus - ${serverError}`);
				return;
			}

			showToast('success', actionResult.success);
			await invalidateAll();
		} catch (err) {
			console.error('Delete error:', err);
			showToast('error', 'Gagal hapus data');
		}
	}

	function validateField(field, value) {
		const errors = {};
		if (field === 'kas_account_id' && !value) errors.kas_account_id = 'Rekening Kas wajib dipilih';
		if (field === 'kategori_id' && !value) errors.kategori_id = 'Kategori wajib dipilih';
		if (field === 'tipe' && !value) errors.tipe = 'Tipe wajib dipilih';
		if (field === 'nominal' && (!value || parseFloat(value) <= 0)) errors.nominal = 'Nominal harus > 0';
		if (field === 'tanggal' && !value) errors.tanggal = 'Tanggal wajib diisi';
		modalFieldErrors = { ...modalFieldErrors, ...errors };
		return Object.keys(errors).length === 0;
	}

	function getFilteredKategori() {
		const filtered = kategoriKas.filter(k => k.tipe === (currentTransaksi.tipe === 'debit' ? 'pemasukan' : 'pengeluaran'));
		// Ensure selected kategori is always in the list (for edit mode)
		if (currentTransaksi.kategori_id) {
			const selected = kategoriKas.find(k => String(k.id) === String(currentTransaksi.kategori_id));
			if (selected && !filtered.find(f => String(f.id) === String(selected.id))) {
				return [selected, ...filtered];
			}
		}
		return filtered;
	}

	async function handleSubmit(e) {
		e.preventDefault();
		modalError = '';
		modalFieldErrors = {};

		let valid = true;
		if (!currentTransaksi.kas_account_id) { modalFieldErrors.kas_account_id = 'Rekening Kas wajib dipilih'; valid = false; }
		if (!currentTransaksi.kategori_id) { modalFieldErrors.kategori_id = 'Kategori wajib dipilih'; valid = false; }
		if (!currentTransaksi.tipe) { modalFieldErrors.tipe = 'Tipe wajib dipilih'; valid = false; }
		if (!currentTransaksi.nominal || parseFloat(currentTransaksi.nominal) <= 0) { modalFieldErrors.nominal = 'Nominal harus > 0'; valid = false; }
		if (!currentTransaksi.tanggal) { modalFieldErrors.tanggal = 'Tanggal wajib diisi'; valid = false; }

		if (!valid) return;

		const formData = new FormData();
		formData.append('kas_account_id', currentTransaksi.kas_account_id);
		formData.append('kategori_id', currentTransaksi.kategori_id);
		formData.append('tipe', currentTransaksi.tipe);
		formData.append('nominal', currentTransaksi.nominal.toString());
		formData.append('tanggal', currentTransaksi.tanggal);
		formData.append('keterangan', currentTransaksi.keterangan);
		if (currentTransaksi.nomor_bukti) formData.append('nomor_bukti', currentTransaksi.nomor_bukti);

		const action = editMode ? 'update' : 'create';
		if (editMode) {
			formData.append('id', currentTransaksi.id);
		}

		try {
			const res = await fetch(`?/${action}`, {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();

			// Parse SvelteKit form action response format
			// fail() returns: { type: 'failure', status: 400, data: '[{"error":1},"pesan error"]' }
			// success returns: { type: 'success', status: 200, data: '[{"success":1},"pesan sukses"]' }
			let actionResult = result;
			if (result.data && typeof result.data === 'string') {
				try {
					const parsed = JSON.parse(result.data);
					if (Array.isArray(parsed) && parsed.length >= 2) {
						if (parsed[0]?.error) {
							actionResult = { error: parsed[1] };
						} else if (parsed[0]?.success) {
							actionResult = { success: parsed[1] };
						}
					} else if (typeof parsed === 'object') {
						actionResult = parsed;
					}
				} catch {}
			}

			if (!res.ok || actionResult.error) {
				if (actionResult.field_errors) {
					modalFieldErrors = actionResult.field_errors;
				} else {
					const serverError = actionResult.error || 'Gagal menyimpan';
					modalError = `Gagal menyimpan - ${serverError}`;
				}
				return;
			}

			showToast('success', actionResult.success);
			closeModal();
			await invalidateAll();
		} catch (err) {
			console.error('Submit error:', err);
			modalError = 'Gagal menyimpan data';
		}
	}

	function updateUrl() {
		const params = new URLSearchParams();
		params.set('page', pagination.page.toString());
		params.set('itemsPerPage', pagination.itemsPerPage.toString());
		if (pagination.search) params.set('search', pagination.search);
		if (pagination.statusFilter !== 'semua') params.set('status', pagination.statusFilter);
		if (pagination.kasFilter !== 'semua') params.set('kas', pagination.kasFilter);
		if (pagination.kategoriFilter !== 'semua') params.set('kategori', pagination.kategoriFilter);
		if (pagination.tipeFilter !== 'semua') params.set('tipe', pagination.tipeFilter);
		if (pagination.sortBy !== 'tanggal') params.set('sortBy', pagination.sortBy);
		if (pagination.sort !== 'desc') params.set('sort', pagination.sort);
		goto(`?${params.toString()}`);
	}

	function handleSearch(e) {
		e.preventDefault();
		pagination.page = 1;
		pagination.search = e.currentTarget.searchInput.value;
		updateUrl();
	}

	function clearSearch() {
		pagination.search = '';
		pagination.page = 1;
		updateUrl();
	}

	function changeFilter(filterName, value) {
		pagination.page = 1;
		pagination[filterName] = value;
		updateUrl();
	}

	function changeSort(newSortBy) {
		if (pagination.sortBy === newSortBy) {
			pagination.sort = pagination.sort === 'asc' ? 'desc' : 'asc';
		} else {
			pagination.sortBy = newSortBy;
			pagination.sort = 'desc';
		}
		pagination.page = 1;
		updateUrl();
	}

	function changePage(newPage) {
		if (newPage < 1 || newPage > pagination.totalPages) return;
		pagination.page = newPage;
		updateUrl();
	}

	function onItemsPerPageChange() {
		pagination.page = 1;
		updateUrl();
	}

	function getSortIcon(col) {
		if (pagination.sortBy !== col) return 'fa-sort';
		return pagination.sort === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
	}

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

	// Reset kategori when tipe changes (only in add mode, not edit mode)
	$effect(() => {
		if (currentTransaksi.tipe && !editMode) {
			currentTransaksi.kategori_id = '';
		}
	});
</script>

{#if toast}
	<div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2"
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
			<h1 class="text-2xl font-bold text-gray-900">Transaksi Kas</h1>
			<p class="text-gray-500 text-sm">Kelola transaksi masuk dan keluar kas</p>
		</div>
		<div class="flex items-center gap-3 w-full lg:w-auto">
			{#if data.user?.role === 'admin'}
				<button
					onclick={openAddModal}
					class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex-shrink-0"
					aria-label="Tambah Transaksi"
				>
					<i class="fa-solid fa-plus"></i>
					<span class="hidden lg:inline">Tambah Transaksi</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- Search & Filter Card (mirip Surat RT) -->
	<div class="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
		<form onsubmit={handleSearch} class="flex flex-col sm:flex-row gap-4">
			<div class="relative flex-1 min-w-0">
				<label class="sr-only">Cari Nomor Bukti / Keterangan / Kas / Kategori</label>
				<input type="text" name="searchInput" value={pagination.search} placeholder="Nomor Bukti / Keterangan / Kas / Kategori..."
					class="w-full pl-10 pr-12 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					oninput={(e) => pagination.search = e.currentTarget.value}
					enterkeyhint="go" />
				<i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
				{#if pagination.search}
					<button
						type="button"
						onclick={clearSearch}
						class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
						title="Hapus pencarian"
					>
						<i class="fa-solid fa-times text-xs"></i>
					</button>
				{/if}
			</div>
			<select bind:value={pagination.statusFilter} onchange={(e) => changeFilter('statusFilter', e.currentTarget.value)} class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
				<option value="semua">Semua Status</option>
				<option value="posted">Diposting</option>
				<option value="pending">Menunggu</option>
				<option value="rejected">Ditolak</option>
				<option value="draft">Draft</option>
			</select>
			<select bind:value={pagination.kasFilter} onchange={(e) => changeFilter('kasFilter', e.currentTarget.value)} class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
				<option value="semua">Semua Kas</option>
				{#each kasAccounts as ka}
					<option value={ka.id}>{ka.kode} - {ka.nama}</option>
				{/each}
			</select>
			<select bind:value={pagination.kategoriFilter} onchange={(e) => changeFilter('kategoriFilter', e.currentTarget.value)} class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
				<option value="semua">Semua Kategori</option>
				{#each kategoriKas as kk}
					<option value={kk.id}>{kk.kode} - {kk.nama}</option>
				{/each}
			</select>
			<select bind:value={pagination.tipeFilter} onchange={(e) => changeFilter('tipeFilter', e.currentTarget.value)} class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
				<option value="semua">Tipe</option>
				<option value="debit">Masuk (Debit)</option>
				<option value="kredit">Keluar (Kredit)</option>
			</select>
		</form>
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Total Masuk (Posted)</p>
			<p class="text-2xl font-bold text-green-600">{formatRupiah(summary.total_debit)}</p>
		</div>
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Total Keluar (Posted)</p>
			<p class="text-2xl font-bold text-red-600">{formatRupiah(summary.total_kredit)}</p>
		</div>
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Saldo Bersih</p>
			<p class="text-2xl font-bold {summary.total_debit - summary.total_kredit >= 0 ? 'text-green-600' : 'text-red-600'}">{formatRupiah(summary.total_debit - summary.total_kredit)}</p>
		</div>
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<p class="text-sm text-gray-500">Menunggu Approval</p>
			<p class="text-2xl font-bold text-yellow-600">{summary.total_pending}</p>
		</div>
	</div>

	<!-- Table -->
	{#if transaksi.length > 0}
		<div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
			<table class="w-full text-left border-collapse min-w-full">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onclick={() => changeSort('tanggal')}>
							Tanggal <i class="fa-solid {getSortIcon('tanggal')} ml-1 text-xs"></i>
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">No. Bukti</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Kas / Kategori</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onclick={() => changeSort('tipe')}>
							Tipe <i class="fa-solid {getSortIcon('tipe')} ml-1 text-xs"></i>
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onclick={() => changeSort('nominal')}>
							Nominal <i class="fa-solid {getSortIcon('nominal')} ml-1 text-xs"></i>
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onclick={() => changeSort('status')}>
							Status <i class="fa-solid {getSortIcon('status')} ml-1 text-xs"></i>
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Ref</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each transaksi as t, index}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-6 py-4 text-sm text-gray-600">{(pagination.page - 1) * pagination.itemsPerPage + index + 1}</td>
							<td class="px-6 py-4 text-sm text-gray-600">{formatDate(t.tanggal)}</td>
							<td class="px-6 py-4 text-sm text-gray-900 font-mono font-medium">{t.nomor_bukti || '-'}</td>
							<td class="px-6 py-4 text-sm">
								<div class="font-medium text-gray-900">{t.kas_kode} - {t.kas_nama}</div>
								<div class="text-gray-500 text-xs">{t.kategori_kode} - {t.kategori_nama}</div>
							</td>
							<td class="px-6 py-4 text-sm">
								{#if getTipeBadge(t.tipe).class}
									<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium {getTipeBadge(t.tipe).class}">
										<i class="fa-solid {getTipeBadge(t.tipe).icon}"></i>
										{getTipeBadge(t.tipe).label}
									</span>
								{/if}
							</td>
							<td class="px-6 py-4 text-sm text-gray-900 font-mono font-medium {t.tipe === 'debit' ? 'text-green-600' : 'text-red-600'}">
								{t.tipe === 'debit' ? '+' : '-'}{formatRupiah(t.nominal)}
							</td>
							<td class="px-6 py-4 text-sm">
								{#if getStatusBadge(t.status).class}
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusBadge(t.status).class}">{getStatusBadge(t.status).label}</span>
								{/if}
							</td>
							<td class="px-6 py-4 text-sm text-gray-500">
														{#if t.ref_type}
															<span class="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-50">{getRefTypeLabel(t.ref_type)}</span>
															{#if t.ref_nomor}
																<div class="text-xs font-mono text-gray-400 mt-0.5">{t.ref_nomor}</div>
															{/if}
														{/if}
													</td>
													<td class="px-6 py-4 text-right">
														<div class="flex items-center justify-center gap-1 lg:gap-2">
															{#if t.ref_type === 'manual' && (t.status === 'posted' || t.status === 'draft')}
																<!-- Mobile: Dropdown -->
																<div class="relative" data-dropdown-menu>
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
																		<div class="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg animate-in fade-in zoom-in-95 z-50" role="menu">
																			<div class="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-t-lg">
																				Detail: {t.keterangan || '-'}
																			</div>
																			<button
																				onclick={() => { openEditModal(t); openDropdownIndex = -1; }}
																				class="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 rounded-t-lg flex items-center gap-2"
																				role="menuitem"
																			>
																				<i class="fa-regular fa-pen-to-square text-blue-600 w-4"></i>
																				<span class="text-blue-600">Edit</span>
																			</button>
																			<button
																				type="button"
																				onclick={() => { handleDelete(t.id); openDropdownIndex = -1; }}
																				class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg flex items-center gap-2"
																				role="menuitem"
																			>
																				<i class="fa-regular fa-trash-can w-4"></i>
																				<span class="text-red-600">Hapus</span>
																			</button>
																			<button
																				type="button"
																				onclick={() => { openDropdownIndex = -1; }}
																				class="w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
																				role="menuitem"
																			>
																				<i class="fa-regular fa-circle-xmark w-4"></i>
																				<span>Tutup</span>
																			</button>
																		</div>
																	{/if}
																</div>
															{:else}
																<!-- Mobile: Dropdown only (for non-manual or non-editable) -->
																<div class="relative" data-dropdown-menu>
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
																		<div class="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg animate-in fade-in zoom-in-95 z-50" role="menu">
																			<div class="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-t-lg">
																				Detail: {t.keterangan || '-'}
																			</div>
																			<button
																				type="button"
																				onclick={() => { openDropdownIndex = -1; }}
																				class="w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 rounded-b-lg flex items-center gap-2"
																				role="menuitem"
																			>
																				<i class="fa-regular fa-circle-xmark w-4"></i>
																				<span>Tutup</span>
																			</button>
																		</div>
																	{/if}
																</div>
															{/if}
														</div>
													</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		<div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-4 py-3 bg-white border border-gray-200 rounded-lg">
			<div class="flex items-center gap-3">
				<label for="items-per-page" class="text-sm text-gray-700">Tampilkan</label>
				<select
					id="items-per-page"
					bind:value={pagination.itemsPerPage}
					onchange={onItemsPerPageChange}
					class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
				>
					{#each itemsPerPageOptions as opt}
						<option value={opt}>{opt} per halaman</option>
					{/each}
				</select>
			</div>
			<div class="flex items-center gap-2">
				<span class="text-sm text-gray-700">
					Halaman {pagination.page} dari {pagination.totalPages} (Total: {pagination.total} data)
				</span>
				<button
					onclick={() => changePage(pagination.page - 1)}
					disabled={pagination.page === 1}
					class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					<i class="fa-solid fa-chevron-left"></i>
				</button>
				<button
					onclick={() => changePage(pagination.page + 1)}
					disabled={pagination.page === pagination.totalPages}
					class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					<i class="fa-solid fa-chevron-right"></i>
				</button>
			</div>
		</div>
	{:else}
		<div class="bg-white rounded-lg border border-gray-200 p-12 text-center">
			<i class="fa-solid fa-receipt text-4xl text-gray-300 mb-4"></i>
			<h3 class="text-lg font-medium text-gray-900 mb-2">Tidak ada transaksi</h3>
			<p class="text-gray-500 mb-4">Belum ada transaksi yang tercatat.</p>
			{#if data.user?.role === 'admin'}
				<button onclick={openAddModal} class="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
					<i class="fa-solid fa-plus mr-2"></i> Tambah Transaksi Pertama
				</button>
			{/if}
		</div>
	{/if}

	<!-- Modal Add Transaksi (Admin only) -->
	{#if showModal && data.user?.role === 'admin'}
		<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onclick={closeModal} role="button" aria-label="Tutup modal"></div>
		<div class="fixed inset-0 z-50 flex items-center justify-center">
			<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-200" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center justify-between mb-6">
								<h3 class="text-lg font-bold text-gray-900">{editMode ? 'Edit' : 'Tambah'} Transaksi Manual</h3>
								<button onclick={closeModal} class="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Tutup">
									<i class="fa-solid fa-times text-xl"></i>
								</button>
							</div>

				<form onsubmit={handleSubmit} class="space-y-4">
					{#if modalError}
						<div class="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
							<i class="fa-solid fa-circle-exclamation mr-1"></i> {modalError}
						</div>
					{/if}

					<div>
						<label for="kas_account_id" class="block text-sm font-medium text-gray-700 mb-2">Rekening Kas <span class="text-red-500">*</span></label>
						<select
							id="kas_account_id"
							bind:value={currentTransaksi.kas_account_id}
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors {modalFieldErrors.kas_account_id ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}"
							onblur={() => validateField('kas_account_id', currentTransaksi.kas_account_id)}
						>
							<option value="">-- Pilih Rekening Kas --</option>
							{#each kasAccounts as ka}
								<option value={ka.id}>{ka.kode} - {ka.nama} ({ka.tipe})</option>
							{/each}
						</select>
						{#if modalFieldErrors.kas_account_id}
							<p class="mt-1 text-sm text-red-600">{modalFieldErrors.kas_account_id}</p>
						{/if}
					</div>

					<div>
						<label for="tipe" class="block text-sm font-medium text-gray-700 mb-2">Tipe <span class="text-red-500">*</span></label>
						<select
							id="tipe"
							bind:value={currentTransaksi.tipe}
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors {modalFieldErrors.tipe ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}"
							onblur={() => validateField('tipe', currentTransaksi.tipe)}
						>
							<option value="debit">Masuk (Debit)</option>
							<option value="kredit">Keluar (Kredit)</option>
						</select>
						{#if modalFieldErrors.tipe}
							<p class="mt-1 text-sm text-red-600">{modalFieldErrors.tipe}</p>
						{/if}
					</div>

					<div>
						<label for="kategori_id" class="block text-sm font-medium text-gray-700 mb-2">Kategori <span class="text-red-500">*</span></label>
						<select
							id="kategori_id"
							bind:value={currentTransaksi.kategori_id}
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors {modalFieldErrors.kategori_id ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}"
							onblur={() => validateField('kategori_id', currentTransaksi.kategori_id)}
						>
							<option value="">-- Pilih Kategori --</option>
							{#each getFilteredKategori() as kk}
								<option value={kk.id}>{kk.kode} - {kk.nama}</option>
							{/each}
						</select>
						{#if modalFieldErrors.kategori_id}
							<p class="mt-1 text-sm text-red-600">{modalFieldErrors.kategori_id}</p>
						{/if}
					</div>

					<div>
						<label for="nominal" class="block text-sm font-medium text-gray-700 mb-2">Nominal <span class="text-red-500">*</span></label>
						<input
							type="number"
							id="nominal"
							bind:value={currentTransaksi.nominal}
							min="1"
							step="1"
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors {modalFieldErrors.nominal ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}"
							onblur={() => validateField('nominal', currentTransaksi.nominal)}
						/>
						{#if modalFieldErrors.nominal}
							<p class="mt-1 text-sm text-red-600">{modalFieldErrors.nominal}</p>
						{/if}
					</div>

					<div>
						<label for="tanggal" class="block text-sm font-medium text-gray-700 mb-2">Tanggal <span class="text-red-500">*</span></label>
						<input
							type="date"
							id="tanggal"
							bind:value={currentTransaksi.tanggal}
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors {modalFieldErrors.tanggal ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}"
							onblur={() => validateField('tanggal', currentTransaksi.tanggal)}
						/>
						{#if modalFieldErrors.tanggal}
							<p class="mt-1 text-sm text-red-600">{modalFieldErrors.tanggal}</p>
						{/if}
					</div>

					<div>
						<label for="keterangan" class="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
						<textarea
							id="keterangan"
							bind:value={currentTransaksi.keterangan}
							rows="3"
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
							placeholder="Keterangan transaksi"
						></textarea>
					</div>

					<div>
						<label for="nomor_bukti" class="block text-sm font-medium text-gray-700 mb-2">Nomor Bukti <span class="text-gray-400">(Opsional, auto-generate jika kosong)</span></label>
						<input
							type="text"
							id="nomor_bukti"
							bind:value={currentTransaksi.nomor_bukti}
							placeholder="BM-2026-0001 atau BK-2026-0001"
							maxlength="50"
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						/>
					</div>

					<div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
						<button type="button" onclick={closeModal} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
							Batal
						</button>
						<button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
							<i class="fa-solid fa-save mr-2"></i>Simpan Transaksi
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>