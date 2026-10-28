<script>
	let {
		showEditIndividu = false,
		editingIndividuId = '',
		editNIK = '',
		editNama = '',
		editJenisKelamin = 'Laki-laki',
		editTanggalLahir = '',
		onClose,
		onSave
	} = $props();

	async function handleSubmit(e) {
		e.preventDefault();

		const formData = new FormData();
		formData.append('id', editingIndividuId);
		formData.append('nik', editNIK);
		formData.append('nama', editNama);
		formData.append('jenis_kelamin', editJenisKelamin);
		formData.append('tanggal_lahir', editTanggalLahir);

		try {
			const res = await fetch('?/updateAnggota', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();
			if (!res.ok || result.error) {
				onClose();
				onSave(false, result.error || 'Gagal menyimpan data individu');
				return;
			}
			onClose();
			onSave(true, result.success || 'Data penduduk berhasil diperbarui');
		} catch (e) {
			console.error('Save individu error:', e);
			onClose();
			onSave(false, 'Gagal menyimpan data individu');
		}
	}
</script>

{#if showEditIndividu}
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onclick={onClose} role="button" aria-label="Tutup modal"></div>
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-200" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between mb-6">
				<h3 class="text-lg font-bold text-gray-900">Edit Data Penduduk</h3>
				<button onclick={onClose} class="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Tutup">
					<i class="fa-solid fa-times text-xl"></i>
				</button>
			</div>

			<form onsubmit={handleSubmit} class="space-y-4">
				<div>
					<label for="edit_nik" class="block text-sm font-medium text-gray-700 mb-2">NIK <span class="text-red-500">*</span></label>
					<input
						id="edit_nik"
						type="text"
						bind:value={editNIK}
						placeholder="16 digit angka"
						maxlength="16"
						required
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					/>
				</div>
				<div>
					<label for="edit_nama" class="block text-sm font-medium text-gray-700 mb-2">Nama <span class="text-red-500">*</span></label>
					<input
						id="edit_nama"
						type="text"
						bind:value={editNama}
						placeholder="Nama lengkap"
						required
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					/>
				</div>
				<div>
					<label for="edit_jenis_kelamin" class="block text-sm font-medium text-gray-700 mb-2">Jenis Kelamin <span class="text-red-500">*</span></label>
					<select
						id="edit_jenis_kelamin"
						bind:value={editJenisKelamin}
						required
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					>
						<option value="Laki-laki">Laki-laki</option>
						<option value="Perempuan">Perempuan</option>
					</select>
				</div>
				<div>
					<label for="edit_tanggal_lahir" class="block text-sm font-medium text-gray-700 mb-2">Tanggal Lahir</label>
					<input
						id="edit_tanggal_lahir"
						type="date"
						bind:value={editTanggalLahir}
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					/>
				</div>
				<div class="flex items-center justify-end gap-3 pt-4">
					<button type="button" onclick={onClose} class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
						Batal
					</button>
					<button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
						Simpan
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
