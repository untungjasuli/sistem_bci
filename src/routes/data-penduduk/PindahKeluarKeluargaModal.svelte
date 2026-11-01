<script>
	let {
		showPindahKeluarKeluarga = false,
		pindahKeluarKeluargaData = { keluarga_id: '', no_kk: '', jumlah_anggota: 0 },
		onClose,
		onSubmit
	} = $props();

	// Form state
	let tanggalMutasi = $state('');
	let alamatTujuan = $state('');
	let rtRwTujuan = $state('');
	let kelurahanTujuan = $state('');
	let kecamatanTujuan = $state('');
	let kotaTujuan = $state('');
	let provinsiTujuan = $state('');
	let noSuratPindah = $state('');
	let alasan = $state('');
	let keterangan = $state('');

	// Error state
	let errors = $state({});
	let serverError = $state('');

	// Reset form saat modal dibuka
	$effect(() => {
		if (showPindahKeluarKeluarga) {
			tanggalMutasi = new Date().toISOString().split('T')[0];
			alamatTujuan = '';
			rtRwTujuan = '';
			kelurahanTujuan = '';
			kecamatanTujuan = '';
			kotaTujuan = '';
			provinsiTujuan = '';
			noSuratPindah = '';
			alasan = '';
			keterangan = '';
			errors = {};
			serverError = '';
		}
	});

	function validate() {
		errors = {};
		let valid = true;

		if (!tanggalMutasi) {
			errors.tanggalMutasi = 'Tanggal pindah wajib diisi';
			valid = false;
		}
		if (!alamatTujuan) {
			errors.alamatTujuan = 'Alamat tujuan wajib diisi';
			valid = false;
		}

		return valid;
	}

	async function handleSubmit(e) {
		e.preventDefault();

		if (!validate()) return;

		const formData = new FormData();
		formData.append('keluarga_id', pindahKeluarKeluargaData.keluarga_id);
		formData.append('tanggal_mutasi', tanggalMutasi);
		formData.append('alamat_tujuan', alamatTujuan);
		formData.append('rt_rw_tujuan', rtRwTujuan);
		formData.append('kelurahan_tujuan', kelurahanTujuan);
		formData.append('kecamatan_tujuan', kecamatanTujuan);
		formData.append('kota_tujuan', kotaTujuan);
		formData.append('provinsi_tujuan', provinsiTujuan);
		formData.append('no_surat_pindah', noSuratPindah);
		formData.append('alasan', alasan);
		formData.append('keterangan', keterangan);

		try {
			const res = await fetch('?/pindahKeluarKeluarga', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
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
				serverError = actionResult.error || 'Gagal pindah keluar keluarga';
				return;
			}

			onClose();
			onSubmit(true, actionResult.success || 'Berhasil pindah keluar keluarga');
		} catch (e) {
			console.error('Pindah keluar keluarga error:', e);
			serverError = 'Gagal pindah keluar keluarga';
		}
	}
</script>

{#if showPindahKeluarKeluarga}
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onclick={onClose} role="button" aria-label="Tutup modal"></div>
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-200" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg">
				<h3 class="text-lg font-bold text-gray-900">Pindah Keluar Keluarga</h3>
				<button onclick={onClose} class="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Tutup">
					<i class="fa-solid fa-times text-xl"></i>
				</button>
			</div>

			<form onsubmit={handleSubmit} class="p-4 space-y-4">
				{#if serverError}
					<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
						{serverError}
					</div>
				{/if}

				<div class="bg-blue-50 p-3 rounded-lg border border-blue-100">
					<p class="text-sm text-blue-900">
						<strong>No. KK:</strong> {pindahKeluarKeluargaData.no_kk} | 
						<strong>Jumlah Anggota:</strong> {pindahKeluarKeluargaData.jumlah_anggota} orang
					</p>
					<p class="text-xs text-blue-700 mt-1">
						<i class="fa-solid fa-circle-info mr-1"></i>
						Semua anggota aktif akan dipindahkan keluar. Blok rumah akan menjadi kosong.
					</p>
				</div>

				<div>
					<label for="tanggal_mutasi_kk" class="block text-sm font-medium text-gray-700 mb-1">
						Tanggal Pindah <span class="text-red-500">*</span>
					</label>
					<input
						id="tanggal_mutasi_kk"
						type="date"
						bind:value={tanggalMutasi}
						required
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					/>
					{#if errors.tanggalMutasi}
						<p class="text-red-500 text-xs mt-1">{errors.tanggalMutasi}</p>
					{/if}
				</div>

				<div>
					<label for="alamat_tujuan_kk" class="block text-sm font-medium text-gray-700 mb-1">
						Alamat Tujuan <span class="text-red-500">*</span>
					</label>
					<textarea
						id="alamat_tujuan_kk"
						bind:value={alamatTujuan}
						rows="2"
						placeholder="Alamat lengkap tujuan pindah seluruh keluarga"
						required
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					></textarea>
					{#if errors.alamatTujuan}
						<p class="text-red-500 text-xs mt-1">{errors.alamatTujuan}</p>
					{/if}
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="rt_rw_tujuan_kk" class="block text-sm font-medium text-gray-700 mb-1">RT/RW</label>
						<input
							id="rt_rw_tujuan_kk"
							type="text"
							bind:value={rtRwTujuan}
							placeholder="Contoh: RT 03 RW 05"
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						/>
					</div>
					<div>
						<label for="kelurahan_tujuan_kk" class="block text-sm font-medium text-gray-700 mb-1">Kelurahan/Desa</label>
						<input
							id="kelurahan_tujuan_kk"
							type="text"
							bind:value={kelurahanTujuan}
							placeholder="Kelurahan/Desa"
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="kecamatan_tujuan_kk" class="block text-sm font-medium text-gray-700 mb-1">Kecamatan</label>
						<input
							id="kecamatan_tujuan_kk"
							type="text"
							bind:value={kecamatanTujuan}
							placeholder="Kecamatan"
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						/>
					</div>
					<div>
						<label for="kota_tujuan_kk" class="block text-sm font-medium text-gray-700 mb-1">Kota/Kabupaten</label>
						<input
							id="kota_tujuan_kk"
							type="text"
							bind:value={kotaTujuan}
							placeholder="Kota/Kabupaten"
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						/>
					</div>
				</div>

				<div>
					<label for="provinsi_tujuan_kk" class="block text-sm font-medium text-gray-700 mb-1">Provinsi</label>
					<input
						id="provinsi_tujuan_kk"
						type="text"
						bind:value={provinsiTujuan}
						placeholder="Provinsi"
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					/>
				</div>

				<div>
					<label for="no_surat_pindah_kk" class="block text-sm font-medium text-gray-700 mb-1">No. Surat Pindah (Opsional)</label>
					<input
						id="no_surat_pindah_kk"
						type="text"
						bind:value={noSuratPindah}
						placeholder="Nomor surat pindah (bisa sama untuk seluruh KK)"
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					/>
				</div>

				<div>
					<label for="alasan_kk" class="block text-sm font-medium text-gray-700 mb-1">Alasan Pindah</label>
					<select
						id="alasan_kk"
						bind:value={alasan}
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					>
						<option value="">-- Pilih Alasan --</option>
						<option value="Pindah kerja">Pindah kerja</option>
						<option value="Pindah sekolah">Pindah sekolah</option>
						<option value="Menikah">Menikah</option>
						<option value="Membeli rumah baru">Membeli rumah baru</option>
						<option value="Sewa rumah baru">Sewa rumah baru</option>
						<option value="Gabung keluarga">Gabung keluarga</option>
						<option value="Lainnya">Lainnya</option>
					</select>
				</div>

				<div>
					<label for="keterangan_kk" class="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
					<textarea
						id="keterangan_kk"
						bind:value={keterangan}
						rows="2"
						placeholder="Keterangan tambahan (opsional)"
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
					<button
						type="button"
						onclick={onClose}
						class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
					>
						<i class="fa-solid fa-users-slash"></i> Pindah Keluar Seluruh Keluarga
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}