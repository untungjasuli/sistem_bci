import { redirect, error, fail } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

export const load = async ({ locals, url }) => {
    const user = locals.user;
    if (!user) {
        throw redirect(303, '/login');
    }

    const page = parseInt(url.searchParams.get('page') || '1');
    const itemsPerPage = parseInt(url.searchParams.get('itemsPerPage') || '10');
    const search = url.searchParams.get('search')?.trim() || '';
    const jenisFilter = url.searchParams.get('jenis') || 'semua';
    const statusFilter = url.searchParams.get('status') || 'semua';
    const blokFilter = url.searchParams.get('blok') || 'semua';

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
        whereClause += ' AND (s.nomor_surat LIKE ? OR ak.nama LIKE ? OR ak.nik LIKE ? OR k.no_kk LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    if (jenisFilter !== 'semua') {
        whereClause += ' AND s.jenis_surat_id = ?';
        params.push(parseInt(jenisFilter));
    }
    if (statusFilter !== 'semua') {
        whereClause += ' AND s.status = ?';
        params.push(statusFilter);
    }
    if (blokFilter !== 'semua') {
        whereClause += ' AND s.blok_rumah_id = ?';
        params.push(parseInt(blokFilter));
    }

    // Count total
    const [countRows] = await executeQuery(
        `SELECT COUNT(*) as total FROM surat s
         JOIN jenis_surat js ON s.jenis_surat_id = js.id
         JOIN anggota_keluarga ak ON s.anggota_keluarga_id = ak.id
         JOIN keluarga k ON ak.keluarga_id = k.id
         JOIN blok_rumah b ON s.blok_rumah_id = b.id
         ${whereClause}`,
        params
    );
    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / itemsPerPage) || 1;

    // Get data with pagination
    const offset = (page - 1) * itemsPerPage;
    params.push(itemsPerPage, offset);

    const [rows] = await executeQuery(
        `SELECT s.*, js.kode as jenis_kode, js.nama as jenis_nama,
                ak.nik, ak.nama, ak.nomor_hp,
                k.no_kk, k.status_rumah,
                b.no_blok,
                u.nama as rt_pembuat_nama
         FROM surat s
         JOIN jenis_surat js ON s.jenis_surat_id = js.id
         JOIN anggota_keluarga ak ON s.anggota_keluarga_id = ak.id
         JOIN keluarga k ON ak.keluarga_id = k.id
         JOIN blok_rumah b ON s.blok_rumah_id = b.id
         LEFT JOIN users u ON s.rt_pembuat_id = u.id
         ${whereClause}
         ORDER BY s.created_at DESC
         LIMIT ? OFFSET ?`,
        params
    );

    // Get filter options
    const [jenisSurat] = await executeQuery('SELECT id, kode, nama FROM jenis_surat WHERE aktif = TRUE ORDER BY urutan');
    const [blokRumah] = await executeQuery('SELECT id, no_blok FROM blok_rumah ORDER BY no_blok');

    return {
        user,
        surat: rows,
        jenisSurat,
        blokRumah,
        page,
        itemsPerPage,
        totalPages,
        total,
        filter: { search, jenisFilter, statusFilter, blokFilter }
    };
};

export const actions = {
    create: async ({ request, locals }) => {
        const user = locals.user;
        if (!user || user.role !== 'admin') {
            return fail(400, { error: 'Hanya admin yang bisa membuat surat' });
        }

        const formData = await request.formData();
        const jenis_surat_id = parseInt(formData.get('jenis_surat_id') || '0');
        const anggota_keluarga_id = parseInt(formData.get('anggota_keluarga_id') || '0');
        const blok_rumah_id = parseInt(formData.get('blok_rumah_id') || '0');
        const keterangan_keperluan = formData.get('keterangan_keperluan')?.toString().trim() || '';
        const tanggal_surat = formData.get('tanggal_surat')?.toString() || new Date().toISOString().split('T')[0];

        if (!jenis_surat_id || !anggota_keluarga_id || !blok_rumah_id || !keterangan_keperluan) {
            return fail(400, { error: 'Semua field wajib diisi' });
        }

        try {
            // Get jenis surat for kode
            const [jsRows] = await executeQuery('SELECT kode FROM jenis_surat WHERE id = ?', [jenis_surat_id]);
            if (!jsRows.length) return fail(400, { error: 'Jenis surat tidak ditemukan' });
            const kode = jsRows[0].kode;

            // Get RT no for nomor surat
            const [rtRows] = await executeQuery('SELECT `value` FROM settings WHERE `key` = "rt_no"');
            const rtNo = rtRows[0]?.value || '001';

            // Get current year
            const year = new Date(tanggal_surat).getFullYear();

            // Get next sequence number
            const [seqRows] = await executeQuery(
                'SELECT COUNT(*) as cnt FROM surat WHERE jenis_surat_id = ? AND YEAR(tanggal_surat) = ?',
                [jenis_surat_id, year]
            );
            const nextSeq = (seqRows[0]?.cnt || 0) + 1;

            const nomor_surat = `${kode}/RT${rtNo}/${year}/${String(nextSeq).padStart(3, '0')}`;

            // Get warga data for variabel
            const [wargaRows] = await executeQuery(
                `SELECT ak.*, k.no_kk, k.status_rumah, b.no_blok
                 FROM anggota_keluarga ak
                 JOIN keluarga k ON ak.keluarga_id = k.id
                 JOIN blok_rumah b ON k.blok_rumah_id = b.id
                 WHERE ak.id = ?`,
                [anggota_keluarga_id]
            );
            if (!wargaRows.length) return fail(400, { error: 'Warga tidak ditemukan' });
            const warga = wargaRows[0];

            // Get RT settings
            const [settingsRows] = await executeQuery('SELECT `key`, `value` FROM settings WHERE `key` IN ("rt_no", "rw_no", "rt_alamat", "rt_nama", "rt_nip", "rw_nama", "rw_nip")');
            const settings = {};
            settingsRows.forEach(s => { settings[s.key] = s.value; });

            // Get jenis surat template
            const [jsTemplate] = await executeQuery('SELECT template_html FROM jenis_surat WHERE id = ?', [jenis_surat_id]);
            const template_html = jsTemplate[0]?.template_html || '';

            // Build variabel
            const formatDate = (dateStr) => {
                if (!dateStr) return '';
                const d = new Date(dateStr);
                const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
            };

            const variabel = {
                nomor_surat,
                nama: warga.nama,
                nik: warga.nik,
                tempat_lahir: warga.tempat_lahir || '-',
                tanggal_lahir: warga.tanggal_lahir ? formatDate(warga.tanggal_lahir) : '-',
                jenis_kelamin: warga.jenis_kelamin || '-',
                agama: warga.agama || '-',
                pekerjaan: warga.pekerjaan || '-',
                status_perkawinan: warga.status_perkawinan || '-',
                no_kk: warga.no_kk || '-',
                alamat_rt: settings.rt_alamat || '-',
                rt: settings.rt_no || '001',
                rw: settings.rw_no || '002',
                nama_rt: settings.rt_nama || '-',
                nip_rt: settings.rt_nip || '-',
                nama_rw: settings.rw_nama || '-',
                nip_rw: settings.rw_nip || '-',
                tanggal_surat: formatDate(tanggal_surat),
                keperluan: keterangan_keperluan
            };

            // Insert surat
            await executeQuery(
                `INSERT INTO surat (nomor_surat, jenis_surat_id, anggota_keluarga_id, blok_rumah_id, 
                 keterangan_keperluan, template_html, variabel, status, tanggal_surat, rt_pembuat_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'selesai', ?, ?)`,
                [nomor_surat, jenis_surat_id, anggota_keluarga_id, blok_rumah_id,
                 keterangan_keperluan, template_html, JSON.stringify(variabel), tanggal_surat, user.id]
            );

            return { success: `Surat ${nomor_surat} berhasil dibuat` };
        } catch (e) {
            console.error('CREATE surat error:', e);
            return fail(400, { error: 'Gagal membuat surat: ' + e.message });
        }
    },

    delete: async ({ request, locals }) => {
        const user = locals.user;
        if (!user || user.role !== 'admin') {
            return fail(400, { error: 'Hanya admin yang bisa menghapus surat' });
        }

        const formData = await request.formData();
        const id = parseInt(formData.get('id') || '0');

        if (!id) return fail(400, { error: 'ID surat tidak valid' });

        try {
            // Get file path before delete
            const [rows] = await executeQuery('SELECT file_pdf_path FROM surat WHERE id = ?', [id]);
            if (rows.length) {
                const filePath = rows[0].file_pdf_path;
                if (filePath) {
                    // Delete file if exists (optional, can be kept for archive)
                    // const fs = await import('fs');
                    // if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
            }

            await executeQuery('DELETE FROM surat WHERE id = ?', [id]);
            return { success: 'Surat berhasil dihapus' };
        } catch (e) {
            console.error('DELETE surat error:', e);
            return fail(400, { error: 'Gagal menghapus surat: ' + e.message });
        }
    },

    generatePDF: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) return fail(400, { error: 'Unauthorized' });

        const formData = await request.formData();
        const id = parseInt(formData.get('id') || '0');

        if (!id) return fail(400, { error: 'ID surat tidak valid' });

        try {
            const [rows] = await executeQuery(
                `SELECT s.*, js.kode as jenis_kode
                 FROM surat s
                 JOIN jenis_surat js ON s.jenis_surat_id = js.id
                 WHERE s.id = ?`,
                [id]
            );
            if (!rows.length) return fail(400, { error: 'Surat tidak ditemukan' });

            const surat = rows[0];
            const variabel = typeof surat.variabel === 'string' ? JSON.parse(surat.variabel) : surat.variabel;

            // Generate PDF using pdfkit
            const PDFDocument = (await import('pdfkit')).default;
            const fs = await import('fs');
            const path = await import('path');

            // Ensure directory exists
            const dir = path.join(process.cwd(), 'static', 'surat');
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const fileName = `${surat.nomor_surat.replace(/\//g, '_')}.pdf`;
            const filePath = path.join(dir, fileName);

            // Render template dengan variabel
            let html = surat.template_html;
            for (const [key, value] of Object.entries(variabel)) {
                html = html.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
            }

            // Convert HTML to PDF using pdfkit
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(chunks);
                fs.writeFileSync(filePath, pdfBuffer);
            });

            // Simple HTML to PDF conversion - render text content
            // Parse HTML and extract text for pdfkit
            const renderHTML = (html) => {
                // Remove scripts and styles
                html = html.replace(/<script[^>]*>.*?<\/script>/gi, '');
                html = html.replace(/<style[^>]*>.*?<\/style>/gi, '');
                
                // Replace block elements with newlines
                html = html.replace(/<\/?(div|p|h[1-6]|br|hr|tr|table|thead|tbody|tfoot|th|td)>/gi, '\n');
                html = html.replace(/<li>/gi, '\n• ');
                html = html.replace(/<\/li>/gi, '');
                
                // Remove remaining tags
                html = html.replace(/<[^>]+>/g, '');
                
                // Decode HTML entities
                html = html.replace(/&nbsp;/g, ' ')
                          .replace(/&/g, '&')
                          .replace(/</g, '<')
                          .replace(/>/g, '>')
                          .replace(/"/g, '"')
                          .replace(/'/g, "'");
                
                // Clean up multiple newlines
                html = html.replace(/\n\s*\n/g, '\n\n').trim();
                
                return html;
            };

            const textContent = renderHTML(html);
            doc.font('Helvetica').fontSize(11).text(textContent, { align: 'justify', lineGap: 2 });
            doc.end();

            // Wait for PDF to be written
            await new Promise((resolve, reject) => {
                doc.on('end', resolve);
                doc.on('error', reject);
            });

            // Update file path in DB
            await executeQuery('UPDATE surat SET file_pdf_path = ? WHERE id = ?', [filePath, id]);

            return { 
                success: 'PDF berhasil digenerate',
                fileName,
                filePath: `/surat/${fileName}`
            };
        } catch (e) {
            console.error('GENERATE PDF error:', e);
            return fail(400, { error: 'Gagal generate PDF: ' + e.message });
        }
    }
};