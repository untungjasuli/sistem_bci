<link
	rel="stylesheet"
	href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
	crossorigin="anonymous"
	referrerpolicy="no-referrer"
/>

<script>
	import '../app.css';
	import { page } from '$app/state';

	let { children, data } = $props();

	let user = $derived(data?.user);
	let sidebarOpen = $state(false);
	let profileOpen = $state(false);
	let dataOpen = $state(false);
	let iuranOpen = $state(false);
	let keuanganOpen = $state(false);
	let laporanOpen = $state(false);
	let tagihanOpen = $state(false);
	let kependudukanOpen = $state(false);

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	function toggleProfile() {
		profileOpen = !profileOpen;
	}

	function closeSidebar() {
		sidebarOpen = false;
	}

	function closeProfile() {
		profileOpen = false;
	}

	// Close dropdown saat klik di luar
	$effect(() => {
		function handleClickOutside(e) {
			if (profileOpen && !e.target.closest('[data-profile-dropdown]')) {
				profileOpen = false;
			}
		}
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	// Get user initial for avatar
	function getInitial(name) {
		return name?.charAt(0).toUpperCase() || 'U';
	}

	// Get role display name
	function getRoleName(role) {
		return role === 'petugas' ? 'Petugas' : 'Admin';
	}

	// Check if user is admin
	function isAdmin() {
		return user?.role === 'admin';
	}
</script>

<div class="min-h-screen bg-gray-50">

	{#if page.url.pathname !== '/login'}
		<nav class="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40">
			<div class="mx-auto px-4 sm:px-6 lg:px-6 flex items-center justify-between h-full">
				<div class="flex items-center gap-4">
					<button
						onclick={toggleSidebar}
						class="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
						aria-label="Toggle sidebar"
					>
						<i class="fa-solid fa-bars text-xl"></i>
					</button>
					<div class="flex items-center gap-2">
						<div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
							B
						</div>
						<span class="text-xl font-bold text-gray-800">Sistem BCI</span>
					</div>
				</div>

				<div class="flex items-center gap-2">
								<div class="relative" data-profile-dropdown>
									<button
										onclick={toggleProfile}
										class="flex items-center gap-2 px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
									>
										<div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
											{getInitial(user?.name)}
										</div>
										<span class="hidden sm:block">{user?.name || 'User'}</span>
										<span class="hidden sm:block text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{getRoleName(user?.role)}</span>
										<i class="fa-solid fa-chevron-down text-xs text-gray-500"></i>
									</button>

									{#if profileOpen}
										<div class="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
											<a href="/profile" onclick={closeProfile} class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors block">
												<i class="fa-solid fa-user w-5 text-gray-400"></i>
												<span>Profil Saya</span>
											</a>
											{#if isAdmin()}
												<a href="/settings" onclick={closeProfile} class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors block">
													<i class="fa-solid fa-gear w-5 text-gray-400"></i>
													<span>Pengaturan</span>
												</a>
											{/if}
											<hr class="my-1 border-gray-100" />
											<form method="POST" action="/logout" class="px-4 py-2">
												<button type="submit" class="flex items-center gap-3 w-full text-left text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors">
													<i class="fa-solid fa-right-from-bracket w-5"></i>
													<span>Log Out</span>
												</button>
											</form>
										</div>
									{/if}
								</div>
							</div>
			</div>
		</nav>

		<aside
			class="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 lg:translate-x-0
			{sidebarOpen ? 'translate-x-0' : '-translate-x-full'}"
		>
			<div class="flex flex-col h-full">
				<div class="p-6 border-b border-gray-200">
					<div class="flex items-center gap-2">
						<div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
							B
						</div>
						<span class="text-lg font-bold text-gray-800">Sistem BCI</span>
					</div>
				</div>
				<nav class="flex-1 overflow-y-auto p-4 space-y-1">
								<ul class="space-y-1">
									{#if isAdmin()}
										<li>
											<a
												href="/"
												onclick={closeSidebar}
												class="flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors text-sm text-left
													{page.url.pathname === '/' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
											>
												<i class="fa-solid fa-chart-pie w-5"></i>
												<span>Dashboard</span>
											</a>
										</li>
									{/if}

									<hr class="my-2 border-gray-100" />
					
									<!-- Divider: Data -->
									<li>
										<div class="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Data</div>
									</li>
					
									<!-- Blok Rumah (expandable) -->
									<li>
										<button
											type="button"
											onclick={() => { dataOpen = !dataOpen; }}
											class="flex items-center justify-between w-full px-4 py-2 rounded-lg font-medium transition-colors text-sm text-left
												{page.url.pathname.startsWith('/data-blok-rumah') || page.url.pathname.startsWith('/denah-blok-rumah') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
										>
											<div class="flex items-center gap-3">
												<i class="fa-solid fa-house w-5"></i>
												<span>Blok Rumah</span>
											</div>
											<i class="fa-solid fa-chevron-down text-xs transition-transform duration-200 {dataOpen ? 'rotate-180' : ''}"></i>
										</button>
										{#if dataOpen}
											<ul class="mt-1 ml-6 space-y-1 border-l border-gray-200">
												<li><a href="/data-blok-rumah" onclick={closeSidebar} class="flex items-center gap-2 px-4 py-1.5 text-sm {page.url.pathname === '/data-blok-rumah' ? 'text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-900'}"><i class="fa-solid fa-building w-4 text-gray-400"></i> Data Blok</a></li>
												<li><a href="/denah-blok-rumah" onclick={closeSidebar} class="flex items-center gap-2 px-4 py-1.5 text-sm {page.url.pathname === '/denah-blok-rumah' ? 'text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-900'}"><i class="fa-solid fa-map w-4 text-gray-400"></i> Denah Blok</a></li>
											</ul>
										{/if}
									</li>
					
									<li>
										<a
											href="/data-penduduk"
											onclick={closeSidebar}
											class="flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors text-sm text-left
												{page.url.pathname === '/data-penduduk' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
										>
											<i class="fa-solid fa-users w-5"></i>
											<span>Data Penduduk</span>
										</a>
									</li>
					
									<li>
										<a
											href="/pemilik-rumah-kosong"
											onclick={closeSidebar}
											class="flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors text-sm text-left
												{page.url.pathname === '/pemilik-rumah-kosong' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
										>
											<i class="fa-solid fa-user-plus w-5"></i>
											<span>Pemilik Rumah Kosong</span>
										</a>
									</li>
					
									<hr class="my-2 border-gray-100" />
					
									<!-- Divider: Iuran Bulanan -->
									<li>
										<div class="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Iuran Bulanan</div>
									</li>
					
									<li>
										<a
											href="/iuran-bulanan"
											onclick={closeSidebar}
											class="flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors text-sm text-left
												{page.url.pathname === '/iuran-bulanan' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
										>
											<i class="fa-solid fa-money-bill-wave w-5"></i>
											<span>Iuran Bulanan</span>
										</a>
									</li>
					
									{#if isAdmin()}
										<li>
											<a
												href="/persetujuan-pembayaran"
												onclick={closeSidebar}
												class="flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors text-sm text-left
													{page.url.pathname === '/persetujuan-pembayaran' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
											>
												<i class="fa-solid fa-clipboard-check w-5"></i>
												<span>Persetujuan Pembayaran</span>
											</a>
										</li>
									{/if}
					
									<hr class="my-2 border-gray-100" />
					
									<!-- Divider: Keuangan (admin only) -->
									{#if isAdmin()}
										<li>
											<div class="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Keuangan</div>
										</li>
						
										<li>
											<a
												href="/kas-account"
												onclick={closeSidebar}
												class="flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors text-sm text-left
													{page.url.pathname === '/kas-account' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
											>
												<i class="fa-solid fa-wallet w-5"></i>
												<span>Rekening Kas</span>
											</a>
										</li>
						
										<li>
											<a
												href="/kategori-kas"
												onclick={closeSidebar}
												class="flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors text-sm text-left
													{page.url.pathname === '/kategori-kas' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
											>
												<i class="fa-solid fa-money-bill-wave w-5"></i>
												<span>Akun Pemasukan & Pengeluaran</span>
											</a>
										</li>
						
										<li>
											<a
												href="/pembayaran-method"
												onclick={closeSidebar}
												class="flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors text-sm text-left
													{page.url.pathname === '/pembayaran-method' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
											>
												<i class="fa-solid fa-credit-card w-5"></i>
												<span>Metode Pembayaran</span>
											</a>
										</li>
						
										<li>
											<a
												href="/transaksi-kas"
												onclick={closeSidebar}
												class="flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors text-sm text-left
													{page.url.pathname === '/transaksi-kas' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
											>
												<i class="fa-solid fa-receipt w-5"></i>
												<span>Transaksi Kas</span>
											</a>
										</li>
						
										<li>
											<a
												href="/transfer-antar-kas"
												onclick={closeSidebar}
												class="flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors text-sm text-left
													{page.url.pathname === '/transfer-antar-kas' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
											>
												<i class="fa-solid fa-arrow-right-arrow-left w-5"></i>
												<span>Transfer Antar Kas</span>
											</a>
										</li>
						
										<hr class="my-2 border-gray-100" />
									{/if}
					
									<!-- Divider: Laporan -->
									<li>
										<div class="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Laporan</div>
									</li>
					
									<!-- Laporan Keuangan -->
									<li>
										<button
											type="button"
											onclick={() => { keuanganOpen = !keuanganOpen; }}
											class="flex items-center justify-between w-full px-4 py-2 rounded-lg font-medium transition-colors text-sm text-left
												{page.url.pathname.startsWith('/laporan/keuangan') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
										>
											<div class="flex items-center gap-3">
												<i class="fa-solid fa-coins w-5"></i>
												<span>Laporan Keuangan</span>
											</div>
											<i class="fa-solid fa-chevron-down text-xs transition-transform duration-200 {keuanganOpen ? 'rotate-180' : ''}"></i>
										</button>
										{#if keuanganOpen}
											<ul class="mt-1 ml-6 space-y-1 border-l border-gray-200">
												<li><a href="/laporan/keuangan/arus-kas" onclick={closeSidebar} class="flex items-center gap-2 px-4 py-1.5 text-sm {page.url.pathname === '/laporan/keuangan/arus-kas' ? 'text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-900'}"><i class="fa-solid fa-arrows-up-down w-4 text-gray-400"></i> Arus Kas</a></li>
												<li><a href="/laporan/keuangan/saldo-kas" onclick={closeSidebar} class="flex items-center gap-2 px-4 py-1.5 text-sm {page.url.pathname === '/laporan/keuangan/saldo-kas' ? 'text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-900'}"><i class="fa-solid fa-wallet w-4 text-gray-400"></i> Saldo Kas</a></li>
												<li><a href="/laporan/keuangan/transaksi-kategori" onclick={closeSidebar} class="flex items-center gap-2 px-4 py-1.5 text-sm {page.url.pathname === '/laporan/keuangan/transaksi-kategori' ? 'text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-900'}"><i class="fa-solid fa-layer-group w-4 text-gray-400"></i> Transaksi per Kategori</a></li>
												<li><a href="/laporan/keuangan/transfer-kas" onclick={closeSidebar} class="flex items-center gap-2 px-4 py-1.5 text-sm {page.url.pathname === '/laporan/keuangan/transfer-kas' ? 'text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-900'}"><i class="fa-solid fa-arrow-right-arrow-left w-4 text-gray-400"></i> Transfer Antar Kas</a></li>
											</ul>
										{/if}
									</li>
					
									<!-- Laporan Tagihan -->
									<li>
										<button
											type="button"
											onclick={() => { tagihanOpen = !tagihanOpen; }}
											class="flex items-center justify-between w-full px-4 py-2 rounded-lg font-medium transition-colors text-sm text-left
												{page.url.pathname.startsWith('/laporan/tagihan') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
										>
											<div class="flex items-center gap-3">
												<i class="fa-solid fa-file-invoice-dollar w-5"></i>
												<span>Laporan Tagihan</span>
											</div>
											<i class="fa-solid fa-chevron-down text-xs transition-transform duration-200 {tagihanOpen ? 'rotate-180' : ''}"></i>
										</button>
										{#if tagihanOpen}
											<ul class="mt-1 ml-6 space-y-1 border-l border-gray-200">
												<li><a href="/laporan/tagihan/rekap-periode" onclick={closeSidebar} class="flex items-center gap-2 px-4 py-1.5 text-sm {page.url.pathname === '/laporan/tagihan/rekap-periode' ? 'text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-900'}"><i class="fa-solid fa-calendar w-4 text-gray-400"></i> Rekap Tagihan per Periode</a></li>
												<li><a href="/laporan/tagihan/tunggakan" onclick={closeSidebar} class="flex items-center gap-2 px-4 py-1.5 text-sm {page.url.pathname === '/laporan/tagihan/tunggakan' ? 'text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-900'}"><i class="fa-solid fa-exclamation-triangle w-4 text-gray-400"></i> Tunggakan Tagihan</a></li>
												<li><a href="/laporan/tagihan/pembayaran-metode" onclick={closeSidebar} class="flex items-center gap-2 px-4 py-1.5 text-sm {page.url.pathname === '/laporan/tagihan/pembayaran-metode' ? 'text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-900'}"><i class="fa-solid fa-credit-card w-4 text-gray-400"></i> Pembayaran per Metode</a></li>
											</ul>
										{/if}
									</li>
					
									<!-- Laporan Kependudukan -->
									<li>
										<button
											type="button"
											onclick={() => { kependudukanOpen = !kependudukanOpen; }}
											class="flex items-center justify-between w-full px-4 py-2 rounded-lg font-medium transition-colors text-sm text-left
												{page.url.pathname.startsWith('/laporan/kependudukan') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
										>
											<div class="flex items-center gap-3">
												<i class="fa-solid fa-users w-5"></i>
												<span>Laporan Kependudukan</span>
											</div>
											<i class="fa-solid fa-chevron-down text-xs transition-transform duration-200 {kependudukanOpen ? 'rotate-180' : ''}"></i>
										</button>
										{#if kependudukanOpen}
											<ul class="mt-1 ml-6 space-y-1 border-l border-gray-200">
												<li><a href="/laporan/kependudukan/warga-blok" onclick={closeSidebar} class="flex items-center gap-2 px-4 py-1.5 text-sm {page.url.pathname === '/laporan/kependudukan/warga-blok' ? 'text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-900'}"><i class="fa-solid fa-house w-4 text-gray-400"></i> Daftar Warga per Blok</a></li>
												<li><a href="/laporan/kependudukan/statistik" onclick={closeSidebar} class="flex items-center gap-2 px-4 py-1.5 text-sm {page.url.pathname === '/laporan/kependudukan/statistik' ? 'text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-900'}"><i class="fa-solid fa-chart-bar w-4 text-gray-400"></i> Statistik Penduduk</a></li>
												<li><a href="/laporan/kependudukan/kelompok-usia" onclick={closeSidebar} class="flex items-center gap-2 px-4 py-1.5 text-sm {page.url.pathname === '/laporan/kependudukan/kelompok-usia' ? 'text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-900'}"><i class="fa-solid fa-user-group w-4 text-gray-400"></i> Warga per Kelompok Usia</a></li>
												<li><a href="/laporan/kependudukan/kontak" onclick={closeSidebar} class="flex items-center gap-2 px-4 py-1.5 text-sm {page.url.pathname === '/laporan/kependudukan/kontak' ? 'text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-900'}"><i class="fa-solid fa-phone w-4 text-gray-400"></i> Data Kontak Warga</a></li>
											</ul>
										{/if}
									</li>
								</ul>
							</nav>
				<div class="p-4 border-t border-gray-200">
								<form method="POST" action="/logout" class="w-full">
																		<button
																			type="submit"
																			onclick={closeSidebar}
																			class="flex items-center gap-3 w-full px-4 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg font-medium transition-colors text-left text-sm"
																		>
										<i class="fa-solid fa-right-from-bracket w-5"></i>
										<span>Logout</span>
									</button>
								</form>
							</div>
			</div>
		</aside>

		{#if sidebarOpen}
			<button type="button"
				onclick={toggleSidebar}
				class="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
				aria-label="Tutup sidebar"
			></button>
		{/if}
	{/if}

	<main class="{page.url.pathname === '/login' ? 'pt-0' : 'lg:pl-64 pt-16'} min-h-screen">
		{#if page.url.pathname === '/login'}
			{@render children()}
		{:else}
			<div class="px-4 sm:px-6 lg:px-8 py-8">
				{@render children()}
			</div>
		{/if}
	</main>

</div>
