<script>
    import { onMount } from 'svelte';
    import TipTapEditor from '#lib/components/editor/TipTapEditor.svelte';

    let { 
        show, 
        isEditing, 
        initialData, 
        standardVariables,
        onClose, 
        onSubmit, 
        onDelete 
    } = $props();

    // Local form state
    let formKode = $state('');
    let formNama = $state('');
    let formDeskripsi = $state('');
    let formTemplateHtml = $state('');
    let formVariabel = $state({});
    let formUrutan = $state(0);
    let formAktif = $state(true);

    let tipTapEditor = $state(null);

    // Handler when TipTap editor is ready
    function handleEditorReady(api) {
        tipTapEditor = api;
        
        // Set initial content if editing
        if (formTemplateHtml) {
            tipTapEditor.setHTML(formTemplateHtml);
        }
    }

    // Custom variables derived from formVariabel
    let customVariables = $derived(Object.entries(formVariabel).map(([key, value]) => ({ key, value, custom: true })));

    // All variables combined
    let allVariables = $derived([
        ...standardVariables.map(v => ({ ...v, custom: false })),
        ...customVariables
    ]);

    // Group variables by category
    let variableCategories = $derived(
        allVariables.reduce((acc, v) => {
            const cat = v.category || 'Lainnya';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(v);
            return acc;
        }, {})
    );

    // For literal {{...}} in text content
    let varExample = '{nama_variabel}';

    // Sync form state when initialData changes (edit mode)
    $effect(() => {
        if (initialData) {
            formKode = initialData.kode || '';
            formNama = initialData.nama || '';
            formDeskripsi = initialData.deskripsi || '';
            formTemplateHtml = initialData.template_html || '';
            formVariabel = typeof initialData.variabel_default === 'string'
                ? JSON.parse(initialData.variabel_default || '{}')
                : (initialData.variabel_default || {});
            formUrutan = initialData.urutan || 0;
            formAktif = initialData.aktif ?? true;
        } else {
            // Reset for add mode
            formKode = '';
            formNama = '';
            formDeskripsi = '';
            formTemplateHtml = '';
            formVariabel = {};
            formUrutan = 0;
            formAktif = true;
        }
    });

    // Update formTemplateHtml when TipTap editor content changes
    function handleEditorChange(html) {
        formTemplateHtml = html;
    }

    function insertVariable(key) {
        tipTapEditor?.insertVariable(key);
    }

    function addCustomVariable() {
        formVariabel = { ...formVariabel, ['variabel_baru_' + Date.now()]: '' };
    }

    function removeCustomVariable(key) {
        const newVars = { ...formVariabel };
        delete newVars[key];
        formVariabel = newVars;
    }

    function updateCustomVariable(key, value) {
        formVariabel = { ...formVariabel, [key]: value };
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (!formKode || !formNama) {
            alert('Kode dan Nama wajib diisi');
            return;
        }

        const formData = new FormData();
        formData.append('id', initialData?.id || '');
        formData.append('kode', formKode);
        formData.append('nama', formNama);
        formData.append('deskripsi', formDeskripsi);
        formData.append('template_html', formTemplateHtml);
        formData.append('variabel_default', JSON.stringify(formVariabel));
        formData.append('urutan', formUrutan);
        formData.append('aktif', formAktif ? 'on' : '');

        const action = isEditing ? 'update' : 'create';
        onSubmit(action, formData);
    }

    function handleDelete() {
        if (!confirm('Yakin ingin menghapus jenis surat ini?')) return;
        const formData = new FormData();
        formData.append('id', initialData.id);
        onDelete(formData);
    }
</script>

{#if show}
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={onClose}>
        <div class="bg-white rounded-lg shadow-xl w-full max-h-[90vh] lg:max-h-[calc(100vh-2rem)] flex flex-col lg:flex-row overflow-hidden border border-gray-200" onclick={(e) => e.stopPropagation()}>
            <!-- Left Container: Form Content (scrollable) -->
            <div class="flex-1 min-w-0 flex flex-col overflow-y-auto lg:overflow-y-auto">
                <!-- Header -->
                <div class="z-10 flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white lg:rounded-tl-lg">
                    <h3 class="text-lg font-bold text-gray-900">{isEditing ? 'Edit' : 'Tambah'} Jenis Surat</h3>
                    <button onclick={onClose} class="text-gray-400 hover:text-gray-600 transition-colors"><i class="fa-solid fa-times text-xl"></i></button>
                </div>

                <!-- Form Content -->
                <form onsubmit={handleSubmit} class="p-4 space-y-4 flex-1 overflow-y-auto">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Kode <span class="text-red-500">*</span></label>
                            <input type="text" bind:value={formKode} required maxlength="10" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors uppercase" placeholder="Contoh: SKD, SKTM" />
                            <p class="text-xs text-gray-500 mt-1">2-10 huruf kapital, unik</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Urutan</label>
                            <input type="number" bind:value={formUrutan} min="0" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors" />
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Nama Surat <span class="text-red-500">*</span></label>
                            <input type="text" bind:value={formNama} required class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors" placeholder="Contoh: Surat Keterangan Domisili" />
                        </div>
                        <div class="sm:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" bind:checked={formAktif} class="text-blue-600 focus:ring-green-500 rounded" />
                                <span class="text-sm text-gray-700">Aktif (tampil di form buat surat)</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                        <textarea bind:value={formDeskripsi} rows="2" placeholder="Deskripsi singkat kegunaan surat" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors"></textarea>
                    </div>

                    <!-- Variabel Custom -->
                    <div class="border-t border-gray-200 pt-4">
                        <h4 class="text-sm font-medium text-gray-700 mb-3">Variabel Khusus Template (opsional)</h4>
                        <p class="text-xs text-gray-500 mb-3">Variabel ini hanya berlaku untuk template ini. Variabel standar (nama, nik, alamat_rt, dll) sudah otomatis tersedia.</p>

                        {#each Object.entries(formVariabel) as [key, value]}
                            <div class="flex items-center gap-2 mb-2">
                                <input type="text" value={key} placeholder="Nama variabel (cth: nama_ayah)" class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors font-mono text-xs" readonly />
                                <input type="text" value={value} placeholder="Nilai default" oninput={(e) => { e.stopPropagation(); updateCustomVariable(key, e.target.value); }} onkeydown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors" />
                                <button type="button" onclick={(e) => { e.stopPropagation(); removeCustomVariable(key); }} class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus"><i class="fa-solid fa-trash-can text-sm"></i></button>
                            </div>
                        {/each}

                        <button type="button" onclick={addCustomVariable} class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                            <i class="fa-solid fa-plus"></i> Tambah Variabel
                        </button>
                    </div>

                    <!-- Template Editor - TipTap -->
                    <div class="border-t border-gray-200 pt-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Template Surat (WYSIWYG)</label>
                        {#key initialData?.id || 'add'}
                            <TipTapEditor
                                onReady={handleEditorReady}
                                content={formTemplateHtml}
                                placeholder={'Ketik template surat di sini... Gunakan tombol "Sisipkan Variabel" di panel kanan untuk memasukkan {{variabel}}.'}
                                onChange={handleEditorChange}
                            />
                        {/key}
                        <p class="text-xs text-gray-500 mt-1">Gunakan tombol <strong>Sisipkan Variabel</strong> di panel kanan untuk memasukkan {varExample} ke kursor.</p>
                    </div>

                    <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <button type="button" onclick={onClose} class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Batal</button>
                        <button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"><i class="fa-solid fa-save mr-2"></i> {isEditing ? 'Update' : 'Simpan'}</button>
                    </div>
                </form>
            </div>

            <!-- Right Sidebar: Variable Panel (fixed height, scrollable) -->
            <div class="hidden lg:block lg:w-80 lg:flex-shrink-0 lg:border-l lg:border-gray-200 lg:bg-gray-50 flex flex-col" style="max-height: calc(100vh - 2rem);">
                <div class="p-4 border-b border-gray-200 sticky top-0 bg-gray-50 lg:rounded-tr-lg">
                    <h4 class="text-sm font-medium text-gray-700 mb-1">Sisipkan Variabel ke Template</h4>
                    <p class="text-xs text-gray-500">Klik untuk memasukkan ke kursor editor.</p>
                </div>
                <div class="flex-1 overflow-y-auto p-4">
                    {#each Object.entries(variableCategories) as [category, vars]}
                        <div class="mb-4">
                            <h5 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{category}</h5>
                            <div class="grid grid-cols-2 gap-1">
                                {#each vars as variable}
                                    <button
                                        type="button"
                                        onclick={() => insertVariable(variable.key)}
                                        class="px-2 py-1.5 text-xs text-left bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors text-gray-700 {variable.custom ? 'text-blue-600' : ''}"
                                        title={variable.custom ? 'Variabel kustom' : 'Variabel standar'}
                                    >
                                        <i class="fa-solid {variable.custom ? 'fa-user-cog text-blue-500' : 'fa-database text-gray-400'} mr-1"></i>
                                        {variable.key}
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </div>
{/if}