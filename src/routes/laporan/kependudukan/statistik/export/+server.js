import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

function formatNumber(num) {
	return new Intl.NumberFormat('id-ID').format(num);
}

function getStatusLabel(status) {
	if (status === 'sendiri') return 'Rumah Sendiri';
	if (status === 'ngontrak') return 'Ngontrak';
	if (status === 'ikut_ortu_mertua') return 'Ikut Orang Tua/Mertua';
	return status;
}

function getHubLabel(hub) {
	const labels = { 'kepala': 'Kepala Keluarga', 'istri': 'Istri', 'anak': 'Anak', 'lainnya': 'Lainnya' };
	return labels[hub] || hub;
}

async function getData(filter) {
	const { blokFilter } = filter;

	let whereClause = 'WHERE 1=1';
	const params = [];

	if (blokFilter !== 'semua') {
		whereClause += ' AND b.id = ?';
		params.push(parseInt(blokFilter));
	}

	// Total keluarga & warga
	const totalSql = `
		SELECT 
			COUNT(DISTINCT k.id) as total_keluarga,
			COUNT(ak.id) as total_warga
		FROM keluarga k
		JOIN blok_rumah b ON k.blok_rumah_id = b.id
		LEFT JOIN anggota_keluarga ak ON k.id = ak.keluarga_id
		${whereClause}
	`;
	const totalRows = await executeQuery(totalSql, params);
	const total = totalRows[0] || { total_keluarga: 0, total_warga: 0 };

	// Per jenis kelamin
	const jkSql = `
		SELECT 
			ak.jenis_kelamin,
			COUNT(*) as jumlah
		FROM anggota_keluarga ak
		JOIN keluarga k ON ak.keluarga_id = k.id
		JOIN blok_rumah b ON k.blok_rumah_id = b.id
		${whereClause}
		GROUP BY ak.jenis_kelamin
	`;
	const jkRows = await executeQuery(jkSql, params);
	const byJenisKelamin = { L: 0, P: 0 };
	for (const row of jkRows) {
		const jk = row.jenis_kelamin === 'Laki-laki' ? 'L' : row.jenis_kelamin === 'Perempuan' ? 'P' : row.jenis_kelamin;
		byJenisKelamin[jk] = (byJenisKelamin[jk] || 0) + parseInt(row.jumlah);
	}

	// Per status rumah
	const statusSql = `
		SELECT 
			k.status_rumah,
			COUNT(DISTINCT k.id) as jml_keluarga,
			COUNT(ak.id) as jml_warga
		FROM keluarga k
		JOIN blok_rumah b ON k.blok_rumah_id = b.id
		LEFT JOIN anggota_keluarga ak ON k.id = ak.keluarga_id
		${whereClause}
		GROUP BY k.status_rumah
	`;
	const statusRows = await executeQuery(statusSql, params);
	const byStatusRumah = {};
	for (const row of statusRows) {
		byStatusRumah[row.status_rumah] = {
			keluarga: parseInt(row.jml_keluarga),
			warga: parseInt(row.jml_warga)
		};
	}

	// Per hub keluarga
	const hubSql = `
		SELECT 
			ak.hub_keluarga,
			COUNT(*) as jumlah
		FROM anggota_keluarga ak
		JOIN keluarga k ON ak.keluarga_id = k.id
		JOIN blok_rumah b ON k.blok_rumah_id = b.id
		${whereClause}
		GROUP BY ak.hub_keluarga
		ORDER BY jumlah DESC
	`;
	const hubRows = await executeQuery(hubSql, params);
	const byHubKeluarga = hubRows.map(r => ({
		hub: r.hub_keluarga,
		jumlah: parseInt(r.jumlah)
	}));

	// Per blok
	const blokSql = `
		SELECT 
			b.no_blok,
			COUNT(DISTINCT k.id) as jml_keluarga,
			COUNT(ak.id) as jml_warga
		FROM blok_rumah b
		LEFT JOIN keluarga k ON b.id = k.blok_rumah_id
		LEFT JOIN anggota_keluarga ak ON k.id = ak.keluarga_id
		${whereClause}
		GROUP BY b.id, b.no_blok
		ORDER BY b.no_blok
	`;
	const blokRows = await executeQuery(blokSql, params);
	const byBlok = blokRows.map(r => ({
		blok: r.no_blok,
		keluarga: parseInt(r.jml_keluarga),
		warga: parseInt(r.jml_warga)
	}));

	const blokRumah = await executeQuery('SELECT id, no_blok FROM blok_rumah ORDER BY no_blok');

	return { total, byJenisKelamin, byStatusRumah, byHubKeluarga, byBlok, blokRumah };
}

async function generateExcel(data, filter) {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Statistik Penduduk');

	// Title
	worksheet.mergeCells('A1:F1');
	worksheet.getCell('A1').value = 'LAPORAN STATISTIK PENDUDUK';
	worksheet.getCell('A1').font = { bold: true, size: 16 };
	worksheet.getCell('A1').alignment = { horizontal: 'center' };

	// Filter info
	let filterInfo = [];
	if (filter.blokFilter !== 'semua') {
		const blok = data.blokRumah?.find(b => b.id === parseInt(filter.blokFilter));
		filterInfo.push(`Blok: ${blok?.no_blok || '-'}`);
	}
	if (filterInfo.length > 0) {
		worksheet.mergeCells('A2:F2');
		worksheet.getCell('A2').value = filterInfo.join(' | ');
		worksheet.getCell('A2').alignment = { horizontal: 'center' };
		worksheet.getCell('A2').font = { italic: true };
	}

	// Summary Cards
	worksheet.mergeCells('A4:F4');
	worksheet.getCell('A4').value = 'RINGKASAN';
	worksheet.getCell('A4').font = { bold: true, size: 12, color: { argb: 'FF4472C4' } };

	let rowNum = 5;
	const summaryData = [
		['Total Keluarga (KK)', data.total.total_keluarga],
		['Total Warga', data.total.total_warga],
		['Laki-laki', data.byJenisKelamin.L || 0],
		['Perempuan', data.byJenisKelamin.P || 0],
	];
	summaryData.forEach(([label, value]) => {
		const row = worksheet.getRow(rowNum++);
		row.getCell(1).value = label;
		row.getCell(2).value = value;
		row.getCell(2).numFmt = '#,##0';
		row.getCell(1).font = { bold: true };
		row.getCell(2).alignment = { horizontal: 'right' };
	});

	// Per Status Rumah
	rowNum++;
	worksheet.mergeCells(`A${rowNum}:F${rowNum}`);
	worksheet.getCell(`A${rowNum}`).value = 'PER STATUS RUMAH';
	worksheet.getCell(`A${rowNum}`).font = { bold: true, size: 12, color: { argb: 'FF4472C4' } };
	rowNum++;

	const statusHeader = ['No', 'Status Rumah', 'Jumlah KK', 'Jumlah Warga', '% KK', '% Warga'];
	const statusHeaderRow = worksheet.getRow(rowNum++);
	statusHeader.forEach((h, i) => {
		const cell = statusHeaderRow.getCell(i + 1);
		cell.value = h;
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
		cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
		cell.alignment = { horizontal: 'center' };
		cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
	});

	Object.entries(data.byStatusRumah).forEach(([status, d], idx) => {
		const row = worksheet.getRow(rowNum++);
		row.getCell(1).value = idx + 1;
		row.getCell(2).value = getStatusLabel(status);
		row.getCell(3).value = d.keluarga;
		row.getCell(3).numFmt = '#,##0';
		row.getCell(4).value = d.warga;
		row.getCell(4).numFmt = '#,##0';
		row.getCell(5).value = data.total.total_keluarga > 0 ? (d.keluarga / data.total.total_keluarga * 100) : 0;
		row.getCell(5).numFmt = '0.00';
		row.getCell(6).value = data.total.total_warga > 0 ? (d.warga / data.total.total_warga * 100) : 0;
		row.getCell(6).numFmt = '0.00';
		row.eachCell(cell => {
			cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
			cell.alignment = { vertical: 'middle' };
		});
		row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
	});

	// Per Hubungan Keluarga
	rowNum++;
	worksheet.mergeCells(`A${rowNum}:F${rowNum}`);
	worksheet.getCell(`A${rowNum}`).value = 'PER HUBUNGAN KELUARGA';
	worksheet.getCell(`A${rowNum}`).font = { bold: true, size: 12, color: { argb: 'FF4472C4' } };
	rowNum++;

	const hubHeader = ['No', 'Hubungan Keluarga', 'Jumlah', '%'];
	const hubHeaderRow = worksheet.getRow(rowNum++);
	hubHeader.forEach((h, i) => {
		const cell = hubHeaderRow.getCell(i + 1);
		cell.value = h;
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
		cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
		cell.alignment = { horizontal: 'center' };
		cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
	});

	data.byHubKeluarga.forEach((item, idx) => {
		const row = worksheet.getRow(rowNum++);
		row.getCell(1).value = idx + 1;
		row.getCell(2).value = getHubLabel(item.hub);
		row.getCell(3).value = item.jumlah;
		row.getCell(3).numFmt = '#,##0';
		row.getCell(4).value = data.total.total_warga > 0 ? (item.jumlah / data.total.total_warga * 100) : 0;
		row.getCell(4).numFmt = '0.00';
		row.eachCell(cell => {
			cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
			cell.alignment = { vertical: 'middle' };
		});
		row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
	});

	// Per Blok
	rowNum++;
	worksheet.mergeCells(`A${rowNum}:F${rowNum}`);
	worksheet.getCell(`A${rowNum}`).value = 'PER BLOK RUMAH';
	worksheet.getCell(`A${rowNum}`).font = { bold: true, size: 12, color: { argb: 'FF4472C4' } };
	rowNum++;

	const blokHeader = ['No', 'Blok', 'Jumlah KK', 'Jumlah Warga', 'Rata-rata Warga/KK'];
	const blokHeaderRow = worksheet.getRow(rowNum++);
	blokHeader.forEach((h, i) => {
		const cell = blokHeaderRow.getCell(i + 1);
		cell.value = h;
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
		cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
		cell.alignment = { horizontal: 'center' };
		cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
	});

	data.byBlok.forEach((item, idx) => {
		const row = worksheet.getRow(rowNum++);
		row.getCell(1).value = idx + 1;
		row.getCell(2).value = item.blok;
		row.getCell(3).value = item.keluarga;
		row.getCell(3).numFmt = '#,##0';
		row.getCell(4).value = item.warga;
		row.getCell(4).numFmt = '#,##0';
		row.getCell(5).value = item.keluarga > 0 ? (item.warga / item.keluarga).toFixed(1) : '0';
		row.eachCell(cell => {
			cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
			cell.alignment = { vertical: 'middle' };
		});
		row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
	});

	// Total row for blok
	const totalBlokRow = worksheet.getRow(rowNum++);
	totalBlokRow.getCell(1).value = '';
	totalBlokRow.getCell(2).value = 'TOTAL';
	totalBlokRow.getCell(2).font = { bold: true };
	totalBlokRow.getCell(2).alignment = { horizontal: 'right' };
	totalBlokRow.getCell(3).value = data.total.total_keluarga;
	totalBlokRow.getCell(3).numFmt = '#,##0';
	totalBlokRow.getCell(3).font = { bold: true, color: { argb: 'FF1F4E79' } };
	totalBlokRow.getCell(3).alignment = { horizontal: 'center' };
	totalBlokRow.getCell(4).value = data.total.total_warga;
	totalBlokRow.getCell(4).numFmt = '#,##0';
	totalBlokRow.getCell(4).font = { bold: true, color: { argb: 'FF1F4E79' } };
	totalBlokRow.getCell(4).alignment = { horizontal: 'center' };
	totalBlokRow.getCell(5).value = data.total.total_keluarga > 0 ? (data.total.total_warga / data.total.total_keluarga).toFixed(1) : '0';
	totalBlokRow.getCell(5).font = { bold: true, color: { argb: 'FF1F4E79' } };
	totalBlokRow.getCell(5).alignment = { horizontal: 'center' };
	totalBlokRow.eachCell(cell => {
		cell.border = { top: { style: 'double' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
	});

	// Column widths
	worksheet.getColumn(1).width = 5;
	worksheet.getColumn(2).width = 25;
	worksheet.getColumn(3).width = 15;
	worksheet.getColumn(4).width = 15;
	worksheet.getColumn(5).width = 15;
	worksheet.getColumn(6).width = 15;

	return workbook.xlsx.writeBuffer();
}

async function generatePDF(data, filter) {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ layout: 'landscape', margin: 20, size: 'A4' });
		const chunks = [];
		doc.on('data', chunk => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		doc.fontSize(16).font('Helvetica-Bold').text('LAPORAN STATISTIK PENDUDUK', { align: 'center' });
		doc.moveDown(0.3);
		doc.fontSize(10).font('Helvetica').text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`, { align: 'center' });

		let filterInfo = [];
		if (filter.blokFilter !== 'semua') {
			const blok = data.blokRumah?.find(b => b.id === parseInt(filter.blokFilter));
			filterInfo.push(`Blok: ${blok?.no_blok || '-'}`);
		}
		if (filterInfo.length > 0) {
			doc.fontSize(8).font('Helvetica-Oblique').text(filterInfo.join(' | '), { align: 'center' });
		}
		doc.moveDown();

		// Ringkasan
		doc.fontSize(12).font('Helvetica-Bold').text('RINGKASAN', { align: 'left' });
		doc.moveDown(0.5);
		doc.fontSize(9).font('Helvetica');
		const summaryLines = [
			`Total Keluarga (KK): ${formatNumber(data.total.total_keluarga)}`,
			`Total Warga: ${formatNumber(data.total.total_warga)}`,
			`Laki-laki: ${formatNumber(data.byJenisKelamin.L || 0)}`,
			`Perempuan: ${formatNumber(data.byJenisKelamin.P || 0)}`
		];
		summaryLines.forEach(line => {
			doc.text(line, { continued: false });
		});
		doc.moveDown();

		// Helper function for drawing full-width tables
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
					// Redraw header
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

		// Per Status Rumah
		const statusHeaders = ['No', 'Status Rumah', 'Jumlah KK', 'Jumlah Warga', '% KK', '% Warga'];
		const statusColWidths = [0.05, 0.25, 0.18, 0.18, 0.17, 0.17].map(p => p * (doc.page.width - doc.page.margins.left - doc.page.margins.right));
		const statusRows = Object.entries(data.byStatusRumah).map(([status, d], idx) => [
			String(idx + 1),
			getStatusLabel(status),
			formatNumber(d.keluarga),
			formatNumber(d.warga),
			data.total.total_keluarga > 0 ? (d.keluarga / data.total.total_keluarga * 100).toFixed(2) + '%' : '0%',
			data.total.total_warga > 0 ? (d.warga / data.total.total_warga * 100).toFixed(2) + '%' : '0%'
		]);
		drawTable(statusHeaders, statusRows, statusColWidths, 'PER STATUS RUMAH');

		// Per Hubungan Keluarga
		const hubHeaders = ['No', 'Hubungan Keluarga', 'Jumlah', '%'];
		const hubColWidths = [0.05, 0.50, 0.25, 0.20].map(p => p * (doc.page.width - doc.page.margins.left - doc.page.margins.right));
		const hubRows = data.byHubKeluarga.map((item, idx) => [
			String(idx + 1),
			getHubLabel(item.hub),
			formatNumber(item.jumlah),
			data.total.total_warga > 0 ? (item.jumlah / data.total.total_warga * 100).toFixed(2) + '%' : '0%'
		]);
		drawTable(hubHeaders, hubRows, hubColWidths, 'PER HUBUNGAN KELUARGA');

		// Per Blok
		const blokHeaders = ['No', 'Blok', 'Jumlah KK', 'Jumlah Warga', 'Rata-rata Warga/KK'];
		const blokColWidths = [0.05, 0.25, 0.23, 0.23, 0.24].map(p => p * (doc.page.width - doc.page.margins.left - doc.page.margins.right));
		const blokRows = data.byBlok.map((item, idx) => [
			String(idx + 1),
			item.blok,
			formatNumber(item.keluarga),
			formatNumber(item.warga),
			item.keluarga > 0 ? (item.warga / item.keluarga).toFixed(1) : '0'
		]);
		drawTable(blokHeaders, blokRows, blokColWidths, 'PER BLOK RUMAH');

		// Total row for blok
		if (doc.y > doc.page.height - doc.page.margins.bottom - 20) {
			doc.addPage();
			doc.y = doc.page.margins.top;
		}
		const totalRowData = ['', 'TOTAL', formatNumber(data.total.total_keluarga), formatNumber(data.total.total_warga), data.total.total_keluarga > 0 ? (data.total.total_warga / data.total.total_keluarga).toFixed(1) : '0'];
		let x = doc.page.margins.left;
		totalRowData.forEach((val, i) => {
			doc.rect(x, doc.y, blokColWidths[i], 20).fill('#D6E4F0').stroke('#999999');
			const align = i === 0 ? 'center' : (i === 1 ? 'right' : (i === blokColWidths.length - 1 ? 'center' : 'center'));
			doc.font('Helvetica-Bold').fontSize(7).fillColor('#1F4E79').text(val, x + 2, doc.y + 4, { width: blokColWidths[i] - 4, align });
			x += blokColWidths[i];
		});
		doc.fillColor('black');

		doc.end();
	});
}

export async function GET({ url, cookies }) {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login?redirect=/laporan/kependudukan/statistik');
	}

	const format = url.searchParams.get('format') || 'excel';
	const blokFilter = url.searchParams.get('blok') || 'semua';

	const filter = { blokFilter };
	const data = await getData(filter);

	if (format === 'pdf') {
		const buffer = await generatePDF(data, filter);
		return new Response(buffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="statistik-penduduk-${blokFilter}.pdf"`
			}
		});
	}

	const buffer = await generateExcel(data, filter);
	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="statistik-penduduk-${blokFilter}.xlsx"`
		}
	});
}