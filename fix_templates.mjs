import { executeQuery } from './src/lib/server/db.js';

// Extract body content from full HTML document
function extractBodyContent(html) {
    if (!html) return html;
    
    // Check if it's a full HTML document
    const hasDoctype = /<!DOCTYPE/i.test(html);
    const hasHtmlTag = /<html/i.test(html);
    const hasBodyTag = /<body/i.test(html);
    
    if (!hasDoctype && !hasHtmlTag && !hasBodyTag) {
        return html; // Already a fragment
    }
    
    // Extract content between <body> and </body>
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
        return bodyMatch[1].trim();
    }
    
    // Fallback: extract everything after </head> until </html>
    const headEndMatch = html.match(/<\/head>([\s\S]*?)<\/html>/i);
    if (headEndMatch) {
        return headEndMatch[1].trim();
    }
    
    return html;
}

async function fixTemplates() {
    console.log('Fetching all jenis_surat...');
    const rows = await executeQuery('SELECT id, kode, template_html FROM jenis_surat');
    
    for (const row of rows) {
        const original = row.template_html;
        const cleaned = extractBodyContent(original);
        
        if (original !== cleaned) {
            console.log(`Fixing ${row.kode} (id: ${row.id})...`);
            await executeQuery(
                'UPDATE jenis_surat SET template_html = ? WHERE id = ?',
                [cleaned, row.id]
            );
        } else {
            console.log(`Skipping ${row.kode} (id: ${row.id}) - already clean`);
        }
    }
    
    // Also fix surat table
    console.log('\nFetching all surat...');
    const suratRows = await executeQuery('SELECT id, nomor_surat, template_html FROM surat');
    
    for (const row of suratRows) {
        const original = row.template_html;
        const cleaned = extractBodyContent(original);
        
        if (original !== cleaned) {
            console.log(`Fixing surat ${row.nomor_surat} (id: ${row.id})...`);
            await executeQuery(
                'UPDATE surat SET template_html = ? WHERE id = ?',
                [cleaned, row.id]
            );
        } else {
            console.log(`Skipping surat ${row.nomor_surat} (id: ${row.id}) - already clean`);
        }
    }
    
    console.log('\nDone!');
    process.exit(0);
}

fixTemplates().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});