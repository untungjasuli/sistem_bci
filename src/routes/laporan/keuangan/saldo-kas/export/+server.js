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
	const worksheet = workbook.addWorksheet('Saldo Kas');

	// Title
	worksheet.mergeCells('A1:G1');
	worksheet.getCell('A1').value = 'LAPORAN SALDO KAS';
	worksheet.getCell('A1').font = { bold: true, size: 16 };
	worksheet.getCell('A1').alignment = { horizontal: 'center' };

	// Periode
	worksheet.mergeCells('A2:G2');
	worksheet.getCell('A2').value = `Periode: ${filter.periode}`;
	worksheet.getCell('A2').alignment = { horizontal: 'center' };

	// Filter info
	let filterInfo = [];
	if (filter.kasFilter !== 'semua') {
		const kas = data.kasAccounts?.find(k => k.id === parseInt(filter.kasFilter));
		filterInfo.push(`Rekening: ${kas?.nama || '-'}`);
	}
	if (filterInfo.length > 0) {
		worksheet.mergeCells('A3:G3');
		worksheet.getCell('A3').value = filterInfo.join(' | ');
		worksheet.getCell('A3').alignment = { horizontal: 'center' };
		worksheet.getCell('A3').font = { italic: true };
	}

	// Headers
	const headers = ['No', 'Kode', 'Rekening Kas', 'Saldo Awal', 'Pemasukan', 'Pengeluaran', 'Saldo Akhir'];
	const headerRow = worksheet.getRow(5);
	headers.forEach((h, i) => {
		const cell = headerRow.getCell(i + 1);
		cell.value = h;
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
		cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
		cell.alignment = { horizontal: 'center' };
		cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
	});

	// Data rows
	data.saldoKas.forEach((item, idx) => {
		const row = worksheet.getRow(6 + idx);
		row.getCell(1).value = idx + 1;
		row.getCell(2).value = item.kode;
		row.getCell(3).value = item.nama;
		row.getCell(4).value = item.saldo_awal;
		row.getCell(4).numFmt = '#,##0';
		row.getCell(5).value = item.total_debit;
		row.getCell(5).numFmt = '#,##0';
		row.getCell(6).value = item.total_kredit;
		row.getCell(6).numFmt = '#,##0';
		row.getCell(7).value = item.saldo_akhir;
		row.getCell(7).numFmt = '#,##0';

		row.eachCell(cell => {
			cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
			cell.alignment = { vertical: 'middle' };
		});
		row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
		row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
		row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
		row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
	});

	// Grand total row
	const totalRowNum = 6 + data.saldoKas.length;
	const totalRow = worksheet.getRow(totalRowNum);
	totalRow.getCell(1).value = '';
	totalRow.getCell(2).value = '';
	totalRow.getCell(3).value = 'GRAND TOTAL';
	totalRow.getCell(3).font = { bold: true };
	totalRow.getCell(3).alignment = { horizontal: 'right' };
	totalRow.getCell(4).value = data.grandTotal.saldo_awal;
	totalRow.getCell(4).numFmt = '#,##0';
	totalRow.getCell(4).font = { bold: true };
	totalRow.getCell(4).alignment = { horizontal: 'right' };
	totalRow.getCell(5).value = data.grandTotal.total_debit;
	totalRow.getCell(5).numFmt = '#,##0';
	totalRow.getCell(5).font = { bold: true, color: { argb: 'FF006100' } };
	totalRow.getCell(5).alignment = { horizontal: 'right' };
	totalRow.getCell(6).value = data.grandTotal.total_kredit;
	totalRow.getCell(6).numFmt = '#,##0';
	totalRow.getCell(6).font = { bold: true, color: { argb: 'FFC00000' } };
	totalRow.getCell(6).alignment = { horizontal: 'right' };
	totalRow.getCell(7).value = data.grandTotal.saldo_akhir;
	totalRow.getCell(7).numFmt = '#,##0';
	totalRow.getCell(7).font = { bold: true, color: { argb: 'FF1F4E79' } };
	totalRow.getCell(7).alignment = { horizontal: 'right' };
	totalRow.eachCell(cell => {
		cell.border = { top: { style: 'double' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
	});

	// Column widths
	worksheet.getColumn(1).width = 5;
	worksheet.getColumn(2).width = 10;
	worksheet.getColumn(3).width = 30;
	worksheet.getColumn(4).width = 18;
	worksheet.getColumn(5).width = 18;
	worksheet.getColumn(6).width = 18;
	worksheet.getColumn(7).width = 18;

	return workbook.xlsx.writeBuffer();
}

async function generatePDF(data, filter) {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ layout: 'landscape', margin: 30, size: 'A4' });
		const chunks = [];
		doc.on('data', chunk => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		doc.fontSize(18).font('Helvetica-Bold').text('LAPORAN SALDO KAS', { align: 'center' });
		doc.moveDown(0.5);
		doc.fontSize(11).font('Helvetica').text(`Periode: ${filter.periode}`, { align: 'center' });

		let filterInfo = [];
		if (filter.kasFilter !== 'semua') {
			const kas = data.kasAccounts?.find(k => k.id === parseInt(filter.kasFilter));
			filterInfo.push(`Rekening: ${kas?.nama || '-'}`);
		}
		if (filterInfo.length > 0) {
			doc.fontSize(9).font('Helvetica-Oblique').text(filterInfo.join(' | '), { align: 'center' });
		}
		doc.moveDown();

		// Full-width table using percentage-based column widths
		const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
		const colPct = [0.04, 0.08, 0.22, 0.15, 0.17, 0.17, 0.17]; // total = 1.0
		const colWidths = colPct.map(p => pageWidth * p);
		const headers = ['No', 'Kode', 'Rekening Kas', 'Saldo Awal', 'Pemasukan', 'Pengeluaran', 'Saldo Akhir'];
		const aligns = ['center', 'center', 'left', 'right', 'right', 'right', 'right'];
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

		data.saldoKas.forEach((item, idx) => {
			const rowData = [
				String(idx + 1),
				item.kode,
				item.nama,
				formatRupiah(item.saldo_awal),
				formatRupiah(item.total_debit),
				formatRupiah(item.total_kredit),
				formatRupiah(item.saldo_akhir)
			];
			y = drawRow(y, rowData);
		});

		// Grand total row
		const totalRowData = ['', '', 'GRAND TOTAL', formatRupiah(data.grandTotal.saldo_awal), formatRupiah(data.grandTotal.total_debit), formatRupiah(data.grandTotal.total_kredit), formatRupiah(data.grandTotal.saldo_akhir)];
		y = drawRow(y, totalRowData, true, '#1F4E79');

		doc.end();
	});
}

async function getData(filter) {
	const { periode, kasFilter } = filter;

	let whereClause = 'WHERE DATE_FORMAT(tk.tanggal, "%Y-%m") = ?';
	const params = [periode];
	if (kasFilter !== 'semua') { whereClause += ' AND tk.kas_account_id = ?'; params.push(parseInt(kasFilter)); }
	whereClause += " AND tk.status = 'posted'";

	const kasAccounts = await executeQuery('SELECT id, kode, nama, saldo_current FROM kas_account WHERE is_active = 1 ORDER BY kode');

	const mutasiSql = `SELECT tk.kas_account_id, SUM(CASE WHEN tk.tipe = 'debit' THEN tk.nominal ELSE 0 END) as total_debit, SUM(CASE WHEN tk.tipe = 'kredit' THEN tk.nominal ELSE 0 END) as total_kredit FROM transaksi_kas tk ${whereClause} GROUP BY tk.kas_account_id`;
	const mutasiRows = await executeQuery(mutasiSql, params);

	const mutasiMap = {};
	for (const row of mutasiRows) {
		mutasiMap[row.kas_account_id] = { total_debit: parseFloat(row.total_debit || 0), total_kredit: parseFloat(row.total_kredit || 0) };
	}

	const saldoPerKas = kasAccounts.map(ka => {
		const mutasi = mutasiMap[ka.id] || { total_debit: 0, total_kredit: 0 };
		const saldoAwal = parseFloat(ka.saldo_current || 0) - mutasi.total_debit + mutasi.total_kredit;
		const saldoAkhir = parseFloat(ka.saldo_current || 0);
		return { ...ka, saldo_awal: saldoAwal, total_debit: mutasi.total_debit, total_kredit: mutasi.total_kredit, saldo_akhir: saldoAkhir };
	});

	const grandTotal = saldoPerKas.reduce((acc, ka) => ({
		saldo_awal: acc.saldo_awal + ka.saldo_awal,
		total_debit: acc.total_debit + ka.total_debit,
		total_kredit: acc.total_kredit + ka.total_kredit,
		saldo_akhir: acc.saldo_akhir + ka.saldo_akhir
	}), { saldo_awal: 0, total_debit: 0, total_kredit: 0, saldo_akhir: 0 });

	return { saldoKas: saldoPerKas, grandTotal, kasAccounts };
}

export async function GET({ url, cookies }) {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login?redirect=/laporan/keuangan/saldo-kas');
	}

	const format = url.searchParams.get('format') || 'excel';
	const periode = url.searchParams.get('periode') || new Date().toISOString().slice(0, 7);
	const kasFilter = url.searchParams.get('kas') || 'semua';

	const filter = { periode, kasFilter };
	const data = await getData(filter);

	if (format === 'pdf') {
		const buffer = await generatePDF(data, filter);
		return new Response(buffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="saldo-kas-${periode}.pdf"`
			}
		});
	}

	const buffer = await generateExcel(data, filter);
	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="saldo-kas-${periode}.xlsx"`
		}
	});
}