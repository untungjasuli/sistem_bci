<link
	rel="stylesheet"
	href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
	crossorigin="anonymous"
	referrerpolicy="no-referrer"
/>

<script>
	import '../app.css';
	import { page } from '$app/state';

	let { children } = $props();

	let sidebarOpen = $state(false);
	let profileOpen = $state(false);

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	function toggleProfile() {
		profileOpen = !profileOpen;
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
					<div class="relative">
						<button
							onclick={toggleProfile}
							class="flex items-center gap-2 px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
						>
							<div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
								U
							</div>
							<span class="hidden sm:block">Admin</span>
							<i class="fa-solid fa-chevron-down text-xs text-gray-500"></i>
						</button>

						{#if profileOpen}
							<div class="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
								<a href="/profile" class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors block">
									<i class="fa-solid fa-user w-5 text-gray-400"></i>
									<span>My Profile</span>
								</a>
								<a href="/settings" class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors block">
									<i class="fa-solid fa-gear w-5 text-gray-400"></i>
									<span>Settings</span>
								</a>
								<a href="/messages" class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors block">
									<i class="fa-solid fa-envelope w-5 text-gray-400"></i>
									<span>Messages</span>
								</a>
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

					<button
						onclick={() => { document.getElementById('logout-form').submit(); }}
						class="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
						aria-label="Logout"
					>
						<i class="fa-solid fa-right-from-bracket text-lg"></i>
					</button>
					<form id="logout-form" method="POST" action="/logout" class="hidden"></form>
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
						<li>
							<a
								href="/"
								class="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg font-medium"
							>
								<i class="fa-solid fa-chart-pie w-5"></i>
								<span>Dashboard</span>
							</a>
						</li>
						<li>
							<a
								href="/data-blok-rumah"
								class="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg font-medium transition-colors"
							>
								<i class="fa-solid fa-house w-5"></i>
								<span>Data Blok Rumah</span>
							</a>
						</li>
						<li>
							<a
								href="/data-penduduk"
								class="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg font-medium transition-colors"
							>
								<i class="fa-solid fa-users w-5"></i>
								<span>Data Penduduk</span>
							</a>
						</li>
					</ul>
				</nav>
				<div class="p-4 border-t border-gray-200">
					<a
						href="/login"
						class="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg font-medium transition-colors"
					>
						<i class="fa-solid fa-right-from-bracket w-5"></i>
						<span>Logout</span>
					</a>
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

		<main class="{page.url.pathname === '/login' ? 'pt-0' : 'lg:pl-64 pt-16'} min-h-screen">
			{#if page.url.pathname === '/login'}
				{@render children()}
			{:else}
				<div class="px-4 sm:px-6 lg:px-8 py-8">
					{@render children()}
				</div>
			{/if}
		</main>
	{/if}

</div>
