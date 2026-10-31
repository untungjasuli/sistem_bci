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
	const worksheet = workbook.addWorksheet('Tunggakan Tagihan');

	worksheet.mergeCells('A1:G1');
	worksheet.getCell('A1').value = 'LAPORAN TUNGGAKAN TAGIHAN';
	worksheet.getCell('A1').font = { bold: true, size: 16 };
	worksheet.getCell('A1').alignment = { horizontal: 'center' };

	worksheet.mergeCells('A2:G2');
	worksheet.getCell('A2').value = `Sampai Periode: ${filter.periode || 'Semua'}`;
	worksheet.getCell('A2').alignment = { horizontal: 'center' };

	let filterInfo = [];
	if (filter.blokFilter !== 'semua') {
		const blok = data.blokRumah?.find(b => b.id === parseInt(filter.blokFilter));
		filterInfo.push(`Blok: ${blok?.label || '-'}`);
	}
	if (filterInfo.length > 0) {
		worksheet.mergeCells('A3:G3');
		worksheet.getCell('A3').value = filterInfo.join(' | ');
		worksheet.getCell('A3').alignment = { horizontal: 'center' };
		worksheet.getCell('A3').font = { italic: true };
	}

	const headers = ['No', 'Blok', 'Penghuni/Pemilik', 'No HP', 'Bulan Tunggak', 'Total Tunggakan', 'Detail'];
	const headerRow = worksheet.getRow(5);
	headers.forEach((h, i) => {
		const cell = headerRow.getCell(i + 1);
		cell.value = h;
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
		cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
		cell.alignment = { horizontal: 'center' };
		cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
	});

	let rowIdx = 6;
	data.tunggakan.forEach((item, idx) => {
		const row = worksheet.getRow(rowIdx++);
		row.getCell(1).value = idx + 1;
		row.getCell(2).value = item.blok;
		row.getCell(3).value = item.penghuni_nama || '-';
		row.getCell(4).value = item.penghuni_hp || '-';
		row.getCell(5).value = item.bulan_tunggak;
		row.getCell(6).value = item.total_tunggakan;
		row.getCell(6).numFmt = '#,##0';
		row.getCell(7).value = `${item.detail.length} detail`;

		row.eachCell(cell => {
			cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
			cell.alignment = { vertical: 'middle' };
		});
		row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
		row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

		item.detail.forEach((d, di) => {
			const dRow = worksheet.getRow(rowIdx++);
			dRow.getCell(1).value = '';
			dRow.getCell(2).value = '';
			dRow.getCell(3).value = `  → ${d.periode}`;
			dRow.getCell(4).value = '';
			dRow.getCell(5).value = '';
			dRow.getCell(6).value = d.nominal;
			dRow.getCell(6).numFmt = '#,##0';
			dRow.getCell(7).value = 'Belum Bayar';

			dRow.eachCell(cell => {
				cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
				cell.alignment = { vertical: 'middle' };
			});
			dRow.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
		});
	});

	const totalRow = worksheet.getRow(rowIdx);
	totalRow.getCell(1).value = '';
	totalRow.getCell(2).value = '';
	totalRow.getCell(3).value = '';
	totalRow.getCell(4).value = 'GRAND TOTAL';
	totalRow.getCell(4).font = { bold: true };
	totalRow.getCell(4).alignment = { horizontal: 'right' };
	totalRow.getCell(5).value = data.grandTotal.total_bulan;
	totalRow.getCell(5).font = { bold: true, color: { argb: 'FFED7D31' } };
	totalRow.getCell(5).alignment = { horizontal: 'center' };
	totalRow.getCell(6).value = data.grandTotal.total_nominal;
	totalRow.getCell(6).numFmt = '#,##0';
	totalRow.getCell(6).font = { bold: true, color: { argb: 'FFC00000' } };
	totalRow.getCell(6).alignment = { horizontal: 'right' };
	totalRow.getCell(7).value = '';
	totalRow.eachCell(cell => {
		cell.border = { top: { style: 'double' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
	});

	worksheet.getColumn(1).width = 5;
	worksheet.getColumn(2).width = 12;
	worksheet.getColumn(3).width = 25;
	worksheet.getColumn(4).width = 16;
	worksheet.getColumn(5).width = 16;
	worksheet.getColumn(6).width = 20;
	worksheet.getColumn(7).width = 12;

	return workbook.xlsx.writeBuffer();
}

async function generatePDF(data, filter) {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ layout: 'landscape', margin: 20, size: 'A4' });
		const chunks = [];
		doc.on('data', chunk => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		doc.fontSize(16).font('Helvetica-Bold').text('LAPORAN TUNGGAKAN TAGIHAN', { align: 'center' });
		doc.moveDown(0.3);
		doc.fontSize(10).font('Helvetica').text(`Sampai Periode: ${filter.periode || 'Semua'}`, { align: 'center' });

		let filterInfo = [];
		if (filter.blokFilter !== 'semua') {
			const blok = data.blokRumah?.find(b => b.id === parseInt(filter.blokFilter));
			filterInfo.push(`Blok: ${blok?.label || '-'}`);
		}
		if (filterInfo.length > 0) {
			doc.fontSize(8).font('Helvetica-Oblique').text(filterInfo.join(' | '), { align: 'center' });
		}
		doc.moveDown();

		const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
		const colWidths = [
			0.04 * pageWidth,
			0.10 * pageWidth,
			0.22 * pageWidth,
			0.14 * pageWidth,
			0.12 * pageWidth,
			0.20 * pageWidth,
			0.18 * pageWidth
		];
		const headers = ['No', 'Blok', 'Penghuni/Pemilik', 'No HP', 'Bulan Tunggak', 'Total Tunggakan', 'Detail'];
		const startX = doc.page.margins.left;

		doc.font('Helvetica-Bold').fontSize(7);
		let x = startX;
		const tableTop = doc.y;
		const headerHeight = 20;

		headers.forEach((h, i) => {
			doc.rect(x, tableTop, colWidths[i], headerHeight).fill('#4472C4');
			doc.fillColor('white').text(h, x + 2, tableTop + 5, { width: colWidths[i] - 4, align: i === 0 || i === 1 || i === 4 || i === 6 ? 'center' : (i === 5 ? 'right' : 'left') });
			x += colWidths[i];
		});
		doc.fillColor('black');

		let y = tableTop + headerHeight;
		const rowHeight = 16;

		data.tunggakan.forEach((item, idx) => {
			if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
				doc.addPage();
				y = doc.page.margins.top;
				doc.font('Helvetica-Bold').fontSize(7);
				x = startX;
				headers.forEach((h, i) => {
					doc.rect(x, y, colWidths[i], headerHeight).fill('#4472C4');
					doc.fillColor('white').text(h, x + 2, y + 5, { width: colWidths[i] - 4, align: i === 0 || i === 1 || i === 4 || i === 6 ? 'center' : (i === 5 ? 'right' : 'left') });
					x += colWidths[i];
				});
				doc.fillColor('black');
				y += headerHeight;
			}

			const rowData = [
				String(idx + 1),
				item.blok,
				item.penghuni_nama || '-',
				item.penghuni_hp || '-',
				`${item.bulan_tunggak} bulan`,
				formatRupiah(item.total_tunggakan),
				`${item.detail.length} detail`
			];
			x = startX;
			rowData.forEach((val, i) => {
				doc.rect(x, y, colWidths[i], rowHeight).stroke('#CCCCCC');
				const align = i === 0 || i === 1 || i === 4 || i === 6 ? 'center' : (i === 5 ? 'right' : 'left');
				doc.font('Helvetica').fontSize(6.5).text(val, x + 2, y + 3, { width: colWidths[i] - 4, align, ellipsis: true });
				x += colWidths[i];
			});
			y += rowHeight;

			item.detail.forEach((d, di) => {
				if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
					doc.addPage();
					y = doc.page.margins.top;
				}
				const dRowData = ['', '', `  → ${d.periode}`, '', '', formatRupiah(d.nominal), 'Belum Bayar'];
				x = startX;
				dRowData.forEach((val, i) => {
					doc.rect(x, y, colWidths[i], rowHeight).stroke('#CCCCCC');
					const align = i === 0 || i === 1 || i === 4 || i === 6 ? 'center' : (i === 5 ? 'right' : 'left');
					doc.font('Helvetica').fontSize(6).text(val, x + 2, y + 3, { width: colWidths[i] - 4, align, ellipsis: true });
					x += colWidths[i];
				});
				y += rowHeight;
			});
		});

		if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
			doc.addPage();
			y = doc.page.margins.top;
		}
		const totalRowData = ['', '', '', '', `Total: ${data.grandTotal.total_bulan} bulan`, formatRupiah(data.grandTotal.total_nominal), ''];
		x = startX;
		totalRowData.forEach((val, i) => {
			doc.rect(x, y, colWidths[i], rowHeight + 2).fill('#D6E4F0').stroke('#999999');
			if (i === 4) {
				doc.font('Helvetica-Bold').fontSize(7).fillColor('#1F4E79').text(val, x + 2, y + 4, { width: colWidths[i] - 4, align: 'center' });
			} else if (i === 5) {
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
	const { periode, blokFilter } = filter;

	let whereClause = 'WHERE t.status = "belum_bayar"';
	const params = [];

	if (periode) {
		whereClause += ' AND t.periode <= ?';
		params.push(periode);
	}
	if (blokFilter !== 'semua') {
		whereClause += ' AND t.blok_rumah_id = ?';
		params.push(parseInt(blokFilter));
	}

	const sql = `SELECT t.id, t.periode, t.nominal, t.status, t.blok_rumah_id, br.no_blok AS blok, COALESCE(ak.nama, pr.nama) as penghuni_nama, COALESCE(ak.nomor_hp, pr.no_hp) as penghuni_hp FROM tagihan_iuran t JOIN blok_rumah br ON t.blok_rumah_id = br.id LEFT JOIN keluarga k ON br.id = k.blok_rumah_id LEFT JOIN anggota_keluarga ak ON k.id = ak.keluarga_id AND ak.hub_keluarga = 'Kepala Keluarga' LEFT JOIN pemilik_rumah pr ON br.id = pr.blok_rumah_id ${whereClause} ORDER BY br.no_blok, t.periode`;
	const rows = await executeQuery(sql, params);

	const grouped = {};
	for (const row of rows) {
		const key = row.blok_rumah_id;
		if (!grouped[key]) {
			grouped[key] = { blok_rumah_id: key, blok: row.blok, penghuni_nama: row.penghuni_nama, penghuni_hp: row.penghuni_hp, bulan_tunggak: 0, total_tunggakan: 0, detail: [] };
		}
		grouped[key].bulan_tunggak++;
		grouped[key].total_tunggakan += parseFloat(row.nominal || 0);
		grouped[key].detail.push(row);
	}

	const tunggakanList = Object.values(grouped).sort((a, b) => a.blok.localeCompare(b.blok));

	const grandTotal = tunggakanList.reduce((acc, t) => ({ jumlah_penghuni: acc.jumlah_penghuni + 1, total_bulan: acc.total_bulan + t.bulan_tunggak, total_nominal: acc.total_nominal + t.total_tunggakan }), { jumlah_penghuni: 0, total_bulan: 0, total_nominal: 0 });

	const blokRumah = await executeQuery('SELECT id, no_blok as label FROM blok_rumah ORDER BY no_blok');

	return { tunggakan: tunggakanList, grandTotal, blokRumah };
}

export async function GET({ url, cookies }) {
	const user = cookies.get('session_user');
	if (!user) {
		throw redirect(303, '/login?redirect=/laporan/tagihan/tunggakan');
	}

	const format = url.searchParams.get('format') || 'excel';
	const periode = url.searchParams.get('periode') || '';
	const blokFilter = url.searchParams.get('blok') || 'semua';

	const filter = { periode, blokFilter };
	const data = await getData(filter);

	if (format === 'pdf') {
		const buffer = await generatePDF(data, filter);
		return new Response(buffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="tunggakan-tagihan-${periode || 'all'}.pdf"`
			}
		});
	}

	const buffer = await generateExcel(data, filter);
	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="tunggakan-tagihan-${periode || 'all'}.xlsx"`
		}
	});
}