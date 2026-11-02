<script>
    import { page } from '$app/state';
    import { invalidateAll } from '$app/navigation';
    import JenisSuratModal from './JenisSuratModal.svelte';

    let { data } = $props();

    let items = $derived(data.jenisSurat || []);
    let toast = $state(null);

    // Standard variables available in all templates
    const standardVariables = [
        { key: 'nama', label: 'Nama Lengkap', category: 'Penduduk' },
        { key: 'nik', label: 'NIK', category: 'Penduduk' },
        { key: 'tempat_lahir', label: 'Tempat Lahir', category: 'Penduduk' },
        { key: 'tanggal_lahir', label: 'Tanggal Lahir', category: 'Penduduk' },
        { key: 'jenis_kelamin', label: 'Jenis Kelamin', category: 'Penduduk' },
        { key: 'agama', label: 'Agama', category: 'Penduduk' },
        { key: 'pekerjaan', label: 'Pekerjaan', category: 'Penduduk' },
        { key: 'status_perkawinan', label: 'Status Perkawinan', category: 'Penduduk' },
        { key: 'no_kk', label: 'No. KK', category: 'Keluarga' },
        { key: 'alamat_rt', label: 'Alamat Lengkap RT', category: 'Lokasi' },
        { key: 'rt', label: 'Nomor RT', category: 'Lokasi' },
        { key: 'rw', label: 'Nomor RW', category: 'Lokasi' },
        { key: 'perumahan_nama', label: 'Nama Perumahan', category: 'Lokasi' },
        { key: 'blok_rumah', label: 'No. Blok Rumah', category: 'Lokasi' },
        { key: 'nama_rt', label: 'Nama RT', category: 'Petugas' },
        { key: 'nip_rt', label: 'NIP RT', category: 'Petugas' },
        { key: 'nama_rw', label: 'Nama RW', category: 'Petugas' },
        { key: 'nip_rw', label: 'NIP RW', category: 'Petugas' },
        { key: 'tanggal_surat', label: 'Tanggal Surat', category: 'Surat' },
        { key: 'keperluan', label: 'Keperluan', category: 'Surat' },
        { key: 'nomor_surat', label: 'Nomor Surat', category: 'Surat' }
    ];

    // Modal state
    let showModal = $state(false);
    let isEditing = $state(false);
    let editingItem = $state(null);

    function showToast(type, message) {
        toast = { type, message };
        setTimeout(() => toast = null, 5000);
    }

    if (data?.success) showToast('success', data.success);
    if (data?.error) showToast('error', data.error);

    function openAddModal() {
        isEditing = false;
        editingItem = null;
        showModal = true;
    }

    function openEditModal(item) {
        isEditing = true;
        editingItem = item;
        showModal = true;
    }

    function closeModal() {
        showModal = false;
        isEditing = false;
        editingItem = null;
    }

    async function handleModalSubmit(action, formData) {
        try {
            const res = await fetch(`?/${action}`, { method: 'POST', body: formData, credentials: 'include' });
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
                showToast('error', actionResult.error || 'Gagal menyimpan');
                return;
            }

            showToast('success', actionResult.success || 'Berhasil disimpan');
            closeModal();
            await invalidateAll();
        } catch (e) {
            console.error('Save error:', e);
            showToast('error', 'Gagal menyimpan');
        }
    }

    async function handleModalDelete(formData) {
        try {
            const res = await fetch('?/delete', { method: 'POST', body: formData, credentials: 'include' });
            const result = await res.json();

            if (!res.ok || result.error) {
                showToast('error', result.error || 'Gagal menghapus');
                return;
            }

            showToast('success', result.success || 'Berhasil dihapus');
            closeModal();
            await invalidateAll();
        } catch (e) {
            console.error('Delete error:', e);
            showToast('error', 'Gagal menghapus');
        }
    }

    async function handleDelete(id) {
        if (!confirm('Yakin ingin menghapus jenis surat ini?')) return;

        const formData = new FormData();
        formData.append('id', id);

        try {
            const res = await fetch('?/delete', { method: 'POST', body: formData, credentials: 'include' });
            const result = await res.json();

            if (!res.ok || result.error) {
                showToast('error', result.error || 'Gagal menghapus');
                return;
            }

            showToast('success', result.success || 'Berhasil dihapus');
            await invalidateAll();
        } catch (e) {
            console.error('Delete error:', e);
            showToast('error', 'Gagal menghapus');
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
        class:border-red-200={toast.type === 'error'}
    >
        {#if toast.type === 'success'}<i class="fa-solid fa-circle-check"></i>{:else}<i class="fa-solid fa-circle-exclamation"></i>{/if}
        <span>{toast.message}</span>
    </div>
{/if}

<div class="px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
            <h1 class="text-2xl font-bold text-gray-900">Master Jenis Surat</h1>
            <p class="text-gray-500 text-sm">Kelola jenis-jenis surat RT/RW</p>
        </div>
        <button onclick={openAddModal} class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <i class="fa-solid fa-plus"></i> Tambah Jenis Surat
        </button>
    </div>

    {#if items.length > 0}
        <div class="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-full">
                <thead>
                    <tr class="bg-gray-50 border-b border-gray-200">
                        <th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                        <th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Kode</th>
                        <th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Surat</th>
                        <th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi</th>
                        <th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Urutan</th>
                        <th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    {#each items as item, index}
                        <tr class="hover:bg-gray-50 transition-colors">
                            <td class="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                            <td class="px-6 py-4 text-sm text-gray-900 font-mono font-medium bg-blue-50 px-2 py-0.5 rounded">{item.kode}</td>
                            <td class="px-6 py-4 text-sm text-gray-900 font-medium">{item.nama}</td>
                            <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{item.deskripsi || '-'}</td>
                            <td class="px-6 py-4 text-sm text-gray-600 text-center">{item.urutan}</td>
                            <td class="px-6 py-4">
                                <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full {item.aktif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">{item.aktif ? 'Aktif' : 'Nonaktif'}</span>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <div class="flex items-center justify-end gap-1">
                                    <button onclick={() => openEditModal(item)} class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><i class="fa-regular fa-pen-to-square text-lg"></i></button>
                                    <button type="button" onclick={() => handleDelete(item.id)} class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus"><i class="fa-regular fa-trash-can text-lg"></i></button>
                                </div>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {:else}
        <div class="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
            <i class="fa-solid fa-file-lines text-gray-300 text-4xl mb-4"></i>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Belum ada jenis surat</h3>
            <p class="text-gray-500">Klik tombol "Tambah Jenis Surat" untuk memulai</p>
        </div>
    {/if}

    <!-- Modal Component -->
    <JenisSuratModal
        show={showModal}
        isEditing={isEditing}
        initialData={editingItem}
        standardVariables={standardVariables}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        onDelete={handleModalDelete}
    />
</div>