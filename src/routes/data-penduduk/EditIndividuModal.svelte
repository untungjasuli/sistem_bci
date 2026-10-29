<script>
	let {
		showEditIndividu = false,
		editingIndividuId = '',
		editNIK = '',
		editNama = '',
		editJenisKelamin = 'Laki-laki',
		editTanggalLahir = '',
		editNomorHp = '',
		onClose,
		onSave
	} = $props();

	// Error state untuk validasi client-side
	let nikError = $state('');
	let nomorHpError = $state('');

	// Error dari server
	let serverError = $state('');

	const nikRegex = /^\d{16}$/;
	const hpRegex = /^\d{11,13}$/;

	function hanyaAngka(e) {
		const t = e.target;
		if (t instanceof HTMLInputElement) {
			t.value = t.value.replace(/\D/g, '');
		}
	}

	// Bersihkan error server saat modal dibuka agar tidak muncul lagi saat dibuka ulang
	$effect(() => {
		if (showEditIndividu) {
			serverError = '';
		}
	});

	function validate() {
		nikError = '';
		nomorHpError = '';

		let valid = true;

		if (!editNIK) {
			nikError = 'NIK wajib diisi';
			valid = false;
		} else if (!nikRegex.test(editNIK)) {
			nikError = 'NIK harus berupa 16 digit angka';
			valid = false;
		}

		if (editNomorHp && !hpRegex.test(editNomorHp)) {
			nomorHpError = 'Nomor HP harus berupa 11-13 digit angka';
			valid = false;
		}

		return valid;
	}

	async function handleSubmit(e) {
		e.preventDefault();

		if (!validate()) return;

		const formData = new FormData();
		formData.append('id', editingIndividuId);
		formData.append('nik', editNIK);
		formData.append('nama', editNama);
		formData.append('jenis_kelamin', editJenisKelamin);
		formData.append('tanggal_lahir', editTanggalLahir);
		formData.append('nomor_hp', editNomorHp);

		try {
			const res = await fetch('?/updateAnggota', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			const result = await res.json();
			// SvelteKit form action response: { type, status, data: '[{"error":1},"message"]' } or '[{"success":1},"message"]'
			let errorMessage = '';
			let successMessage = '';
			if (result.data) {
				try {
					const parsed = JSON.parse(result.data);
					if (Array.isArray(parsed) && parsed[1]) {
						if (parsed[0]?.error) {
							errorMessage = parsed[1];
						} else if (parsed[0]?.success) {
							successMessage = parsed[1];
						}
					}
				} catch {}
			}
			const hasError = !res.ok || result.error || errorMessage;
			if (hasError) {
				serverError = errorMessage || result.error || 'Gagal menyimpan data individu';
				return;
			}
			onClose();
			onSave(true, successMessage || result.success || 'Data penduduk berhasil diperbarui');
		} catch (e) {
			console.error('Save individu error:', e);
			serverError = 'Gagal menyimpan data individu';
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
				{#if serverError}
					<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
						{serverError}
					</div>
				{/if}
				<div>
					<label for="edit_nik" class="block text-sm font-medium text-gray-700 mb-2">NIK <span class="text-red-500">*</span></label>
					<input
						id="edit_nik"
						type="text"
						bind:value={editNIK}
						placeholder="16 digit angka"
						maxlength="16"
						required
						oninput={hanyaAngka}
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					/>
					{#if nikError}
						<p class="text-red-500 text-xs mt-1">{nikError}</p>
					{/if}
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
				<div>
					<label for="edit_nomor_hp" class="block text-sm font-medium text-gray-700 mb-2">Nomor HP</label>
					<input
						id="edit_nomor_hp"
						type="text"
						bind:value={editNomorHp}
						placeholder="081234567890"
						maxlength="13"
						oninput={hanyaAngka}
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					/>
					{#if nomorHpError}
						<p class="text-red-500 text-xs mt-1">{nomorHpError}</p>
					{/if}
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