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
												class="flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
													{page.url.pathname === '/' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
											>
												<i class="fa-solid fa-chart-pie w-5"></i>
												<span>Dashboard</span>
											</a>
										</li>
										<li>
											<a
												href="/data-blok-rumah"
												onclick={closeSidebar}
												class="flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
													{page.url.pathname === '/data-blok-rumah' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
											>
												<i class="fa-solid fa-house w-5"></i>
												<span>Data Blok Rumah</span>
											</a>
										</li>
										<li>
															<a
																href="/data-penduduk"
																onclick={closeSidebar}
																class="flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
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
																class="flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
																	{page.url.pathname === '/pemilik-rumah-kosong' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
															>
																<i class="fa-solid fa-user-plus w-5"></i>
																<span>Pemilik Rumah Kosong</span>
															</a>
														</li>
														<hr class="my-2 border-gray-100" />
									{/if}
									<li>
										<a
											href="/iuran-bulanan"
											onclick={closeSidebar}
											class="flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
												{page.url.pathname === '/iuran-bulanan' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
										>
											<i class="fa-solid fa-money-bill-wave w-5"></i>
											<span>Iuran Bulanan</span>
										</a>
									</li>
								</ul>
							</nav>
				<div class="p-4 border-t border-gray-200">
								<form method="POST" action="/logout" class="w-full">
									<button
										type="submit"
										onclick={closeSidebar}
										class="flex items-center gap-3 w-full px-4 py-3 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg font-medium transition-colors text-left"
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
