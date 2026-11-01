import { executeQuery } from './src/lib/server/db.js';

const jenisSurat = [
    {
        kode: 'SKD',
        nama: 'Surat Keterangan Domisili',
        deskripsi: 'Untuk keperluan administrasi KTP, KK, dll',
        urutan: 1,
        template_html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Times New Roman', serif; margin: 40px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h3 { margin: 5px 0; text-transform: uppercase; font-weight: bold; }
        .header hr { border: 1px solid #000; margin: 10px 0; }
        .nomor { text-align: center; margin-bottom: 20px; }
        .content { text-align: justify; line-height: 1.8; }
        .content p { margin: 10px 0; }
        .data-table { width: 100%; margin: 20px 0; border-collapse: collapse; }
        .data-table td { padding: 5px 10px; vertical-align: top; }
        .data-table td:first-child { width: 180px; font-weight: bold; }
        .data-table td:nth-child(2) { width: 20px; text-align: center; }
        .ttd { margin-top: 50px; text-align: right; }
        .ttd-block { display: inline-block; text-align: center; width: 250px; }
        .ttd-block p { margin: 5px 0; }
        .ttd-space { height: 60px; }
        .footer { margin-top: 30px; font-size: 11px; text-align: justify; }
    </style>
</head>
<body>
    <div class="header">
        <h3>surat keterangan domisili</h3>
        <h3>nomor: {{nomor_surat}}</h3>
        <hr>
    </div>
    
    <div class="content">
        <p>Yang bertanda tangan di bawah ini:</p>
        
        <table class="data-table">
            <tr><td>Nama</td><td>:</td><td>{{nama}}</td></tr>
            <tr><td>NIK</td><td>:</td><td>{{nik}}</td></tr>
            <tr><td>Tempat/Tanggal Lahir</td><td>:</td><td>{{tempat_lahir}}, {{tanggal_lahir}}</td></tr>
            <tr><td>Jenis Kelamin</td><td>:</td><td>{{jenis_kelamin}}</td></tr>
            <tr><td>Agama</td><td>:</td><td>{{agama}}</td></tr>
            <tr><td>Pekerjaan</td><td>:</td><td>{{pekerjaan}}</td></tr>
            <tr><td>Status Perkawinan</td><td>:</td><td>{{status_perkawinan}}</td></tr>
            <tr><td>No. KK</td><td>:</td><td>{{no_kk}}</td></tr>
            <tr><td>Alamat</td><td>:</td><td>{{alamat_rt}}, RT {{rt}} RW {{rw}}</td></tr>
        </table>
        
        <p>Menerangkan bahwa orang tersebut di atas benar-benar bermukim/domisili di alamat tersebut di atas.</p>
        <p>Surat keterangan ini dibuat untuk keperluan: <strong>{{keperluan}}</strong>.</p>
        <p>Demikian surat keterangan ini dibuat dengan sebenarnya dan dapat dipergunakan sebagaimana mestinya.</p>
    </div>
    
    <div class="ttd">
        <div class="ttd-block">
            <p>{{alamat_rt}}, {{tanggal_surat}}</p>
            <p>Kepala RT {{rt}} RW {{rw}}</p>
            <div class="ttd-space"></div>
            <p><u>{{nama_rt}}</u></p>
            <p>NIP. {{nip_rt}}</p>
        </div>
    </div>
    
    <div class="footer">
        <p><strong>Catatan:</strong> Surat ini hanya berlaku untuk keperluan sebagaimana tercantum di atas. Pembuatan surat keterangan palsu dapat dikenakan sanksi pidana sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.</p>
    </div>
</body>
</html>`,
        variabel_default: JSON.stringify({})
    },
    {
        kode: 'SKTM',
        nama: 'Surat Keterangan Tidak Mampu',
        deskripsi: 'Untuk bantuan sosial, beasiswa, KIP, dll',
        urutan: 2,
        template_html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Times New Roman', serif; margin: 40px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h3 { margin: 5px 0; text-transform: uppercase; font-weight: bold; }
        .header hr { border: 1px solid #000; margin: 10px 0; }
        .nomor { text-align: center; margin-bottom: 20px; }
        .content { text-align: justify; line-height: 1.8; }
        .content p { margin: 10px 0; }
        .data-table { width: 100%; margin: 20px 0; border-collapse: collapse; }
        .data-table td { padding: 5px 10px; vertical-align: top; }
        .data-table td:first-child { width: 180px; font-weight: bold; }
        .data-table td:nth-child(2) { width: 20px; text-align: center; }
        .ttd { margin-top: 50px; text-align: right; }
        .ttd-block { display: inline-block; text-align: center; width: 250px; }
        .ttd-block p { margin: 5px 0; }
        .ttd-space { height: 60px; }
        .footer { margin-top: 30px; font-size: 11px; text-align: justify; }
    </style>
</head>
<body>
    <div class="header">
        <h3>surat keterangan tidak mampu</h3>
        <h3>nomor: {{nomor_surat}}</h3>
        <hr>
    </div>
    
    <div class="content">
        <p>Yang bertanda tangan di bawah ini:</p>
        
        <table class="data-table">
            <tr><td>Nama</td><td>:</td><td>{{nama}}</td></tr>
            <tr><td>NIK</td><td>:</td><td>{{nik}}</td></tr>
            <tr><td>Tempat/Tanggal Lahir</td><td>:</td><td>{{tempat_lahir}}, {{tanggal_lahir}}</td></tr>
            <tr><td>Jenis Kelamin</td><td>:</td><td>{{jenis_kelamin}}</td></tr>
            <tr><td>Agama</td><td>:</td><td>{{agama}}</td></tr>
            <tr><td>Pekerjaan</td><td>:</td><td>{{pekerjaan}}</td></tr>
            <tr><td>Status Perkawinan</td><td>:</td><td>{{status_perkawinan}}</td></tr>
            <tr><td>No. KK</td><td>:</td><td>{{no_kk}}</td></tr>
            <tr><td>Alamat</td><td>:</td><td>{{alamat_rt}}, RT {{rt}} RW {{rw}}</td></tr>
        </table>
        
        <p>Menerangkan bahwa orang tersebut di atas benar-benar termasuk keluarga <strong>tidak mampu (miskin)</strong> dan berhak menerima bantuan sosial/pemerintah.</p>
        <p>Surat keterangan ini dibuat untuk keperluan: <strong>{{keperluan}}</strong>.</p>
        <p>Demikian surat keterangan ini dibuat dengan sebenarnya dan dapat dipergunakan sebagaimana mestinya.</p>
    </div>
    
    <div class="ttd">
        <div class="ttd-block">
            <p>{{alamat_rt}}, {{tanggal_surat}}</p>
            <p>Kepala RT {{rt}} RW {{rw}}</p>
            <div class="ttd-space"></div>
            <p><u>{{nama_rt}}</u></p>
            <p>NIP. {{nip_rt}}</p>
        </div>
    </div>
    
    <div class="footer">
        <p><strong>Catatan:</strong> Surat ini hanya berlaku untuk keperluan sebagaimana tercantum di atas. Pembuatan surat keterangan palsu dapat dikenakan sanksi pidana sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.</p>
    </div>
</body>
</html>`,
        variabel_default: JSON.stringify({})
    },
    {
        kode: 'SKBM',
        nama: 'Surat Keterangan Belum Menikah',
        deskripsi: 'Untuk keperluan nikah, KTP, administrasi pernikahan',
        urutan: 3,
        template_html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Times New Roman', serif; margin: 40px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h3 { margin: 5px 0; text-transform: uppercase; font-weight: bold; }
        .header hr { border: 1px solid #000; margin: 10px 0; }
        .nomor { text-align: center; margin-bottom: 20px; }
        .content { text-align: justify; line-height: 1.8; }
        .content p { margin: 10px 0; }
        .data-table { width: 100%; margin: 20px 0; border-collapse: collapse; }
        .data-table td { padding: 5px 10px; vertical-align: top; }
        .data-table td:first-child { width: 180px; font-weight: bold; }
        .data-table td:nth-child(2) { width: 20px; text-align: center; }
        .ttd { margin-top: 50px; text-align: right; }
        .ttd-block { display: inline-block; text-align: center; width: 250px; }
        .ttd-block p { margin: 5px 0; }
        .ttd-space { height: 60px; }
        .footer { margin-top: 30px; font-size: 11px; text-align: justify; }
    </style>
</head>
<body>
    <div class="header">
        <h3>surat keterangan belum menikah</h3>
        <h3>nomor: {{nomor_surat}}</h3>
        <hr>
    </div>
    
    <div class="content">
        <p>Yang bertanda tangan di bawah ini:</p>
        
        <table class="data-table">
            <tr><td>Nama</td><td>:</td><td>{{nama}}</td></tr>
            <tr><td>NIK</td><td>:</td><td>{{nik}}</td></tr>
            <tr><td>Tempat/Tanggal Lahir</td><td>:</td><td>{{tempat_lahir}}, {{tanggal_lahir}}</td></tr>
            <tr><td>Jenis Kelamin</td><td>:</td><td>{{jenis_kelamin}}</td></tr>
            <tr><td>Agama</td><td>:</td><td>{{agama}}</td></tr>
            <tr><td>Pekerjaan</td><td>:</td><td>{{pekerjaan}}</td></tr>
            <tr><td>No. KK</td><td>:</td><td>{{no_kk}}</td></tr>
            <tr><td>Alamat</td><td>:</td><td>{{alamat_rt}}, RT {{rt}} RW {{rw}}</td></tr>
        </table>
        
        <p>Menerangkan bahwa orang tersebut di atas sampai saat ini <strong>belum pernah menikah</strong> (belum memiliki status perkawinan).</p>
        <p>Surat keterangan ini dibuat untuk keperluan: <strong>{{keperluan}}</strong>.</p>
        <p>Demikian surat keterangan ini dibuat dengan sebenarnya dan dapat dipergunakan sebagaimana mestinya.</p>
    </div>
    
    <div class="ttd">
        <div class="ttd-block">
            <p>{{alamat_rt}}, {{tanggal_surat}}</p>
            <p>Kepala RT {{rt}} RW {{rw}}</p>
            <div class="ttd-space"></div>
            <p><u>{{nama_rt}}</u></p>
            <p>NIP. {{nip_rt}}</p>
        </div>
    </div>
    
    <div class="footer">
        <p><strong>Catatan:</strong> Surat ini hanya berlaku untuk keperluan sebagaimana tercantum di atas. Pembuatan surat keterangan palsu dapat dikenakan sanksi pidana sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.</p>
    </div>
</body>
</html>`,
        variabel_default: JSON.stringify({})
    },
    {
        kode: 'SKU',
        nama: 'Surat Keterangan Usaha',
        deskripsi: 'Untuk izin usaha, SIUP, modal usaha, dll',
        urutan: 4,
        template_html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Times New Roman', serif; margin: 40px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h3 { margin: 5px 0; text-transform: uppercase; font-weight: bold; }
        .header hr { border: 1px solid #000; margin: 10px 0; }
        .nomor { text-align: center; margin-bottom: 20px; }
        .content { text-align: justify; line-height: 1.8; }
        .content p { margin: 10px 0; }
        .data-table { width: 100%; margin: 20px 0; border-collapse: collapse; }
        .data-table td { padding: 5px 10px; vertical-align: top; }
        .data-table td:first-child { width: 180px; font-weight: bold; }
        .data-table td:nth-child(2) { width: 20px; text-align: center; }
        .ttd { margin-top: 50px; text-align: right; }
        .ttd-block { display: inline-block; text-align: center; width: 250px; }
        .ttd-block p { margin: 5px 0; }
        .ttd-space { height: 60px; }
        .footer { margin-top: 30px; font-size: 11px; text-align: justify; }
    </style>
</head>
<body>
    <div class="header">
        <h3>surat keterangan usaha</h3>
        <h3>nomor: {{nomor_surat}}</h3>
        <hr>
    </div>
    
    <div class="content">
        <p>Yang bertanda tangan di bawah ini:</p>
        
        <table class="data-table">
            <tr><td>Nama</td><td>:</td><td>{{nama}}</td></tr>
            <tr><td>NIK</td><td>:</td><td>{{nik}}</td></tr>
            <tr><td>Tempat/Tanggal Lahir</td><td>:</td><td>{{tempat_lahir}}, {{tanggal_lahir}}</td></tr>
            <tr><td>Jenis Kelamin</td><td>:</td><td>{{jenis_kelamin}}</td></tr>
            <tr><td>Agama</td><td>:</td><td>{{agama}}</td></tr>
            <tr><td>Pekerjaan</td><td>:</td><td>{{pekerjaan}}</td></tr>
            <tr><td>No. KK</td><td>:</td><td>{{no_kk}}</td></tr>
            <tr><td>Alamat</td><td>:</td><td>{{alamat_rt}}, RT {{rt}} RW {{rw}}</td></tr>
        </table>
        
        <p>Menerangkan bahwa orang tersebut di atas benar-benar menggeluti usaha <strong>{{pekerjaan}}</strong> di alamat tersebut di atas.</p>
        <p>Surat keterangan ini dibuat untuk keperluan: <strong>{{keperluan}}</strong>.</p>
        <p>Demikian surat keterangan ini dibuat dengan sebenarnya dan dapat dipergunakan sebagaimana mestinya.</p>
    </div>
    
    <div class="ttd">
        <div class="ttd-block">
            <p>{{alamat_rt}}, {{tanggal_surat}}</p>
            <p>Kepala RT {{rt}} RW {{rw}}</p>
            <div class="ttd-space"></div>
            <p><u>{{nama_rt}}</u></p>
            <p>NIP. {{nip_rt}}</p>
        </div>
    </div>
    
    <div class="footer">
        <p><strong>Catatan:</strong> Surat ini hanya berlaku untuk keperluan sebagaimana tercantum di atas. Pembuatan surat keterangan palsu dapat dikenakan sanksi pidana sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.</p>
    </div>
</body>
</html>`,
        variabel_default: JSON.stringify({})
    },
    {
        kode: 'SKPN',
        nama: 'Surat Pengantar Nikah',
        deskripsi: 'Untuk keperluan pernikahan di KUA/Kantor Catatan Sipil',
        urutan: 5,
        template_html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Times New Roman', serif; margin: 40px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h3 { margin: 5px 0; text-transform: uppercase; font-weight: bold; }
        .header hr { border: 1px solid #000; margin: 10px 0; }
        .nomor { text-align: center; margin-bottom: 20px; }
        .content { text-align: justify; line-height: 1.8; }
        .content p { margin: 10px 0; }
        .data-table { width: 100%; margin: 20px 0; border-collapse: collapse; }
        .data-table td { padding: 5px 10px; vertical-align: top; }
        .data-table td:first-child { width: 180px; font-weight: bold; }
        .data-table td:nth-child(2) { width: 20px; text-align: center; }
        .ttd { margin-top: 50px; text-align: right; }
        .ttd-block { display: inline-block; text-align: center; width: 250px; }
        .ttd-block p { margin: 5px 0; }
        .ttd-space { height: 60px; }
        .footer { margin-top: 30px; font-size: 11px; text-align: justify; }
    </style>
</head>
<body>
    <div class="header">
        <h3>surat pengantar nikah</h3>
        <h3>nomor: {{nomor_surat}}</h3>
        <hr>
    </div>
    
    <div class="content">
        <p>Yang bertanda tangan di bawah ini:</p>
        
        <table class="data-table">
            <tr><td>Nama Calon Suami/Istri</td><td>:</td><td>{{nama}}</td></tr>
            <tr><td>NIK</td><td>:</td><td>{{nik}}</td></tr>
            <tr><td>Tempat/Tanggal Lahir</td><td>:</td><td>{{tempat_lahir}}, {{tanggal_lahir}}</td></tr>
            <tr><td>Jenis Kelamin</td><td>:</td><td>{{jenis_kelamin}}</td></tr>
            <tr><td>Agama</td><td>:</td><td>{{agama}}</td></tr>
            <tr><td>Pekerjaan</td><td>:</td><td>{{pekerjaan}}</td></tr>
            <tr><td>Status Perkawinan</td><td>:</td><td>{{status_perkawinan}}</td></tr>
            <tr><td>No. KK</td><td>:</td><td>{{no_kk}}</td></tr>
            <tr><td>Alamat</td><td>:</td><td>{{alamat_rt}}, RT {{rt}} RW {{rw}}</td></tr>
            <tr><td>Nama Ayah</td><td>:</td><td>{{nama_ayah}}</td></tr>
            <tr><td>Nama Ibu</td><td>:</td><td>{{nama_ibu}}</td></tr>
        </table>
        
        <p>Menerangkan bahwa orang tersebut di atas benar-benar warga RT {{rt}} RW {{rw}} dan <strong>belum pernah menikah</strong>, serta tidak ada halangan hukum untuk menikah.</p>
        <p>Surat pengantar ini dibuat untuk keperluan: <strong>{{keperluan}}</strong> (pendaftaran nikah di KUA/KCS).</p>
        <p>Demikian surat pengantar ini dibuat dengan sebenarnya dan dapat dipergunakan sebagaimana mestinya.</p>
    </div>
    
    <div class="ttd">
        <div class="ttd-block">
            <p>{{alamat_rt}}, {{tanggal_surat}}</p>
            <p>Kepala RT {{rt}} RW {{rw}}</p>
            <div class="ttd-space"></div>
            <p><u>{{nama_rt}}</u></p>
            <p>NIP. {{nip_rt}}</p>
        </div>
    </div>
    
    <div class="footer">
        <p><strong>Catatan:</strong> Surat ini hanya berlaku untuk keperluan sebagaimana tercantum di atas. Pembuatan surat keterangan palsu dapat dikenakan sanksi pidana sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.</p>
    </div>
</body>
</html>`,
        variabel_default: JSON.stringify({ nama_ayah: '', nama_ibu: '' })
    },
    {
        kode: 'SKK',
        nama: 'Surat Keterangan Kematian',
        deskripsi: 'Untuk keperluan administrasi waris, penghapusan KK, dll',
        urutan: 6,
        template_html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Times New Roman', serif; margin: 40px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h3 { margin: 5px 0; text-transform: uppercase; font-weight: bold; }
        .header hr { border: 1px solid #000; margin: 10px 0; }
        .nomor { text-align: center; margin-bottom: 20px; }
        .content { text-align: justify; line-height: 1.8; }
        .content p { margin: 10px 0; }
        .data-table { width: 100%; margin: 20px 0; border-collapse: collapse; }
        .data-table td { padding: 5px 10px; vertical-align: top; }
        .data-table td:first-child { width: 180px; font-weight: bold; }
        .data-table td:nth-child(2) { width: 20px; text-align: center; }
        .ttd { margin-top: 50px; text-align: right; }
        .ttd-block { display: inline-block; text-align: center; width: 250px; }
        .ttd-block p { margin: 5px 0; }
        .ttd-space { height: 60px; }
        .footer { margin-top: 30px; font-size: 11px; text-align: justify; }
    </style>
</head>
<body>
    <div class="header">
        <h3>surat keterangan kematian</h3>
        <h3>nomor: {{nomor_surat}}</h3>
        <hr>
    </div>
    
    <div class="content">
        <p>Yang bertanda tangan di bawah ini:</p>
        
        <table class="data-table">
            <tr><td>Nama Almarhum/Almarhumah</td><td>:</td><td>{{nama}}</td></tr>
            <tr><td>NIK</td><td>:</td><td>{{nik}}</td></tr>
            <tr><td>Tempat/Tanggal Lahir</td><td>:</td><td>{{tempat_lahir}}, {{tanggal_lahir}}</td></tr>
            <tr><td>Jenis Kelamin</td><td>:</td><td>{{jenis_kelamin}}</td></tr>
            <tr><td>Agama</td><td>:</td><td>{{agama}}</td></tr>
            <tr><td>Pekerjaan</td><td>:</td><td>{{pekerjaan}}</td></tr>
            <tr><td>Status Perkawinan</td><td>:</td><td>{{status_perkawinan}}</td></tr>
            <tr><td>No. KK</td><td>:</td><td>{{no_kk}}</td></tr>
            <tr><td>Alamat Terakhir</td><td>:</td><td>{{alamat_rt}}, RT {{rt}} RW {{rw}}</td></tr>
            <tr><td>Tanggal Meninggal</td><td>:</td><td>{{tanggal_meninggal}}</td></tr>
            <tr><td>Penyebab Kematian</td><td>:</td><td>{{penyebab_kematian}}</td></tr>
        </table>
        
        <p>Menerangkan bahwa orang tersebut di atas telah <strong>meninggal dunia</strong> pada tanggal {{tanggal_meninggal}} karena {{penyebab_kematian}}.</p>
        <p>Surat keterangan ini dibuat untuk keperluan: <strong>{{keperluan}}</strong>.</p>
        <p>Demikian surat keterangan ini dibuat dengan sebenarnya dan dapat dipergunakan sebagaimana mestinya.</p>
    </div>
    
    <div class="ttd">
        <div class="ttd-block">
            <p>{{alamat_rt}}, {{tanggal_surat}}</p>
            <p>Kepala RT {{rt}} RW {{rw}}</p>
            <div class="ttd-space"></div>
            <p><u>{{nama_rt}}</u></p>
            <p>NIP. {{nip_rt}}</p>
        </div>
    </div>
    
    <div class="footer">
        <p><strong>Catatan:</strong> Surat ini hanya berlaku untuk keperluan sebagaimana tercantum di atas. Pembuatan surat keterangan palsu dapat dikenakan sanksi pidana sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.</p>
    </div>
</body>
</html>`,
        variabel_default: JSON.stringify({ tanggal_meninggal: '', penyebab_kematian: '' })
    }
];

async function seedJenisSurat() {
    try {
        for (const js of jenisSurat) {
            await executeQuery(`
                INSERT INTO jenis_surat (kode, nama, deskripsi, template_html, variabel_default, aktif, urutan)
                VALUES (?, ?, ?, ?, ?, TRUE, ?)
                ON DUPLICATE KEY UPDATE 
                    nama = VALUES(nama),
                    deskripsi = VALUES(deskripsi),
                    template_html = VALUES(template_html),
                    variabel_default = VALUES(variabel_default),
                    urutan = VALUES(urutan)
            `, [js.kode, js.nama, js.deskripsi, js.template_html, js.variabel_default, js.urutan]);
            console.log(`Seeded: ${js.kode} - ${js.nama}`);
        }
        console.log('All jenis_surat seeded successfully!');
    } catch (e) {
        console.error('Seed error:', e.message);
    }
}

seedJenisSurat();