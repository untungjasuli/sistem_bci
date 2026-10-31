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

function getMetodeIcon(metode) {
	const icons = {
		cash: 'fa-money-bill-wave',
		qris: 'fa-qrcode',
		transfer: 'fa-money-bill-transfer'
	};
	return icons[metode?.toLowerCase()] || 'fa-credit-card';
}

function getMetodeLabel(metode) {
	const labels = {
		cash: 'Cash',
		qris: 'QRIS',
		transfer: 'Transfer'
	};
	return labels[metode?.toLowerCase()] || metode;
}

async function generateExcel(data, filter) {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Pembayaran per Metode');

	worksheet.mergeCells('A1:G1');
	worksheet.getCell('A1').value = 'LAPORAN PEMBAYARAN PER METODE';
	worksheet.getCell('A1').font = { bold: true, size: 16 };
	worksheet.getCell('A1').alignment = { horizontal: 'center' };

	worksheet.mergeCells('A2:G2');
	worksheet.getCell('A2').value = `Periode: ${filter.periode}`;
	worksheet.getCell('A2').alignment = { horizontal: 'center' };

	let filterInfo = [];
	if (filter.metodeFilter !== 'semua') {
		filterInfo.push(`Metode: ${getMetodeLabel(filter.metodeFilter)}`);
	}
	if (filterInfo.length > 0) {
		worksheet.mergeCells('A3:G3');
		worksheet.getCell('A3').value = filterInfo.join(' | ');
		worksheet.getCell('A3').alignment = { horizontal: 'center' };
		worksheet.getCell('A3').font = { italic: true };
	}

	const headers = ['No', 'Tgl Bayar', 'Blok', 'Penghuni/Pemilik', 'Periode', 'Metode', 'Nominal'];
	const headerRow = worksheet.getRow(5);
	headers.forEach((h, i) => {
		const cell = headerRow.getCell(i + 1);
		cell.value = h;
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
		cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
		cell.alignment = { horizontal: 'center' };
		cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
	});

	data.pembayaran.forEach((item, idx) => {
		const row = worksheet.getRow(6 + idx);
		row.getCell(1).value = idx + 1;
		row.getCell(2).value = formatDateIndo(item.tanggal_bayar);
		row.getCell(3).value = item.blok;
		row.getCell(4).value = item.penghuni_nama || '-';
		row.getCell(5).value = item.periode;
		row.getCell(6).value = getMetodeLabel(item.metode_bayar);
		row.getCell(7).value = item.nominal;
		row.getCell(7).numFmt = '#,##0';

		row.eachCell(cell => {
			cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
			cell.alignment = { vertical: 'middle' };
		});
		row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
	});

	const totalRowNum = 6 + data.pembayaran.length;
	const totalRow = worksheet.getRow(totalRowNum);
	totalRow.getCell(1).value = '';
	totalRow.getCell(2).value = '';
	totalRow.getCell(3).value = '';
	totalRow.getCell(4).value = '';
	totalRow.getCell(5).value = '';
	totalRow.getCell(6).value = 'TOTAL';
	totalRow.getCell(6).font = { bold: true };
	totalRow.getCell(6).alignment = { horizontal: 'right' };
	totalRow.getCell(7).value = data.grandTotal.total_nominal;
	totalRow.getCell(7).numFmt = '#,##0';
	totalRow.getCell(7).font = { bold: true, color: { argb: 'FF006100' } };
	totalRow.getCell(7).alignment = { horizontal: 'right' };
	totalRow.eachCell(cell => {
		cell.border = { top: { style: 'double' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
	});

	worksheet.getColumn(1).width = 5;
	worksheet.getColumn(2).width = 14;
	worksheet.getColumn(3).width = 12;
	worksheet.getColumn(4).width = 25;
	worksheet.getColumn(5).width = 12;
	worksheet.getColumn(6).width = 16;
	worksheet.getColumn(7).width = 18;

	return workbook.xlsx.writeBuffer();
}

async function generatePDF(data, filter) {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ layout: 'landscape', margin: 20, size: 'A4' });
		const chunks = [];
		doc.on('data', chunk => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		doc.fontSize(16).font('Helvetica-Bold').text('LAPORAN PEMBAYARAN PER METODE', { align: 'center' });
		doc.moveDown(0.3);
		doc.fontSize(10).font('Helvetica').text(`Periode: ${filter.periode}`, { align: 'center' });

		let filterInfo = [];
		if (filter.metodeFilter !== 'semua') {
			filterInfo.push(`Metode: ${getMetodeLabel(filter.metodeFilter)}`);
		}
		if (filterInfo.length > 0) {
			doc.fontSize(8).font('Helvetica-Oblique').text(filterInfo.join(' | '), { align: 'center' });
		}
		doc.moveDown();

		const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
		const colWidths = [
			0.04 * pageWidth,
			0.12 * pageWidth,
			0.10 * pageWidth,
			0.22 * pageWidth,
			0.10 * pageWidth,
			0.16 * pageWidth,
			0.26 * pageWidth
		];
		const headers = ['No', 'Tgl Bayar', 'Blok', 'Penghuni/Pemilik', 'Periode', 'Metode', 'Nominal'];
		const startX = doc.page.margins.left;

		doc.font('Helvetica-Bold').fontSize(7);
		let x = startX;
		const tableTop = doc.y;
		const headerHeight = 20;

		headers.forEach((h, i) => {
			doc.rect(x, tableTop, colWidths[i], headerHeight).fill('#4472C4');
			doc.fillColor('white').text(h, x + 2, tableTop + 5, { width: colWidths[i] - 4, align: i <= 4 ? 'center' : (i === 6 ? 'right' : 'left') });
			x += colWidths[i];
		});
		doc.fillColor('black');

		let y = tableTop + headerHeight;
		const rowHeight = 16;

		data.pembayaran.forEach((item, idx) => {
			if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
				doc.addPage();
				y = doc.page.margins.top;
				doc.font('Helvetica-Bold').fontSize(7);
				x = startX;
				headers.forEach((h, i) => {
					doc.rect(x, y, colWidths[i], headerHeight).fill('#4472C4');
					doc.fillColor('white').text(h, x + 2, y + 5, { width: colWidths[i] - 4, align: i <= 4 ? 'center' : (i === 6 ? 'right' : 'left') });
					x += colWidths[i];
				});
				doc.fillColor('black');
				y += headerHeight;
			}

			const rowData = [
				String(idx + 1),
				formatDateIndo(item.tanggal_bayar),
				item.blok,
				item.penghuni_nama || '-',
				item.periode,
				getMetodeLabel(item.metode_bayar),
				formatRupiah(item.nominal)
			];
			x = startX;
			rowData.forEach((val, i) => {
				doc.rect(x, y, colWidths[i], rowHeight).stroke('#CCCCCC');
				const align = i <= 4 ? 'center' : (i === 6 ? 'right' : 'left');
				doc.font('Helvetica').fontSize(6.5).text(val, x + 2, y + 3, { width: colWidths[i] - 4, align, ellipsis: true });
				x += colWidths[i];
			});
			y += rowHeight;
		});

		if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
			doc.addPage();
			y = doc.page.margins.top;
		}
		const totalRowData = ['', '', '', '', '', 'TOTAL', formatRupiah(data.grandTotal.total_nominal)];
		x = startX;
		totalRowData.forEach((val, i) => {
			doc.rect(x, y, colWidths[i], rowHeight + 2).fill('#D6E4F0').stroke('#999999');
			if (i === 5) {
				doc.font('Helvetica-Bold').fontSize(7).fillColor('#1F4E79').text(val, x + 2, y + 4, { width: colWidths[i] - 4, align: 'right' });
			} else if (i === 6) {
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
	const { periode, metodeFilter } = filter;

	let whereClause = 'WHERE t.periode = ? AND t.status = "lunas"';
	const params = [periode];

	if (metodeFilter !== 'semua') {
		whereClause += ' AND pi.metode_bayar = ?';
		params.push(metodeFilter);
	}

	const sql = `SELECT t.id, t.periode, t.nominal, pi.tanggal_bayar, pi.metode_bayar, br.no_blok AS blok, COALESCE(ak.nama, pr.nama) as penghuni_nama FROM tagihan_iuran t JOIN blok_rumah br ON t.blok_rumah_id = br.id LEFT JOIN keluarga k ON br.id = k.blok_rumah_id LEFT JOIN anggota_keluarga ak ON k.id = ak.keluarga_id AND ak.hub_keluarga = 'Kepala Keluarga' LEFT JOIN pemilik_rumah pr ON br.id = pr.blok_rumah_id JOIN pembayaran_iuran pi ON t.id = pi.tagihan_id ${whereClause} ORDER BY pi.metode_bayar, pi.tanggal_bayar, t.id`;
	const rows = await executeQuery(sql, params);

	const summarySql = `SELECT pi.metode_bayar, COUNT(*) as jumlah, SUM(t.nominal) as total_nominal FROM tagihan_iuran t JOIN pembayaran_iuran pi ON t.id = pi.tagihan_id ${whereClause} GROUP BY pi.metode_bayar ORDER BY pi.metode_bayar`;
	const summaryRows = await executeQuery(summarySql, params);
	const summaryByMetode = summaryRows.map(r => ({
		metode_bayar: r.metode_bayar,
		jumlah: parseInt(r.jumlah),
		total_nominal: parseFloat(r.total_nominal || 0)
	}));

	const grandTotal = rows.reduce((acc, r) => ({ jumlah: acc.jumlah + 1, total_nominal: acc.total_nominal + parseFloat(r.nominal || 0) }), { jumlah: 0, total_nominal: 0 });

	return { pembayaran: rows, summaryByMetode, grandTotal };
}

export async function GET({ url, cookies }) {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login?redirect=/laporan/tagihan/pembayaran-metode');
	}

	const format = url.searchParams.get('format') || 'excel';
	const periode = url.searchParams.get('periode') || new Date().toISOString().slice(0, 7);
	const metodeFilter = url.searchParams.get('metode') || 'semua';

	const filter = { periode, metodeFilter };
	const data = await getData(filter);

	if (format === 'pdf') {
		const buffer = await generatePDF(data, filter);
		return new Response(buffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="pembayaran-metode-${periode}.pdf"`
			}
		});
	}

	const buffer = await generateExcel(data, filter);
	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="pembayaran-metode-${periode}.xlsx"`
		}
	});
}