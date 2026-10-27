<script>
	let { form } = $props();
</script>

<style>
	:global(html, body) {
		overflow: hidden;
		height: 100%;
	}
</style>

<div class="pt-0 min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-700 px-4 sm:px-6 lg:px-8 overflow-hidden">
	<div class="max-w-md w-full">
		<div class="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-white/20">
			<div class="text-center mb-8">
				<div class="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
					<i class="fa-solid fa-shield-halved text-white text-2xl"></i>
				</div>
				<h2 class="text-2xl font-bold text-gray-900">Login Admin</h2>
				<p class="text-gray-600 text-sm mt-2">Masuk ke sistem administrasi Sistem BCI</p>
			</div>

			{#if form?.error}
				<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
					{form.error}
				</div>
			{/if}

			<form method="POST" class="space-y-5">
				<div>
					<label for="username" class="block text-sm font-medium text-gray-700 mb-2">Username</label>
					<div class="relative">
						<i class="fa-solid fa-user absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
						<input
							id="username"
							type="text"
							name="username"
							placeholder="admin"
							autocomplete="username"
							required
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						/>
					</div>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700 mb-2">Password</label>
					<div class="relative">
						<i class="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
						<input
							id="password"
							type="password"
							name="password"
							placeholder="••••••••"
							autocomplete="current-password"
							required
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
						/>
					</div>
				</div>

				<div class="flex items-center space-x-3">
					<input id="remember" type="checkbox" name="remember" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
					<label for="remember" class="text-sm text-gray-600 cursor-pointer">Ingat saya</label>
				</div>

				<button
					type="submit"
					class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-lg"
				>
					Masuk
				</button>
			</form>
		</div>
	</div>
</div>
