<script>
    import { page } from '$app/state';
    import { goto, invalidateAll } from '$app/navigation';

    let { data } = $props();

    let items = $derived(data.jenisSurat || []);
    let showModal = $state(false);
    let isEditing = $state(false);
    let editingId = $state('');

    let formKode = $state('');
    let formNama = $state('');
    let formDeskripsi = $state('');
    let formTemplate = $state('');
    let formVariabel = $state('{}');
	let placeholderVariabel = '{"nama_ayah": "", "nama_ibu": ""}';
    let formUrutan = $state(0);
    let formAktif = $state(true);

    let toast = $state(null);

    function showToast(type, message) {
        toast = { type, message };
        setTimeout(() => toast = null, 5000);
    }

    if (data?.success) showToast('success', data.success);
    if (data?.error) showToast('error', data.error);

    function openAddModal() {
        isEditing = false;
        editingId = '';
        formKode = '';
        formNama = '';
        formDeskripsi = '';
        formTemplate = '';
        formVariabel = '{}';
        formUrutan = 0;
        formAktif = true;
        showModal = true;
    }

    function openEditModal(item) {
        isEditing = true;
        editingId = item.id;
        formKode = item.kode;
        formNama = item.nama;
        formDeskripsi = item.deskripsi || '';
        formTemplate = item.template_html || '';
        formVariabel = item.variabel_default || '{}';
        formUrutan = item.urutan || 0;
        formAktif = item.aktif;
        showModal = true;
    }

    function closeModal() {
        showModal = false;
        isEditing = false;
        editingId = '';
        formKode = '';
        formNama = '';
        formDeskripsi = '';
        formTemplate = '';
        formVariabel = '{}';
        formUrutan = 0;
        formAktif = true;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!formKode || !formNama) {
            showToast('error', 'Kode dan Nama wajib diisi');
            return;
        }

        const formData = new FormData();
        formData.append('id', editingId);
        formData.append('kode', formKode);
        formData.append('nama', formNama);
        formData.append('deskripsi', formDeskripsi);
        formData.append('template_html', formTemplate);
        formData.append('variabel_default', formVariabel);
        formData.append('urutan', formUrutan);
        formData.append('aktif', formAktif ? 'on' : '');

        const action = isEditing ? 'update' : 'create';

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

    <!-- Modal -->
    {#if showModal}
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={closeModal}>
            <div class="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-200" onclick={(e) => e.stopPropagation()}>
                <div class="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg">
                    <h3 class="text-lg font-bold text-gray-900">{isEditing ? 'Edit' : 'Tambah'} Jenis Surat</h3>
                    <button onclick={closeModal} class="text-gray-400 hover:text-gray-600 transition-colors"><i class="fa-solid fa-times text-xl"></i></button>
                </div>
                <form onsubmit={handleSubmit} class="p-4 space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Kode <span class="text-red-500">*</span></label>
                            <input type="text" bind:value={formKode} required maxlength="10" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors uppercase" placeholder="Contoh: SKD, SKTM" />
                            <p class="text-xs text-gray-500 mt-1">2-10 huruf kapital, unik</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Urutan</label>
                            <input type="number" bind:value={formUrutan} min="0" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" />
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Nama Surat <span class="text-red-500">*</span></label>
                            <input type="text" bind:value={formNama} required class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" placeholder="Contoh: Surat Keterangan Domisili" />
                        </div>
                        <div class="sm:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" bind:checked={formAktif} class="text-blue-600 focus:ring-blue-500 rounded" />
                                <span class="text-sm text-gray-700">Aktif (tampil di form buat surat)</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                        <textarea bind:value={formDeskripsi} rows="2" placeholder="Deskripsi singkat kegunaan surat" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Variabel Default (JSON)</label>
                        <textarea bind:value={formVariabel} rows="3" placeholder={placeholderVariabel} class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors font-mono text-xs"></textarea>
                        <p class="text-xs text-gray-500 mt-1">Variabel tambahan untuk template (opsional)</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Template HTML</label>
                        <textarea bind:value={formTemplate} rows="15" placeholder="Template HTML dengan variabel {{variabel}}..." class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors font-mono text-xs" style="font-family: monospace;"></textarea>
                        <p class="text-xs text-gray-500 mt-1">Gunakan <code>{{nama_variabel}}</code> untuk placeholder. Variabel standar: nama, nik, tempat_lahir, tanggal_lahir, jenis_kelamin, agama, pekerjaan, status_perkawinan, no_kk, alamat_rt, rt, rw, nama_rt, nip_rt, nama_rw, nip_rw, tanggal_surat, keperluan, nomor_surat</p>
                    </div>
                    <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <button type="button" onclick={closeModal} class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Batal</button>
                        <button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"><i class="fa-solid fa-save mr-2"></i> {isEditing ? 'Update' : 'Simpan'}</button>
                    </div>
                </form>
            </div>
        </div>
    {/if}
</div>