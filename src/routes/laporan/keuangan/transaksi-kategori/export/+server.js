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

function getTipeLabel(tipe) {
	return tipe === 'pemasukan' ? 'Pemasukan' : tipe === 'pengeluaran' ? 'Pengeluaran' : 'Lainnya';
}

async function generateExcel(data, filter) {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Transaksi per Kategori');

	worksheet.mergeCells('A1:H1');
	worksheet.getCell('A1').value = 'LAPORAN TRANSAKSI PER KATEGORI';
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

	const headers = ['No', 'Kode', 'Kategori', 'Tipe', 'Jumlah Transaksi', 'Pemasukan', 'Pengeluaran', 'Net'];
	const headerRow = worksheet.getRow(5);
	headers.forEach((h, i) => {
		const cell = headerRow.getCell(i + 1);
		cell.value = h;
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
		cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
		cell.alignment = { horizontal: 'center' };
		cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
	});

	data.transaksiKategori.forEach((item, idx) => {
		const row = worksheet.getRow(6 + idx);
		row.getCell(1).value = idx + 1;
		row.getCell(2).value = item.kategori_kode || '-';
		row.getCell(3).value = item.kategori_nama || '-';
		row.getCell(4).value = getTipeLabel(item.kategori_tipe || 'lainnya');
		row.getCell(5).value = item.jumlah_transaksi;
		row.getCell(6).value = item.total_debit;
		row.getCell(6).numFmt = '#,##0';
		row.getCell(7).value = item.total_kredit;
		row.getCell(7).numFmt = '#,##0';
		row.getCell(8).value = item.total_debit - item.total_kredit;
		row.getCell(8).numFmt = '#,##0';

		row.eachCell(cell => {
			cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
			cell.alignment = { vertical: 'middle' };
		});
		row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
		row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
		row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
	});

	const totalRowNum = 6 + data.transaksiKategori.length;
	const totalRow = worksheet.getRow(totalRowNum);
	totalRow.getCell(1).value = '';
	totalRow.getCell(2).value = '';
	totalRow.getCell(3).value = '';
	totalRow.getCell(4).value = 'GRAND TOTAL';
	totalRow.getCell(4).font = { bold: true };
	totalRow.getCell(4).alignment = { horizontal: 'right' };
	totalRow.getCell(5).value = data.grandTotal.jumlah_transaksi;
	totalRow.getCell(5).font = { bold: true };
	totalRow.getCell(5).alignment = { horizontal: 'center' };
	totalRow.getCell(6).value = data.grandTotal.total_debit;
	totalRow.getCell(6).numFmt = '#,##0';
	totalRow.getCell(6).font = { bold: true, color: { argb: 'FF006100' } };
	totalRow.getCell(6).alignment = { horizontal: 'right' };
	totalRow.getCell(7).value = data.grandTotal.total_kredit;
	totalRow.getCell(7).numFmt = '#,##0';
	totalRow.getCell(7).font = { bold: true, color: { argb: 'FFC00000' } };
	totalRow.getCell(7).alignment = { horizontal: 'right' };
	totalRow.getCell(8).value = data.grandTotal.total_debit - data.grandTotal.total_kredit;
	totalRow.getCell(8).numFmt = '#,##0';
	totalRow.getCell(8).font = { bold: true, color: { argb: 'FF1F4E79' } };
	totalRow.getCell(8).alignment = { horizontal: 'right' };
	totalRow.eachCell(cell => {
		cell.border = { top: { style: 'double' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
	});

	worksheet.getColumn(1).width = 5;
	worksheet.getColumn(2).width = 12;
	worksheet.getColumn(3).width = 30;
	worksheet.getColumn(4).width = 14;
	worksheet.getColumn(5).width = 18;
	worksheet.getColumn(6).width = 18;
	worksheet.getColumn(7).width = 18;
	worksheet.getColumn(8).width = 18;

	return workbook.xlsx.writeBuffer();
}

async function generatePDF(data, filter) {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ layout: 'landscape', margin: 30, size: 'A4' });
		const chunks = [];
		doc.on('data', chunk => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		doc.fontSize(18).font('Helvetica-Bold').text('LAPORAN TRANSAKSI PER KATEGORI', { align: 'center' });
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
		const colPct = [0.04, 0.08, 0.22, 0.08, 0.08, 0.15, 0.15, 0.20]; // total = 1.0
		const colWidths = colPct.map(p => pageWidth * p);
		const headers = ['No', 'Kode', 'Kategori', 'Tipe', 'Jumlah Trx', 'Pemasukan', 'Pengeluaran', 'Net'];
		const aligns = ['center', 'center', 'left', 'center', 'center', 'right', 'right', 'right'];
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

		data.transaksiKategori.forEach((item, idx) => {
			const net = item.total_debit - item.total_kredit;
			const rowData = [
				String(idx + 1),
				item.kategori_kode || '-',
				item.kategori_nama || '-',
				getTipeLabel(item.kategori_tipe || 'lainnya'),
				String(item.jumlah_transaksi),
				formatRupiah(item.total_debit),
				formatRupiah(item.total_kredit),
				formatRupiah(net)
			];
			y = drawRow(y, rowData);
		});

		const netTotal = data.grandTotal.total_debit - data.grandTotal.total_kredit;
		const totalRowData = ['', '', '', 'GRAND TOTAL', String(data.grandTotal.jumlah_transaksi), formatRupiah(data.grandTotal.total_debit), formatRupiah(data.grandTotal.total_kredit), formatRupiah(netTotal)];
		y = drawRow(y, totalRowData, true, '#1F4E79');

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

	const sql = `SELECT kk.id as kategori_id, kk.kode as kategori_kode, kk.nama as kategori_nama, kk.tipe as kategori_tipe, SUM(CASE WHEN tk.tipe = 'debit' THEN tk.nominal ELSE 0 END) as total_debit, SUM(CASE WHEN tk.tipe = 'kredit' THEN tk.nominal ELSE 0 END) as total_kredit, COUNT(*) as jumlah_transaksi FROM transaksi_kas tk LEFT JOIN kategori_kas kk ON tk.kategori_id = kk.id ${whereClause} GROUP BY kk.id, kk.kode, kk.nama, kk.tipe ORDER BY kk.tipe, kk.urutan, kk.nama`;
	const rows = await executeQuery(sql, params);

	const summarySql = `SELECT kk.tipe, SUM(CASE WHEN tk.tipe = 'debit' THEN tk.nominal ELSE 0 END) as total_debit, SUM(CASE WHEN tk.tipe = 'kredit' THEN tk.nominal ELSE 0 END) as total_kredit FROM transaksi_kas tk LEFT JOIN kategori_kas kk ON tk.kategori_id = kk.id ${whereClause} GROUP BY kk.tipe`;
	const summaryRows = await executeQuery(summarySql, params);
	const summaryByTipe = {};
	for (const row of summaryRows) {
		summaryByTipe[row.tipe || 'lainnya'] = { total_debit: parseFloat(row.total_debit || 0), total_kredit: parseFloat(row.total_kredit || 0) };
	}

	const grandTotal = rows.reduce((acc, r) => ({ total_debit: acc.total_debit + parseFloat(r.total_debit || 0), total_kredit: acc.total_kredit + parseFloat(r.total_kredit || 0), jumlah_transaksi: acc.jumlah_transaksi + parseInt(r.jumlah_transaksi || 0) }), { total_debit: 0, total_kredit: 0, jumlah_transaksi: 0 });

	const kasAccounts = await executeQuery('SELECT id, kode, nama FROM kas_account WHERE is_active = 1 ORDER BY kode');
	const kategoriKas = await executeQuery('SELECT id, kode, nama, tipe FROM kategori_kas WHERE is_active = 1 ORDER BY tipe, urutan, nama');

	return { transaksiKategori: rows, summaryByTipe, grandTotal, kasAccounts, kategoriKas };
}

export async function GET({ url, cookies }) {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login?redirect=/laporan/keuangan/transaksi-kategori');
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
				'Content-Disposition': `attachment; filename="transaksi-kategori-${periode}.pdf"`
			}
		});
	}

	const buffer = await generateExcel(data, filter);
	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="transaksi-kategori-${periode}.xlsx"`
		}
	});
}