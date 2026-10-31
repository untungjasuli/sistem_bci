import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const load = async ({ cookies }) => {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login?redirect=/denah-blok-rumah');
	}

	// Ambil semua blok rumah dengan posisi & status
	const sql = `
		SELECT 
			b.id,
			b.no_blok,
			b.pos_x,
			b.pos_y,
			b.width,
			b.height,
			CASE 
				WHEN EXISTS (SELECT 1 FROM keluarga k WHERE k.blok_rumah_id = b.id) THEN 'Dihuni'
				ELSE 'Kosong'
			END as status
		FROM blok_rumah b
		ORDER BY b.no_blok
	`;
	const blokRumah = await executeQuery(sql);

	// Auto-expand grid based on data
	// Calculate max extent: max(pos_x + width), max(pos_y + height)
	let maxCol = 10;
	let maxRow = 10;
	const MAX_GRID_COLS = 40; // batas maksimal grid horizontal (kolom)
	const MAX_GRID_ROWS = 50; // batas maksimal grid vertikal (baris)

	for (const b of blokRumah) {
		const x = (b.pos_x || 0) + (b.width || 1);
		const y = (b.pos_y || 0) + (b.height || 1);
		if (x > maxCol) maxCol = x;
		if (y > maxRow) maxRow = y;
	}

	// Clamp to max
	const gridCols = Math.min(maxCol, MAX_GRID_COLS);
	const gridRows = Math.min(maxRow, MAX_GRID_ROWS);
	const cellSize = 40; // px per grid cell (diperkecil)

	return {
		blokRumah,
		gridCols,
		gridRows,
		cellSize,
		maxGridCols: MAX_GRID_COLS,
		maxGridRows: MAX_GRID_ROWS
	};
};

export const actions = {
	updatePosition: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const pos_x = parseInt(formData.get('pos_x')) || 0;
		const pos_y = parseInt(formData.get('pos_y')) || 0;

		if (!id) {
			return { error: 'ID blok rumah diperlukan' };
		}

		try {
			await executeQuery(
				'UPDATE blok_rumah SET pos_x = ?, pos_y = ? WHERE id = ?',
				[pos_x, pos_y, id]
			);
			// Return updated block for confirmation
			const updated = await executeQuery('SELECT id, no_blok, pos_x, pos_y, width, height FROM blok_rumah WHERE id = ?', [id]);
			return { success: 'Posisi blok berhasil diperbarui', block: updated[0] };
		} catch (e) {
			console.error('Update position error:', e);
			return { error: 'Gagal memperbarui posisi' };
		}
	},

	updateSize: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const width = parseInt(formData.get('width')) || 1;
		const height = parseInt(formData.get('height')) || 1;

		if (!id) {
			return { error: 'ID blok rumah diperlukan' };
		}

		try {
			await executeQuery(
				'UPDATE blok_rumah SET width = ?, height = ? WHERE id = ?',
				[width, height, id]
			);
			const updated = await executeQuery('SELECT id, no_blok, pos_x, pos_y, width, height FROM blok_rumah WHERE id = ?', [id]);
			return { success: 'Ukuran blok berhasil diperbarui', block: updated[0] };
		} catch (e) {
			console.error('Update size error:', e);
			return { error: 'Gagal memperbarui ukuran' };
		}
	}
};