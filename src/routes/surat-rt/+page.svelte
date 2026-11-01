<script>
    import { page } from '$app/state';
    import { goto, invalidateAll } from '$app/navigation';
    import { enhance } from '$app/forms';

    let { data } = $props();

    // Derived data
    let items = $derived(data.surat || []);
    let jenisSurat = $derived(data.jenisSurat || []);
    let blokRumah = $derived(data.blokRumah || []);

    // Pagination
    let currentPage = $derived(parseInt(page.url.searchParams.get('page') || '1', 10));
    let itemsPerPage = $state(data.itemsPerPage || 10);
    const itemsPerPageOptions = [10, 25, 50, 100];

    // Modal states
    let showModal = $state(false);
    let isEditing = $state(false);
    let editingId = $state('');

    // Form states
    let formJenisSuratId = $state('');
    let formAnggotaId = $state('');
    let formBlokId = $state('');
    let formKeterangan = $state('');
    let formTanggal = $state(new Date().toISOString().split('T')[0]);
    let formWargaOptions = $state([]);

    // Search & Filter
    let search = $state(data.filter?.search || '');
    let pendingSearch = $state(data.filter?.search || '');
    let jenisFilter = $state(data.filter?.jenisFilter || 'semua');
    let statusFilter = $state(data.filter?.statusFilter || 'semua');
    let blokFilter = $state(data.filter?.blokFilter || 'semua');

    // Toast
    let toast = $state(null);

    function showToast(type, message) {
        toast = { type, message };
        setTimeout(() => toast = null, 5000);
    }

    if (data?.success) showToast('success', data.success);
    if (data?.error) showToast('error', data.error);

    // Watch blok filter to update warga options
    $effect(() => {
        if (formBlokId) {
            loadWargaByBlok(formBlokId);
        } else {
            formWargaOptions = [];
            formAnggotaId = '';
        }
    });

    async function loadWargaByBlok(blokId) {
        try {
            const res = await fetch(`/surat-rt/warga-by-blok?blok_id=${blokId}`, { credentials: 'include' });
            const result = await res.json();
            if (result.data) {
                formWargaOptions = result.data;
            }
        } catch (e) {
            console.error('Load warga error:', e);
        }
    }

    function openAddModal() {
        isEditing = false;
        editingId = '';
        formJenisSuratId = '';
        formAnggotaId = '';
        formBlokId = '';
        formKeterangan = '';
        formTanggal = new Date().toISOString().split('T')[0];
        formWargaOptions = [];
        showModal = true;
    }

    function closeModal() {
        showModal = false;
        isEditing = false;
        editingId = '';
        formJenisSuratId = '';
        formAnggotaId = '';
        formBlokId = '';
        formKeterangan = '';
        formTanggal = new Date().toISOString().split('T')[0];
        formWargaOptions = [];
    }

    function handleSearchSubmit(e) {
        e.preventDefault();
        search = pendingSearch;
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (jenisFilter !== 'semua') params.set('jenis', jenisFilter);
        if (statusFilter !== 'semua') params.set('status', statusFilter);
        if (blokFilter !== 'semua') params.set('blok', blokFilter);
        params.set('page', '1');
        params.set('itemsPerPage', itemsPerPage.toString());
        goto(`?${params.toString()}`);
    }

    function onFilterChange() {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (jenisFilter !== 'semua') params.set('jenis', jenisFilter);
        if (statusFilter !== 'semua') params.set('status', statusFilter);
        if (blokFilter !== 'semua') params.set('blok', blokFilter);
        params.set('page', '1');
        params.set('itemsPerPage', itemsPerPage.toString());
        goto(`?${params.toString()}`);
    }

    async function handleCreate(e) {
        e.preventDefault();
        
        if (!formJenisSuratId || !formAnggotaId || !formBlokId || !formKeterangan || !formTanggal) {
            showToast('error', 'Semua field wajib diisi');
            return;
        }

        const formData = new FormData();
        formData.append('jenis_surat_id', formJenisSuratId);
        formData.append('anggota_keluarga_id', formAnggotaId);
        formData.append('blok_rumah_id', formBlokId);
        formData.append('keterangan_keperluan', formKeterangan);
        formData.append('tanggal_surat', formTanggal);

        try {
            const res = await fetch('?/create', { method: 'POST', body: formData, credentials: 'include' });
            const result = await res.json();
            
            let actionResult = result;
            if (result.data && typeof result.data === 'string') {
                try {
                    const parsed = JSON.parse(result.data);
                    if (Array.isArray(parsed) && parsed.length >= 2) {
                        if (parsed[0]?.error) actionResult = { error: parsed[1] };
                        else if (parsed[0]?.success) actionResult = { success: parsed[1] };
                    } else if (typeof parsed === 'object') actionResult = parsed;
                } catch {}
            }

            if (!res.ok || actionResult.error) {
                showToast('error', actionResult.error || 'Gagal membuat surat');
                return;
            }

            showToast('success', actionResult.success || 'Surat berhasil dibuat');
            closeModal();
            await invalidateAll();
        } catch (e) {
            console.error('Create surat error:', e);
            showToast('error', 'Gagal membuat surat');
        }
    }

    async function handleDelete(id) {
        if (!confirm('Yakin ingin menghapus surat ini?')) return;

        const formData = new FormData();
        formData.append('id', id);

        try {
            const res = await fetch('?/delete', { method: 'POST', body: formData, credentials: 'include' });
            const result = await res.json();
            
            if (!res.ok || result.error) {
                showToast('error', result.error || 'Gagal menghapus');
                return;
            }

            showToast('success', result.success || 'Surat dihapus');
            await invalidateAll();
        } catch (e) {
            console.error('Delete error:', e);
            showToast('error', 'Gagal menghapus');
        }
    }

    async function handleGeneratePDF(id) {
        showToast('info', 'Membuat PDF...');
        
        try {
            const formData = new FormData();
            formData.append('id', id);
            
            const res = await fetch('?/generatePDF', { method: 'POST', body: formData, credentials: 'include' });
            const result = await res.json();
            
            if (!res.ok || result.error) {
                showToast('error', result.error || 'Gagal generate PDF');
                return;
            }

            showToast('success', result.success);
            
            // Open PDF in new tab
            if (result.filePath) {
                window.open(result.filePath, '_blank');
            }
        } catch (e) {
            console.error('Generate PDF error:', e);
            showToast('error', 'Gagal generate PDF');
        }
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function getStatusBadge(status) {
        const badges = {
            'selesai': { bg: 'bg-green-100', text: 'text-green-800', label: 'Selesai' },
            'draft': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Draft' },
            'dibatalkan': { bg: 'bg-red-100', text: 'text-red-800', label: 'Dibatalkan' }
        };
        return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    }
</script>

{#if toast}
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2"
        class:bg-green-50={toast.type === 'success'}
        class:text-green-700={toast.type === 'success'}
        class:border-green-200={toast.type === 'success'}
        class:bg-red-50={toast.type === 'error'}
        class:text-red-700={toast.type === 'error'}
        class:border-red-200={toast.type === 'error'}
        class:bg-blue-50={toast.type === 'info'}
        class:text-blue-700={toast.type === 'info'}
        class:border-blue-200={toast.type === 'info'}
    >
        {#if toast.type === 'success'}<i class="fa-solid fa-circle-check"></i>
        {:else if toast.type === 'info'}<i class="fa-solid fa-circle-info"></i>
        {:else}<i class="fa-solid fa-circle-exclamation"></i>{/if}
        <span>{toast.message}</span>
    </div>
{/if}

<div class="px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
            <h1 class="text-2xl font-bold text-gray-900">Surat RT</h1>
            <p class="text-gray-500 text-sm">Kelola surat keterangan RT/RW</p>
        </div>
        <button onclick={openAddModal} class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <i class="fa-solid fa-plus"></i> Buat Surat
        </button>
    </div>

    <!-- Search & Filter -->
    <div class="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
        <form onsubmit={handleSearchSubmit} class="flex flex-col sm:flex-row gap-4">
            <div class="relative flex-1 min-w-0">
                <label class="sr-only">Cari Nomor/Nama/NIK/KK</label>
                <input type="text" name="search" value={pendingSearch} placeholder="Cari Nomor Surat / Nama / NIK / KK..."
                    class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    oninput={(e) => pendingSearch = e.target.value} />
                <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            </div>
            <select bind:value={jenisFilter} onchange={onFilterChange} class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
                <option value="semua">Semua Jenis</option>
                {#each jenisSurat as j}
                    <option value={j.id}>{j.kode} - {j.nama}</option>
                {/each}
            </select>
            <select bind:value={statusFilter} onchange={onFilterChange} class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
                <option value="semua">Semua Status</option>
                <option value="selesai">Selesai</option>
                <option value="draft">Draft</option>
                <option value="dibatalkan">Dibatalkan</option>
            </select>
            <select bind:value={blokFilter} onchange={onFilterChange} class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
                <option value="semua">Semua Blok</option>
                {#each blokRumah as b}
                    <option value={b.id}>{b.no_blok}</option>
                {/each}
            </select>
        </form>
    </div>

    <!-- Table -->
    {#if items.length > 0}
        <div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-full">
                <thead>
                    <tr class="bg-gray-50 border-b border-gray-200">
                        <th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                        <th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Nomor Surat</th>
                        <th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis</th>
                        <th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Warga</th>
                        <th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">NIK</th>
                        <th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Blok</th>
                        <th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                        <th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    {#each items as s, index}
                        <tr class="hover:bg-gray-50 transition-colors">
                            <td class="px-6 py-4 text-sm text-gray-600">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                            <td class="px-6 py-4 text-sm text-gray-900 font-mono font-medium">{s.nomor_surat}</td>
                            <td class="px-6 py-4 text-sm text-gray-700">
                                <span class="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">{s.jenis_kode}</span>
                                <p class="text-xs text-gray-500 mt-0.5">{s.jenis_nama}</p>
                            </td>
                            <td class="px-6 py-4 text-sm text-gray-900">{s.nama}</td>
                            <td class="px-6 py-4 text-sm text-gray-600 font-mono">{s.nik}</td>
                            <td class="px-6 py-4 text-sm text-gray-600">{s.no_blok}</td>
                            <td class="px-6 py-4 text-sm text-gray-600">{formatDate(s.tanggal_surat)}</td>
                            <td class="px-6 py-4">
                                <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full {getStatusBadge(s.status).bg} {getStatusBadge(s.status).text}">{getStatusBadge(s.status).label}</span>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <div class="flex items-center justify-end gap-1">
                                    <button onclick={() => handleGeneratePDF(s.id)} class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Generate/Cetak PDF" aria-label="Generate PDF">
                                        <i class="fa-solid fa-file-pdf text-lg"></i>
                                    </button>
                                    <button type="button" onclick={() => handleDelete(s.id)} class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus" aria-label="Hapus">
                                        <i class="fa-regular fa-trash-can text-lg"></i>
                                    </button>
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
                <select id="items-per-page" bind:value={itemsPerPage} onchange={onFilterChange} class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
                    {#each itemsPerPageOptions as opt}<option value={opt}>{opt} per halaman</option>{/each}
                </select>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-sm text-gray-700">Halaman {currentPage} dari {totalPages} (Total: {data.total} data)</span>
                <button onclick={() => { if (currentPage > 1) { const p = new URLSearchParams(); if (search) p.set('search', search); if (jenisFilter !== 'semua') p.set('jenis', jenisFilter); if (statusFilter !== 'semua') p.set('status', statusFilter); if (blokFilter !== 'semua') p.set('blok', blokFilter); p.set('page', (currentPage - 1).toString()); p.set('itemsPerPage', itemsPerPage.toString()); goto(`?${p.toString()}`); } }} disabled={currentPage === 1} class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><i class="fa-solid fa-chevron-left"></i></button>
                <button onclick={() => { if (currentPage < totalPages) { const p = new URLSearchParams(); if (search) p.set('search', search); if (jenisFilter !== 'semua') p.set('jenis', jenisFilter); if (statusFilter !== 'semua') p.set('status', statusFilter); if (blokFilter !== 'semua') p.set('blok', blokFilter); p.set('page', (currentPage + 1).toString()); p.set('itemsPerPage', itemsPerPage.toString()); goto(`?${p.toString()}`); } }} disabled={currentPage === totalPages} class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><i class="fa-solid fa-chevron-right"></i></button>
            </div>
        </div>
    {:else}
        <div class="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
            <i class="fa-solid fa-file-lines text-gray-300 text-4xl mb-4"></i>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Belum ada data surat</h3>
            <p class="text-gray-500">Klik tombol "Buat Surat" untuk membuat surat baru</p>
        </div>
    {/if}

    <!-- Modal Buat Surat -->
    {#if showModal}
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={closeModal}>
            <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200" onclick={(e) => e.stopPropagation()}>
                <div class="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg">
                    <h3 class="text-lg font-bold text-gray-900">Buat Surat Baru</h3>
                    <button onclick={closeModal} class="text-gray-400 hover:text-gray-600 transition-colors"><i class="fa-solid fa-times text-xl"></i></button>
                </div>
                <form onsubmit={handleCreate} class="p-4 space-y-4" use:enhance>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="sm:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Jenis Surat <span class="text-red-500">*</span></label>
                            <select bind:value={formJenisSuratId} required class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
                                <option value="">-- Pilih Jenis Surat --</option>
                                {#each jenisSurat as j}
                                    <option value={j.id}>{j.kode} - {j.nama}</option>
                                {/each}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Blok Rumah <span class="text-red-500">*</span></label>
                            <select bind:value={formBlokId} required class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
                                <option value="">-- Pilih Blok --</option>
                                {#each blokRumah as b}
                                    <option value={b.id}>{b.no_blok}</option>
                                {/each}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Surat <span class="text-red-500">*</span></label>
                            <input type="date" bind:value={formTanggal} required class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" max={new Date().toISOString().split('T')[0]} />
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Pilih Warga <span class="text-red-500">*</span></label>
                        <select bind:value={formAnggotaId} required class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
                            <option value="">-- Pilih Blok Terlebih Dahulu --</option>
                            {#each formWargaOptions as w}
                                <option value={w.id}>{w.nama} (NIK: {w.nik}) - KK: {w.no_kk}</option>
                            {/each}
                        </select>
                        {#if !formBlokId}<p class="text-xs text-gray-500 mt-1">Pilih blok rumah terlebih dahulu untuk memuat daftar warga</p>{/if}
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Keperluan <span class="text-red-500">*</span></label>
                        <textarea bind:value={formKeterangan} rows="3" required placeholder="Contoh: Membuat KTP Baru, Bantuan Sosial, Izin Usaha, Pernikahan, dll" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"></textarea>
                    </div>
                    <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <button type="button" onclick={closeModal} class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Batal</button>
                        <button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"><i class="fa-solid fa-file-lines mr-2"></i> Buat Surat</button>
                    </div>
                </form>
            </div>
        </div>
    {/if}
</div>