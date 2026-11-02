import { error } from '@sveltejs/kit';
import { executeQuery } from '#lib/server/db';

const CSS_A4 = `
<style>
/* Reset & Base */
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: auto; }
body {
    font-family: 'Helvetica', 'Arial', 'DejaVu Sans', sans-serif;
    font-size: 11pt;
    color: #111827;
    background: white;
}

/* A4 Page */
@page {
    size: A4;
    margin: 2cm;
}
@media print {
    body { margin: 0; padding: 0; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
}

/* ProseMirror / TipTap Content Styles */
.ProseMirror { outline: none; }

/* Headings */
.ProseMirror h1 {
    font-size: 16pt;
    font-weight: 700;
    line-height: 1.3;
    margin: 1.5rem 0 0.75rem;
    color: #111827;
}
.ProseMirror h2 {
    font-size: 15pt;
    font-weight: 600;
    line-height: 1.4;
    margin: 1.25rem 0 0.5rem;
    color: #1f2937;
}
.ProseMirror h3 {
    font-size: 14pt;
    font-weight: 600;
    line-height: 1.4;
    margin: 1rem 0 0.5rem;
    color: #374151;
}

/* Text Alignment (from TextAlign extension - uses style attribute) */
.ProseMirror [style*="text-align: center"] { text-align: center; }
.ProseMirror [style*="text-align: right"] { text-align: right; }
.ProseMirror [style*="text-align: justify"] { text-align: justify; }
.ProseMirror [style*="text-align: left"] { text-align: left; }

/* Paragraph */
.ProseMirror p { margin: 1.5pt 0 0 0; }

/* Lists */
.ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
.ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
.ProseMirror li { margin: 0.25rem 0; line-height: 1.6; }
.ProseMirror li p { margin: 0; display: inline; }
.ProseMirror ul ul { list-style-type: circle; }
.ProseMirror ul ul ul { list-style-type: square; }
.ProseMirror ol ol { list-style-type: lower-alpha; }
.ProseMirror ol ol ol { list-style-type: lower-roman; }

/* Blockquote */
.ProseMirror blockquote {
    border-left: 3px solid #3b82f6;
    padding-left: 1rem;
    margin: 1rem 0;
    font-style: italic;
    color: #4b5563;
    background-color: #f9fafb;
    padding: 0.75rem 1rem;
    border-radius: 0 0.375rem 0.375rem 0;
}

/* Code */
.ProseMirror pre {
    background: #1f2937;
    color: #e5e7eb;
    padding: 1rem;
    border-radius: 0.375rem;
    overflow-x: auto;
    margin: 1rem 0;
}
.ProseMirror pre code { background: none; padding: 0; font-size: 0.875rem; line-height: 1.7; }
.ProseMirror code {
    background: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-family: monospace;
}

/* Horizontal Rule */
.ProseMirror hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }

/* Table */
.ProseMirror table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
.ProseMirror th, .ProseMirror td { text-align: left; vertical-align: text-top;}
.ProseMirror th { background-color: #f3f4f6; font-weight: 600; }

/* Strong, Em, etc */
.ProseMirror strong { font-weight: 700; }
.ProseMirror em { font-style: italic; }
.ProseMirror u { text-decoration: underline; }
.ProseMirror s { text-decoration: line-through; }

/* Links */
.ProseMirror a { color: #3b82f6; text-decoration: underline; }

/* Image */
.ProseMirror img { max-width: 100%; height: auto; display: block; margin: 1rem auto; }

/* Print button container */
.print-header {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
}
@media print {
    .print-header { display: none !important; }
}
</style>
`;

function formatDateIndo(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function wrapTemplate(templateHtml, variabel) {
    // Replace variabel
    let html = templateHtml;
    for (const [key, value] of Object.entries(variabel)) {
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
    }
    return html;
}

export async function GET({ url }) {
    const id = url.searchParams.get('id');
    if (!id) throw error(400, 'ID surat diperlukan');

    try {
        const rows = await executeQuery(
            `SELECT s.*, js.kode as jenis_kode, js.nama as jenis_nama,
                    ak.nik, ak.nama, ak.nomor_hp,
                    k.no_kk, k.status_rumah,
                    b.no_blok,
                    u.name as rt_pembuat_nama
             FROM surat s
             JOIN jenis_surat js ON s.jenis_surat_id = js.id
             JOIN anggota_keluarga ak ON s.anggota_keluarga_id = ak.id
             JOIN keluarga k ON ak.keluarga_id = k.id
             JOIN blok_rumah b ON s.blok_rumah_id = b.id
             LEFT JOIN users u ON s.rt_pembuat_id = u.id
             WHERE s.id = ?`,
            [parseInt(id)]
        );

        if (!rows.length) throw error(404, 'Surat tidak ditemukan');

        const surat = rows[0];
        const variabel = typeof surat.variabel === 'string' ? JSON.parse(surat.variabel) : surat.variabel;

        // Render template with variables
        const contentHtml = wrapTemplate(surat.template_html, variabel);

        // Full HTML with print button
        const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${surat.nomor_surat} - ${surat.jenis_nama}</title>
    ${CSS_A4}
</head>
<body class="ProseMirror">
    <div class="print-header no-print">
        <button onclick="window.print()" style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <i class="fa-solid fa-print"></i> Cetak / Simpan PDF
        </button>
    </div>
    ${contentHtml}
    <script>
        // Auto-focus for print dialog (optional)
        // window.onload = () => window.print();
    </script>
</body>
</html>`;

        return new Response(fullHtml, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });

    } catch (e) {
        console.error('PREVIEW error:', e);
        if (e.status) throw e;
        throw error(500, 'Gagal memuat preview: ' + e.message);
    }
}