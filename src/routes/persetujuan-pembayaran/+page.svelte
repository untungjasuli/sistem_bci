<script>
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';

	let { data } = $props();

	let pembayaran = $derived(data?.pembayaran || []);
	let summary = $derived(data?.summary || { total_pending: 0, nominal_pending: 0 });
	let pagination = $derived(data?.pagination || {
		page: 1,
		itemsPerPage: 10,
		total: 0,
		totalPages: 1,
		search: '',
		statusFilter: 'pending_approval',
		metodeFilter: 'semua',
		sortBy: 'created_at',
		sort: 'asc'
	});
	let itemsPerPageOptions = $derived(data?.itemsPerPageOptions || [10, 25, 50, 100]);

	let selectedIds = $state([]);
	let selectAll = $state(false);

	let rejectModal = $state({ show: false, id: 0, reason: '' });
	let openDropdownIndex = $state(-1);

	let toast = $state(null);

	function showToast(type, message) {
		// Handle if message is an object with status/message properties
		let msg = message;
		if (typeof message === 'object' && message !== null) {
			msg = message.message || message.error || message.success || message.msg || JSON.stringify(message);
		}
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

	function formatDateTime(dateStr) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function getMetodeBadge(metode) {
		const badges = {
			cash: { class: 'bg-gray-100 text-gray-700', icon: 'fa-money-bill-wave', label: 'Tunai' },
			qris: { class: 'bg-green-100 text-green-700', icon: 'fa-qrcode', label: 'QRIS' },
			transfer: { class: 'bg-blue-100 text-blue-700', icon: 'fa-university', label: 'Transfer' }
		};
		return badges[metode] || badges.cash;
	}

	function getStatusBadge(status) {
		const badges = {
			pending_approval: 'bg-yellow-100 text-yellow-700',
			approved: 'bg-green-100 text-green-700',
			rejected: 'bg-red-100 text-red-700'
		};
		const labels = { pending_approval: 'Menunggu Approval', approved: 'Disetujui', rejected: 'Ditolak' };
		return { class: badges[status] || badges.pending_approval, label: labels[status] || status };
	}

	function getPembayarInfo(p) {
		if (p.tipe_pembayar === 'keluarga') {
			return { nama: p.kepala_keluarga_nama || 'Keluarga', hp: p.kepala_keluarga_hp || '-' };
		} else {
			return { nama: p.pemilik_nama || 'Pemilik Kosong', hp: p.pemilik_hp || '-' };
		}
	}

	function toggleSelectAll() {
		selectAll = !selectAll;
		if (selectAll) {
			selectedIds = pembayaran.map(p => p.id);
		} else {
			selectedIds = [];
		}
	}

	function toggleSelect(id) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter(x => x !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
		selectAll = selectedIds.length === pembayaran.length && pembayaran.length > 0;
	}

	async function handleSingleApprove(id) {
		if (!confirm('Yakin approve pembayaran ini?')) return;

		const formData = new FormData();
		formData.append('id', String(id));

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

	async function handleApprove() {
		if (selectedIds.length === 0) {
			alert('Pilih minimal satu pembayaran');
			return;
		}
		if (!confirm(`Yakin approve ${selectedIds.length} pembayaran ini?`)) return;

		const formData = new FormData();
		selectedIds.forEach(id => formData.append('ids', String(id)));

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
			selectedIds = [];
			selectAll = false;
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
		formData.append('id', String(rejectModal.id));
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
			selectedIds = selectedIds.filter(x => x !== rejectModal.id);
			await invalidateAll();
		} catch (err) {
			console.error('Reject error:', err);
			showToast('error', 'Gagal reject');
		}
	}

	function updateUrl() {
		const params = new URLSearchParams();
		params.set('page', pagination.page.toString());
		params.set('itemsPerPage', pagination.itemsPerPage.toString());
		if (pagination.search) params.set('search', pagination.search);
		if (pagination.statusFilter !== 'pending_approval') params.set('status', pagination.statusFilter);
		if (pagination.metodeFilter !== 'semua') params.set('metode', pagination.metodeFilter);
		if (pagination.sortBy !== 'created_at') params.set('sortBy', pagination.sortBy);
		if (pagination.sort !== 'asc') params.set('sort', pagination.sort);
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
			pagination.sort = 'asc';
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

	// Reset selection when page changes
	$effect(() => {
		selectedIds = [];
		selectAll = false;
	});

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
			<h1 class="text-2xl font-bold text-gray-900">Persetujuan Pembayaran Iuran</h1>
			<p class="text-gray-500 text-sm">Review dan approve pembayaran iuran dari petugas</p>
		</div>
		<div class="flex items-center gap-3 w-full lg:w-auto">
			<div class="flex items-center gap-3 px-3 py-2 text-sm bg-yellow-50 border border-yellow-200 rounded-lg flex-shrink-0">
				<i class="fa-solid fa-clock text-yellow-600"></i>
				<span>{summary.total_pending} menunggu · {formatRupiah(summary.nominal_pending)}</span>
			</div>
		</div>
	</div>

	<!-- Search & Filter Card (mirip Surat RT) -->
	<div class="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
		<form onsubmit={handleSearch} class="flex flex-col sm:flex-row gap-4">
			<div class="relative flex-1 min-w-0">
				<label class="sr-only">Cari Nomor Bukti / Catatan / Nama / Blok</label>
				<input type="text" name="searchInput" value={pagination.search} placeholder="Nomor Bukti / Catatan / Nama / Blok..."
					class="w-full pl-10 pr-12 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					oninput={(e) => pagination.search = e.currentTarget.value}
					enterkeyhint="go" />
				<i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
				{#if pagination.search}
					<button
						type="button"
						onclick={clearSearch}
						class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
						title="Hapus pencarian"
					>
						<i class="fa-solid fa-times text-xs"></i>
					</button>
				{/if}
			</div>
			<select bind:value={pagination.metodeFilter} onchange={(e) => changeFilter('metodeFilter', e.currentTarget.value)} class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
				<option value="semua">Metode</option>
				<option value="cash">Tunai</option>
				<option value="qris">QRIS</option>
				<option value="transfer">Transfer</option>
			</select>
		</form>
	</div>

	<!-- Batch Actions -->
	{#if pembayaran.length > 0 && selectedIds.length > 0}
		<div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
			<span class="text-sm text-blue-700">
				<i class="fa-solid fa-check-circle mr-1"></i>
				{selectedIds.length} dipilih
			</span>
			<div class="flex items-center gap-2">
				<button
					onclick={handleApprove}
					disabled={selectedIds.length === 0}
					class="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					<i class="fa-solid fa-check mr-2"></i>Approve ({selectedIds.length})
				</button>
			</div>
		</div>
	{/if}

	<!-- Table -->
	{#if pembayaran.length > 0}
		<div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
			<table class="w-full text-left border-collapse min-w-full">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
							<input type="checkbox" checked={selectAll} onchange={toggleSelectAll} class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" aria-label="Pilih semua" />
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onclick={() => changeSort('created_at')}>
							Tgl Input <i class="fa-solid {getSortIcon('created_at')} ml-1 text-xs"></i>
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Periode</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Blok / Pembayar</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Metode</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onclick={() => changeSort('nominal_bayar')}>
							Nominal <i class="fa-solid {getSortIcon('nominal_bayar')} ml-1 text-xs"></i>
						</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl Bayar</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Petugas</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each pembayaran as p, index}
						<tr class="hover:bg-gray-50 transition-colors {p.status === 'rejected' ? 'bg-red-50' : ''}">
							<td class="px-6 py-4 text-sm text-gray-600">
								<input type="checkbox" checked={selectedIds.includes(p.id)} onchange={() => toggleSelect(p.id)} class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" />
							</td>
							<td class="px-6 py-4 text-sm text-gray-600">{formatDateTime(p.created_at)}</td>
							<td class="px-6 py-4 text-sm text-gray-900 font-medium">{p.periode}</td>
							<td class="px-6 py-4 text-sm">
								<div class="font-medium text-gray-900">Blok {p.no_blok}</div>
								<div class="text-gray-500 text-xs">{getPembayarInfo(p).nama} · {getPembayarInfo(p).hp}</div>
								{#if p.tipe_pembayar === 'keluarga'}
									<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700 mt-1">Keluarga</span>
								{:else}
									<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700 mt-1">Pemilik Kosong</span>
								{/if}
							</td>
							<td class="px-6 py-4 text-sm">
								{#if getMetodeBadge(p.metode_bayar).class}
									<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium {getMetodeBadge(p.metode_bayar).class}">
										<i class="fa-solid {getMetodeBadge(p.metode_bayar).icon}"></i>
										{getMetodeBadge(p.metode_bayar).label}
									</span>
								{/if}
							</td>
							<td class="px-6 py-4 text-sm text-gray-900 font-mono font-medium text-green-600">{formatRupiah(p.nominal_bayar)}</td>
							<td class="px-6 py-4 text-sm text-gray-600">{formatDate(p.tanggal_bayar)}</td>
							<td class="px-6 py-4 text-sm text-gray-600">{p.petugas_nama || '-'}</td>
							<td class="px-6 py-4 text-sm">
								{#if getStatusBadge(p.status).class}
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusBadge(p.status).class}">{getStatusBadge(p.status).label}</span>
								{/if}
							</td>
							<td class="px-6 py-4 text-right">
								<div class="flex items-center justify-end gap-1 lg:gap-2">
									{#if p.status === 'pending_approval'}
										<!-- Desktop: Horizontal buttons -->
										<div class="hidden lg:flex items-center gap-1">
											<button
												onclick={() => handleSingleApprove(p.id)}
												class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
												title="Approve"
												aria-label="Approve"
											>
												<i class="fa-solid fa-check text-lg"></i>
											</button>
											<button
												type="button"
												onclick={() => openRejectModal(p.id)}
												class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
												title="Reject"
												aria-label="Reject"
											>
												<i class="fa-solid fa-times text-lg"></i>
											</button>
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
														onclick={() => { handleSingleApprove(p.id); openDropdownIndex = -1; }}
														class="w-full px-3 py-2 text-left text-sm text-green-600 hover:bg-green-50 rounded-t-lg flex items-center gap-2"
														role="menuitem"
													>
														<i class="fa-solid fa-check text-green-600 w-4"></i>
														<span class="text-green-600">Approve</span>
													</button>
													<button
														type="button"
														onclick={() => { openRejectModal(p.id); openDropdownIndex = -1; }}
														class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg flex items-center gap-2"
														role="menuitem"
													>
														<i class="fa-solid fa-times w-4"></i>
														<span class="text-red-600">Reject</span>
													</button>
												</div>
											{/if}
										</div>
									{:else if p.status === 'rejected'}
										<button
											type="button"
											onclick={() => alert(`Alasan: ${p.reject_reason || 'Tidak ada alasan'}`)}
											class="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
											title="Lihat Alasan"
											aria-label="Lihat Alasan"
										>
											<i class="fa-solid fa-info-circle text-lg"></i>
										</button>
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
			<i class="fa-solid fa-clipboard-check text-4xl text-gray-300 mb-4"></i>
			<h3 class="text-lg font-medium text-gray-900 mb-2">Tidak ada pembayaran menunggu approval</h3>
			<p class="text-gray-500 mb-4">Semua pembayaran sudah diproses.</p>
		</div>
	{/if}

	<!-- Reject Modal -->
	{#if rejectModal.show}
		<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onclick={() => rejectModal = { show: false, id: 0, reason: '' }} role="button" aria-label="Tutup modal"></div>
		<div class="fixed inset-0 z-50 flex items-center justify-center">
			<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-200" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center justify-between mb-6">
					<h3 class="text-lg font-bold text-gray-900">Tolak Pembayaran</h3>
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
							placeholder="Alasan menolak pembayaran ini..."
						></textarea>
					</div>

					<div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
						<button type="button" onclick={() => rejectModal = { show: false, id: 0, reason: '' }} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
							Batal
						</button>
						<button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors">
							<i class="fa-solid fa-times mr-2"></i>Tolak Pembayaran
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>