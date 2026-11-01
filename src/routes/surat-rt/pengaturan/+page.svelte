<script>
    import { invalidateAll } from '$app/navigation';

    let { data } = $props();

    let settingKeys = $derived(data.settingKeys || []);
    let settings = $derived(data.settings || {});

    // Form state
    let formValues = $state({});
    
    $effect(() => {
        // Initialize form with current settings
        settingKeys.forEach(s => {
            formValues[s.key] = settings[s.key] || '';
        });
    });

    let toast = $state(null);

    function showToast(type, message) {
        toast = { type, message };
        setTimeout(() => toast = null, 5000);
    }

    if (data?.success) showToast('success', data.success);
    if (data?.error) showToast('error', data.error);

    async function handleSubmit(e) {
        e.preventDefault();
        
        // Validate required fields
        for (const setting of settingKeys) {
            if (setting.required && !formValues[setting.key]) {
                showToast('error', `${setting.label} wajib diisi`);
                return;
            }
        }

        const formData = new FormData();
        settingKeys.forEach(s => {
            formData.append(s.key, formValues[s.key] || '');
        });

        try {
            const res = await fetch('?/update', { method: 'POST', body: formData, credentials: 'include' });
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

            showToast('success', actionResult.success || 'Pengaturan berhasil disimpan');
            await invalidateAll();
        } catch (e) {
            console.error('Save error:', e);
            showToast('error', 'Gagal menyimpan');
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
    <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Pengaturan RT/RW</h1>
        <p class="text-gray-500 text-sm">Konfigurasi data RT/RW untuk template surat</p>
    </div>

    <div class="bg-white rounded-lg shadow border border-gray-200">
        <div class="p-6 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <i class="fa-solid fa-gear text-blue-600"></i>
                Data Identitas RT/RW
            </h2>
            <p class="text-sm text-gray-500 mt-1">Data ini akan otomatis digunakan di semua template surat</p>
        </div>

        <form onsubmit={handleSubmit} class="p-6 space-y-6">
            {#each settingKeys as setting}
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div class="sm:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                            {setting.label} {#if setting.required}<span class="text-red-500">*</span>{/if}
                        </label>
                        {#if setting.type === 'textarea'}
                            <textarea
                                bind:value={formValues[setting.key]}
                                rows="3"
                                placeholder={setting.placeholder}
                                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                            ></textarea>
                        {:else}
                            <input
                                type={setting.type}
                                bind:value={formValues[setting.key]}
                                placeholder={setting.placeholder}
                                required={setting.required}
                                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                            />
                        {/if}
                        {#if setting.key === 'rt_no' || setting.key === 'rw_no'}
                            <p class="text-xs text-gray-500 mt-1">Format 3 digit (contoh: 001, 002)</p>
                        {/if}
                    </div>
                </div>
            {/each}

            <div class="pt-4 border-t border-gray-200">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h3 class="font-medium text-blue-900 mb-2 flex items-center gap-2">
                        <i class="fa-solid fa-info-circle"></i>
                        Variabel Otomatis di Template Surat
                    </h3>
                    <ul class="text-sm text-blue-800 space-y-1">
                        <li><code>rt</code> → Nomor RT (dari pengaturan di atas)</li>
                        <li><code>rw</code> → Nomor RW</li>
                        <li><code>alamat_rt</code> → Alamat Lengkap RT</li>
                        <li><code>nama_rt</code> → Nama RT</li>
                        <li><code>nip_rt</code> → NIP RT</li>
                        <li><code>nama_rw</code> → Nama RW</li>
                        <li><code>nip_rw</code> → NIP RW</li>
                    </ul>
                    <p class="text-xs text-blue-700 mt-2">Variabel ini otomatis tersedia di semua template surat sebagai <code>{{rt}}</code>, <code>{{rw}}</code>, <code>{{alamat_rt}}</code>, dst.</p>
                </div>
            </div>

            <div class="flex items-center justify-end gap-3">
                <button type="submit" class="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2">
                    <i class="fa-solid fa-save"></i> Simpan Pengaturan
                </button>
            </div>
        </form>
    </div>
</div>