<script>
	let { data } = $props();

	let stats = $derived(data?.stats || {
		totalBlok: 0,
		totalKeluarga: 0,
		totalPenduduk: 0,
		blokDihuni: 0,
		blokKosong: 0,
		jkStats: { laki: 0, perempuan: 0 },
		hubStats: { kepala: 0, istri: 0, anak: 0 },
		umurStats: { bayi: 0, balita: 0, anak_anak: 0, remaja: 0, dewasa: 0, pra_lansia: 0, lansia: 0 }
	});
	let recentKeluarga = $derived(data?.recentKeluarga || []);
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
		<p class="text-gray-600">Selamat datang di halaman admin Sistem BCI</p>
	</div>

	<!-- Ringkasan Utama -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
		<div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-500 uppercase font-semibold">Total Blok Rumah</p>
					<h3 class="text-3xl font-bold text-gray-900 mt-1">{stats.totalBlok}</h3>
				</div>
				<div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
					<i class="fa-solid fa-house text-xl"></i>
				</div>
			</div>
			<div class="mt-4 flex gap-4 text-sm">
				<span class="text-green-600 font-medium flex items-center gap-1">
					<i class="fa-solid fa-circle-check"></i>
					{stats.blokDihuni} Dihuni
				</span>
				<span class="text-gray-500 font-medium flex items-center gap-1">
					<i class="fa-solid fa-circle-xmark"></i>
					{stats.blokKosong} Kosong
				</span>
			</div>
		</div>

		<div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-500 uppercase font-semibold">Total Keluarga (KK)</p>
					<h3 class="text-3xl font-bold text-gray-900 mt-1">{stats.totalKeluarga}</h3>
				</div>
				<div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
					<i class="fa-solid fa-users text-xl"></i>
				</div>
			</div>
		</div>

		<div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-500 uppercase font-semibold">Total Penduduk</p>
					<h3 class="text-3xl font-bold text-gray-900 mt-1">{stats.totalPenduduk}</h3>
				</div>
				<div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
					<i class="fa-solid fa-user-group text-xl"></i>
				</div>
			</div>
			<div class="mt-4 flex gap-4 text-sm">
				<span class="text-blue-600 font-medium flex items-center gap-1">
					<i class="fa-solid fa-mars"></i>
					{stats.jkStats.laki} Laki
				</span>
				<span class="text-pink-600 font-medium flex items-center gap-1">
					<i class="fa-solid fa-venus"></i>
					{stats.jkStats.perempuan} Perempuan
				</span>
			</div>
		</div>

		<div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-500 uppercase font-semibold">Rata-rata Anggota/KK</p>
					<h3 class="text-3xl font-bold text-gray-900 mt-1">
						{stats.totalKeluarga > 0 ? (stats.totalPenduduk / stats.totalKeluarga).toFixed(1) : 0}
					</h3>
				</div>
				<div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
					<i class="fa-solid fa-chart-bar text-xl"></i>
				</div>
			</div>
		</div>
	</div>

	<!-- Komposisi Penduduk -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
			<h3 class="text-lg font-bold text-gray-900 mb-6">Jenis Kelamin</h3>
			<div class="space-y-4">
				<div>
					<div class="flex justify-between text-sm mb-1">
						<span class="text-gray-600">Laki-laki</span>
						<span class="font-medium text-blue-600">{stats.jkStats.laki}</span>
					</div>
					<div class="w-full bg-gray-100 rounded-full h-2">
						<div class="bg-blue-600 h-2 rounded-full transition-all duration-500" style={`width: ${stats.totalPenduduk > 0 ? (stats.jkStats.laki / stats.totalPenduduk) * 100 : 0}%`}></div>
					</div>
				</div>
				<div>
					<div class="flex justify-between text-sm mb-1">
						<span class="text-gray-600">Perempuan</span>
						<span class="font-medium text-pink-600">{stats.jkStats.perempuan}</span>
					</div>
					<div class="w-full bg-gray-100 rounded-full h-2">
						<div class="bg-pink-600 h-2 rounded-full transition-all duration-500" style={`width: ${stats.totalPenduduk > 0 ? (stats.jkStats.perempuan / stats.totalPenduduk) * 100 : 0}%`}></div>
					</div>
				</div>
			</div>
		</div>

		<div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
			<h3 class="text-lg font-bold text-gray-900 mb-6">Hubungan Keluarga</h3>
			<div class="space-y-4">
				<div>
					<div class="flex justify-between text-sm mb-1">
						<span class="text-gray-600">Kepala Keluarga</span>
						<span class="font-medium text-indigo-600">{stats.hubStats.kepala}</span>
					</div>
					<div class="w-full bg-gray-100 rounded-full h-2">
						<div class="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={`width: ${stats.totalPenduduk > 0 ? (stats.hubStats.kepala / stats.totalPenduduk) * 100 : 0}%`}></div>
					</div>
				</div>
				<div>
					<div class="flex justify-between text-sm mb-1">
						<span class="text-gray-600">Istri</span>
						<span class="font-medium text-teal-600">{stats.hubStats.istri}</span>
					</div>
					<div class="w-full bg-gray-100 rounded-full h-2">
						<div class="bg-teal-600 h-2 rounded-full transition-all duration-500" style={`width: ${stats.totalPenduduk > 0 ? (stats.hubStats.istri / stats.totalPenduduk) * 100 : 0}%`}></div>
					</div>
				</div>
				<div>
					<div class="flex justify-between text-sm mb-1">
						<span class="text-gray-600">Anak</span>
						<span class="font-medium text-amber-600">{stats.hubStats.anak}</span>
					</div>
					<div class="w-full bg-gray-100 rounded-full h-2">
						<div class="bg-amber-600 h-2 rounded-full transition-all duration-500" style={`width: ${stats.totalPenduduk > 0 ? (stats.hubStats.anak / stats.totalPenduduk) * 100 : 0}%`}></div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Kelompok Umur -->
	<div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
		<h3 class="text-lg font-bold text-gray-900 mb-6">Kelompok Umur</h3>
		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
			<div class="text-center p-4 bg-red-50 rounded-lg">
				<p class="text-2xl font-bold text-red-600">{stats.umurStats.bayi}</p>
				<p class="text-xs text-gray-500 mt-1">Bayi (0-1 th)</p>
			</div>
			<div class="text-center p-4 bg-orange-50 rounded-lg">
				<p class="text-2xl font-bold text-orange-600">{stats.umurStats.balita}</p>
				<p class="text-xs text-gray-500 mt-1">Balita (1-5 th)</p>
			</div>
			<div class="text-center p-4 bg-amber-50 rounded-lg">
				<p class="text-2xl font-bold text-amber-600">{stats.umurStats.anak_anak}</p>
				<p class="text-xs text-gray-500 mt-1">Anak-Anak (5-10 th)</p>
			</div>
			<div class="text-center p-4 bg-green-50 rounded-lg">
				<p class="text-2xl font-bold text-green-600">{stats.umurStats.remaja}</p>
				<p class="text-xs text-gray-500 mt-1">Remaja (10-19 th)</p>
			</div>
			<div class="text-center p-4 bg-blue-50 rounded-lg">
				<p class="text-2xl font-bold text-blue-600">{stats.umurStats.dewasa}</p>
				<p class="text-xs text-gray-500 mt-1">Dewasa (19-44 th)</p>
			</div>
			<div class="text-center p-4 bg-indigo-50 rounded-lg">
				<p class="text-2xl font-bold text-indigo-600">{stats.umurStats.pra_lansia}</p>
				<p class="text-xs text-gray-500 mt-1">Pra-Lansia (45-59 th)</p>
			</div>
			<div class="text-center p-4 bg-purple-50 rounded-lg">
				<p class="text-2xl font-bold text-purple-600">{stats.umurStats.lansia}</p>
				<p class="text-xs text-gray-500 mt-1">Lansia (60+ th)</p>
			</div>
		</div>
		<div class="mt-4 flex gap-2 flex-wrap">
			{#if stats.totalPenduduk > 0}
				<span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Total: {stats.totalPenduduk}</span>
				<span class="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">Bayi: {stats.umurStats.bayi}</span>
				<span class="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">Balita: {stats.umurStats.balita}</span>
				<span class="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">Anak: {stats.umurStats.anak_anak}</span>
				<span class="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Remaja: {stats.umurStats.remaja}</span>
				<span class="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Dewasa: {stats.umurStats.dewasa}</span>
				<span class="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Pra-Lansia: {stats.umurStats.pra_lansia}</span>
				<span class="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">Lansia: {stats.umurStats.lansia}</span>
			{/if}
		</div>
	</div>

	<!-- Aktivitas Terbaru: 5 Keluarga Terbaru -->
	<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
		<div class="flex items-center justify-between mb-6">
			<h3 class="text-lg font-bold text-gray-900">Keluarga Terbaru Terdaftar</h3>
			<a href="/data-penduduk" class="text-sm text-blue-600 hover:text-blue-700 font-medium">Lihat Semua <i class="fa-solid fa-arrow-right ml-1"></i></a>
		</div>
		{#if recentKeluarga.length > 0}
			<div class="space-y-3">
				{#each recentKeluarga as k}
					<div class="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
						<div class="flex items-center gap-4">
							<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
								<i class="fa-solid fa-users"></i>
							</div>
							<div>
								<p class="text-sm font-medium text-gray-900">KK: {k.no_kk}</p>
								<p class="text-xs text-gray-500">Blok: {k.no_blok || '-'} • {k.jumlah_anggota} anggota • {k.status_rumah === 'sendiri' ? 'Rumah Sendiri' : 'Ngontrak'}</p>
							</div>
						</div>
						<span class="text-xs text-gray-500">{new Date(k.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-center py-8 text-gray-500">
				<i class="fa-solid fa-inbox text-3xl mb-2"></i>
				<p>Belum ada data keluarga</p>
			</div>
		{/if}
	</div>

	<!-- Quick Actions -->
	<div class="grid grid-cols-2 gap-4">
		<a href="/data-blok-rumah" class="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-600 hover:bg-blue-100 transition-colors">
			<i class="fa-solid fa-house text-2xl mb-2"></i>
			<span class="text-sm font-medium">Kelola Blok Rumah</span>
		</a>
		<a href="/data-penduduk" class="flex flex-col items-center justify-center p-4 bg-green-50 rounded-xl border border-green-100 text-green-600 hover:bg-green-100 transition-colors">
			<i class="fa-solid fa-users text-2xl mb-2"></i>
			<span class="text-sm font-medium">Kelola Data Penduduk</span>
		</a>
	</div>
</div>