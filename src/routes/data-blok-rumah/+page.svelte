<script>
	import { page } from '$app/state';

	let { data } = $props();

	let showModal = $state(false);
	let isEdit = $state(false);
	let editingId = $state('');
	let noBlok = $state('');

	let toast = $state(null); // { type: 'success'|'error', message: string }

	function openAddModal() {
		isEdit = false;
		editingId = '';
		noBlok = '';
		showModal = true;
	}

	function openEditModal(id, blok) {
		isEdit = true;
		editingId = id;
		noBlok = blok;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		isEdit = false;
		editingId = '';
		noBlok = '';
	}

	function showToast(type, message) {
		toast = { type, message };
		setTimeout(() => {
			toast = null;
		}, 4000);
	}

	// Auto-show toast from server messages (runes mode replacement for afterUpdate)
	$effect(() => {
		if (data?.success) {
			showToast('success', data.success);
		}
		if (data?.error) {
			showToast('error', data.error);
		}
	});
</script>

{#if toast}
	<div
		class="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2"
		class:bg-green-50={toast.type === 'success'}
		class:text-green-700={toast.type === 'success'}
		class:border-green-200={toast.type === 'success'}
		class:bg-red-50={toast.type === 'error'}
		class:text-red-700={toast.type === 'error'}
		class:border-red-200={toast.type === 'error'}
	>
		{#if toast.type === 'success'}
			<i class="fa-solid fa-circle-check"></i>
		{:else}
			<i class="fa-solid fa-circle-exclamation"></i>
		{/if}
		<span>{toast.message}</span>
	</div>
{/if}

<div class="px-4 sm:px-6 lg:px-8 py-8">
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Data Blok Rumah</h1>
			<p class="text-gray-500 text-sm">Kelola data blok rumah dalam sistem</p>
		</div>
		<button
			onclick={openAddModal}
			class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
		>
			<i class="fa-solid fa-plus"></i>
			<span>Tambah Blok</span>
		</button>
	</div>

	{#if data.blokRumah && data.blokRumah.length > 0}
		<div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">No. Blok</th>
						<th class="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each data.blokRumah as blok, index}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
							<td class="px-6 py-4 text-sm text-gray-900 font-medium">{blok.no_blok}</td>
							<td class="px-6 py-4 text-right">
								<button
									onclick={() => openEditModal(blok.id, blok.no_blok)}
									class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
									title="Edit"
								>
									<i class="fa-solid fa-pen-to-square"></i>
								</button>
								<form
									method="POST"
									action="?/delete"
									onclick={(e) => {
										if (!confirm('Hapus blok rumah ini?')) e.preventDefault();
									}}
									class="inline"
								>
									<input type="hidden" name="id" value={blok.id} />
									<button
										type="submit"
										class="px-3 py-1.5 text-xs font-medium text-white bg-red-600 border border-transparent rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors"
										title="Hapus"
									>
										<i class="fa-solid fa-trash"></i>
									</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3">
			<i class="fa-solid fa-circle-exclamation text-red-500"></i>
			<div>
				<h3 class="text-sm font-medium text-red-800">Tidak ada data</h3>
				<p class="text-sm text-red-600">Belum ada data blok rumah yang terdaftar.</p>
			</div>
		</div>
	{/if}

	<!-- Modal Add/Edit -->
	{#if showModal}
		<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
			onclick={closeModal}
		></div>
		<div class="fixed inset-0 z-50 flex items-center justify-center"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-200">
				<div class="flex items-center justify-between mb-6">
					<h3 class="text-lg font-bold text-gray-900">
						{isEdit ? 'Edit Blok Rumah' : 'Tambah Blok Rumah'}
					</h3>
					<button onclick={closeModal} class="text-gray-400 hover:text-gray-600 transition-colors">
						<i class="fa-solid fa-times text-xl"></i>
					</button>
				</div>

				<form method="POST" action={isEdit ? '?/update' : '?/create'} class="space-y-4">
					<input type="hidden" name="id" value={editingId} />
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">No. Blok</label>
						<input
							type="text"
							name="no_blok"
							bind:value={noBlok}
							placeholder="Contoh: U-10"
							required
							class="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						/>
					</div>
					<div class="flex items-center justify-end gap-3 pt-4">
						<button
							type="button"
							onclick={closeModal}
							class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
						>
							Batal
						</button>
						<button
							type="submit"
							class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
						>
							{isEdit ? 'Perbarui' : 'Simpan'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
