<script>
	import { page } from '$app/state';

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

	// Error state untuk validasi client-side
	let formErrors = $state({
		noKk: '',
		anggota: []
	});

	// Error dari server (misal No. KK sudah terdaftar)
	let serverError = $state('');

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
				tempat_lahir: a.tempat_lahir || '',
				tanggal_lahir: toWibDateString(a.tanggal_lahir),
				hub_keluarga: a.hub_keluarga || 'Anak',
				nomor_hp: a.nomor_hp || '',
				agama: a.agama || '',
				pekerjaan: a.pekerjaan || '',
				status_perkawinan: a.status_perkawinan || ''
			}));
		} else {
			anggotaForm = [
				{ nik: '', nama: '', jenis_kelamin: 'Laki-laki', tempat_lahir: '', tanggal_lahir: '', hub_keluarga: 'Kepala Keluarga', nomor_hp: '', agama: '', pekerjaan: '', status_perkawinan: '' }
			];
		}
		activeAnggotaIndex = 0;
	});

	// Bersihkan error server saat modal dibuka agar tidak muncul lagi saat dibuka ulang
	$effect(() => {
		if (showModal) {
			serverError = '';
		}
	});

	// Opsi dropdown untuk field baru
	const agamaOptions = [
		'Islam',
		'Kristen Protestan',
		'Kristen Katolik',
		'Hindu',
		'Buddha',
		'Konghucu'
	];

	const pekerjaanOptions = [
		'Tidak Bekerja',
		'Ibu Rumah Tangga',
		'Pelajar/Mahasiswa',
		'Pensiunan',
		'Karyawan Swasta',
		'Wiraswasta',
		'Pedagang',
		'Buruh Harian Lepas',
		'PNS/ASN',
		'TNI',
		'POLRI',
		'Karyawan BUMN',
		'Karyawan Honorer',
		'Dokter/Bidan/Perawat/Apoteker',
		'Guru/Dosen',
		'Pengacara/Notaris/Akuntan',
		'Petani/Pekebun dan Nelayan',
		'Seniman',
		'Wartawan'
	];

	const statusPerkawinanOptions = [
		'Belum Kawin',
		'Kawin Tercatat',
		'Kawin Belum Tercatat',
		'Cerai Hidup',
		'Cerai Mati'
	];

	function hanyaAngka(e) {
		const t = e.target;
		if (t instanceof HTMLInputElement) {
			t.value = t.value.replace(/\D/g, '');
		}
	}

	function validateForm() {
		const nikRegex = /^\d{16}$/;
		const hpRegex = /^\d{11,13}$/;

		let valid = true;

		// Reset errors
		formErrors.noKk = '';
		formErrors.anggota = anggotaForm.map(() => ({ nik: '', nomorHp: '' }));

		if (!noKk) {
			formErrors.noKk = 'No. KK wajib diisi';
			valid = false;
		} else if (!nikRegex.test(noKk)) {
			formErrors.noKk = 'No. KK harus berupa 16 digit angka';
			valid = false;
		}

		for (let i = 0; i < anggotaForm.length; i++) {
			const a = anggotaForm[i];
			if (!a.nik) {
				formErrors.anggota[i].nik = 'NIK wajib diisi';
				valid = false;
			} else if (!nikRegex.test(a.nik)) {
				formErrors.anggota[i].nik = 'NIK harus berupa 16 digit angka';
				valid = false;
			}
			if (a.nomor_hp && !hpRegex.test(a.nomor_hp)) {
				formErrors.anggota[i].nomorHp = 'Nomor HP harus berupa 11-13 digit angka';
				valid = false;
			}
		}

		return valid;
	}

	function addAnggota() {
		anggotaForm = [
			...anggotaForm,
			{ nik: '', nama: '', jenis_kelamin: 'Laki-laki', tempat_lahir: '', tanggal_lahir: '', hub_keluarga: 'Anak', nomor_hp: '', agama: '', pekerjaan: '', status_perkawinan: '' }
		];
		formErrors.anggota = [
			...formErrors.anggota,
			{ nik: '', nomorHp: '' }
		];
		activeAnggotaIndex = anggotaForm.length - 1;
	}

	function removeAnggota(index) {
		if (anggotaForm.length <= 1) return;
		anggotaForm = anggotaForm.filter((_, i) => i !== index);
		formErrors.anggota = formErrors.anggota.filter((_, i) => i !== index);
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

	async function handleSubmit(e) {
		e.preventDefault();

		if (!validateForm()) return;

		const formData = new FormData();
		formData.append('id', editingKeluargaId);
		formData.append('no_kk', noKk);
		formData.append('blok_rumah_id', blokRumahId);
		formData.append('status_rumah', statusRumah);

		for (let i = 0; i < anggotaForm.length; i++) {
			const a = anggotaForm[i];
			formData.append('nik[]', a.nik);
			formData.append('nama[]', a.nama);
			formData.append('jenis_kelamin[]', a.jenis_kelamin);
			formData.append('tempat_lahir[]', a.tempat_lahir || '');
			formData.append('tanggal_lahir[]', a.tanggal_lahir);
			formData.append('hub_keluarga[]', a.hub_keluarga);
			formData.append('nomor_hp[]', a.nomor_hp || '');
			formData.append('agama[]', a.agama || '');
			formData.append('pekerjaan[]', a.pekerjaan || '');
			formData.append('status_perkawinan[]', a.status_perkawinan || '');
		}

		try {
			const res = await fetch('?/create', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();
			// SvelteKit form action response: { type, status, data: '[{"error":1},"message"]' } or '[{"success":1},"message"]'
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

			const hasError = !res.ok || actionResult.error;
			if (hasError) {
				serverError = actionResult.error || 'Gagal menyimpan data keluarga';
				return;
			}
			onClose();
			onSave(true, actionResult.success || 'Data keluarga berhasil disimpan');
		} catch (e) {
			console.error('Save keluarga error:', e);
			serverError = 'Gagal menyimpan data keluarga';
		}
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

			<form onsubmit={handleSubmit} class="space-y-6">
				{#if serverError}
					<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
						{serverError}
					</div>
				{/if}
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
								oninput={hanyaAngka}
								class="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
							/>
							{#if formErrors.noKk}
								<p class="text-red-500 text-xs mt-1">{formErrors.noKk}</p>
							{/if}
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
											<div class="flex flex-wrap items-center gap-4">
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
												<label class="flex items-center gap-2 cursor-pointer">
													<input
														type="radio"
														name="status_rumah"
														value="ikut_ortu_mertua"
														bind:group={statusRumah}
														class="text-blue-600 focus:ring-blue-500"
													/>
													<span class="text-sm text-gray-700">Ikut Orang Tua/Mertua</span>
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
								</button>
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
											oninput={hanyaAngka}
											class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
										/>
										{#if formErrors.anggota[idx]?.nik}
											<p class="text-red-500 text-xs mt-1">{formErrors.anggota[idx].nik}</p>
										{/if}
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
														<label class="block text-xs font-medium text-gray-700 mb-1">Status Perkawinan</label>
														<select
															name="status_perkawinan[]"
															bind:value={anggota.status_perkawinan}
															class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
														>
															<option value="">-- Pilih Status Perkawinan --</option>
															{#each statusPerkawinanOptions as opt}
																<option value={opt}>{opt}</option>
															{/each}
														</select>
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
														<label class="block text-xs font-medium text-gray-700 mb-1">Tempat Lahir</label>
														<input
															type="text"
															name="tempat_lahir[]"
															bind:value={anggota.tempat_lahir}
															placeholder="Contoh: Jakarta"
															class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
														/>
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

													<div>
														<label class="block text-xs font-medium text-gray-700 mb-1">Nomor HP</label>
														<input
															type="text"
															name="nomor_hp[]"
															bind:value={anggota.nomor_hp}
															placeholder="081234567890"
															maxlength="13"
															oninput={hanyaAngka}
															class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
														/>
														{#if formErrors.anggota[idx]?.nomorHp}
															<p class="text-red-500 text-xs mt-1">{formErrors.anggota[idx].nomorHp}</p>
														{/if}
													</div>

													<div>
														<label class="block text-xs font-medium text-gray-700 mb-1">Agama</label>
														<select
															name="agama[]"
															bind:value={anggota.agama}
															class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
														>
															<option value="">-- Pilih Agama --</option>
															{#each agamaOptions as opt}
																<option value={opt}>{opt}</option>
															{/each}
														</select>
													</div>

													<div>
																		<label class="block text-xs font-medium text-gray-700 mb-1">Pekerjaan</label>
																		<select
																			name="pekerjaan[]"
																			bind:value={anggota.pekerjaan}
																			class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
																		>
																			<option value="">-- Pilih Pekerjaan --</option>
																			{#each pekerjaanOptions as opt}
																				<option value={opt}>{opt}</option>
																			{/each}
																		</select>
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
									<i class="fa-solid fa-save mr-2"></i> {isEditKeluarga ? 'Perbarui' : 'Simpan Keluarga'}
								</button>
				</div>
			</form>
		</div>
	</div>
{/if}