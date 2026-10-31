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

async function generateExcel(data, filter) {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Arus Kas');

	worksheet.mergeCells('A1:H1');
	worksheet.getCell('A1').value = 'LAPORAN ARUS KAS';
	worksheet.getCell('A1').font = { bold: true, size: 16 };
	worksheet.getCell('A1').alignment = { horizontal: 'center' };

	worksheet.mergeCells('A2:H2');
	worksheet.getCell('A2').value = `Periode: ${filter.periode}`;
	worksheet.getCell('A2').alignment = { horizontal: 'center' };

	let filterInfo = [];
	if (filter.kasFilter !== 'semua') {
		const kas = data.kasAccounts?.find(k => k.id === parseInt(filter.kasFilter));
		filterInfo.push(`Rekening: ${kas?.nama || '-'}`);
	}
	if (filter.kategoriFilter !== 'semua') {
		const kat = data.kategoriKas?.find(k => k.id === parseInt(filter.kategoriFilter));
		filterInfo.push(`Kategori: ${kat?.nama || '-'}`);
	}
	if (filter.tipeFilter !== 'semua') {
		filterInfo.push(`Tipe: ${filter.tipeFilter.toUpperCase()}`);
	}
	if (filterInfo.length > 0) {
		worksheet.mergeCells('A3:H3');
		worksheet.getCell('A3').value = filterInfo.join(' | ');
		worksheet.getCell('A3').alignment = { horizontal: 'center' };
		worksheet.getCell('A3').font = { italic: true };
	}

	const headers = ['No', 'Tanggal', 'Tipe', 'Nominal', 'Keterangan', 'No. Bukti', 'Rekening Kas', 'Kategori'];
	const headerRow = worksheet.getRow(5);
	headers.forEach((h, i) => {
		const cell = headerRow.getCell(i + 1);
		cell.value = h;
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
		cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
		cell.alignment = { horizontal: 'center' };
		cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
	});

	data.arusKas.forEach((item, idx) => {
		const row = worksheet.getRow(6 + idx);
		row.getCell(1).value = idx + 1;
		row.getCell(2).value = formatDateIndo(item.tanggal);
		row.getCell(3).value = item.tipe === 'debit' ? 'DEBIT (Masuk)' : 'KREDIT (Keluar)';
		row.getCell(4).value = item.nominal;
		row.getCell(4).numFmt = '#,##0';
		row.getCell(5).value = item.keterangan || '-';
		row.getCell(6).value = item.nomor_bukti || '-';
		row.getCell(7).value = `${item.kas_kode} - ${item.kas_nama}`;
		row.getCell(8).value = `${item.kategori_kode} - ${item.kategori_nama}`;

		row.eachCell(cell => {
			cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
			cell.alignment = { vertical: 'middle' };
		});
		row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
		row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
	});

	const summaryRowNum = 6 + data.arusKas.length;
	const summaryRow = worksheet.getRow(summaryRowNum);
	summaryRow.getCell(1).value = '';
	summaryRow.getCell(2).value = '';
	summaryRow.getCell(3).value = 'TOTAL DEBIT';
	summaryRow.getCell(3).font = { bold: true };
	summaryRow.getCell(3).alignment = { horizontal: 'center' };
	summaryRow.getCell(4).value = data.summary.total_debit;
	summaryRow.getCell(4).numFmt = '#,##0';
	summaryRow.getCell(4).font = { bold: true, color: { argb: 'FF006100' } };
	summaryRow.getCell(4).alignment = { horizontal: 'right' };
	summaryRow.getCell(5).value = '';
	summaryRow.getCell(6).value = '';
	summaryRow.getCell(7).value = '';
	summaryRow.getCell(8).value = '';
	summaryRow.eachCell(cell => {
		cell.border = { top: { style: 'double' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
	});

	const kreditRow = worksheet.getRow(summaryRowNum + 1);
	kreditRow.getCell(3).value = 'TOTAL KREDIT';
	kreditRow.getCell(3).font = { bold: true };
	kreditRow.getCell(3).alignment = { horizontal: 'center' };
	kreditRow.getCell(4).value = data.summary.total_kredit;
	kreditRow.getCell(4).numFmt = '#,##0';
	kreditRow.getCell(4).font = { bold: true, color: { argb: 'FFC00000' } };
	kreditRow.getCell(4).alignment = { horizontal: 'right' };
	kreditRow.eachCell(cell => {
		cell.border = { top: { style: 'thin' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } };
	});

	const saldoRow = worksheet.getRow(summaryRowNum + 2);
	saldoRow.getCell(3).value = 'SALDO (Debit - Kredit)';
	saldoRow.getCell(3).font = { bold: true };
	saldoRow.getCell(3).alignment = { horizontal: 'center' };
	saldoRow.getCell(4).value = data.summary.total_debit - data.summary.total_kredit;
	saldoRow.getCell(4).numFmt = '#,##0';
	saldoRow.getCell(4).font = { bold: true, color: { argb: 'FF1F4E79' } };
	saldoRow.getCell(4).alignment = { horizontal: 'right' };
	saldoRow.eachCell(cell => {
		cell.border = { top: { style: 'thin' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
	});

	worksheet.getColumn(1).width = 5;
	worksheet.getColumn(2).width = 14;
	worksheet.getColumn(3).width = 18;
	worksheet.getColumn(4).width = 18;
	worksheet.getColumn(5).width = 35;
	worksheet.getColumn(6).width = 20;
	worksheet.getColumn(7).width = 25;
	worksheet.getColumn(8).width = 30;

	return workbook.xlsx.writeBuffer();
}

async function generatePDF(data, filter) {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ layout: 'landscape', margin: 30, size: 'A4' });
		const chunks = [];
		doc.on('data', chunk => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		doc.fontSize(18).font('Helvetica-Bold').text('LAPORAN ARUS KAS', { align: 'center' });
		doc.moveDown(0.5);
		doc.fontSize(11).font('Helvetica').text(`Periode: ${filter.periode}`, { align: 'center' });

		let filterInfo = [];
		if (filter.kasFilter !== 'semua') {
			const kas = data.kasAccounts?.find(k => k.id === parseInt(filter.kasFilter));
			filterInfo.push(`Rekening: ${kas?.nama || '-'}`);
		}
		if (filter.kategoriFilter !== 'semua') {
			const kat = data.kategoriKas?.find(k => k.id === parseInt(filter.kategoriFilter));
			filterInfo.push(`Kategori: ${kat?.nama || '-'}`);
		}
		if (filter.tipeFilter !== 'semua') {
			filterInfo.push(`Tipe: ${filter.tipeFilter.toUpperCase()}`);
		}
		if (filterInfo.length > 0) {
			doc.fontSize(9).font('Helvetica-Oblique').text(filterInfo.join(' | '), { align: 'center' });
		}
		doc.moveDown();

		// Full-width table using percentage-based column widths
		const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
		const colPct = [0.04, 0.08, 0.08, 0.10, 0.25, 0.10, 0.15, 0.20]; // total = 1.0
		const colWidths = colPct.map(p => pageWidth * p);
		const headers = ['No', 'Tanggal', 'Tipe', 'Nominal', 'Keterangan', 'No. Bukti', 'Rekening Kas', 'Kategori'];
		const aligns = ['center', 'center', 'center', 'right', 'left', 'center', 'left', 'left'];
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

		data.arusKas.forEach((item, idx) => {
			const rowData = [
				String(idx + 1),
				formatDateIndo(item.tanggal),
				item.tipe === 'debit' ? 'DEBIT' : 'KREDIT',
				formatRupiah(item.nominal),
				item.keterangan || '-',
				item.nomor_bukti || '-',
				`${item.kas_kode} - ${item.kas_nama}`,
				`${item.kategori_kode} - ${item.kategori_nama}`
			];
			y = drawRow(y, rowData);
		});

		const summaryRows = [
			{ data: ['', '', 'TOTAL DEBIT', formatRupiah(data.summary.total_debit), '', '', '', ''], color: '#006100' },
			{ data: ['', '', 'TOTAL KREDIT', formatRupiah(data.summary.total_kredit), '', '', '', ''], color: '#C00000' },
			{ data: ['', '', 'SALDO', formatRupiah(data.summary.total_debit - data.summary.total_kredit), '', '', '', ''], color: '#1F4E79' }
		];

		summaryRows.forEach(row => {
			y = drawRow(y, row.data, true, row.color);
		});

		doc.end();
	});
}

async function getData(filter) {
	const { periode, kasFilter, kategoriFilter, tipeFilter } = filter;

	let whereClause = 'WHERE DATE_FORMAT(tk.tanggal, "%Y-%m") = ?';
	const params = [periode];
	if (kasFilter !== 'semua') { whereClause += ' AND tk.kas_account_id = ?'; params.push(parseInt(kasFilter)); }
	if (kategoriFilter !== 'semua') { whereClause += ' AND tk.kategori_id = ?'; params.push(parseInt(kategoriFilter)); }
	if (tipeFilter !== 'semua') { whereClause += ' AND tk.tipe = ?'; params.push(tipeFilter); }
	whereClause += " AND tk.status = 'posted'";

	const sql = `SELECT tk.id, tk.tanggal, tk.tipe, tk.nominal, tk.keterangan, tk.nomor_bukti, ka.kode as kas_kode, ka.nama as kas_nama, kk.kode as kategori_kode, kk.nama as kategori_nama FROM transaksi_kas tk LEFT JOIN kas_account ka ON tk.kas_account_id = ka.id LEFT JOIN kategori_kas kk ON tk.kategori_id = kk.id ${whereClause} ORDER BY tk.tanggal ASC, tk.id ASC`;
	const rows = await executeQuery(sql, params);

	const summarySql = `SELECT SUM(CASE WHEN tk.tipe = 'debit' THEN tk.nominal ELSE 0 END) as total_debit, SUM(CASE WHEN tk.tipe = 'kredit' THEN tk.nominal ELSE 0 END) as total_kredit FROM transaksi_kas tk ${whereClause}`;
	const summaryRows = await executeQuery(summarySql, params);
	const summary = summaryRows[0] || { total_debit: 0, total_kredit: 0 };

	const kasAccounts = await executeQuery('SELECT id, kode, nama FROM kas_account WHERE is_active = 1 ORDER BY kode');
	const kategoriKas = await executeQuery('SELECT id, kode, nama, tipe FROM kategori_kas WHERE is_active = 1 ORDER BY tipe, urutan, nama');

	return { arusKas: rows, summary, kasAccounts, kategoriKas };
}

export async function GET({ url, cookies }) {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login?redirect=/laporan/keuangan/arus-kas');
	}

	const format = url.searchParams.get('format') || 'excel';
	const periode = url.searchParams.get('periode') || new Date().toISOString().slice(0, 7);
	const kasFilter = url.searchParams.get('kas') || 'semua';
	const kategoriFilter = url.searchParams.get('kategori') || 'semua';
	const tipeFilter = url.searchParams.get('tipe') || 'semua';

	const filter = { periode, kasFilter, kategoriFilter, tipeFilter };
	const data = await getData(filter);

	if (format === 'pdf') {
		const buffer = await generatePDF(data, filter);
		return new Response(buffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="arus-kas-${periode}.pdf"`
			}
		});
	}

	const buffer = await generateExcel(data, filter);
	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="arus-kas-${periode}.xlsx"`
		}
	});
}