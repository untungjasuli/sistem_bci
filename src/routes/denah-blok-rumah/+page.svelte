<script>
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let blokRumah = $derived(data.blokRumah || []);
	let gridCols = data.gridCols || 10;
	let gridRows = data.gridRows || 10;
	let cellSize = $state(data.cellSize || 40);
	let maxGrid = $state(data.maxGrid || 50);

	let toast = $state(null);

	function showToast(type, message) {
		toast = { type, message };
		setTimeout(() => { toast = null; }, 5000);
	}

	// Drag state
	let draggedBlok = $state(null);
	let dragOverCell = $state({ x: -1, y: -1 });
	let isDragging = $state(false);

	// Resize state
	let resizingBlok = $state(null);
	let resizeStart = $state({ x: 0, y: 0, width: 1, height: 1 });

	// Detail modal state
	let detailModal = $state({ show: false, loading: false, data: null });

	async function fetchBlokDetail(blokId) {
		detailModal = { show: true, loading: true, data: null };
		try {
			const res = await fetch(`/denah-blok-rumah/detail?id=${blokId}`, { credentials: 'include' });
			const result = await res.json();
			if (result.error) {
				showToast('error', result.error);
				detailModal = { show: false, loading: false, data: null };
			} else {
				detailModal = { show: true, loading: false, data: result };
			}
		} catch (e) {
			console.error('Fetch detail error:', e);
			showToast('error', 'Gagal memuat detail');
			detailModal = { show: false, loading: false, data: null };
		}
	}

	function closeDetailModal() {
		detailModal = { show: false, loading: false, data: null };
	}

	// Get blok at grid position
	function getBlokAt(x, y, excludeId = null) {
		return blokRumah.find(b => {
			if (excludeId && b.id === excludeId) return false;
			const bx = b.pos_x || 0;
			const by = b.pos_y || 0;
			const bw = b.width || 1;
			const bh = b.height || 1;
			return x >= bx && x < bx + bw && y >= by && y < by + bh;
		});
	}

	// Find nearest empty cell (spiral search from target)
	function findNearestEmptyCell(startX, startY, blokWidth, blokHeight) {
		const maxSearch = maxGrid;
		if (!getBlokAt(startX, startY)) return { x: startX, y: startY };
		
		for (let radius = 1; radius <= maxSearch; radius++) {
			for (let dx = -radius; dx <= radius; dx++) {
				for (let dy = -radius; dy <= radius; dy++) {
					if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
					const nx = startX + dx;
					const ny = startY + dy;
					if (nx < 0 || ny < 0 || nx + blokWidth > maxGrid || ny + blokHeight > maxGrid) continue;
					
					// Check if area is free
					let free = true;
					for (let ix = 0; ix < blokWidth; ix++) {
						for (let iy = 0; iy < blokHeight; iy++) {
							if (getBlokAt(nx + ix, ny + iy)) { free = false; break; }
						}
						if (!free) break;
					}
					if (free) return { x: nx, y: ny };
				}
			}
		}
		return null; // grid full
	}

	// Auto-distribute blocks stuck at (0,0) on load
	function autoDistributeBlocks() {
		const atZero = blokRumah.filter(b => (b.pos_x || 0) === 0 && (b.pos_y || 0) === 0);
		if (atZero.length <= 1) return; // only 1 or none at origin
		
		let nextX = 0, nextY = 0;
		for (const blok of atZero.slice(1)) { // skip first one
			const spot = findNearestEmptyCell(nextX, nextY, blok.width || 1, blok.height || 1);
			if (spot) {
				// Update via API (fire and forget)
				const formData = new FormData();
				formData.append('id', blok.id);
				formData.append('pos_x', spot.x);
				formData.append('pos_y', spot.y);
				fetch('?/updatePosition', { method: 'POST', body: formData, credentials: 'include' });
				nextX = spot.x + (blok.width || 1);
				if (nextX >= maxGrid) { nextX = 0; nextY += 2; }
			}
		}
	}

	// Call auto-distribute on mount
	{
		autoDistributeBlocks();
	}
	function getBlokById(id) {
		return blokRumah.find(b => b.id === id);
	}

	// Handle drag start
	function handleDragStart(e, blok) {
		draggedBlok = blok;
		isDragging = true;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', blok.id.toString());
	}

	// Handle drag over grid cell
	function handleDragOver(e, x, y) {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		if (!isDragging) return;
		
		// Check bounds (respect maxGrid)
		if (x < 0 || y < 0 || x >= maxGrid || y >= maxGrid) return;
		
		// Check if target cell is valid (not occupied by other blok)
		const targetBlok = getBlokAt(x, y, draggedBlok?.id);
		if (!targetBlok || targetBlok.id === draggedBlok?.id) {
			dragOverCell = { x, y };
		}
	}

	// Handle drag leave
	function handleDragLeave() {
		dragOverCell = { x: -1, y: -1 };
	}

	// Handle drop
	function handleDrop(e, x, y) {
		e.preventDefault();
		if (!draggedBlok) return;

		// Bounds check
		if (x < 0 || y < 0 || x >= maxGrid || y >= maxGrid) {
			draggedBlok = null;
			isDragging = false;
			dragOverCell = { x: -1, y: -1 };
			return;
		}

		const targetBlok = getBlokAt(x, y, draggedBlok.id);
		let finalX = x;
		let finalY = y;

		// If target occupied by OTHER block, find nearest empty spot
		if (targetBlok && targetBlok.id !== draggedBlok.id) {
			const spot = findNearestEmptyCell(x, y, draggedBlok.width || 1, draggedBlok.height || 1);
			if (spot) {
				finalX = spot.x;
				finalY = spot.y;
				showToast('info', `Blok dipindah ke sel kosong terdekat (${finalX},${finalY})`);
			} else {
				showToast('error', 'Grid penuh, tidak bisa memindahkan blok');
				draggedBlok = null;
				isDragging = false;
				dragOverCell = { x: -1, y: -1 };
				return;
			}
		}

		// Update position via form action
		const formData = new FormData();
		formData.append('id', draggedBlok.id);
		formData.append('pos_x', finalX);
		formData.append('pos_y', finalY);
		
		fetch('?/updatePosition', {
			method: 'POST',
			body: formData,
			credentials: 'include'
		}).then(async res => {
			const text = await res.text();
			console.log('updatePosition raw response:', text, 'status:', res.status);
			
			let result;
			try {
				result = JSON.parse(text);
			} catch {
				result = { error: 'Response tidak valid JSON' };
			}
			
			// Parse SvelteKit form action response format: { data: '[{"success":1},"msg"]' }
			if (result.data && typeof result.data === 'string') {
				try {
					const parsed = JSON.parse(result.data);
					if (Array.isArray(parsed) && parsed.length >= 2) {
						if (parsed[0]?.success) {
							result = { success: parsed[1], block: result.block };
						} else if (parsed[0]?.error) {
							result = { error: parsed[1] };
						}
					}
				} catch {}
			}
			
			return result;
		}).then(result => {
			if (result.success) {
				// Optimistic update local state before invalidateAll
				if (result.block) {
					blokRumah = blokRumah.map(b => b.id === result.block.id ? { ...b, ...result.block } : b);
					
					// Auto-expand grid if block goes beyond current bounds
					const b = result.block;
					const newMaxCol = (b.pos_x || 0) + (b.width || 1);
					const newMaxRow = (b.pos_y || 0) + (b.height || 1);
					if (newMaxCol > gridCols) gridCols = Math.min(newMaxCol, maxGrid);
					if (newMaxRow > gridRows) gridRows = Math.min(newMaxRow, maxGrid);
				}
				showToast('success', result.success);
				invalidateAll();
			} else {
				const errMsg = result.error || result.message || 'Gagal memindahkan blok';
				console.error('Server error:', result);
				showToast('error', `Gagal - ${errMsg}`);
			}
		}).catch(err => {
			console.error('Fetch error:', err);
			showToast('error', `Error jaringan - ${err.message}`);
		});

		draggedBlok = null;
		isDragging = false;
		dragOverCell = { x: -1, y: -1 };
	}

	// Handle drag end
	function handleDragEnd() {
		draggedBlok = null;
		isDragging = false;
		dragOverCell = { x: -1, y: -1 };
	}

	// Resize handlers
	function handleResizeStart(e, blok, direction) {
		e.preventDefault();
		e.stopPropagation();
		resizingBlok = { ...blok, direction };
		resizeStart = { 
			x: e.clientX, 
			y: e.clientY, 
			width: blok.width || 1, 
			height: blok.height || 1 
		};
		document.addEventListener('mousemove', handleResizeMove);
		document.addEventListener('mouseup', handleResizeEnd);
	}

	function handleResizeMove(e) {
		if (!resizingBlok) return;
		
		const dx = Math.round((e.clientX - resizeStart.x) / cellSize);
		const dy = Math.round((e.clientY - resizeStart.y) / cellSize);
		
		let newWidth = Math.max(1, resizeStart.width);
		let newHeight = Math.max(1, resizeStart.height);
		
		if (resizingBlok.direction.includes('e')) newWidth = Math.max(1, resizeStart.width + dx);
		if (resizingBlok.direction.includes('w')) newWidth = Math.max(1, resizeStart.width - dx);
		if (resizingBlok.direction.includes('s')) newHeight = Math.max(1, resizeStart.height + dy);
		if (resizingBlok.direction.includes('n')) newHeight = Math.max(1, resizeStart.height - dy);
		
		// Clamp to grid (use maxGrid as absolute max)
		const maxW = Math.min(gridCols, maxGrid) - (resizingBlok.pos_x || 0);
		const maxH = Math.min(gridRows, maxGrid) - (resizingBlok.pos_y || 0);
		newWidth = Math.min(newWidth, maxW);
		newHeight = Math.min(newHeight, maxH);
		
		resizingBlok.width = newWidth;
		resizingBlok.height = newHeight;
	}

	function handleResizeEnd(e) {
		if (!resizingBlok) return;
		
		document.removeEventListener('mousemove', handleResizeMove);
		document.removeEventListener('mouseup', handleResizeEnd);
		
		// Save new size
		const formData = new FormData();
		formData.append('id', resizingBlok.id);
		formData.append('width', resizingBlok.width);
		formData.append('height', resizingBlok.height);
		
		fetch('?/updateSize', {
			method: 'POST',
			body: formData,
			credentials: 'include'
		}).then(async res => {
			const text = await res.text();
			console.log('updateSize raw response:', text, 'status:', res.status);
			
			let result;
			try {
				result = JSON.parse(text);
			} catch {
				result = { error: 'Response tidak valid JSON' };
			}
			
			// Parse SvelteKit form action response format
			if (result.data && typeof result.data === 'string') {
				try {
					const parsed = JSON.parse(result.data);
					if (Array.isArray(parsed) && parsed.length >= 2) {
						if (parsed[0]?.success) {
							result = { success: parsed[1] };
						} else if (parsed[0]?.error) {
							result = { error: parsed[1] };
						}
					}
				} catch {}
			}
			
			return result;
		}).then(result => {
			if (result.success) {
				// Auto-expand grid if resized block goes beyond current bounds
				if (result.block) {
					const b = result.block;
					const newMaxCol = (b.pos_x || 0) + (b.width || 1);
					const newMaxRow = (b.pos_y || 0) + (b.height || 1);
					if (newMaxCol > gridCols) gridCols = Math.min(newMaxCol, maxGrid);
					if (newMaxRow > gridRows) gridRows = Math.min(newMaxRow, maxGrid);
				}
				showToast('success', result.success);
				invalidateAll();
			} else {
				const errMsg = result.error || result.message || 'Gagal mengubah ukuran';
				console.error('Server error:', result);
				showToast('error', `Gagal - ${errMsg}`);
			}
		}).catch(err => {
			console.error('Fetch error:', err);
			showToast('error', `Error jaringan - ${err.message}`);
		});
		
		resizingBlok = null;
	}

	// Keyboard navigation for accessibility
	function handleKeyDown(e, blok) {
		if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
			e.preventDefault();
			const step = e.shiftKey ? 1 : 1;
			let newX = blok.pos_x || 0;
			let newY = blok.pos_y || 0;
			
			switch(e.key) {
				case 'ArrowLeft': newX = Math.max(0, newX - step); break;
				case 'ArrowRight': newX = Math.min(maxGrid - (blok.width || 1), newX + step); break;
				case 'ArrowUp': newY = Math.max(0, newY - step); break;
				case 'ArrowDown': newY = Math.min(maxGrid - (blok.height || 1), newY + step); break;
			}
			
			if (newX !== (blok.pos_x || 0) || newY !== (blok.pos_y || 0)) {
				const formData = new FormData();
				formData.append('id', blok.id);
				formData.append('pos_x', newX);
				formData.append('pos_y', newY);
				
				fetch('?/updatePosition', {
					method: 'POST',
					body: formData,
					credentials: 'include'
				}).then(res => res.json()).then(result => {
					if (result.success) {
						invalidateAll();
					}
				});
			}
		}
	}

	// Legend items
	const legendItems = [
		{ color: '#22c55e', label: 'Dihuni' },
		{ color: '#ef4444', label: 'Kosong' },
		{ color: '#9ca3af', label: 'Tidak di Grid' }
	];
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
		class:bg-blue-50={toast.type === 'info'}
		class:text-blue-700={toast.type === 'info'}
		class:border-blue-200={toast.type === 'info'}
	>
		{#if toast.type === 'success'}
			<i class="fa-solid fa-circle-check"></i>
		{:else if toast.type === 'info'}
			<i class="fa-solid fa-circle-info"></i>
		{:else}
			<i class="fa-solid fa-circle-exclamation"></i>
		{/if}
		<span>{toast.message}</span>
	</div>
{/if}

<div class="px-4 sm:px-6 lg:px-8 py-8">
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Denah Blok Rumah</h1>
			<p class="text-gray-500 text-sm">Visualisasi tata ruang blok rumah - Drag untuk pindahkan, drag sudut untuk resize</p>
		</div>
		<div class="flex items-center gap-3 w-full lg:w-auto flex-wrap">
			<div class="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg text-sm text-gray-600">
				<i class="fa-solid fa-info-circle text-blue-500"></i>
				<span>Grid: {gridCols} x {gridRows}</span>
			</div>
			<div class="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg text-sm text-gray-600">
				<i class="fa-solid fa-magnifying-glass text-blue-500"></i>
				<span>Zoom:</span>
				<input
					type="range"
					min="30"
					max="80"
					step="5"
					bind:value={cellSize}
					class="w-32 h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
					aria-label="Ukuran sel"
				/>
				<span class="w-12 text-right">{cellSize}px</span>
			</div>
			<div class="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg text-sm text-gray-600">
				<i class="fa-solid fa-expand text-blue-500"></i>
				<span>Max Grid:</span>
				<select
					bind:value={maxGrid}
					class="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
					aria-label="Maksimal grid"
				>
					<option value={20}>20</option>
					<option value={30}>30</option>
					<option value={40}>40</option>
					<option value={50}>50</option>
					<option value={60}>60</option>
				</select>
			</div>
		</div>
	</div>

	<!-- Legend -->
	<div class="flex flex-wrap gap-4 mb-4 p-4 bg-white rounded-lg border border-gray-200">
		<span class="font-medium text-gray-700">Legenda:</span>
		{#each legendItems as item}
			<div class="flex items-center gap-2">
				<div class="w-5 h-5 rounded border" style="background-color: {item.color}"></div>
				<span class="text-sm text-gray-600">{item.label}</span>
			</div>
		{/each}
	</div>

	<!-- Grid Container -->
	<div class="bg-white rounded-lg border border-gray-200 overflow-auto max-w-full max-h-[calc(100vh-300px)] touch-pan-x touch-pan-y" style="min-width: 0; min-height: 0;">
		<div 
			class="relative" 
			style="width: {maxGrid * cellSize}px; height: {maxGrid * cellSize}px;"
			on:dragover={(e) => {
				// Calculate grid cell from mouse position
				const rect = e.currentTarget.getBoundingClientRect();
				const x = Math.floor((e.clientX - rect.left) / cellSize);
				const y = Math.floor((e.clientY - rect.top) / cellSize);
				handleDragOver(e, x, y);
			}}
			on:drop={(e) => {
				const rect = e.currentTarget.getBoundingClientRect();
				const x = Math.floor((e.clientX - rect.left) / cellSize);
				const y = Math.floor((e.clientY - rect.top) / cellSize);
				handleDrop(e, x, y);
			}}
			on:dragleave={handleDragLeave}
		>
			<!-- Grid lines -->
			{#each Array(gridRows).fill(0) as _, rowIndex}
				<div class="absolute left-0 right-0 border-t border-gray-100" style="top: {rowIndex * cellSize}px; height: 1px;"></div>
			{/each}
			{#each Array(gridCols).fill(0) as _, colIndex}
				<div class="absolute top-0 bottom-0 border-l border-gray-100" style="left: {colIndex * cellSize}px; width: 1px;"></div>
			{/each}

			<!-- Row/Col labels -->
			{#each Array(gridCols).fill(0) as _, colIndex}
				<div class="absolute top-[-20px] text-center text-xs text-gray-400 font-medium" style="left: {colIndex * cellSize + cellSize/2}px; transform: translateX(-50%); width: {cellSize}px;">
					{colIndex + 1}
				</div>
			{/each}
			{#each Array(gridRows).fill(0) as _, rowIndex}
				<div class="absolute left-[-25px] text-right text-xs text-gray-400 font-medium" style="top: {rowIndex * cellSize + cellSize/2}px; transform: translateY(-50%); height: {cellSize}px; line-height: {cellSize}px; width: 20px;">
					{rowIndex + 1}
				</div>
			{/each}

			<!-- Blok Rumah Blocks -->
			{#each blokRumah as blok}
				{#if (blok.pos_x || 0) < gridCols && (blok.pos_y || 0) < gridRows}
					<div
						class="absolute cursor-move select-none transition-all duration-150"
						style="
							left: {(blok.pos_x || 0) * cellSize}px;
							top: {(blok.pos_y || 0) * cellSize}px;
							width: {(blok.width || 1) * cellSize - 2}px;
							height: {(blok.height || 1) * cellSize - 2}px;
							background-color: {blok.status === 'Dihuni' ? '#22c55e' : '#ef4444'};
							z-index: {draggedBlok?.id === blok.id ? 100 : 10};
							opacity: {draggedBlok?.id === blok.id ? 0.8 : 1};
							box-shadow: {draggedBlok?.id === blok.id ? '0 8px 20px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)'};
						"
						draggable="true"
										on:dragstart={(e) => handleDragStart(e, blok)}
										on:dragend={handleDragEnd}
										on:keydown={(e) => handleKeyDown(e, blok)}
										on:click={(e) => { e.stopPropagation(); if (!isDragging) fetchBlokDetail(blok.id); }}
						tabindex="0"
						role="button"
						aria-label="Blok {blok.no_blok}, {blok.status}, posisi {blok.pos_x},{blok.pos_y}, ukuran {blok.width}x{blok.height}"
						title="Blok {blok.no_blok} - {blok.status}"
					>
						<div class="absolute inset-0 flex flex-col items-center justify-center p-1 text-white overflow-hidden">
							<span class="font-bold text-center truncate w-full" style="font-size: {Math.max(10, cellSize/4)}px;">{blok.no_blok}</span>
							<span class="text-center truncate w-full" style="font-size: {Math.max(8, cellSize/5)}px;">{blok.status}</span>
						</div>

						<!-- Resize handles -->
										<div class="absolute inset-0 pointer-events-none">
											{#if resizingBlok?.id === blok.id || !isDragging}
												<!-- SE corner -->
												<div
													class="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize bg-white/80 border border-gray-300 rounded-br pointer-events-auto"
													style="transform: translate(50%, 50%);"
													on:mousedown={(e) => handleResizeStart(e, blok, 'se')}
													aria-label="Resize kanan-bawah"
												></div>
												<!-- SW corner -->
												<div
													class="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize bg-white/80 border border-gray-300 rounded-bl pointer-events-auto"
													style="transform: translate(-50%, 50%);"
													on:mousedown={(e) => handleResizeStart(e, blok, 'sw')}
													aria-label="Resize kiri-bawah"
												></div>
												<!-- NE corner -->
												<div
													class="absolute top-0 right-0 w-3 h-3 cursor-ne-resize bg-white/80 border border-gray-300 rounded-tr pointer-events-auto"
													style="transform: translate(50%, -50%);"
													on:mousedown={(e) => handleResizeStart(e, blok, 'ne')}
													aria-label="Resize kanan-atas"
												></div>
												<!-- NW corner -->
												<div
													class="absolute top-0 left-0 w-3 h-3 cursor-nw-resize bg-white/80 border border-gray-300 rounded-tl pointer-events-auto"
													style="transform: translate(-50%, -50%);"
													on:mousedown={(e) => handleResizeStart(e, blok, 'nw')}
													aria-label="Resize kiri-atas"
												></div>
											{/if}
										</div>
					</div>
				{/if}
			{/each}

			<!-- Drop zone highlight -->
			{#if isDragging && dragOverCell.x >= 0 && dragOverCell.y >= 0}
				<div
					class="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 pointer-events-none"
					style="
						left: {dragOverCell.x * cellSize}px;
						top: {dragOverCell.y * cellSize}px;
						width: {(draggedBlok?.width || 1) * cellSize}px;
						height: {(draggedBlok?.height || 1) * cellSize}px;
						z-index: 50;
					"
				></div>
			{/if}
		</div>
	</div>

	<!-- Blok list outside grid (not positioned) -->
	{#if blokRumah.filter(b => (b.pos_x || 0) >= gridCols || (b.pos_y || 0) >= gridRows).length > 0}
		<div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
			<h3 class="font-medium text-yellow-800 mb-2">Blok di luar grid:</h3>
			<div class="flex flex-wrap gap-2">
				{#each blokRumah.filter(b => (b.pos_x || 0) >= gridCols || (b.pos_y || 0) >= gridRows) as blok}
					<span class="px-3 py-1 bg-white border border-yellow-300 rounded text-sm text-yellow-700">
						{blok.no_blok} ({blok.pos_x},{blok.pos_y})
					</span>
				{/each}
			</div>
		</div>
	{/if}
</div>

<!-- Detail Modal -->
{#if detailModal.show}
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" on:click={closeDetailModal}>
		<div class="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden" on:click={(e) => e.stopPropagation()}>
			{#if detailModal.loading}
				<div class="flex items-center justify-center p-12">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<span class="ml-3 text-gray-600">Memuat detail...</span>
				</div>
			{:else if detailModal.data}
				<div class="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
					<h3 class="text-lg font-bold text-gray-900">Detail Blok: {detailModal.data.blok.no_blok}</h3>
					<button on:click={closeDetailModal} class="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
				</div>
				<div class="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
					<!-- Blok Info -->
					<div class="mb-6 p-4 bg-gray-50 rounded-lg">
						<div class="grid grid-cols-2 gap-2 text-sm">
							<div><span class="font-medium text-gray-600">Status:</span> <span class="inline-flex px-2 py-0.5 text-xs rounded-full {detailModal.data.keluarga.length > 0 ? (detailModal.data.keluarga[0].status_rumah === 'sendiri' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700') : 'bg-red-100 text-red-600'}">{detailModal.data.keluarga.length > 0 ? (detailModal.data.keluarga[0].status_rumah === 'sendiri' ? 'Milik Sendiri' : 'Ngontrak') : 'Kosong'}</span></div>
							<div><span class="font-medium text-gray-600">Jumlah KK:</span> <span class="text-gray-900">{detailModal.data.keluarga.length}</span></div>
						</div>
					</div>

					<!-- Keluarga List -->
					{#if detailModal.data.keluarga.length > 0}
						{#each detailModal.data.keluarga as kk, kkIdx}
							<div class="mb-6 border border-gray-200 rounded-lg overflow-hidden">
								<div class="bg-blue-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
													<div>
														<span class="font-medium text-gray-900">KK: {kk.no_kk}</span>
													</div>
													<div class="text-sm text-gray-500">{kk.anggota.length} anggota</div>
												</div>
								<div class="p-4">
									<!-- Anggota Table -->
									<div class="overflow-x-auto mb-4">
										<table class="w-full text-sm text-left">
											<thead>
												<tr class="bg-gray-50 border-b border-gray-200">
													<th class="px-3 py-2 font-medium text-gray-600">Nama</th>
													<th class="px-3 py-2 font-medium text-gray-600">NIK</th>
													<th class="px-3 py-2 font-medium text-gray-600">JK</th>
													<th class="px-3 py-2 font-medium text-gray-600">Tgl Lahir</th>
													<th class="px-3 py-2 font-medium text-gray-600">Hub. Keluarga</th>
													<th class="px-3 py-2 font-medium text-gray-600">No. HP</th>
												</tr>
											</thead>
											<tbody class="divide-y divide-gray-100">
												{#each kk.anggota as a}
													<tr class="hover:bg-gray-50">
														<td class="px-3 py-2 font-medium text-gray-900">{a.nama}</td>
														<td class="px-3 py-2 text-gray-600">{a.nik}</td>
														<td class="px-3 py-2 text-center">
															<span class="inline-flex px-2 py-0.5 text-xs rounded-full {a.jenis_kelamin === 'Laki-laki' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}">
																{a.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}
															</span>
														</td>
														<td class="px-3 py-2 text-gray-600">{a.tanggal_lahir ? new Date(a.tanggal_lahir).toLocaleDateString('id-ID') : '-'}</td>
														<td class="px-3 py-2 text-gray-600">{a.hub_keluarga}</td>
														<td class="px-3 py-2 text-gray-600">{a.nomor_hp || '-'}</td>
													</tr>
												{/each}
											</tbody>
										</table>
									</div>

									<!-- Tagihan Iuran -->
															<div class="border-t border-gray-200 pt-4">
																<h4 class="font-medium text-gray-900 mb-3">Status Iuran (12 periode terakhir)</h4>
																{#if kk.iuran.length > 0}
																								<div class="overflow-x-auto">
																									<table class="w-full text-sm text-left">
																										<thead>
																											<tr class="bg-gray-50 border-b border-gray-200">
																												<th class="px-3 py-2 font-medium text-gray-600">Periode</th>
																												<th class="px-3 py-2 font-medium text-gray-600">Bayar</th>
																												<th class="px-3 py-2 font-medium text-gray-600">Tgl Bayar</th>
																												<th class="px-3 py-2 font-medium text-gray-600">Metode</th>
																												<th class="px-3 py-2 font-medium text-gray-600">Status Bayar</th>
																											</tr>
																										</thead>
																										<tbody class="divide-y divide-gray-100">
																											{#each kk.iuran as t}
																												<tr class="hover:bg-gray-50">
																													<td class="px-3 py-2 text-gray-900">{t.periode}</td>
																													<td class="px-3 py-2">
																														{ t.nominal_bayar 
																															? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(t.nominal_bayar)
																															: '-' }
																													</td>
																													<td class="px-3 py-2 text-gray-600">{t.tanggal_bayar ? new Date(t.tanggal_bayar).toLocaleDateString('id-ID') : '-'}</td>
																													<td class="px-3 py-2 text-gray-600 capitalize">{t.metode_bayar || '-'}</td>
																													<td class="px-3 py-2">
																																			{#if t.tagihan_status === 'lunas'}
																																				<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
																																					<i class="fa-solid fa-circle-check"></i> Lunas
																																				</span>
																																			{:else}
																																				<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
																																					<i class="fa-solid fa-circle-exclamation"></i> Belum Bayar
																																				</span>
																																			{/if}
																																		</td>
																												</tr>
																											{/each}
																										</tbody>
																									</table>
																								</div>
																							{:else}
																								<p class="text-gray-500 text-sm py-4">Belum ada history pembayaran</p>
																							{/if}
															</div>
								</div>
							</div>
						{/each}
					{:else}
						<div class="text-center py-8 text-gray-500">
							<i class="fa-solid fa-users text-3xl mb-2"></i>
							<p>Blok ini kosong (belum ada keluarga)</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Ensure grid container scrolls on mobile */
	@media (max-width: 768px) {
		.relative {
			overflow-x: auto;
			overflow-y: auto;
			-webkit-overflow-scrolling: touch;
		}
	}
</style>