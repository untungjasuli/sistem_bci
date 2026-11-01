<script>
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';

	let { data } = $props();

	let transfers = $derived(data?.transfers || []);
	let kasAccounts = $derived(data?.kasAccounts || []);
	let pagination = $derived(data?.pagination || {
		page: 1,
		itemsPerPage: 10,
		total: 0,
		totalPages: 1,
		search: '',
		statusFilter: 'semua',
		sortBy: 'tanggal',
		sort: 'desc'
	});
	let itemsPerPageOptions = $derived(data?.itemsPerPageOptions || [10, 25, 50, 100]);

	let showModal = $state(false);
	let currentTransfer = $state({ dari_kas_id: '', ke_kas_id: '', nominal: 0, tanggal: '', keterangan: '' });
	let modalError = $state('');
	let modalFieldErrors = $state({});

	let openDropdownIndex = $state(-1);
	let rejectModal = $state({ show: false, id: 0, reason: '' });

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
			pending: 'bg-yellow-100 text-yellow-700',
			posted: 'bg-green-100 text-green-700',
			rejected: 'bg-red-100 text-red-700'
		};
		const labels = { pending: 'Menunggu Approval', posted: 'Diposting', rejected: 'Ditolak' };
		return { class: badges[status] || badges.pending, label: labels[status] || status };
	}

	function openAddModal() {
		currentTransfer = { 
			dari_kas_id: kasAccounts[0]?.id || '', 
			ke_kas_id: '', 
			nominal: 0, 
			tanggal: new Date().toISOString().split('T')[0], 
			keterangan: '' 
		};
		modalError = '';
		modalFieldErrors = {};
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		currentTransfer = { dari_kas_id: '', ke_kas_id: '', nominal: 0, tanggal: '', keterangan: '' };
		modalError = '';
		modalFieldErrors = {};
	}

	function validateField(field, value) {
		const errors = {};
		if (field === 'dari_kas_id' && !value) errors.dari_kas_id = 'Rekening asal wajib dipilih';
		if (field === 'ke_kas_id' && !value) errors.ke_kas_id = 'Rekening tujuan wajib dipilih';
		if (field === 'nominal' && (!value || parseFloat(value) <= 0)) errors.nominal = 'Nominal harus > 0';
		if (field === 'tanggal' && !value) errors.tanggal = 'Tanggal wajib diisi';
		if (field === 'dari_kas_id' && value && currentTransfer.ke_kas_id && value === currentTransfer.ke_kas_id) {
			errors.dari_kas_id = 'Rekening asal dan tujuan tidak boleh sama';
			errors.ke_kas_id = 'Rekening asal dan tujuan tidak boleh sama';
		}
		modalFieldErrors = { ...modalFieldErrors, ...errors };
		return Object.keys(errors).length === 0;
	}

	function getKeKasOptions() {
		return kasAccounts.filter(k => k.id !== currentTransfer.dari_kas_id);
	}

	async function handleSubmit(e) {
		e.preventDefault();
		modalError = '';
		modalFieldErrors = {};

		let valid = true;
		if (!currentTransfer.dari_kas_id) { modalFieldErrors.dari_kas_id = 'Rekening asal wajib dipilih'; valid = false; }
		if (!currentTransfer.ke_kas_id) { modalFieldErrors.ke_kas_id = 'Rekening tujuan wajib dipilih'; valid = false; }
		if (!currentTransfer.nominal || parseFloat(currentTransfer.nominal) <= 0) { modalFieldErrors.nominal = 'Nominal harus > 0'; valid = false; }
		if (!currentTransfer.tanggal) { modalFieldErrors.tanggal = 'Tanggal wajib diisi'; valid = false; }
		if (currentTransfer.dari_kas_id === currentTransfer.ke_kas_id) { modalFieldErrors.dari_kas_id = 'Rekening asal dan tujuan tidak boleh sama'; valid = false; }

		if (!valid) return;

		const formData = new FormData();
		formData.append('dari_kas_id', currentTransfer.dari_kas_id);
		formData.append('ke_kas_id', currentTransfer.ke_kas_id);
		formData.append('nominal', currentTransfer.nominal.toString());
		formData.append('tanggal', currentTransfer.tanggal);
		formData.append('keterangan', currentTransfer.keterangan);

		try {
			const res = await fetch('?/create', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();

			// Parse SvelteKit form action response format (fail() returns data as JSON string array)
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

	async function handleApprove(id) {
		if (!confirm('Yakin approve transfer ini?')) return;

		const formData = new FormData();
		formData.append('id', id);

		try {
			const res = await fetch('?/approve', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();

			// Parse SvelteKit form action response format (fail() returns data as JSON string array)
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
				const serverError = actionResult.error || 'Gagal approve';
				showToast('error', `Gagal approve - ${serverError}`);
				return;
			}

			showToast('success', actionResult.success);
			await invalidateAll();
		} catch (err) {
			console.error('Approve error:', err);
			showToast('error', 'Gagal approve');
		}
	}

	function openRejectModal(id) {
		rejectModal = { show: true, id, reason: '' };
	}

	async function handleReject() {
		if (!rejectModal.reason.trim()) {
			alert('Alasan penolakan wajib diisi');
			return;
		}

		const formData = new FormData();
		formData.append('id', rejectModal.id);
		formData.append('reject_reason', rejectModal.reason);

		try {
			const res = await fetch('?/reject', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();

			// Parse SvelteKit form action response format (fail() returns data as JSON string array)
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
				const serverError = actionResult.error || 'Gagal reject';
				showToast('error', `Gagal reject - ${serverError}`);
				return;
			}

			showToast('success', actionResult.success);
			rejectModal = { show: false, id: 0, reason: '' };
			await invalidateAll();
		} catch (err) {
			console.error('Reject error:', err);
			showToast('error', 'Gagal reject');
		}
	}

	async function handleDelete(id, nomor_bukti) {
		if (!confirm(`Yakin hapus transfer "${nomor_bukti}"?`)) return;

		const formData = new FormData();
		formData.append('id', id);

		try {
			const res = await fetch('?/delete', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();

			// Parse SvelteKit form action response format (fail() returns data as JSON string array)
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

	function updateUrl() {
		const params = new URLSearchParams();
		params.set('page', pagination.page.toString());
		params.set('itemsPerPage', pagination.itemsPerPage.toString());
		if (pagination.search) params.set('search', pagination.search);
		if (pagination.statusFilter !== 'semua') params.set('status', pagination.statusFilter);
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

	// Reset ke_kas when dari_kas changes
	$effect(() => {
		if (currentTransfer.dari_kas_id) {
			currentTransfer.ke_kas_id = '';
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
			<h1 class="text-2xl font-bold text-gray-900">Transfer Antar Kas</h1>
			<p class="text-gray-500 text-sm">Transfer dana antar rekening kas (butuh approval)</p>
		</div>
		<div class="flex items-center gap-3 w-full lg:w-auto">
			<button
				onclick={openAddModal}
				class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex-shrink-0"
				aria-label="Tambah Transfer"
			>
				<i class="fa-solid fa-plus"></i>
				<span class="hidden lg:inline">Tambah Transfer</span>
			</button>
		</div>
	</div>

	<!-- Search & Filter Card (mirip Surat RT) -->
	<div class="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
		<form onsubmit={handleSearch} class="flex flex-col sm:flex-row gap-4">
			<div class="relative flex-1 min-w-0">
				<label class="sr-only">Cari Nomor Bukti / Keterangan / Kas</label>
				<input type="text" name="searchInput" value={pagination.search} placeholder="Nomor Bukti / Keterangan / Kas..."
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
				<option value="pending">Menunggu</option>
				<option value="posted">Diposting</option>
				<option value="rejected">Ditolak</option>
			</select>
		</form>
	</div>

	<!-- Table -->
	{#if transfers.length > 0}
		<div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
			<table class="w-full text-left border-collapse min-w-full">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onclick={() => changeSort('tanggal')}>
							Tanggal <i class="fa-solid {getSortIcon('tanggal')} ml-1 text-xs"></i>
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">No. Bukti</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Dari Kas</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Ke Kas</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onclick={() => changeSort('nominal')}>
							Nominal <i class="fa-solid {getSortIcon('nominal')} ml-1 text-xs"></i>
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onclick={() => changeSort('status')}>
							Status <i class="fa-solid {getSortIcon('status')} ml-1 text-xs"></i>
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each transfers as t, index}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-6 py-4 text-sm text-gray-600">{(pagination.page - 1) * pagination.itemsPerPage + index + 1}</td>
							<td class="px-6 py-4 text-sm text-gray-600">{formatDate(t.tanggal)}</td>
							<td class="px-6 py-4 text-sm text-gray-900 font-mono font-medium">{t.nomor_bukti}</td>
							<td class="px-6 py-4 text-sm">
								<div class="font-medium text-gray-900">{t.dari_kode} - {t.dari_nama}</div>
								<div class="text-gray-500 text-xs">Saldo: {formatRupiah(t.saldo_current)}</div>
							</td>
							<td class="px-6 py-4 text-sm">
								<div class="font-medium text-gray-900">{t.ke_kode} - {t.ke_nama}</div>
							</td>
							<td class="px-6 py-4 text-sm text-gray-900 font-mono font-medium text-blue-600">{formatRupiah(t.nominal)}</td>
							<td class="px-6 py-4 text-sm">
								{#if getStatusBadge(t.status).class}
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusBadge(t.status).class}">{getStatusBadge(t.status).label}</span>
								{/if}
							</td>
							<td class="px-6 py-4 text-right">
								<div class="flex items-center justify-end gap-1 lg:gap-2">
									<!-- Desktop: Horizontal buttons -->
									<div class="hidden lg:flex items-center gap-1">
										{#if t.status === 'pending'}
											<button
												onclick={() => handleApprove(t.id)}
												class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
												title="Approve"
												aria-label="Approve"
											>
												<i class="fa-solid fa-check text-lg"></i>
											</button>
											<button
												type="button"
												onclick={() => openRejectModal(t.id)}
												class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
												title="Reject"
												aria-label="Reject"
											>
												<i class="fa-solid fa-times text-lg"></i>
											</button>
										{/if}
										{#if t.status !== 'posted'}
											<button
												type="button"
												onclick={() => handleDelete(t.id, t.nomor_bukti)}
												class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
												title="Hapus"
												aria-label="Hapus"
											>
												<i class="fa-regular fa-trash-can text-lg"></i>
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
											<div class="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg animate-in fade-in zoom-in-95 z-50" role="menu">
												{#if t.status === 'pending'}
													<button
														onclick={() => { handleApprove(t.id); openDropdownIndex = -1; }}
														class="w-full px-3 py-2 text-left text-sm text-green-600 hover:bg-green-50 rounded-t-lg flex items-center gap-2"
														role="menuitem"
													>
														<i class="fa-solid fa-check text-green-600 w-4"></i>
														<span class="text-green-600">Approve</span>
													</button>
													<button
														type="button"
														onclick={() => { openRejectModal(t.id); openDropdownIndex = -1; }}
														class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
														role="menuitem"
													>
														<i class="fa-solid fa-times w-4"></i>
														<span class="text-red-600">Reject</span>
													</button>
												{/if}
												{#if t.status !== 'posted'}
													<button
														type="button"
														onclick={() => { handleDelete(t.id, t.nomor_bukti); openDropdownIndex = -1; }}
														class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 {t.status === 'pending' ? '' : 'rounded-b-lg'} flex items-center gap-2"
														role="menuitem"
													>
														<i class="fa-regular fa-trash-can w-4"></i>
														<span class="text-red-600">Hapus</span>
													</button>
												{/if}
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
			<i class="fa-solid fa-arrow-right-arrow-left text-4xl text-gray-300 mb-4"></i>
			<h3 class="text-lg font-medium text-gray-900 mb-2">Tidak ada transfer</h3>
			<p class="text-gray-500 mb-4">Belum ada transfer antar kas yang diajukan.</p>
			<button onclick={openAddModal} class="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
				<i class="fa-solid fa-plus mr-2"></i> Ajukan Transfer Pertama
			</button>
		</div>
	{/if}

	<!-- Modal Add Transfer -->
	{#if showModal}
		<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onclick={closeModal} role="button" aria-label="Tutup modal"></div>
		<div class="fixed inset-0 z-50 flex items-center justify-center">
			<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-200" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center justify-between mb-6">
					<h3 class="text-lg font-bold text-gray-900">Ajukan Transfer Antar Kas</h3>
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
						<label for="dari_kas_id" class="block text-sm font-medium text-gray-700 mb-2">Dari Rekening (Keluar) <span class="text-red-500">*</span></label>
						<select
							id="dari_kas_id"
							bind:value={currentTransfer.dari_kas_id}
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors {modalFieldErrors.dari_kas_id ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}"
							onblur={() => validateField('dari_kas_id', currentTransfer.dari_kas_id)}
						>
							<option value="">-- Pilih Rekening Asal --</option>
							{#each kasAccounts as ka}
								<option value={ka.id}>{ka.kode} - {ka.nama} (Saldo: {formatRupiah(ka.saldo_current)})</option>
							{/each}
						</select>
						{#if modalFieldErrors.dari_kas_id}
							<p class="mt-1 text-sm text-red-600">{modalFieldErrors.dari_kas_id}</p>
						{/if}
					</div>

					<div>
						<label for="ke_kas_id" class="block text-sm font-medium text-gray-700 mb-2">Ke Rekening (Masuk) <span class="text-red-500">*</span></label>
						<select
							id="ke_kas_id"
							bind:value={currentTransfer.ke_kas_id}
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors {modalFieldErrors.ke_kas_id ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}"
							onblur={() => validateField('ke_kas_id', currentTransfer.ke_kas_id)}
						>
							<option value="">-- Pilih Rekening Tujuan --</option>
							{#each getKeKasOptions() as ka}
								<option value={ka.id}>{ka.kode} - {ka.nama}</option>
							{/each}
						</select>
						{#if modalFieldErrors.ke_kas_id}
							<p class="mt-1 text-sm text-red-600">{modalFieldErrors.ke_kas_id}</p>
						{/if}
					</div>

					<div>
							<label for="nominal" class="block text-sm font-medium text-gray-700 mb-2">Nominal <span class="text-red-500">*</span></label>
							<input
								type="number"
								id="nominal"
								bind:value={currentTransfer.nominal}
								min="0"
								step="100"
								class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors {modalFieldErrors.nominal ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}"
								onblur={() => validateField('nominal', currentTransfer.nominal)}
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
							bind:value={currentTransfer.tanggal}
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors {modalFieldErrors.tanggal ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}"
							onblur={() => validateField('tanggal', currentTransfer.tanggal)}
						/>
						{#if modalFieldErrors.tanggal}
							<p class="mt-1 text-sm text-red-600">{modalFieldErrors.tanggal}</p>
						{/if}
					</div>

					<div>
						<label for="keterangan" class="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
						<textarea
							id="keterangan"
							bind:value={currentTransfer.keterangan}
							rows="3"
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
							placeholder="Keterangan transfer"
						></textarea>
					</div>

					<div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
						<button type="button" onclick={closeModal} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
							Batal
						</button>
						<button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
							<i class="fa-solid fa-save mr-2"></i>Ajukan Transfer
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Reject Modal -->
	{#if rejectModal.show}
		<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onclick={() => rejectModal = { show: false, id: 0, reason: '' }} role="button" aria-label="Tutup modal"></div>
		<div class="fixed inset-0 z-50 flex items-center justify-center">
			<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-200" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center justify-between mb-6">
					<h3 class="text-lg font-bold text-gray-900">Tolak Transfer</h3>
					<button onclick={() => rejectModal = { show: false, id: 0, reason: '' }} class="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Tutup">
						<i class="fa-solid fa-times text-xl"></i>
					</button>
				</div>

				<form onsubmit={handleReject} class="space-y-4">
					<div>
						<label for="reject_reason" class="block text-sm font-medium text-gray-700 mb-2">Alasan Penolakan <span class="text-red-500">*</span></label>
						<textarea
							id="reject_reason"
							bind:value={rejectModal.reason}
							rows="3"
							required
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
							placeholder="Alasan menolak transfer ini..."
						></textarea>
					</div>

					<div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
						<button type="button" onclick={() => rejectModal = { show: false, id: 0, reason: '' }} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
							Batal
						</button>
						<button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors">
							<i class="fa-solid fa-times mr-2"></i>Tolak Transfer
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>