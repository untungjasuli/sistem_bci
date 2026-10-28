<script>
	import { page } from '$app/state';
	import { enhance } from '$app/forms';

	let {
		showModal = false,
		blokRumahItems = [],
		isEditKeluarga = false,
		editingKeluargaId = '',
		noKk = '',
		blokRumahId = '',
		statusRumah = 'sendiri',
		anggotaFormRaw = [],
		onClose,
		onSave
	} = $props();

	let anggotaForm = $state([]);
	let activeAnggotaIndex = $state(0);

	// Konversi tanggal ke format YYYY-MM-DD dalam timezone GMT+7 (WIB)
	function toWibDateString(dateVal) {
		if (!dateVal) return '';
		const d = new Date(dateVal);
		if (isNaN(d.getTime())) return '';
		const offsetMs = 7 * 60 * 60 * 1000;
		const wib = new Date(d.getTime() + offsetMs);
		const y = wib.getUTCFullYear();
		const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
		const day = String(wib.getUTCDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	$effect(() => {
		if (anggotaFormRaw && anggotaFormRaw.length > 0) {
			anggotaForm = anggotaFormRaw.map((a) => ({
				nik: a.nik || '',
				nama: a.nama || '',
				jenis_kelamin: a.jenis_kelamin || 'Laki-laki',
				tanggal_lahir: toWibDateString(a.tanggal_lahir),
				hub_keluarga: a.hub_keluarga || 'Anak'
			}));
		} else {
			anggotaForm = [
				{ nik: '', nama: '', jenis_kelamin: 'Laki-laki', tanggal_lahir: '', hub_keluarga: 'Kepala Keluarga' }
			];
		}
		activeAnggotaIndex = 0;
	});

	function addAnggota() {
		anggotaForm = [
			...anggotaForm,
			{ nik: '', nama: '', jenis_kelamin: 'Laki-laki', tanggal_lahir: '', hub_keluarga: 'Anak' }
		];
		activeAnggotaIndex = anggotaForm.length - 1;
	}

	function removeAnggota(index) {
		if (anggotaForm.length <= 1) return;
		anggotaForm = anggotaForm.filter((_, i) => i !== index);
		if (activeAnggotaIndex >= anggotaForm.length) {
			activeAnggotaIndex = anggotaForm.length - 1;
		}
	}

	function onHubChange(idx, value) {
		anggotaForm = anggotaForm.map((a, i) => {
			if (i === idx) {
				return { ...a, hub_keluarga: value, jenis_kelamin: value === 'Istri' ? 'Perempuan' : a.jenis_kelamin };
			}
			return a;
		});
	}

	function handleFormSubmit() {
		return async ({ update }) => {
			await update();
			if (page.form?.success) {
				onClose();
				onSave(true, page.form.success);
			}
			if (page.form?.error) {
				onClose();
				onSave(false, page.form.error);
			}
		};
	}
</script>

{#if showModal}
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onclick={onClose} role="button" aria-label="Tutup modal"></div>
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 border border-gray-200 max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between mb-6">
				<h3 class="text-lg font-bold text-gray-900">
					{isEditKeluarga ? 'Edit Keluarga' : 'Tambah Keluarga'}
				</h3>
				<button onclick={onClose} class="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Tutup">
					<i class="fa-solid fa-times text-xl"></i>
				</button>
			</div>

			<form method="POST" action="?/create" use:enhance={handleFormSubmit} class="space-y-6">
				<input type="hidden" name="id" value={editingKeluargaId} />

				<div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
					<h4 class="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
						<i class="fa-solid fa-house"></i>
						Data Keluarga
					</h4>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">No. KK</label>
							<input
								type="text"
								name="no_kk"
								bind:value={noKk}
								placeholder="Contoh: 1234567890123456"
								required
								maxlength="16"
								class="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Blok Rumah</label>
							<select
								name="blok_rumah_id"
								bind:value={blokRumahId}
								required
								class="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
							>
								<option value="">-- Pilih Blok Rumah --</option>
								{#each blokRumahItems as blok}
									<option value={blok.id}>{blok.no_blok}</option>
								{/each}
							</select>
						</div>
						<div class="sm:col-span-2">
							<label class="block text-sm font-medium text-gray-700 mb-1">Status Rumah</label>
							<div class="flex items-center gap-4">
								<label class="flex items-center gap-2 cursor-pointer">
									<input
										type="radio"
										name="status_rumah"
										value="sendiri"
										bind:group={statusRumah}
										class="text-blue-600 focus:ring-blue-500"
									/>
									<span class="text-sm text-gray-700">Rumah Sendiri</span>
								</label>
								<label class="flex items-center gap-2 cursor-pointer">
									<input
										type="radio"
										name="status_rumah"
										value="ngontrak"
										bind:group={statusRumah}
										class="text-blue-600 focus:ring-blue-500"
									/>
									<span class="text-sm text-gray-700">Ngontrak</span>
								</label>
							</div>
						</div>
					</div>
				</div>

				<div>
					<h4 class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
						<i class="fa-solid fa-users"></i>
						Anggota Keluarga
					</h4>

					{#if anggotaForm.length > 0}
						<!-- Tab header -->
						<div class="flex gap-0 border-b border-gray-300 mb-6 overflow-x-auto scrollbar-hide">
							{#each anggotaForm as anggota, idx (idx)}
								<button
									onclick={() => activeAnggotaIndex = idx}
									type="button"
									class={`px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 ${
										idx === 0
											? 'rounded-tl-xl border-r border-gray-200'
											: idx === anggotaForm.length - 1
												? 'border-r border-gray-200'
												: 'border-r border-gray-200'
									} ${activeAnggotaIndex === idx ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-700'}`}
								>
									{anggota.nama || `Anggota ${idx + 1}`}
									{#if anggotaForm.length > 1}
										<button
											onclick={(e) => {
												e.stopPropagation();
												removeAnggota(idx);
											}}
											type="button"
											class="ml-1 px-1.5 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
											title="Hapus anggota"
										>
											<i class="fa-solid fa-times"></i>
										</button>
									{/if}
								</button>
							{/each}
							<button
								onclick={addAnggota}
								type="button"
								class="px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all whitespace-nowrap rounded-tr-xl"
							>
								<i class="fa-solid fa-plus"></i>
							</button>
						</div>

						<!-- Tab panel — all panels stay in DOM but hidden, so all inputs submit -->
						{#each anggotaForm as anggota, idx (idx)}
							<div class={`space-y-3 ${activeAnggotaIndex !== idx ? 'hidden' : ''}`}>
								<div class="w-full">
									<label class="block text-xs font-medium text-gray-700 mb-1">Hubungan Keluarga</label>
									<select
										name="hub_keluarga[]"
										bind:value={anggota.hub_keluarga}
										required
										onchange={(e) => onHubChange(idx, e.target?.value || '')}
										class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
									>
										<option value="Kepala Keluarga">Kepala Keluarga</option>
										<option value="Istri">Istri</option>
										<option value="Anak">Anak</option>
									</select>
								</div>

								<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label class="block text-xs font-medium text-gray-700 mb-1">NIK</label>
										<input
											type="text"
											name="nik[]"
											bind:value={anggota.nik}
											placeholder="1234567890123456"
											required
											maxlength="16"
											class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
										/>
									</div>

									<div>
										<label class="block text-xs font-medium text-gray-700 mb-1">Nama</label>
										<input
											type="text"
											name="nama[]"
											bind:value={anggota.nama}
											placeholder="Nama lengkap"
											required
											class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
										/>
									</div>

									<div>
										<label class="block text-xs font-medium text-gray-700 mb-1">Jenis Kelamin</label>
										<select
											name="jenis_kelamin_visible[]"
											bind:value={anggota.jenis_kelamin}
											disabled={anggota.hub_keluarga === 'Istri'}
											class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
										>
											<option value="Laki-laki">Laki-laki</option>
											<option value="Perempuan">Perempuan</option>
										</select>
										<input type="hidden" name="jenis_kelamin[]" value={anggota.jenis_kelamin} />
									</div>

									<div>
										<label class="block text-xs font-medium text-gray-700 mb-1">Tanggal Lahir</label>
										<input
											type="date"
											name="tanggal_lahir[]"
											bind:value={anggota.tanggal_lahir}
											required
											class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
										/>
									</div>
								</div>
							</div>
						{/each}
					{/if}
				</div>

				<div class="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
					<button type="button" onclick={onClose} class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
						Batal
					</button>
					<button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
						{isEditKeluarga ? 'Perbarui' : 'Simpan Keluarga'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
