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
	return status === 'posted' ? 'Posted' : status === 'pending' ? 'Pending' : 'Rejected';
}

async function generateExcel(data, filter) {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Transfer Antar Kas');

	worksheet.mergeCells('A1:J1');
	worksheet.getCell('A1').value = 'LAPORAN TRANSFER ANTAR KAS';
	worksheet.getCell('A1').font = { bold: true, size: 16 };
	worksheet.getCell('A1').alignment = { horizontal: 'center' };

	worksheet.mergeCells('A2:J2');
	worksheet.getCell('A2').value = `Periode: ${filter.periode}`;
	worksheet.getCell('A2').alignment = { horizontal: 'center' };

	let filterInfo = [];
	if (filter.kasFilter !== 'semua') {
		const kas = data.kasAccounts?.find(k => k.id === parseInt(filter.kasFilter));
		filterInfo.push(`Rekening: ${kas?.nama || '-'}`);
	}
	if (filter.statusFilter !== 'semua') {
		filterInfo.push(`Status: ${filter.statusFilter.charAt(0).toUpperCase() + filter.statusFilter.slice(1)}`);
	}
	if (filterInfo.length > 0) {
		worksheet.mergeCells('A3:J3');
		worksheet.getCell('A3').value = filterInfo.join(' | ');
		worksheet.getCell('A3').alignment = { horizontal: 'center' };
		worksheet.getCell('A3').font = { italic: true };
	}

	const headers = ['No', 'Tanggal', 'No. Bukti', 'Status', 'Dari Kas', 'Ke Kas', 'Nominal', 'Keterangan', 'Dibuat Oleh', 'Diapprove Oleh'];
	const headerRow = worksheet.getRow(5);
	headers.forEach((h, i) => {
		const cell = headerRow.getCell(i + 1);
		cell.value = h;
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
		cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
		cell.alignment = { horizontal: 'center' };
		cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
	});

	data.transfers.forEach((item, idx) => {
		const row = worksheet.getRow(6 + idx);
		row.getCell(1).value = idx + 1;
		row.getCell(2).value = formatDateIndo(item.tanggal);
		row.getCell(3).value = item.nomor_bukti || '-';
		row.getCell(4).value = getStatusLabel(item.status);
		row.getCell(5).value = `${item.dari_kode} - ${item.dari_nama}`;
		row.getCell(6).value = `${item.ke_kode} - ${item.ke_nama}`;
		row.getCell(7).value = item.nominal;
		row.getCell(7).numFmt = '#,##0';
		row.getCell(8).value = item.keterangan || '-';
		row.getCell(9).value = item.created_by_nama || '-';
		row.getCell(10).value = item.approved_by_nama || '-';

		row.eachCell(cell => {
			cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
			cell.alignment = { vertical: 'middle' };
		});
		row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
	});

	const totalRowNum = 6 + data.transfers.length;
	const totalRow = worksheet.getRow(totalRowNum);
	totalRow.getCell(1).value = '';
	totalRow.getCell(2).value = '';
	totalRow.getCell(3).value = '';
	totalRow.getCell(4).value = '';
	totalRow.getCell(5).value = '';
	totalRow.getCell(6).value = 'TOTAL (Posted)';
	totalRow.getCell(6).font = { bold: true };
	totalRow.getCell(6).alignment = { horizontal: 'right' };
	totalRow.getCell(7).value = data.summary.total_nominal;
	totalRow.getCell(7).numFmt = '#,##0';
	totalRow.getCell(7).font = { bold: true, color: { argb: 'FF1F4E79' } };
	totalRow.getCell(7).alignment = { horizontal: 'right' };
	totalRow.getCell(8).value = '';
	totalRow.getCell(9).value = '';
	totalRow.getCell(10).value = '';
	totalRow.eachCell(cell => {
		cell.border = { top: { style: 'double' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
	});

	worksheet.getColumn(1).width = 5;
	worksheet.getColumn(2).width = 14;
	worksheet.getColumn(3).width = 20;
	worksheet.getColumn(4).width = 12;
	worksheet.getColumn(5).width = 25;
	worksheet.getColumn(6).width = 25;
	worksheet.getColumn(7).width = 18;
	worksheet.getColumn(8).width = 30;
	worksheet.getColumn(9).width = 18;
	worksheet.getColumn(10).width = 18;

	return workbook.xlsx.writeBuffer();
}

async function generatePDF(data, filter) {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ layout: 'landscape', margin: 30, size: 'A4' });
		const chunks = [];
		doc.on('data', chunk => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		doc.fontSize(18).font('Helvetica-Bold').text('LAPORAN TRANSFER ANTAR KAS', { align: 'center' });
		doc.moveDown(0.5);
		doc.fontSize(11).font('Helvetica').text(`Periode: ${filter.periode}`, { align: 'center' });

		let filterInfo = [];
		if (filter.kasFilter !== 'semua') {
			const kas = data.kasAccounts?.find(k => k.id === parseInt(filter.kasFilter));
			filterInfo.push(`Rekening: ${kas?.nama || '-'}`);
		}
		if (filter.statusFilter !== 'semua') {
			filterInfo.push(`Status: ${filter.statusFilter.charAt(0).toUpperCase() + filter.statusFilter.slice(1)}`);
		}
		if (filterInfo.length > 0) {
			doc.fontSize(9).font('Helvetica-Oblique').text(filterInfo.join(' | '), { align: 'center' });
		}
		doc.moveDown();

		// Full-width table using percentage-based column widths
		const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
		const colPct = [0.03, 0.08, 0.10, 0.07, 0.18, 0.18, 0.10, 0.12, 0.07, 0.07]; // total = 1.0
		const colWidths = colPct.map(p => pageWidth * p);
		const headers = ['No', 'Tanggal', 'No. Bukti', 'Status', 'Dari Kas', 'Ke Kas', 'Nominal', 'Keterangan', 'Dibuat Oleh', 'Diapprove Oleh'];
		const aligns = ['center', 'center', 'center', 'center', 'left', 'left', 'right', 'left', 'left', 'left'];
		const marginLeft = doc.page.margins.left;

		function drawHeader(y) {
			doc.font('Helvetica-Bold').fontSize(7);
			let x = marginLeft;
			headers.forEach((h, i) => {
				doc.rect(x, y, colWidths[i], 18).fill('#4472C4');
				doc.fillColor('white').text(h, x + 2, y + 4, { width: colWidths[i] - 4, align: aligns[i], ellipsis: true });
				x += colWidths[i];
			});
			doc.fillColor('black');
			return y + 18;
		}

		function drawRow(y, rowData, isSummary = false, fontColor = 'black') {
			if (y > doc.page.height - 50) {
				doc.addPage();
				y = doc.page.margins.top;
				y = drawHeader(y);
			}
			doc.font(isSummary ? 'Helvetica-Bold' : 'Helvetica').fontSize(isSummary ? 7 : 6.5);
			if (isSummary) doc.fillColor(fontColor);
			let x = marginLeft;
			rowData.forEach((val, i) => {
				doc.rect(x, y, colWidths[i], 16).stroke('#CCCCCC');
				doc.text(val, x + 2, y + 3, { width: colWidths[i] - 4, align: aligns[i], ellipsis: true });
				x += colWidths[i];
			});
			doc.fillColor('black');
			return y + 16;
		}

		let y = drawHeader(doc.y);

		data.transfers.forEach((item, idx) => {
			const rowData = [
				String(idx + 1),
				formatDateIndo(item.tanggal),
				item.nomor_bukti || '-',
				getStatusLabel(item.status),
				`${item.dari_kode} - ${item.dari_nama}`,
				`${item.ke_kode} - ${item.ke_nama}`,
				formatRupiah(item.nominal),
				item.keterangan || '-',
				item.created_by_nama || '-',
				item.approved_by_nama || '-'
			];
			y = drawRow(y, rowData);
		});

		const totalRowData = ['', '', '', '', '', 'TOTAL (Posted)', formatRupiah(data.summary.total_nominal), '', '', ''];
		y = drawRow(y, totalRowData, true, '#1F4E79');

		doc.end();
	});
}

async function getData(filter) {
	const { periode, kasFilter, statusFilter } = filter;

	let whereClause = 'WHERE DATE_FORMAT(tak.tanggal, "%Y-%m") = ?';
	const params = [periode];
	if (kasFilter !== 'semua') { whereClause += ' AND (tak.dari_kas_id = ? OR tak.ke_kas_id = ?)'; params.push(parseInt(kasFilter), parseInt(kasFilter)); }
	if (statusFilter !== 'semua') { whereClause += ' AND tak.status = ?'; params.push(statusFilter); }

	const sql = `SELECT tak.*, ka.kode as dari_kode, ka.nama as dari_nama, kka.kode as ke_kode, kka.nama as ke_nama, u.name as created_by_nama, ap.name as approved_by_nama FROM transfer_antar_kas tak JOIN kas_account ka ON tak.dari_kas_id = ka.id JOIN kas_account kka ON tak.ke_kas_id = kka.id LEFT JOIN users u ON tak.created_by = u.id LEFT JOIN users ap ON tak.approved_by = ap.id ${whereClause} ORDER BY tak.tanggal ASC, tak.id ASC`;
	const rows = await executeQuery(sql, params);

	const summarySql = `SELECT SUM(tak.nominal) as total_nominal, COUNT(*) as jumlah_transfer FROM transfer_antar_kas tak ${whereClause} AND tak.status = 'posted'`;
	const summaryRows = await executeQuery(summarySql, params);
	const summary = summaryRows[0] || { total_nominal: 0, jumlah_transfer: 0 };

	const kasAccounts = await executeQuery('SELECT id, kode, nama FROM kas_account WHERE is_active = 1 ORDER BY kode');

	return { transfers: rows, summary: { total_nominal: parseFloat(summary.total_nominal || 0), jumlah_transfer: parseInt(summary.jumlah_transfer || 0) }, kasAccounts };
}

export async function GET({ url, cookies }) {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login?redirect=/laporan/keuangan/transfer-kas');
	}

	const format = url.searchParams.get('format') || 'excel';
	const periode = url.searchParams.get('periode') || new Date().toISOString().slice(0, 7);
	const kasFilter = url.searchParams.get('kas') || 'semua';
	const statusFilter = url.searchParams.get('status') || 'semua';

	const filter = { periode, kasFilter, statusFilter };
	const data = await getData(filter);

	if (format === 'pdf') {
		const buffer = await generatePDF(data, filter);
		return new Response(buffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="transfer-kas-${periode}.pdf"`
			}
		});
	}

	const buffer = await generateExcel(data, filter);
	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="transfer-kas-${periode}.xlsx"`
		}
	});
}