import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

function formatNumber(num) {
	return new Intl.NumberFormat('id-ID').format(num);
}

function getHubLabel(hub) {
	const labels = { 'kepala': 'Kepala Keluarga', 'istri': 'Istri', 'anak': 'Anak', 'lainnya': 'Lainnya' };
	return labels[hub] || hub;
}

function getStatusLabel(status) {
	if (status === 'sendiri') return 'Rumah Sendiri';
	if (status === 'ngontrak') return 'Ngontrak';
	if (status === 'ikut_ortu_mertua') return 'Ikut Orang Tua/Mertua';
	return status;
}

function getJkLabel(jk) {
	return jk === 'Laki-laki' ? 'L' : 'P';
}

function formatPhone(phone) {
	if (!phone) return '-';
	const cleaned = phone.replace(/\D/g, '');
	if (cleaned.length >= 10) {
		return cleaned.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3').replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2-$3');
	}
	return phone;
}

async function getData(filter) {
	const { blokFilter, search } = filter;

	let whereClause = 'WHERE ak.nomor_hp IS NOT NULL AND ak.nomor_hp != "" AND k.status_keluarga = \'aktif\' AND ak.status_kependudukan = \'aktif\'';
	const params = [];

	if (blokFilter !== 'semua') {
		whereClause += ' AND b.id = ?';
		params.push(parseInt(blokFilter));
	}
	if (search) {
		whereClause += ' AND (ak.nama LIKE ? OR ak.nomor_hp LIKE ? OR k.no_kk LIKE ?)';
		const searchTerm = `%${search}%`;
		params.push(searchTerm, searchTerm, searchTerm);
	}

	const sql = `
		SELECT 
			ak.id,
			ak.nik,
			ak.nama,
			ak.jenis_kelamin,
			ak.tanggal_lahir,
			ak.hub_keluarga,
			ak.nomor_hp,
			k.no_kk,
			k.status_rumah,
			b.no_blok,
			TIMESTAMPDIFF(YEAR, ak.tanggal_lahir, CURDATE()) as umur
		FROM anggota_keluarga ak
		JOIN keluarga k ON ak.keluarga_id = k.id
		JOIN blok_rumah b ON k.blok_rumah_id = b.id
		${whereClause}
		ORDER BY b.no_blok, k.status_rumah, ak.hub_keluarga, ak.nama
	`;
	const rows = await executeQuery(sql, params);

	const grouped = {};
	for (const row of rows) {
		const key = row.no_blok;
		if (!grouped[key]) {
			grouped[key] = { blok: key, kontak: [], total: 0 };
		}
		grouped[key].kontak.push(row);
		grouped[key].total++;
	}

	const kontakPerBlok = Object.values(grouped).sort((a, b) => a.blok.localeCompare(b.blok));
	const grandTotal = rows.length;

	// Stats
	const statsSql = `
		SELECT 
			COUNT(*) as total_warga,
			SUM(CASE WHEN ak.nomor_hp IS NOT NULL AND ak.nomor_hp != '' THEN 1 ELSE 0 END) as ada_hp,
			SUM(CASE WHEN ak.nomor_hp IS NULL OR ak.nomor_hp = '' THEN 1 ELSE 0 END) as tanpa_hp
		FROM anggota_keluarga ak
		JOIN keluarga k ON ak.keluarga_id = k.id
		JOIN blok_rumah b ON k.blok_rumah_id = b.id
		WHERE k.status_keluarga = 'aktif' AND ak.status_kependudukan = 'aktif'
		${blokFilter !== 'semua' ? 'AND b.id = ?' : ''}
	`;
	const statsParams = blokFilter !== 'semua' ? [parseInt(blokFilter)] : [];
	const statsRows = await executeQuery(statsSql, statsParams);
	const stats = statsRows[0] || { total_warga: 0, ada_hp: 0, tanpa_hp: 0 };

	const blokRumah = await executeQuery('SELECT id, no_blok FROM blok_rumah ORDER BY no_blok');

	return { 
		kontakPerBlok, 
		grandTotal, 
		stats: {
			total_warga: parseInt(stats.total_warga),
			ada_hp: parseInt(stats.ada_hp),
			tanpa_hp: parseInt(stats.tanpa_hp)
		},
		blokRumah 
	};
}

async function generateExcel(data, filter) {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Data Kontak Warga');

	// Title
	worksheet.mergeCells('A1:G1');
	worksheet.getCell('A1').value = 'LAPORAN DATA KONTAK WARGA';
	worksheet.getCell('A1').font = { bold: true, size: 16 };
	worksheet.getCell('A1').alignment = { horizontal: 'center' };

	// Filter info
	let filterInfo = [];
	if (filter.blokFilter !== 'semua') {
		const blok = data.blokRumah?.find(b => b.id === parseInt(filter.blokFilter));
		filterInfo.push(`Blok: ${blok?.no_blok || '-'}`);
	}
	if (filter.search) {
		filterInfo.push(`Pencarian: ${filter.search}`);
	}
	if (filterInfo.length > 0) {
		worksheet.mergeCells('A2:G2');
		worksheet.getCell('A2').value = filterInfo.join(' | ');
		worksheet.getCell('A2').alignment = { horizontal: 'center' };
		worksheet.getCell('A2').font = { italic: true };
	}

	// Stats
	worksheet.mergeCells('A4:G4');
	worksheet.getCell('A4').value = 'RINGKASAN';
	worksheet.getCell('A4').font = { bold: true, size: 12, color: { argb: 'FF4472C4' } };

	let rowNum = 5;
	const summaryData = [
		['Total Warga', data.stats.total_warga],
		['Ada No. HP', data.stats.ada_hp],
		['Belum Ada HP', data.stats.tanpa_hp],
	];
	summaryData.forEach(([label, value]) => {
		const row = worksheet.getRow(rowNum++);
		row.getCell(1).value = label;
		row.getCell(2).value = value;
		row.getCell(2).numFmt = '#,##0';
		row.getCell(1).font = { bold: true };
		row.getCell(2).alignment = { horizontal: 'right' };
	});

	// Detail per Blok
	rowNum++;
	worksheet.mergeCells(`A${rowNum}:G${rowNum}`);
	worksheet.getCell(`A${rowNum}`).value = 'DETAIL KONTAK PER BLOK';
	worksheet.getCell(`A${rowNum}`).font = { bold: true, size: 12, color: { argb: 'FF4472C4' } };
	rowNum++;

	const detailHeaders = ['No', 'Blok', 'Nama', 'JK', 'Status Rumah', 'No. HP'];
	const detailHeaderRow = worksheet.getRow(rowNum++);
	detailHeaders.forEach((h, i) => {
		const cell = detailHeaderRow.getCell(i + 1);
		cell.value = h;
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
		cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
		cell.alignment = { horizontal: 'center' };
		cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
	});

	let rowCounter = 1;
	data.kontakPerBlok.forEach(blokData => {
		blokData.kontak.forEach((item, idx) => {
			const row = worksheet.getRow(rowNum++);
			row.getCell(1).value = rowCounter++;
			row.getCell(2).value = blokData.blok;
			row.getCell(3).value = item.nama;
			row.getCell(4).value = getJkLabel(item.jenis_kelamin);
			row.getCell(5).value = getStatusLabel(item.status_rumah);
			row.getCell(6).value = formatPhone(item.nomor_hp);
			row.eachCell(cell => {
				cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
				cell.alignment = { vertical: 'middle' };
			});
			row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
			row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
			row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
		});
	});

	// Column widths
	worksheet.getColumn(1).width = 5;
	worksheet.getColumn(2).width = 10;
	worksheet.getColumn(3).width = 25;
	worksheet.getColumn(4).width = 8;
	worksheet.getColumn(5).width = 20;
	worksheet.getColumn(6).width = 20;

	return workbook.xlsx.writeBuffer();
}

async function generatePDF(data, filter) {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ layout: 'portrait', margin: 20, size: 'A4' });
		const chunks = [];
		doc.on('data', chunk => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		doc.fontSize(16).font('Helvetica-Bold').text('LAPORAN DATA KONTAK WARGA', { align: 'center' });
		doc.moveDown(0.3);
		doc.fontSize(10).font('Helvetica').text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`, { align: 'center' });

		let filterInfo = [];
		if (filter.blokFilter !== 'semua') {
			const blok = data.blokRumah?.find(b => b.id === parseInt(filter.blokFilter));
			filterInfo.push(`Blok: ${blok?.no_blok || '-'}`);
		}
		if (filter.search) {
			filterInfo.push(`Pencarian: ${filter.search}`);
		}
		if (filterInfo.length > 0) {
			doc.fontSize(8).font('Helvetica-Oblique').text(filterInfo.join(' | '), { align: 'center' });
		}
		doc.moveDown();

		// Stats
		doc.fontSize(12).font('Helvetica-Bold').text('RINGKASAN', { align: 'left' });
		doc.moveDown(0.5);
		doc.fontSize(9).font('Helvetica');
		const summaryLines = [
			`Total Warga: ${formatNumber(data.stats.total_warga)}`,
			`Ada No. HP: ${formatNumber(data.stats.ada_hp)} (${data.stats.total_warga > 0 ? ((data.stats.ada_hp / data.stats.total_warga) * 100).toFixed(1) : 0}%)`,
			`Belum Ada HP: ${formatNumber(data.stats.tanpa_hp)} (${data.stats.total_warga > 0 ? ((data.stats.tanpa_hp / data.stats.total_warga) * 100).toFixed(1) : 0}%)`
		];
		summaryLines.forEach(line => {
			doc.text(line, { continued: false });
		});
		doc.moveDown();

		const drawTable = (headers, rows, colWidths, title) => {
			if (title) {
				doc.moveDown(0.5);
				doc.fontSize(12).font('Helvetica-Bold').text(title, { align: 'left' });
				doc.moveDown(0.3);
			}

			const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
			const startX = doc.page.margins.left;
			const headerHeight = 20;
			const rowHeight = 18;

			doc.font('Helvetica-Bold').fontSize(7);
			let x = startX;
			const tableTop = doc.y;

			// Header
			headers.forEach((h, i) => {
				doc.rect(x, tableTop, colWidths[i], headerHeight).fill('#4472C4');
				doc.fillColor('white').text(h, x + 2, tableTop + 5, { width: colWidths[i] - 4, align: i === 0 ? 'center' : (i === headers.length - 1 ? 'right' : 'left') });
				x += colWidths[i];
			});
			doc.fillColor('black');

			let y = tableTop + headerHeight;

			// Data rows
			rows.forEach((rowData, idx) => {
				if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
					doc.addPage();
					y = doc.page.margins.top;
					doc.font('Helvetica-Bold').fontSize(7);
					x = startX;
					headers.forEach((h, i) => {
						doc.rect(x, y, colWidths[i], headerHeight).fill('#4472C4');
						doc.fillColor('white').text(h, x + 2, y + 5, { width: colWidths[i] - 4, align: i === 0 ? 'center' : (i === headers.length - 1 ? 'right' : 'left') });
						x += colWidths[i];
					});
					doc.fillColor('black');
					y += headerHeight;
				}

				x = startX;
				rowData.forEach((val, i) => {
					doc.rect(x, y, colWidths[i], rowHeight).stroke('#CCCCCC');
					const align = i === 0 ? 'center' : (i === rowData.length - 1 ? 'right' : 'left');
					doc.font('Helvetica').fontSize(6.5).text(val, x + 2, y + 3, { width: colWidths[i] - 4, align, ellipsis: true });
					x += colWidths[i];
				});
				y += rowHeight;
			});

			doc.y = y + 10;
		};

		// Detail per Blok
		const detailHeaders = ['No', 'Blok', 'Nama', 'JK', 'Status Rumah', 'No. HP'];
		const detailColWidths = [0.05, 0.10, 0.30, 0.07, 0.23, 0.25].map(p => p * (doc.page.width - doc.page.margins.left - doc.page.margins.right));
		
		let rowCounter = 1;
		const detailRows = [];
		data.kontakPerBlok.forEach(blokData => {
			blokData.kontak.forEach((item, idx) => {
				detailRows.push([
					String(rowCounter++),
					blokData.blok,
					item.nama,
					getJkLabel(item.jenis_kelamin),
					getStatusLabel(item.status_rumah),
					formatPhone(item.nomor_hp)
				]);
			});
		});

		drawTable(detailHeaders, detailRows, detailColWidths, 'DETAIL KONTAK PER BLOK');

		doc.end();
	});
}

export async function GET({ url, cookies }) {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login?redirect=/laporan/kependudukan/kontak');
	}

	const format = url.searchParams.get('format') || 'excel';
	const blokFilter = url.searchParams.get('blok') || 'semua';
	const search = url.searchParams.get('search')?.trim() || '';

	const filter = { blokFilter, search };
	const data = await getData(filter);

	if (format === 'pdf') {
		const buffer = await generatePDF(data, filter);
		return new Response(buffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="kontak-warga-${blokFilter}-${search || 'all'}.pdf"`
			}
		});
	}

	const buffer = await generateExcel(data, filter);
	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="kontak-warga-${blokFilter}-${search || 'all'}.xlsx"`
		}
	});
}