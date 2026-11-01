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

function getJkLabel(jk) {
	return jk === 'Laki-laki' ? 'L' : 'P';
}

function getKelompokOrder() {
	return [
		'Bayi (0-1 th)',
		'Balita (1-5 th)',
		'Anak-Anak (5-10 th)',
		'Remaja (10-19 th)',
		'Dewasa (19-44 th)',
		'Pra-Lansia (45-59 th)',
		'Lansia (60+ th)'
	];
}

async function getData(filter) {
	const { blokFilter, jkFilter } = filter;

	let whereClause = 'WHERE ak.tanggal_lahir IS NOT NULL';
	const params = [];

	if (blokFilter !== 'semua') {
		whereClause += ' AND b.id = ?';
		params.push(parseInt(blokFilter));
	}
	if (jkFilter !== 'semua') {
		const jkValue = jkFilter === 'L' ? 'Laki-laki' : 'Perempuan';
		whereClause += ' AND ak.jenis_kelamin = ?';
		params.push(jkValue);
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
			b.no_blok,
			TIMESTAMPDIFF(YEAR, ak.tanggal_lahir, CURDATE()) as umur,
			CASE 
				WHEN TIMESTAMPDIFF(YEAR, ak.tanggal_lahir, CURDATE()) < 1 THEN 'Bayi (0-1 th)'
				WHEN TIMESTAMPDIFF(YEAR, ak.tanggal_lahir, CURDATE()) < 5 THEN 'Balita (1-5 th)'
				WHEN TIMESTAMPDIFF(YEAR, ak.tanggal_lahir, CURDATE()) < 10 THEN 'Anak-Anak (5-10 th)'
				WHEN TIMESTAMPDIFF(YEAR, ak.tanggal_lahir, CURDATE()) < 19 THEN 'Remaja (10-19 th)'
				WHEN TIMESTAMPDIFF(YEAR, ak.tanggal_lahir, CURDATE()) < 45 THEN 'Dewasa (19-44 th)'
				WHEN TIMESTAMPDIFF(YEAR, ak.tanggal_lahir, CURDATE()) < 60 THEN 'Pra-Lansia (45-59 th)'
				ELSE 'Lansia (60+ th)'
			END as kelompok_usia
		FROM anggota_keluarga ak
		JOIN keluarga k ON ak.keluarga_id = k.id
		JOIN blok_rumah b ON k.blok_rumah_id = b.id
		${whereClause}
		ORDER BY kelompok_usia, ak.tanggal_lahir
	`;
	const rows = await executeQuery(sql, params);

	const kelompokOrder = getKelompokOrder();
	const grouped = {};
	for (const row of rows) {
		const key = row.kelompok_usia;
		if (!grouped[key]) {
			grouped[key] = { kelompok: key, warga: [], total: 0, laki: 0, perempuan: 0 };
		}
		grouped[key].warga.push(row);
		grouped[key].total++;
		if (row.jenis_kelamin === 'Laki-laki') grouped[key].laki++;
		else grouped[key].perempuan++;
	}

	const kelompokList = kelompokOrder
		.map(k => grouped[k])
		.filter(Boolean);

	const grandTotal = rows.length;
	const blokRumah = await executeQuery('SELECT id, no_blok FROM blok_rumah ORDER BY no_blok');

	return { kelompokList, grandTotal, blokRumah };
}

async function generateExcel(data, filter) {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Warga per Kelompok Usia');

	// Title
	worksheet.mergeCells('A1:J1');
	worksheet.getCell('A1').value = 'LAPORAN WARGA PER KELOMPOK USIA';
	worksheet.getCell('A1').font = { bold: true, size: 16 };
	worksheet.getCell('A1').alignment = { horizontal: 'center' };

	// Filter info
	let filterInfo = [];
	if (filter.blokFilter !== 'semua') {
		const blok = data.blokRumah?.find(b => b.id === parseInt(filter.blokFilter));
		filterInfo.push(`Blok: ${blok?.no_blok || '-'}`);
	}
	if (filter.jkFilter !== 'semua') {
		filterInfo.push(`Jenis Kelamin: ${filter.jkFilter === 'L' ? 'Laki-laki' : 'Perempuan'}`);
	}
	if (filterInfo.length > 0) {
		worksheet.mergeCells('A2:J2');
		worksheet.getCell('A2').value = filterInfo.join(' | ');
		worksheet.getCell('A2').alignment = { horizontal: 'center' };
		worksheet.getCell('A2').font = { italic: true };
	}

	// Summary
	worksheet.mergeCells('A4:J4');
	worksheet.getCell('A4').value = 'RINGKASAN';
	worksheet.getCell('A4').font = { bold: true, size: 12, color: { argb: 'FF4472C4' } };

	let rowNum = 5;
	const summaryData = [
		['Total Warga', data.grandTotal],
		['Laki-laki', data.kelompokList.reduce((s, k) => s + k.laki, 0)],
		['Perempuan', data.kelompokList.reduce((s, k) => s + k.perempuan, 0)],
		['Jumlah Kelompok', data.kelompokList.length],
	];
	summaryData.forEach(([label, value]) => {
		const row = worksheet.getRow(rowNum++);
		row.getCell(1).value = label;
		row.getCell(2).value = value;
		row.getCell(2).numFmt = '#,##0';
		row.getCell(1).font = { bold: true };
		row.getCell(2).alignment = { horizontal: 'right' };
	});

	// Detail per Kelompok Usia
	rowNum++;
	worksheet.mergeCells(`A${rowNum}:J${rowNum}`);
	worksheet.getCell(`A${rowNum}`).value = 'DETAIL PER KELOMPOK USIA';
	worksheet.getCell(`A${rowNum}`).font = { bold: true, size: 12, color: { argb: 'FF4472C4' } };
	rowNum++;

	const detailHeaders = ['No', 'Kelompok Usia', 'NIK', 'Nama', 'JK', 'Umur', 'Hub. Keluarga', 'Blok', 'No. KK', 'No. HP'];
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
	data.kelompokList.forEach(kelompok => {
		kelompok.warga.forEach((w, idx) => {
			const row = worksheet.getRow(rowNum++);
			row.getCell(1).value = rowCounter++;
			row.getCell(2).value = kelompok.kelompok;
			row.getCell(3).value = w.nik || '-';
			row.getCell(4).value = w.nama;
			row.getCell(5).value = getJkLabel(w.jenis_kelamin);
			row.getCell(6).value = `${w.umur} thn`;
			row.getCell(7).value = getHubLabel(w.hub_keluarga);
			row.getCell(8).value = w.no_blok;
			row.getCell(9).value = w.no_kk;
			row.getCell(10).value = w.nomor_hp || '-';
			row.eachCell(cell => {
				cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
				cell.alignment = { vertical: 'middle' };
			});
			row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
			row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
			row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
			row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
		});
	});

	// Column widths
	worksheet.getColumn(1).width = 5;
	worksheet.getColumn(2).width = 20;
	worksheet.getColumn(3).width = 18;
	worksheet.getColumn(4).width = 25;
	worksheet.getColumn(5).width = 8;
	worksheet.getColumn(6).width = 10;
	worksheet.getColumn(7).width = 20;
	worksheet.getColumn(8).width = 10;
	worksheet.getColumn(9).width = 18;
	worksheet.getColumn(10).width = 18;

	return workbook.xlsx.writeBuffer();
}

async function generatePDF(data, filter) {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ layout: 'landscape', margin: 20, size: 'A4' });
		const chunks = [];
		doc.on('data', chunk => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		doc.fontSize(16).font('Helvetica-Bold').text('LAPORAN WARGA PER KELOMPOK USIA', { align: 'center' });
		doc.moveDown(0.3);
		doc.fontSize(10).font('Helvetica').text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`, { align: 'center' });

		let filterInfo = [];
		if (filter.blokFilter !== 'semua') {
			const blok = data.blokRumah?.find(b => b.id === parseInt(filter.blokFilter));
			filterInfo.push(`Blok: ${blok?.no_blok || '-'}`);
		}
		if (filter.jkFilter !== 'semua') {
			filterInfo.push(`Jenis Kelamin: ${filter.jkFilter === 'L' ? 'Laki-laki' : 'Perempuan'}`);
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
			`Total Warga: ${formatNumber(data.grandTotal)}`,
			`Laki-laki: ${formatNumber(data.kelompokList.reduce((s, k) => s + k.laki, 0))}`,
			`Perempuan: ${formatNumber(data.kelompokList.reduce((s, k) => s + k.perempuan, 0))}`,
			`Jumlah Kelompok: ${data.kelompokList.length}`
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

		// Detail per Kelompok Usia
		const detailHeaders = ['No', 'Kelompok Usia', 'NIK', 'Nama', 'JK', 'Umur', 'Hub. Keluarga', 'Blok', 'No. KK', 'No. HP'];
		const detailColWidths = [0.03, 0.12, 0.12, 0.15, 0.05, 0.06, 0.12, 0.08, 0.12, 0.15].map(p => p * (doc.page.width - doc.page.margins.left - doc.page.margins.right));
		
		let rowCounter = 1;
		const detailRows = [];
		data.kelompokList.forEach(kelompok => {
			kelompok.warga.forEach((w, idx) => {
				detailRows.push([
					String(rowCounter++),
					kelompok.kelompok,
					w.nik || '-',
					w.nama,
					getJkLabel(w.jenis_kelamin),
					`${w.umur} thn`,
					getHubLabel(w.hub_keluarga),
					w.no_blok,
					w.no_kk,
					w.nomor_hp || '-'
				]);
			});
		});

		drawTable(detailHeaders, detailRows, detailColWidths, 'DETAIL PER KELOMPOK USIA');

		doc.end();
	});
}

export async function GET({ url, cookies }) {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login?redirect=/laporan/kependudukan/kelompok-usia');
	}

	const format = url.searchParams.get('format') || 'excel';
	const blokFilter = url.searchParams.get('blok') || 'semua';
	const jkFilter = url.searchParams.get('jk') || 'semua';

	const filter = { blokFilter, jkFilter };
	const data = await getData(filter);

	if (format === 'pdf') {
		const buffer = await generatePDF(data, filter);
		return new Response(buffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="warga-kelompok-usia-${blokFilter}-${jkFilter}.pdf"`
			}
		});
	}

	const buffer = await generateExcel(data, filter);
	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="warga-kelompok-usia-${blokFilter}-${jkFilter}.xlsx"`
		}
	});
}