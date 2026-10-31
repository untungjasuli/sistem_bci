import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

function formatRupiah(num) {
	if (num === null || num === undefined) return 'Rp 0';
	return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

function formatDateIndo(dateStr) {
	if (!dateStr) return '-';
	return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getStatusLabel(status) {
	return status === 'lunas' ? 'Lunas' : 'Belum Bayar';
}

async function generateExcel(data, filter) {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Rekap Tagihan per Periode');

	worksheet.mergeCells('A1:H1');
	worksheet.getCell('A1').value = 'LAPORAN REKAP TAGIHAN PER PERIODE';
	worksheet.getCell('A1').font = { bold: true, size: 16 };
	worksheet.getCell('A1').alignment = { horizontal: 'center' };

	worksheet.mergeCells('A2:H2');
	worksheet.getCell('A2').value = `Periode: ${filter.periode}`;
	worksheet.getCell('A2').alignment = { horizontal: 'center' };

	let filterInfo = [];
	if (filter.blokFilter !== 'semua') {
		const blok = data.blokRumah?.find(b => b.id === parseInt(filter.blokFilter));
		filterInfo.push(`Blok: ${blok?.label || '-'}`);
	}
	if (filter.statusFilter !== 'semua') {
		filterInfo.push(`Status: ${filter.statusFilter === 'lunas' ? 'Lunas' : 'Belum Bayar'}`);
	}
	if (filterInfo.length > 0) {
		worksheet.mergeCells('A3:H3');
		worksheet.getCell('A3').value = filterInfo.join(' | ');
		worksheet.getCell('A3').alignment = { horizontal: 'center' };
		worksheet.getCell('A3').font = { italic: true };
	}

	const headers = ['No', 'Blok - No Rumah', 'Penghuni/Pemilik', 'Periode', 'Nominal', 'Status', 'Tgl Bayar', 'Metode'];
	const headerRow = worksheet.getRow(5);
	headers.forEach((h, i) => {
		const cell = headerRow.getCell(i + 1);
		cell.value = h;
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
		cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
		cell.alignment = { horizontal: 'center' };
		cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
	});

	data.tagihan.forEach((item, idx) => {
		const row = worksheet.getRow(6 + idx);
		row.getCell(1).value = idx + 1;
		row.getCell(2).value = item.blok;
		row.getCell(3).value = item.penghuni_nama || '-';
		row.getCell(4).value = item.periode;
		row.getCell(5).value = item.nominal;
		row.getCell(5).numFmt = '#,##0';
		row.getCell(6).value = getStatusLabel(item.status);
		row.getCell(7).value = formatDateIndo(item.tanggal_bayar);
		row.getCell(8).value = item.metode_bayar || '-';

		row.eachCell(cell => {
			cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
			cell.alignment = { vertical: 'middle' };
		});
		row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
		row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
	});

	const totalRowNum = 6 + data.tagihan.length;
	const totalRow = worksheet.getRow(totalRowNum);
	totalRow.getCell(1).value = '';
	totalRow.getCell(2).value = '';
	totalRow.getCell(3).value = '';
	totalRow.getCell(4).value = 'TOTAL';
	totalRow.getCell(4).font = { bold: true };
	totalRow.getCell(4).alignment = { horizontal: 'right' };
	totalRow.getCell(5).value = data.grandTotal.total_nominal;
	totalRow.getCell(5).numFmt = '#,##0';
	totalRow.getCell(5).font = { bold: true, color: { argb: 'FF1F4E79' } };
	totalRow.getCell(5).alignment = { horizontal: 'right' };
	totalRow.getCell(6).value = '';
	totalRow.getCell(7).value = '';
	totalRow.getCell(8).value = '';
	totalRow.eachCell(cell => {
		cell.border = { top: { style: 'double' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
	});

	worksheet.getColumn(1).width = 5;
	worksheet.getColumn(2).width = 16;
	worksheet.getColumn(3).width = 25;
	worksheet.getColumn(4).width = 12;
	worksheet.getColumn(5).width = 18;
	worksheet.getColumn(6).width = 14;
	worksheet.getColumn(7).width = 14;
	worksheet.getColumn(8).width = 16;

	return workbook.xlsx.writeBuffer();
}

async function generatePDF(data, filter) {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ layout: 'landscape', margin: 20, size: 'A4' });
		const chunks = [];
		doc.on('data', chunk => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		doc.fontSize(16).font('Helvetica-Bold').text('LAPORAN REKAP TAGIHAN PER PERIODE', { align: 'center' });
		doc.moveDown(0.3);
		doc.fontSize(10).font('Helvetica').text(`Periode: ${filter.periode}`, { align: 'center' });

		let filterInfo = [];
		if (filter.blokFilter !== 'semua') {
			const blok = data.blokRumah?.find(b => b.id === parseInt(filter.blokFilter));
			filterInfo.push(`Blok: ${blok?.label || '-'}`);
		}
		if (filter.statusFilter !== 'semua') {
			filterInfo.push(`Status: ${filter.statusFilter === 'lunas' ? 'Lunas' : 'Belum Bayar'}`);
		}
		if (filterInfo.length > 0) {
			doc.fontSize(8).font('Helvetica-Oblique').text(filterInfo.join(' | '), { align: 'center' });
		}
		doc.moveDown();

		// Full width table - calculate column widths based on page width
		const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right; // ~801 for landscape A4
		const colWidths = [
			0.04 * pageWidth,  // No - 4%
			0.12 * pageWidth,  // Blok - 12%
			0.22 * pageWidth,  // Penghuni - 22%
			0.10 * pageWidth,  // Periode - 10%
			0.16 * pageWidth,  // Nominal - 16%
			0.12 * pageWidth,  // Status - 12%
			0.12 * pageWidth,  // Tgl Bayar - 12%
			0.14 * pageWidth   // Metode - 14%
		];
		const headers = ['No', 'Blok', 'Penghuni/Pemilik', 'Periode', 'Nominal', 'Status', 'Tgl Bayar', 'Metode'];
		const startX = doc.page.margins.left;

		doc.font('Helvetica-Bold').fontSize(7);
		let x = startX;
		const tableTop = doc.y;
		const headerHeight = 20;

		headers.forEach((h, i) => {
			doc.rect(x, tableTop, colWidths[i], headerHeight).fill('#4472C4');
			doc.fillColor('white').text(h, x + 2, tableTop + 5, { width: colWidths[i] - 4, align: i === 0 || i === 1 || i === 3 || i === 5 || i === 6 ? 'center' : (i === 4 ? 'right' : 'left') });
			x += colWidths[i];
		});
		doc.fillColor('black');

		let y = tableTop + headerHeight;
		const rowHeight = 18;

		data.tagihan.forEach((item, idx) => {
			if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
				doc.addPage();
				y = doc.page.margins.top;
				// Redraw header on new page
				doc.font('Helvetica-Bold').fontSize(7);
				x = startX;
				headers.forEach((h, i) => {
					doc.rect(x, y, colWidths[i], headerHeight).fill('#4472C4');
					doc.fillColor('white').text(h, x + 2, y + 5, { width: colWidths[i] - 4, align: i === 0 || i === 1 || i === 3 || i === 5 || i === 6 ? 'center' : (i === 4 ? 'right' : 'left') });
					x += colWidths[i];
				});
				doc.fillColor('black');
				y += headerHeight;
			}

			const rowData = [
				String(idx + 1),
				item.blok,
				item.penghuni_nama || '-',
				item.periode,
				formatRupiah(item.nominal),
				getStatusLabel(item.status),
				formatDateIndo(item.tanggal_bayar),
				item.metode_bayar || '-'
			];
			x = startX;
			rowData.forEach((val, i) => {
				doc.rect(x, y, colWidths[i], rowHeight).stroke('#CCCCCC');
				const align = i === 0 || i === 1 || i === 3 || i === 5 || i === 6 ? 'center' : (i === 4 ? 'right' : 'left');
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
		const totalRowData = ['', '', '', 'TOTAL', formatRupiah(data.grandTotal.total_nominal), '', '', ''];
		x = startX;
		totalRowData.forEach((val, i) => {
			doc.rect(x, y, colWidths[i], rowHeight + 2).fill('#D6E4F0').stroke('#999999');
			if (i === 3) {
				doc.font('Helvetica-Bold').fontSize(7).fillColor('#1F4E79').text(val, x + 2, y + 4, { width: colWidths[i] - 4, align: 'right' });
			} else if (i === 4) {
				doc.font('Helvetica-Bold').fontSize(7).fillColor('#1F4E79').text(val, x + 2, y + 4, { width: colWidths[i] - 4, align: 'right' });
			} else {
				doc.font('Helvetica').fontSize(7).text(val, x + 2, y + 4, { width: colWidths[i] - 4 });
			}
			x += colWidths[i];
		});
		doc.fillColor('black');

		doc.end();
	});
}

async function getData(filter) {
	const { periode, blokFilter, statusFilter } = filter;

	let whereClause = 'WHERE t.periode = ?';
	const params = [periode];

	if (blokFilter !== 'semua') { whereClause += ' AND t.blok_rumah_id = ?'; params.push(parseInt(blokFilter)); }
	if (statusFilter !== 'semua') { whereClause += ' AND t.status = ?'; params.push(statusFilter); }

	const sql = `SELECT t.id, t.periode, t.nominal, t.status, t.tipe_pembayar, br.no_blok AS blok, COALESCE(ak.nama, pr.nama) as penghuni_nama, pi.tanggal_bayar, pi.metode_bayar FROM tagihan_iuran t JOIN blok_rumah br ON t.blok_rumah_id = br.id LEFT JOIN keluarga k ON br.id = k.blok_rumah_id LEFT JOIN anggota_keluarga ak ON k.id = ak.keluarga_id AND ak.hub_keluarga = 'Kepala Keluarga' LEFT JOIN pemilik_rumah pr ON br.id = pr.blok_rumah_id LEFT JOIN pembayaran_iuran pi ON t.id = pi.tagihan_id ${whereClause} ORDER BY br.no_blok, t.periode`;
	const rows = await executeQuery(sql, params);

	const summarySql = `SELECT t.status, COUNT(*) as jumlah, SUM(t.nominal) as total_nominal FROM tagihan_iuran t ${whereClause} GROUP BY t.status`;
	const summaryRows = await executeQuery(summarySql, params);
	const summary = { lunas: { jumlah: 0, total: 0 }, belum_bayar: { jumlah: 0, total: 0 } };
	for (const row of summaryRows) {
		if (summary[row.status]) {
			summary[row.status] = { jumlah: parseInt(row.jumlah), total: parseFloat(row.total_nominal || 0) };
		}
	}

	const grandTotal = rows.reduce((acc, r) => ({ jumlah: acc.jumlah + 1, total_nominal: acc.total_nominal + parseFloat(r.nominal || 0) }), { jumlah: 0, total_nominal: 0 });

	const blokRumah = await executeQuery('SELECT id, no_blok as label FROM blok_rumah ORDER BY no_blok');

	return { tagihan: rows, summary, grandTotal, blokRumah };
}

export async function GET({ url, cookies }) {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login?redirect=/laporan/tagihan/rekap-periode');
	}

	const format = url.searchParams.get('format') || 'excel';
	const periode = url.searchParams.get('periode') || new Date().toISOString().slice(0, 7);
	const blokFilter = url.searchParams.get('blok') || 'semua';
	const statusFilter = url.searchParams.get('status') || 'semua';

	const filter = { periode, blokFilter, statusFilter };
	const data = await getData(filter);

	if (format === 'pdf') {
		const buffer = await generatePDF(data, filter);
		return new Response(buffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="rekap-tagihan-${periode}.pdf"`
			}
		});
	}

	const buffer = await generateExcel(data, filter);
	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="rekap-tagihan-${periode}.xlsx"`
		}
	});
}