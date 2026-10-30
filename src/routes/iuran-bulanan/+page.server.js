import { redirect, error, fail } from '@sveltejs/kit';
import { getConnection, executeQuery, executeTransaction } from '#lib/server/db';

export const load = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(303, '/login');
	}

	const periode = url.searchParams.get('periode') || new Date().toISOString().slice(0, 7); // YYYY-MM
	const statusFilter = url.searchParams.get('status') || 'semua'; // semua, belum_bayar, lunas
	const tipeFilter = url.searchParams.get('tipe') || 'semua'; // semua, keluarga, pemilik_kosong
	const page = parseInt(url.searchParams.get('page') || '1');
	const itemsPerPage = parseInt(url.searchParams.get('itemsPerPage') || '10');

	const conn = await getConnection();
	try {
		// Ambil settings iuran
		const [settingsRows] = await conn.execute('SELECT `key`, `value` FROM settings WHERE `key` LIKE "iuran_%"');
		const settings = {};
		settingsRows.forEach(s => { settings[s.key] = s.value; });
		const jatuhTempo = parseInt(settings.iuran_jatuh_tempo || '10');
		const nominalPenuh = parseInt(settings.iuran_nominal_penuh || '50000');
		const nominalKeamanan = parseInt(settings.iuran_nominal_keamanan || '25000');

		// Build where clause
		let whereClause = 'WHERE ti.periode = ?';
		const params = [periode];

		if (statusFilter !== 'semua') {
			whereClause += ' AND ti.status = ?';
			params.push(statusFilter);
		}
		if (tipeFilter !== 'semua') {
			whereClause += ' AND ti.tipe_pembayar = ?';
			params.push(tipeFilter);
		}

		// Count total
		const [countRows] = await conn.execute(
			`SELECT COUNT(*) as total FROM tagihan_iuran ti ${whereClause}`,
			params
		);
		const total = countRows[0]?.total || 0;
		const totalPages = Math.ceil(total / itemsPerPage) || 1;

		// Get tagihan with joined data
		const offset = (page - 1) * itemsPerPage;
		params.push(itemsPerPage, offset);

		const [tagihanRows] = await conn.execute(
			`SELECT 
				ti.id, ti.periode, ti.blok_rumah_id, ti.tipe_pembayar, ti.keluarga_id, ti.pemilik_rumah_id,
				ti.nominal, ti.status, ti.jatuh_tempo, ti.created_at,
				br.no_blok,
				k.no_kk,
				kk.nama as keluarga_nama,
				kk.nomor_hp as keluarga_hp,
				pr.nama as pemilik_nama, pr.no_hp as pemilik_hp,
				(
					SELECT SUM(nominal_bayar) 
					FROM pembayaran_iuran pi 
					WHERE pi.tagihan_id = ti.id
				) as total_dibayar
			FROM tagihan_iuran ti
			JOIN blok_rumah br ON ti.blok_rumah_id = br.id
			LEFT JOIN keluarga k ON ti.keluarga_id = k.id
			LEFT JOIN anggota_keluarga kk ON kk.keluarga_id = k.id AND kk.hub_keluarga = 'Kepala Keluarga'
			LEFT JOIN pemilik_rumah pr ON ti.pemilik_rumah_id = pr.id
			${whereClause}
			ORDER BY br.no_blok ASC
			LIMIT ? OFFSET ?`,
			params
		);

		// Summary stats for current periode
		const [summaryRows] = await conn.execute(
			`SELECT 
				COUNT(*) as total_tagihan,
				SUM(CASE WHEN status = 'lunas' THEN 1 ELSE 0 END) as total_lunas,
				SUM(CASE WHEN status = 'belum_bayar' THEN 1 ELSE 0 END) as total_belum_bayar,
				SUM(nominal) as total_nominal,
				SUM(CASE WHEN status = 'lunas' THEN nominal ELSE 0 END) as nominal_lunas
			FROM tagihan_iuran 
			WHERE periode = ?`,
			[periode]
		);
		const summary = summaryRows[0] || {
			total_tagihan: 0, total_lunas: 0, total_belum_bayar: 0, total_nominal: 0, nominal_lunas: 0
		};

		// Get list of available periods
		const [periodRows] = await conn.execute(
			'SELECT DISTINCT periode FROM tagihan_iuran ORDER BY periode DESC'
		);

		return {
			user,
			periode,
			statusFilter,
			tipeFilter,
			page,
			itemsPerPage,
			totalPages,
			total,
			tagihan: tagihanRows,
			summary,
			periods: periodRows.map(r => r.periode),
			settings: {
				jatuh_tempo: jatuhTempo,
				nominal_penuh: nominalPenuh,
				nominal_keamanan: nominalKeamanan
			}
		};
	} catch (e) {
		console.error('LOAD iuran-bulanan error:', e);
		throw error(500, 'Gagal memuat data iuran bulanan');
	} finally {
		conn.release();
	}
};

export const actions = {
	generateTagihan: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return fail(400, { error: 'Hanya admin yang bisa generate tagihan' });
		}

		const formData = await request.formData();
		const periode = formData.get('periode')?.toString().trim();

		if (!periode || !/^\d{4}-\d{2}$/.test(periode)) {
			return fail(400, { error: 'Format periode harus YYYY-MM' });
		}

		const conn = await getConnection();
		try {
			// Ambil settings
			const [settingsRows] = await conn.execute('SELECT `key`, `value` FROM settings WHERE `key` LIKE "iuran_%"');
			const settings = {};
			settingsRows.forEach(s => { settings[s.key] = s.value; });
			const jatuhTempo = parseInt(settings.iuran_jatuh_tempo || '10');
			const nominalPenuh = parseInt(settings.iuran_nominal_penuh || '50000');
			const nominalKeamanan = parseInt(settings.iuran_nominal_keamanan || '25000');

			// Cek apakah sudah generate untuk periode ini
			const [existing] = await conn.execute(
				'SELECT COUNT(*) as cnt FROM tagihan_iuran WHERE periode = ?',
				[periode]
			);
			if (existing[0].cnt > 0) {
				return fail(400, { error: `Tagihan untuk periode ${periode} sudah digenerate` });
			}

			// Ambil semua blok rumah dengan status dihuni/kosong berdasarkan keberadaan keluarga
			const [blokRows] = await conn.execute(`
				SELECT 
					br.id, 
					br.no_blok,
					CASE WHEN COUNT(k.id) > 0 THEN 'Dihuni' ELSE 'Kosong' END as status
				FROM blok_rumah br
				LEFT JOIN keluarga k ON k.blok_rumah_id = br.id
				GROUP BY br.id, br.no_blok
				ORDER BY br.no_blok ASC
			`);

			await conn.beginTransaction();
			let generated = 0;

			for (const blok of blokRows) {
				if (blok.status === 'Dihuni') {
					// Cari KK yang menempati blok ini
					const [kkRows] = await conn.execute(
						'SELECT id FROM keluarga WHERE blok_rumah_id = ? LIMIT 1',
						[blok.id]
					);
					if (kkRows.length > 0) {
						const jatuhTempoDate = `${periode}-${String(jatuhTempo).padStart(2, '0')}`;
						await conn.execute(
							`INSERT INTO tagihan_iuran (periode, blok_rumah_id, tipe_pembayar, keluarga_id, nominal, jatuh_tempo)
							VALUES (?, ?, 'keluarga', ?, ?, ?)`,
							[periode, blok.id, kkRows[0].id, nominalPenuh, jatuhTempoDate]
						);
						generated++;
					}
				} else if (blok.status === 'Kosong') {
					// Cari pemilik rumah kosong
					const [pemilikRows] = await conn.execute(
						'SELECT id FROM pemilik_rumah WHERE blok_rumah_id = ?',
						[blok.id]
					);
					if (pemilikRows.length > 0) {
						const jatuhTempoDate = `${periode}-${String(jatuhTempo).padStart(2, '0')}`;
						await conn.execute(
							`INSERT INTO tagihan_iuran (periode, blok_rumah_id, tipe_pembayar, pemilik_rumah_id, nominal, jatuh_tempo)
							VALUES (?, ?, 'pemilik_kosong', ?, ?, ?)`,
							[periode, blok.id, pemilikRows[0].id, nominalKeamanan, jatuhTempoDate]
						);
						generated++;
					}
				}
			}

			await conn.commit();
			return { success: `Berhasil generate ${generated} tagihan untuk periode ${periode}` };
		} catch (e) {
			await conn.rollback();
			console.error('GENERATE tagihan error:', e);
			return fail(400, { error: 'Gagal generate tagihan: ' + e.message });
		} finally {
			conn.release();
		}
	},

	generateMissing: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'admin') {
			return fail(400, { error: 'Hanya admin yang bisa generate tagihan' });
		}

		const formData = await request.formData();
		const periode = formData.get('periode')?.toString().trim();

		if (!periode || !/^\d{4}-\d{2}$/.test(periode)) {
			return fail(400, { error: 'Format periode harus YYYY-MM' });
		}

		const conn = await getConnection();
		try {
			// Ambil settings
			const [settingsRows] = await conn.execute('SELECT `key`, `value` FROM settings WHERE `key` LIKE "iuran_%"');
			const settings = {};
			settingsRows.forEach(s => { settings[s.key] = s.value; });
			const jatuhTempo = parseInt(settings.iuran_jatuh_tempo || '10');
			const nominalPenuh = parseInt(settings.iuran_nominal_penuh || '50000');
			const nominalKeamanan = parseInt(settings.iuran_nominal_keamanan || '25000');

			// Cek apakah periode ini sudah generate
			const [existing] = await conn.execute(
				'SELECT COUNT(*) as cnt FROM tagihan_iuran WHERE periode = ?',
				[periode]
			);
			if (existing[0].cnt === 0) {
				return fail(400, { error: `Belum ada tagihan untuk periode ${periode}. Gunakan Generate Tagihan dulu.` });
			}

			// Ambil semua blok rumah dengan status
			const [blokRows] = await conn.execute(`
				SELECT 
					br.id, 
					br.no_blok,
					CASE WHEN COUNT(k.id) > 0 THEN 'Dihuni' ELSE 'Kosong' END as status
				FROM blok_rumah br
				LEFT JOIN keluarga k ON k.blok_rumah_id = br.id
				GROUP BY br.id, br.no_blok
				ORDER BY br.no_blok ASC
			`);

			await conn.beginTransaction();
			let generated = 0;

			for (const blok of blokRows) {
				// Cek apakah blok ini sudah punya tagihan untuk periode ini
				const [tagihanAda] = await conn.execute(
					'SELECT id FROM tagihan_iuran WHERE periode = ? AND blok_rumah_id = ?',
					[periode, blok.id]
				);
				if (tagihanAda.length > 0) {
					continue; // Sudah ada, skip
				}

				// Blok ini belum punya tagihan → buat
				if (blok.status === 'Dihuni') {
					const [kkRows] = await conn.execute(
						'SELECT id FROM keluarga WHERE blok_rumah_id = ? LIMIT 1',
						[blok.id]
					);
					if (kkRows.length > 0) {
						const jatuhTempoDate = `${periode}-${String(jatuhTempo).padStart(2, '0')}`;
						await conn.execute(
							`INSERT INTO tagihan_iuran (periode, blok_rumah_id, tipe_pembayar, keluarga_id, nominal, jatuh_tempo)
							VALUES (?, ?, 'keluarga', ?, ?, ?)`,
							[periode, blok.id, kkRows[0].id, nominalPenuh, jatuhTempoDate]
						);
						generated++;
					}
				} else if (blok.status === 'Kosong') {
					const [pemilikRows] = await conn.execute(
						'SELECT id FROM pemilik_rumah WHERE blok_rumah_id = ?',
						[blok.id]
					);
					if (pemilikRows.length > 0) {
						const jatuhTempoDate = `${periode}-${String(jatuhTempo).padStart(2, '0')}`;
						await conn.execute(
							`INSERT INTO tagihan_iuran (periode, blok_rumah_id, tipe_pembayar, pemilik_rumah_id, nominal, jatuh_tempo)
							VALUES (?, ?, 'pemilik_kosong', ?, ?, ?)`,
							[periode, blok.id, pemilikRows[0].id, nominalKeamanan, jatuhTempoDate]
						);
						generated++;
					}
				}
			}

			await conn.commit();
			return { success: `Berhasil generate ${generated} tagihan missing untuk periode ${periode}` };
		} catch (e) {
			await conn.rollback();
			console.error('GENERATE MISSING tagihan error:', e);
			return fail(400, { error: 'Gagal generate missing: ' + e.message });
		} finally {
			conn.release();
		}
	},

	bayarTagihan: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) {
			return fail(400, { error: 'Silakan login terlebih dahulu' });
		}

		const formData = await request.formData();
		const tagihanId = parseInt(formData.get('tagihan_id')?.toString() || '0');
		const tanggalBayar = formData.get('tanggal_bayar')?.toString().trim();
		const metodeBayar = formData.get('metode_bayar')?.toString().trim();
		const catatan = formData.get('catatan')?.toString().trim() || '';

		if (!tagihanId || !tanggalBayar || !metodeBayar) {
			return fail(400, { error: 'Data tidak lengkap' });
		}
		if (!['transfer', 'qris', 'cash'].includes(metodeBayar)) {
			return fail(400, { error: 'Metode bayar tidak valid' });
		}

		try {
			const result = await executeTransaction(async (conn) => {
				// Ambil tagihan
				const [tagihanRows] = await conn.execute(
					'SELECT tagihan_iuran.*, blok_rumah.no_blok FROM tagihan_iuran join blok_rumah WHERE tagihan_iuran.id = ?',
					[tagihanId]
				);
				if (tagihanRows.length === 0) {
					throw new Error('Tagihan tidak ditemukan');
				}
				const tagihan = tagihanRows[0];

				if (tagihan.status === 'lunas') {
					throw new Error('Tagihan sudah lunas');
				}

				// Cek total sudah dibayar (hanya yang approved)
				const [bayarRows] = await conn.execute(
					'SELECT COALESCE(SUM(nominal_bayar), 0) as total FROM pembayaran_iuran WHERE tagihan_id = ? AND status = "approved"',
					[tagihanId]
				);
				const sudahBayar = parseFloat(bayarRows[0]?.total || 0);
				const sisa = parseFloat(tagihan.nominal) - sudahBayar;

				// Get default kas_account from metode_bayar
				const [methodRows] = await conn.execute(
					'SELECT default_kas_account_id FROM pembayaran_method WHERE kode = ? AND is_active = 1',
					[metodeBayar]
				);
				if (methodRows.length === 0) {
					throw new Error(`Metode pembayaran ${metodeBayar} tidak memiliki mapping ke rekening kas`);
				}
				const kas_account_id = methodRows[0].default_kas_account_id;

				// Get kategori iuran
				const [katRows] = await conn.execute(
					'SELECT id FROM kategori_kas WHERE kode = "PMS-IURAN" AND is_active = 1 LIMIT 1'
				);
				if (katRows.length === 0) {
					throw new Error('Kategori Iuran Bulanan (PMS-IURAN) tidak ditemukan');
				}
				const kategori_id = katRows[0].id;

				// Insert pembayaran with pending_approval status
				const [payResult] = await conn.execute(
					`INSERT INTO pembayaran_iuran (tagihan_id, nominal_bayar, tanggal_bayar, metode_bayar, petugas_id, catatan, status)
					VALUES (?, ?, ?, ?, ?, ?, 'pending_approval')`,
					[tagihanId, sisa, tanggalBayar, metodeBayar, user.id, catatan]
				);
				const pembayaranId = payResult.insertId;

				// Update tagihan status ke lunas LANGSUNG (supaya petugas lihat sudah lunas)
				await conn.execute(
					'UPDATE tagihan_iuran SET status = "lunas" WHERE id = ?',
					[tagihanId]
				);

				// Create transaksi_kas with pending status (waiting for admin approval)
				await conn.execute(
					`INSERT INTO transaksi_kas (kas_account_id, kategori_id, tipe, nominal, tanggal, keterangan, status, ref_type, ref_id, created_by)
					VALUES (?, ?, 'debit', ?, ?, ?, 'pending', 'iuran', ?, ?)`,
					[
						kas_account_id,
						kategori_id,
						sisa,
						tanggalBayar,
						`Iuran ${tagihan.periode} - Blok ${tagihan.no_blok || ''} - ${metodeBayar.toUpperCase()}`,
						pembayaranId,
						user.id
					]
				);

				return { success: 'Pembayaran berhasil dicatat, menunggu persetujuan admin untuk posting ke kas' };
			});

			return result;
		} catch (e) {
			console.error('BAYAR tagihan error:', e);
			return fail(400, { error: 'Gagal mencatat pembayaran: ' + e.message });
		}
	}
};