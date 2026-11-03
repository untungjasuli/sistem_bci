import { redirect } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

function formatDateIndo(dateStr) {
	if (!dateStr) return '-';
	return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getJenisLabel(jenis) {
	const labels = {
		'pindah_keluar': 'Pindah Keluar',
		'meninggal': 'Meninggal',
		'pindah_datang': 'Pindah Datang',
		'lahir': 'Lahir'
	};
	return labels[jenis] || jenis;
}

function getJkLabel(jk) {
	return jk === 'Laki-laki' ? 'Laki-laki' : 'Perempuan';
}

function getHubLabel(hub) {
	const labels = { 'kepala': 'Kepala Keluarga', 'istri': 'Istri', 'anak': 'Anak', 'lainnya': 'Lainnya' };
	return labels[hub] || hub;
}

async function getData(filter) {
	const { yearFilter, jenisFilter } = filter;

	let whereClause = 'WHERE 1=1';
	const params = [];

	if (yearFilter !== 'semua') {
		whereClause += ' AND YEAR(mp.tanggal_mutasi) = ?';
		params.push(parseInt(yearFilter));
	}
	if (jenisFilter !== 'semua') {
		whereClause += ' AND mp.jenis_mutasi = ?';
		params.push(jenisFilter);
	}

	const sql = `
		SELECT 
			mp.id,
			mp.jenis_mutasi,
			mp.tanggal_mutasi,
			mp.alasan,
			mp.alamat_asal,
			mp.alamat_tujuan,
			mp.rt_rw_tujuan,
			mp.kelurahan_tujuan,
			mp.kecamatan_tujuan,
			mp.kota_tujuan,
			mp.provinsi_tujuan,
			mp.no_surat_pindah,
			mp.keterangan,
			ak.nik,
			ak.nama,
			ak.jenis_kelamin,
			ak.tanggal_lahir,
			ak.hub_keluarga,
			ak.nomor_hp,
			k.no_kk,
			k.status_rumah,
			b.no_blok,
			TIMESTAMPDIFF(YEAR, ak.tanggal_lahir, mp.tanggal_mutasi) as umur_saat_mutasi
		FROM mutasi_penduduk mp
		JOIN anggota_keluarga ak ON mp.anggota_keluarga_id = ak.id
		JOIN keluarga k ON ak.keluarga_id = k.id
		JOIN blok_rumah b ON k.blok_rumah_id = b.id
		${whereClause}
		ORDER BY mp.tanggal_mutasi DESC, b.no_blok, ak.nama
	`;
	const rows = await executeQuery(sql, params);

	return { mutasi: rows };
}

async function generateExcel(data, filter) {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Mutasi Penduduk & Kematian');

	// Title
	worksheet.mergeCells('A1:N1');
	worksheet.getCell('A1').value = 'LAPORAN MUTASI PENDUDUK & KEMATIAN';
	worksheet.getCell('A1').font = { bold: true, size: 16 };
	worksheet.getCell('A1').alignment = { horizontal: 'center' };

	// Filter info
	let filterInfo = [];
	if (filter.yearFilter !== 'semua') {
		filterInfo.push(`Tahun: ${filter.yearFilter}`);
	}
	if (filter.jenisFilter !== 'semua') {
		filterInfo.push(`Jenis: ${getJenisLabel(filter.jenisFilter)}`);
	}
	if (filterInfo.length > 0) {
		worksheet.mergeCells('A2:N2');
		worksheet.getCell('A2').value = filterInfo.join(' | ');
		worksheet.getCell('A2').alignment = { horizontal: 'center' };
		worksheet.getCell('A2').font = { italic: true };
	}

	// Headers
	const headers = [
		'No', 'Tgl Mutasi', 'Jenis', 'NIK', 'Nama', 'JK', 'Umur', 'Hub. Keluarga',
		'No. KK', 'Blok', 'Alasan', 'Alamat Tujuan', 'No Surat Pindah', 'Keterangan'
	];
	const headerRow = worksheet.getRow(4);
	headers.forEach((h, i) => {
		const cell = headerRow.getCell(i + 1);
		cell.value = h;
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
		cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
		cell.alignment = { horizontal: 'center', wrapText: true };
		cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
	});

	// Data rows
	data.mutasi.forEach((item, idx) => {
		const row = worksheet.getRow(5 + idx);
		let alamatTujuan = '-';
		if (item.jenis_mutasi === 'pindah_keluar') {
			alamatTujuan = item.alamat_tujuan || '-';
			if (item.rt_rw_tujuan) alamatTujuan += ` RT/RW ${item.rt_rw_tujuan}`;
			if (item.kelurahan_tujuan) alamatTujuan += `, ${item.kelurahan_tujuan}`;
			if (item.kecamatan_tujuan) alamatTujuan += `, ${item.kecamatan_tujuan}`;
			if (item.kota_tujuan) alamatTujuan += `, ${item.kota_tujuan}`;
			if (item.provinsi_tujuan) alamatTujuan += `, ${item.provinsi_tujuan}`;
		}

		const rowData = [
			idx + 1,
			formatDateIndo(item.tanggal_mutasi),
			getJenisLabel(item.jenis_mutasi),
			item.nik || '-',
			item.nama,
			getJkLabel(item.jenis_kelamin),
			item.umur_saat_mutasi ? `${item.umur_saat_mutasi} thn` : '-',
			getHubLabel(item.hub_keluarga),
			item.no_kk,
			item.no_blok,
			item.alasan || '-',
			alamatTujuan,
			item.no_surat_pindah || '-',
			item.keterangan || '-'
		];

		rowData.forEach((val, i) => {
			const cell = row.getCell(i + 1);
			cell.value = val;
			cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
			cell.alignment = { vertical: 'middle', wrapText: true };
		});
		row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
	});

	// Total row
	const totalRowNum = 5 + data.mutasi.length;
	const totalRow = worksheet.getRow(totalRowNum);
	totalRow.getCell(1).value = '';
	totalRow.getCell(2).value = '';
	totalRow.getCell(3).value = 'TOTAL';
	totalRow.getCell(3).font = { bold: true };
	totalRow.getCell(3).alignment = { horizontal: 'right' };
	totalRow.getCell(5).value = data.mutasi.length;
	totalRow.getCell(5).font = { bold: true, color: { argb: 'FF1F4E79' } };
	totalRow.getCell(5).alignment = { horizontal: 'center' };
	totalRow.eachCell(cell => {
		cell.border = { top: { style: 'double' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
	});

	// Column widths
	const colWidths = [5, 14, 16, 20, 25, 12, 10, 18, 18, 8, 20, 35, 18, 25];
	colWidths.forEach((w, i) => {
		worksheet.getColumn(i + 1).width = w;
	});

	return workbook.xlsx.writeBuffer();
}

async function generatePDF(data, filter) {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ layout: 'landscape', margin: 15, size: 'A4' });
		const chunks = [];
		doc.on('data', chunk => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		doc.fontSize(14).font('Helvetica-Bold').text('LAPORAN MUTASI PENDUDUK & KEMATIAN', { align: 'center' });
		doc.moveDown(0.3);
		doc.fontSize(9).font('Helvetica').text(`Tanggal Cetak: ${formatDateIndo(new Date().toISOString())}`, { align: 'center' });

		let filterInfo = [];
		if (filter.yearFilter !== 'semua') filterInfo.push(`Tahun: ${filter.yearFilter}`);
		if (filter.jenisFilter !== 'semua') filterInfo.push(`Jenis: ${getJenisLabel(filter.jenisFilter)}`);
		if (filterInfo.length > 0) {
			doc.fontSize(8).font('Helvetica-Oblique').text(filterInfo.join(' | '), { align: 'center' });
		}
		doc.moveDown();

		// Table columns
		const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
		const colWidths = [
			0.035 * pageWidth,  // No
			0.09 * pageWidth,   // Tgl Mutasi
			0.10 * pageWidth,   // Jenis
			0.12 * pageWidth,   // NIK
			0.14 * pageWidth,   // Nama
			0.06 * pageWidth,   // JK
			0.05 * pageWidth,   // Umur
			0.10 * pageWidth,   // Hub. Keluarga
			0.11 * pageWidth,   // No. KK
			0.05 * pageWidth,   // Blok
			0.10 * pageWidth,   // Alasan
			0.15 * pageWidth,   // Alamat Tujuan
			0.10 * pageWidth,   // No Surat Pindah
			0.10 * pageWidth    // Keterangan
		];
		const headers = [
			'No', 'Tgl Mutasi', 'Jenis', 'NIK', 'Nama', 'JK', 'Umur', 'Hub. Keluarga',
			'No. KK', 'Blok', 'Alasan', 'Alamat Tujuan', 'No Surat', 'Keterangan'
		];
		const startX = doc.page.margins.left;

		const drawHeader = (y) => {
			doc.font('Helvetica-Bold').fontSize(6.5);
			let x = startX;
			const headerHeight = 18;
			headers.forEach((h, i) => {
				doc.rect(x, y, colWidths[i], headerHeight).fill('#4472C4');
				doc.fillColor('white').text(h, x + 2, y + 4, {
					width: colWidths[i] - 4,
					align: i <= 2 || i === 5 || i === 6 || i === 8 || i === 9 ? 'center' : 'left'
				});
				x += colWidths[i];
			});
			doc.fillColor('black');
			return y + headerHeight;
		};

		let y = drawHeader(doc.y);
		const rowHeight = 15;

		data.mutasi.forEach((item, idx) => {
			if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
				doc.addPage();
				y = doc.page.margins.top;
				y = drawHeader(y);
			}

			let alamatTujuan = '-';
			if (item.jenis_mutasi === 'pindah_keluar') {
				alamatTujuan = item.alamat_tujuan || '-';
				if (item.rt_rw_tujuan) alamatTujuan += ` RT/RW ${item.rt_rw_tujuan}`;
				if (item.kelurahan_tujuan) alamatTujuan += `, ${item.kelurahan_tujuan}`;
				if (item.kecamatan_tujuan) alamatTujuan += `, ${item.kecamatan_tujuan}`;
				if (item.kota_tujuan) alamatTujuan += `, ${item.kota_tujuan}`;
				if (item.provinsi_tujuan) alamatTujuan += `, ${item.provinsi_tujuan}`;
			}

			const rowData = [
				String(idx + 1),
				formatDateIndo(item.tanggal_mutasi),
				getJenisLabel(item.jenis_mutasi),
				item.nik || '-',
				item.nama,
				getJkLabel(item.jenis_kelamin),
				item.umur_saat_mutasi ? String(item.umur_saat_mutasi) : '-',
				getHubLabel(item.hub_keluarga),
				item.no_kk,
				item.no_blok,
				item.alasan || '-',
				alamatTujuan,
				item.no_surat_pindah || '-',
				item.keterangan || '-'
			];

			let x = startX;
			rowData.forEach((val, i) => {
				doc.rect(x, y, colWidths[i], rowHeight).stroke('#CCCCCC');
				const align = i <= 2 || i === 5 || i === 6 || i === 8 || i === 9 ? 'center' : 'left';
				doc.font('Helvetica').fontSize(6).text(val, x + 2, y + 2, {
					width: colWidths[i] - 4,
					align,
					ellipsis: true
				});
				x += colWidths[i];
			});
			y += rowHeight;
		});

		// Total row
		if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
			doc.addPage();
			y = doc.page.margins.top;
		}
		const totalRowData = ['', '', 'TOTAL', '', String(data.mutasi.length), '', '', '', '', '', '', '', '', ''];
		let x = startX;
		totalRowData.forEach((val, i) => {
			doc.rect(x, y, colWidths[i], rowHeight + 2).fill('#D6E4F0').stroke('#999999');
			if (i === 2) {
				doc.font('Helvetica-Bold').fontSize(7).fillColor('#1F4E79').text(val, x + 2, y + 4, { width: colWidths[i] - 4, align: 'right' });
			} else if (i === 4) {
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
		throw redirect(303, '/login?redirect=/laporan/kependudukan/mutasi-kematian');
	}

	const format = url.searchParams.get('format') || 'excel';
	const yearFilter = url.searchParams.get('tahun') || 'semua';
	const jenisFilter = url.searchParams.get('jenis') || 'semua';

	const filter = { yearFilter, jenisFilter };
	const data = await getData(filter);

	if (format === 'pdf') {
		const buffer = await generatePDF(data, filter);
		return new Response(buffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="mutasi-kematian-${yearFilter}-${jenisFilter}.pdf"`
			}
		});
	}

	const buffer = await generateExcel(data, filter);
	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="mutasi-kematian-${yearFilter}-${jenisFilter}.xlsx"`
		}
	});
}