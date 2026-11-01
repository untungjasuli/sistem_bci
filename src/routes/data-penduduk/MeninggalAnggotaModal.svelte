<script>
	let {
		showMeninggalAnggota = false,
		meninggalAnggotaData = { id: '', nama: '', nik: '' },
		onClose,
		onSubmit
	} = $props();

	// Form state
	let tanggalMutasi = $state('');
	let alasan = $state('');
	let noSuratMeninggal = $state('');
	let keterangan = $state('');

	// Error state
	let errors = $state({});
	let serverError = $state('');

	// Reset form saat modal dibuka
	$effect(() => {
		if (showMeninggalAnggota) {
			tanggalMutasi = new Date().toISOString().split('T')[0];
			alasan = '';
			noSuratMeninggal = '';
			keterangan = '';
			errors = {};
			serverError = '';
		}
	});

	function validate() {
		errors = {};
		let valid = true;

		if (!tanggalMutasi) {
			errors.tanggalMutasi = 'Tanggal meninggal wajib diisi';
			valid = false;
		}

		return valid;
	}

	async function handleSubmit(e) {
		e.preventDefault();

		if (!validate()) return;

		const formData = new FormData();
		formData.append('id', meninggalAnggotaData.id);
		formData.append('tanggal_mutasi', tanggalMutasi);
		formData.append('alasan', alasan);
		formData.append('no_surat_meninggal', noSuratMeninggal);
		formData.append('keterangan', keterangan);

		try {
			const res = await fetch('?/meninggalAnggota', {
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
				serverError = actionResult.error || 'Gagal mencatat meninggal';
				return;
			}

			onClose();
			onSubmit(true, actionResult.success || 'Berhasil mencatat meninggal');
		} catch (e) {
			console.error('Meninggal anggota error:', e);
			serverError = 'Gagal mencatat meninggal';
		}
	}
</script>

{#if showMeninggalAnggota}
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onclick={onClose} role="button" aria-label="Tutup modal"></div>
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-200" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg">
				<h3 class="text-lg font-bold text-gray-900">Mencatat Meninggal</h3>
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

				<div class="bg-gray-50 p-3 rounded-lg border border-gray-100">
					<p class="text-sm text-gray-800">
						<strong>NIK:</strong> {meninggalAnggotaData.nik} | 
						<strong>Nama:</strong> {meninggalAnggotaData.nama}
					</p>
				</div>

				<div>
					<label for="tanggal_meninggal" class="block text-sm font-medium text-gray-700 mb-1">
						Tanggal Meninggal <span class="text-red-500">*</span>
					</label>
					<input
						id="tanggal_meninggal"
						type="date"
						bind:value={tanggalMutasi}
						required
						max={new Date().toISOString().split('T')[0]}
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					/>
					{#if errors.tanggalMutasi}
						<p class="text-red-500 text-xs mt-1">{errors.tanggalMutasi}</p>
					{/if}
				</div>

				<div>
					<label for="alasan_meninggal" class="block text-sm font-medium text-gray-700 mb-1">Alasan/Penyebab</label>
					<select
						id="alasan_meninggal"
						bind:value={alasan}
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					>
						<option value="">-- Pilih Alasan (Opsional) --</option>
						<option value="Sakit lama">Sakit lama</option>
						<option value="Kecelakaan">Kecelakaan</option>
						<option value="Usia lanjut">Usia lanjut</option>
						<option value="Sakit mendadak">Sakit mendadak</option>
						<option value="Lainnya">Lainnya</option>
					</select>
				</div>

				<div>
					<label for="no_surat_meninggal" class="block text-sm font-medium text-gray-700 mb-1">No. Surat Keterangan Meninggal (Opsional)</label>
					<input
						id="no_surat_meninggal"
						type="text"
						bind:value={noSuratMeninggal}
						placeholder="Nomor surat keterangan meninggal dari kelurahan/RS"
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					/>
				</div>

				<div>
					<label for="keterangan_meninggal" class="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
					<textarea
						id="keterangan_meninggal"
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
						class="px-4 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 rounded-lg transition-colors flex items-center gap-2"
					>
						<i class="fa-solid fa-cross"></i> Catat Meninggal
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}