import { executeQuery } from './src/lib/server/db.js';

async function checkTemplates() {
    console.log('Checking current templates...');
    const rows = await executeQuery('SELECT id, kode, template_html FROM jenis_surat');
    
    for (const row of rows) {
        console.log(`\n=== ${row.kode} (id: ${row.id}) ===`);
        console.log(row.template_html.substring(0, 500));
        console.log('...');
        console.log(`Length: ${row.template_html.length} chars`);
    }
    
    process.exit(0);
}

checkTemplates().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});