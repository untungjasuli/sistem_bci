import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

function formatDateIndo(dateStr) {
	if (!dateStr) return '-';
	return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
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

function getJkLabel(jk) {
	return jk === 'Laki-laki' ? 'Laki-laki' : 'Perempuan';
}

async function getData(filter) {
	const { blokFilter, statusFilter } = filter;

	let whereClause = 'WHERE 1=1';
	const params = [];

	if (blokFilter !== 'semua') {
		whereClause += ' AND k.blok_rumah_id = ?';
		params.push(parseInt(blokFilter));
	}
	if (statusFilter !== 'semua') {
		whereClause += ' AND k.status_rumah = ?';
		params.push(statusFilter);
	}

	// Same query as +page.server.js
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

	const blokRumah = await executeQuery('SELECT id, no_blok FROM blok_rumah ORDER BY no_blok');

	return { warga: rows, blokRumah };
}

async function generateExcel(data, filter) {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Daftar Warga per Blok');

	// Title
	worksheet.mergeCells('A1:J1');
	worksheet.getCell('A1').value = 'LAPORAN DAFTAR WARGA PER BLOK';
	worksheet.getCell('A1').font = { bold: true, size: 16 };
	worksheet.getCell('A1').alignment = { horizontal: 'center' };

	// Filter info
	let filterInfo = [];
	if (filter.blokFilter !== 'semua') {
		const blok = data.blokRumah?.find(b => b.id === parseInt(filter.blokFilter));
		filterInfo.push(`Blok: ${blok?.no_blok || '-'}`);
	}
	if (filter.statusFilter !== 'semua') {
		filterInfo.push(`Status: ${getStatusLabel(filter.statusFilter)}`);
	}
	if (filterInfo.length > 0) {
		worksheet.mergeCells('A2:J2');
		worksheet.getCell('A2').value = filterInfo.join(' | ');
		worksheet.getCell('A2').alignment = { horizontal: 'center' };
		worksheet.getCell('A2').font = { italic: true };
	}

	// Headers
	const headers = ['No', 'Blok', 'No. KK', 'Status Rumah', 'NIK', 'Nama', 'Jenis Kelamin', 'Tgl Lahir', 'Umur', 'Hub. Keluarga', 'No. HP'];
	const headerRow = worksheet.getRow(4);
	headers.forEach((h, i) => {
		const cell = headerRow.getCell(i + 1);
		cell.value = h;
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
		cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
		cell.alignment = { horizontal: 'center' };
		cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
	});

	// Data rows
	data.warga.forEach((item, idx) => {
		const row = worksheet.getRow(5 + idx);
		row.getCell(1).value = idx + 1;
		row.getCell(2).value = item.no_blok;
		row.getCell(3).value = item.no_kk;
		row.getCell(4).value = getStatusLabel(item.status_rumah);
		row.getCell(5).value = item.nik || '-';
		row.getCell(6).value = item.nama;
		row.getCell(7).value = getJkLabel(item.jenis_kelamin);
		row.getCell(8).value = formatDateIndo(item.tanggal_lahir);
		row.getCell(9).value = item.umur || '-';
		row.getCell(10).value = getHubLabel(item.hub_keluarga);
		row.getCell(11).value = item.nomor_hp || '-';

		row.eachCell(cell => {
			cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
			cell.alignment = { vertical: 'middle' };
		});
		row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
	});

	// Total row
	const totalRowNum = 5 + data.warga.length;
	const totalRow = worksheet.getRow(totalRowNum);
	totalRow.getCell(1).value = '';
	totalRow.getCell(2).value = '';
	totalRow.getCell(3).value = '';
	totalRow.getCell(4).value = 'TOTAL';
	totalRow.getCell(4).font = { bold: true };
	totalRow.getCell(4).alignment = { horizontal: 'right' };
	totalRow.getCell(6).value = data.warga.length;
	totalRow.getCell(6).font = { bold: true, color: { argb: 'FF1F4E79' } };
	totalRow.getCell(6).alignment = { horizontal: 'center' };
	totalRow.eachCell(cell => {
		cell.border = { top: { style: 'double' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
	});

	// Column widths
	worksheet.getColumn(1).width = 5;
	worksheet.getColumn(2).width = 10;
	worksheet.getColumn(3).width = 18;
	worksheet.getColumn(4).width = 22;
	worksheet.getColumn(5).width = 20;
	worksheet.getColumn(6).width = 25;
	worksheet.getColumn(7).width = 16;
	worksheet.getColumn(8).width = 14;
	worksheet.getColumn(9).width = 8;
	worksheet.getColumn(10).width = 18;
	worksheet.getColumn(11).width = 18;

	return workbook.xlsx.writeBuffer();
}

async function generatePDF(data, filter) {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ layout: 'landscape', margin: 20, size: 'A4' });
		const chunks = [];
		doc.on('data', chunk => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		doc.fontSize(16).font('Helvetica-Bold').text('LAPORAN DAFTAR WARGA PER BLOK', { align: 'center' });
		doc.moveDown(0.3);
		doc.fontSize(10).font('Helvetica').text(`Tanggal Cetak: ${formatDateIndo(new Date().toISOString())}`, { align: 'center' });

		let filterInfo = [];
		if (filter.blokFilter !== 'semua') {
			const blok = data.blokRumah?.find(b => b.id === parseInt(filter.blokFilter));
			filterInfo.push(`Blok: ${blok?.no_blok || '-'}`);
		}
		if (filter.statusFilter !== 'semua') {
			filterInfo.push(`Status: ${getStatusLabel(filter.statusFilter)}`);
		}
		if (filterInfo.length > 0) {
			doc.fontSize(8).font('Helvetica-Oblique').text(filterInfo.join(' | '), { align: 'center' });
		}
		doc.moveDown();

		// Full width table - calculate column widths based on page width
		const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right; // ~801 for landscape A4
		const colWidths = [
			0.04 * pageWidth,  // No - 4%
			0.08 * pageWidth,  // Blok - 8%
			0.14 * pageWidth,  // No. KK - 14%
			0.16 * pageWidth,  // Status Rumah - 16%
			0.14 * pageWidth,  // NIK - 14%
			0.18 * pageWidth,  // Nama - 18%
			0.10 * pageWidth,  // JK - 10%
			0.10 * pageWidth,  // Tgl Lahir - 10%
			0.06 * pageWidth,  // Umur - 6%
			0.12 * pageWidth,  // Hub. Keluarga - 12%
			0.14 * pageWidth   // No. HP - 14%
		];
		const headers = ['No', 'Blok', 'No. KK', 'Status Rumah', 'NIK', 'Nama', 'JK', 'Tgl Lahir', 'Umur', 'Hub. Keluarga', 'No. HP'];
		const startX = doc.page.margins.left;

		doc.font('Helvetica-Bold').fontSize(7);
		let x = startX;
		const tableTop = doc.y;
		const headerHeight = 20;

		headers.forEach((h, i) => {
			doc.rect(x, tableTop, colWidths[i], headerHeight).fill('#4472C4');
			doc.fillColor('white').text(h, x + 2, tableTop + 5, { width: colWidths[i] - 4, align: i === 0 || i === 1 || i === 2 || i === 3 || i === 6 || i === 7 || i === 8 || i === 9 ? 'center' : 'left' });
			x += colWidths[i];
		});
		doc.fillColor('black');

		let y = tableTop + headerHeight;
		const rowHeight = 18;

		data.warga.forEach((item, idx) => {
			if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
				doc.addPage();
				y = doc.page.margins.top;
				// Redraw header on new page
				doc.font('Helvetica-Bold').fontSize(7);
				x = startX;
				headers.forEach((h, i) => {
					doc.rect(x, y, colWidths[i], headerHeight).fill('#4472C4');
					doc.fillColor('white').text(h, x + 2, y + 5, { width: colWidths[i] - 4, align: i === 0 || i === 1 || i === 2 || i === 3 || i === 6 || i === 7 || i === 8 || i === 9 ? 'center' : 'left' });
					x += colWidths[i];
				});
				doc.fillColor('black');
				y += headerHeight;
			}

			const rowData = [
				String(idx + 1),
				item.no_blok,
				item.no_kk,
				getStatusLabel(item.status_rumah),
				item.nik || '-',
				item.nama,
				getJkLabel(item.jenis_kelamin),
				formatDateIndo(item.tanggal_lahir),
				String(item.umur || '-'),
				getHubLabel(item.hub_keluarga),
				item.nomor_hp || '-'
			];
			x = startX;
			rowData.forEach((val, i) => {
				doc.rect(x, y, colWidths[i], rowHeight).stroke('#CCCCCC');
				const align = i === 0 || i === 1 || i === 2 || i === 3 || i === 6 || i === 7 || i === 8 || i === 9 ? 'center' : 'left';
				doc.font('Helvetica').fontSize(6.5).text(val, x + 2, y + 3, { width: colWidths[i] - 4, align, ellipsis: true });
				x += colWidths[i];
			});
			y += rowHeight;
		});

		// Total row
		if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
			doc.addPage();
			y = doc.page.margins.top;
		}
		const totalRowData = ['', '', '', 'TOTAL', '', String(data.warga.length), '', '', '', '', ''];
		x = startX;
		totalRowData.forEach((val, i) => {
			doc.rect(x, y, colWidths[i], rowHeight + 2).fill('#D6E4F0').stroke('#999999');
			if (i === 3) {
				doc.font('Helvetica-Bold').fontSize(7).fillColor('#1F4E79').text(val, x + 2, y + 4, { width: colWidths[i] - 4, align: 'right' });
			} else if (i === 5) {
				doc.font('Helvetica-Bold').fontSize(7).fillColor('#1F4E79').text(val, x + 2, y + 4, { width: colWidths[i] - 4, align: 'center' });
			} else {
				doc.font('Helvetica').fontSize(7).text(val, x + 2, y + 4, { width: colWidths[i] - 4 });
			}
			x += colWidths[i];
		});
		doc.fillColor('black');

		doc.end();
	});
}

export async function GET({ url, cookies }) {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login?redirect=/laporan/kependudukan/warga-blok');
	}

	const format = url.searchParams.get('format') || 'excel';
	const blokFilter = url.searchParams.get('blok') || 'semua';
	const statusFilter = url.searchParams.get('status') || 'semua';

	const filter = { blokFilter, statusFilter };
	const data = await getData(filter);

	if (format === 'pdf') {
		const buffer = await generatePDF(data, filter);
		return new Response(buffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="daftar-warga-per-blok-${blokFilter}-${statusFilter}.pdf"`
			}
		});
	}

	const buffer = await generateExcel(data, filter);
	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="daftar-warga-per-blok-${blokFilter}-${statusFilter}.xlsx"`
		}
	});
}