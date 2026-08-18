/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QuarantineRecord } from './types';

export const initialQuarantineRecords: QuarantineRecord[] = [
  {
    id: "qr-001",
    tempatPelayanan: "TP Pelabuhan Laut",
    via: "SSM",
    tanggalSertifikat: "2026-05-12",
    nomorDokumen: "K-SB/2026/05/00124",
    daerahAsal: "Sorong",
    daerahTujuan: "Shanghai",
    negaraTujuan: "Tiongkok",
    bidang: "Ikan",
    statusLaluLintas: "Ekspor",
    komoditasList: [
      { id: "c-1", komoditas: "Kepiting Bakau Hidup (Scylla serrata)", volume: 1500, satuan: "kg", nilaiEkonomi: 375000000 }
    ],
    komoditasSummary: "Kepiting Bakau Hidup (Scylla serrata)",
    totalVolume: 1500,
    totalNilaiEkonomi: 375000000,
    linkSertifikat: "https://karantina.go.id/sertifikat/verify?id=K-SB-2026-05-00124",
    createdAt: "2026-05-12T10:00:00Z"
  },
  {
    id: "qr-002",
    tempatPelayanan: "TP Bandara DEO",
    via: "PTK",
    tanggalSertifikat: "2026-05-14",
    nomorDokumen: "K-H/2026/05/00962",
    daerahAsal: "Sorong",
    daerahTujuan: "Jakarta",
    bidang: "Hewan",
    statusLaluLintas: "Domestik Keluar",
    komoditasList: [
      { id: "c-2", komoditas: "Ayam Day Old Chick (DOC)", volume: 5000, satuan: "ekor", nilaiEkonomi: 75000000 }
    ],
    komoditasSummary: "Ayam Day Old Chick (DOC)",
    totalVolume: 5000,
    totalNilaiEkonomi: 75000000,
    linkSertifikat: "https://karantina.go.id/sertifikat/verify?id=K-H-2026-05-00962",
    createdAt: "2026-05-14T11:20:00Z"
  },
  {
    id: "qr-003",
    tempatPelayanan: "TP Pelabuhan Laut",
    via: "PTK",
    tanggalSertifikat: "2026-05-18",
    nomorDokumen: "K-T/2026/05/00451",
    daerahAsal: "Surabaya",
    daerahTujuan: "Sorong",
    bidang: "Tumbuhan",
    statusLaluLintas: "Domestik Masuk",
    komoditasList: [
      { id: "c-3", komoditas: "Sayur Kubis Segar", volume: 12000, satuan: "kg", nilaiEkonomi: 180000000 },
      { id: "c-4", komoditas: "Wortel Segar", volume: 8000, satuan: "kg", nilaiEkonomi: 160000000 }
    ],
    komoditasSummary: "Sayur Kubis Segar, Wortel Segar",
    totalVolume: 20000,
    totalNilaiEkonomi: 340000000,
    linkSertifikat: "https://karantina.go.id/sertifikat/verify?id=K-T-2026-05-00451",
    createdAt: "2026-05-18T14:30:00Z"
  },
  {
    id: "qr-004",
    tempatPelayanan: "TP Kantor Pos",
    via: "PTK",
    tanggalSertifikat: "2026-05-20",
    nomorDokumen: "K-T/2026/05/00511",
    daerahAsal: "Maybrat (Kumurkek)",
    daerahTujuan: "Bandung",
    bidang: "Tumbuhan",
    statusLaluLintas: "Domestik Keluar",
    komoditasList: [
      { id: "c-5", komoditas: "Bibit Daun Gatal Papua", volume: 50, satuan: "pcs", nilaiEkonomi: 5000000 }
    ],
    komoditasSummary: "Bibit Daun Gatal Papua",
    totalVolume: 50,
    totalNilaiEkonomi: 5000000,
    linkSertifikat: "https://karantina.go.id/sertifikat/verify?id=K-T-2026-05-00511",
    createdAt: "2026-05-20T09:15:00Z"
  },
  {
    id: "qr-005",
    tempatPelayanan: "TP Raja Ampat",
    via: "SSM",
    tanggalSertifikat: "2026-06-01",
    nomorDokumen: "K-SB/2026/06/00015",
    daerahAsal: "Raja Ampat (Waisai)",
    daerahTujuan: "Tokyo",
    negaraTujuan: "Jepang",
    bidang: "Ikan",
    statusLaluLintas: "Ekspor",
    komoditasList: [
      { id: "c-6", komoditas: "Ikan Hias Kerapu Raja Ampat (Ornamental)", volume: 1200, satuan: "ekor", nilaiEkonomi: 240000000 }
    ],
    komoditasSummary: "Ikan Hias Kerapu Raja Ampat (Ornamental)",
    totalVolume: 1200,
    totalNilaiEkonomi: 240000000,
    linkSertifikat: "https://karantina.go.id/sertifikat/verify?id=K-SB-2026-06-00015",
    createdAt: "2026-06-01T08:00:00Z"
  },
  {
    id: "qr-006",
    tempatPelayanan: "TP Bandara DEO",
    via: "PTK",
    tanggalSertifikat: "2026-06-02",
    nomorDokumen: "K-I/2026/06/00102",
    daerahAsal: "Sorong",
    daerahTujuan: "Makassar",
    bidang: "Ikan",
    statusLaluLintas: "Domestik Keluar",
    komoditasList: [
      { id: "c-7", komoditas: "Benih Lobster Pasir", volume: 18000, satuan: "ekor", nilaiEkonomi: 540000000 }
    ],
    komoditasSummary: "Benih Lobster Pasir",
    totalVolume: 18000,
    totalNilaiEkonomi: 540000000,
    linkSertifikat: "https://karantina.go.id/sertifikat/verify?id=K-I-2026-06-00102",
    createdAt: "2026-06-02T13:45:00Z"
  },
  {
    id: "qr-007",
    tempatPelayanan: "TP Pelabuhan Rakyat",
    via: "PTK",
    tanggalSertifikat: "2026-06-04",
    nomorDokumen: "K-H/2026/06/00023",
    daerahAsal: "Sorong",
    daerahTujuan: "Raja Ampat (Waisai)",
    bidang: "Hewan",
    statusLaluLintas: "Domestik Keluar",
    komoditasList: [
      { id: "c-8", komoditas: "Kambing Kacang Ettawa", volume: 45, satuan: "ekor", nilaiEkonomi: 135000000 }
    ],
    komoditasSummary: "Kambing Kacang Ettawa",
    totalVolume: 45,
    totalNilaiEkonomi: 135000000,
    linkSertifikat: "https://karantina.go.id/sertifikat/verify?id=K-H-2026-06-00023",
    createdAt: "2026-06-04T10:10:00Z"
  },
  {
    id: "qr-008",
    tempatPelayanan: "TP Pelabuhan Laut",
    via: "PTK",
    tanggalSertifikat: "2026-06-05",
    nomorDokumen: "K-T/2026/06/00115",
    daerahAsal: "Tambrauw (Fef)",
    daerahTujuan: "Surabaya",
    bidang: "Tumbuhan",
    statusLaluLintas: "Domestik Keluar",
    komoditasList: [
      { id: "c-9", komoditas: "Kayu Masoyi (Bark)", volume: 15, satuan: "ton", nilaiEkonomi: 900000000 }
    ],
    komoditasSummary: "Kayu Masoyi (Bark)",
    totalVolume: 15,
    totalNilaiEkonomi: 900000000,
    linkSertifikat: "https://karantina.go.id/sertifikat/verify?id=K-T-2026-06-00115",
    createdAt: "2026-06-05T15:20:00Z"
  },
  {
    id: "qr-009",
    tempatPelayanan: "TP Pelabuhan Laut",
    via: "SSM",
    tanggalSertifikat: "2026-06-06",
    nomorDokumen: "K-SB/2026/06/00041",
    daerahAsal: "Sorong",
    daerahTujuan: "Rotterdam",
    negaraTujuan: "Belanda",
    bidang: "Tumbuhan",
    statusLaluLintas: "Ekspor",
    komoditasList: [
      { id: "c-10", komoditas: "Kopra Olahan Kelas A", volume: 50, satuan: "ton", nilaiEkonomi: 750000000 }
    ],
    komoditasSummary: "Kopra Olahan Kelas A",
    totalVolume: 50,
    totalNilaiEkonomi: 750000000,
    linkSertifikat: "https://karantina.go.id/sertifikat/verify?id=K-SB-2026-06-00041",
    createdAt: "2026-06-06T11:00:00Z"
  },
  {
    id: "qr-010",
    tempatPelayanan: "TP Bandara DEO",
    via: "SSM",
    tanggalSertifikat: "2026-06-07",
    nomorDokumen: "K-I/2026/06/00099",
    daerahAsal: "Sydney",
    daerahTujuan: "Sorong",
    negaraTujuan: "Australia",
    bidang: "Ikan",
    statusLaluLintas: "Impor",
    komoditasList: [
      { id: "c-11", komoditas: "Pakan Ikan Hias Premium", volume: 500, satuan: "kg", nilaiEkonomi: 45000000 }
    ],
    komoditasSummary: "Pakan Ikan Hias Premium",
    totalVolume: 500,
    totalNilaiEkonomi: 45000000,
    linkSertifikat: "https://karantina.go.id/sertifikat/verify?id=K-I-2026-06-00099",
    createdAt: "2026-06-07T09:40:00Z"
  },
  {
    id: "qr-011",
    tempatPelayanan: "TP Pelabuhan Laut",
    via: "PTK",
    tanggalSertifikat: "2026-06-08",
    nomorDokumen: "K-T/2026/06/00244",
    daerahAsal: "Makassar",
    daerahTujuan: "Sorong",
    bidang: "Tumbuhan",
    statusLaluLintas: "Domestik Masuk",
    komoditasList: [
      { id: "c-12", komoditas: "Beras Cianjur Unggul", volume: 45, satuan: "ton", nilaiEkonomi: 675000000 }
    ],
    komoditasSummary: "Beras Cianjur Unggul",
    totalVolume: 45,
    totalNilaiEkonomi: 675000000,
    linkSertifikat: "https://karantina.go.id/sertifikat/verify?id=K-T-2026-06-00244",
    createdAt: "2026-06-08T16:00:00Z"
  },
  {
    id: "qr-012",
    tempatPelayanan: "TP Pelabuhan Laut",
    via: "PTK",
    tanggalSertifikat: "2026-06-10",
    nomorDokumen: "K-H/2026/06/00311",
    daerahAsal: "Sorong",
    daerahTujuan: "Makassar",
    bidang: "Hewan",
    statusLaluLintas: "Domestik Keluar",
    komoditasList: [
      { id: "c-13", komoditas: "Daging Sapi Beku", volume: 12000, satuan: "kg", nilaiEkonomi: 1440000000 }
    ],
    komoditasSummary: "Daging Sapi Beku",
    totalVolume: 12000,
    totalNilaiEkonomi: 1440000000,
    linkSertifikat: "https://karantina.go.id/sertifikat/verify?id=K-H-2026-06-00311",
    createdAt: "2026-06-10T14:10:00Z"
  },
  {
    id: "qr-013",
    tempatPelayanan: "TP Raja Ampat",
    via: "PTK",
    tanggalSertifikat: "2026-06-11",
    nomorDokumen: "K-I/2026/06/00551",
    daerahAsal: "Raja Ampat (Waisai)",
    daerahTujuan: "Jakarta",
    bidang: "Ikan",
    statusLaluLintas: "Domestik Keluar",
    komoditasList: [
      { id: "c-14", komoditas: "Sarang Burung Walet Laut", volume: 150, satuan: "kg", nilaiEkonomi: 1800000000 }
    ],
    komoditasSummary: "Sarang Burung Walet Laut",
    totalVolume: 150,
    totalNilaiEkonomi: 1800000000,
    linkSertifikat: "https://karantina.go.id/sertifikat/verify?id=K-I-2026-06-00551",
    createdAt: "2026-06-11T11:50:00Z"
  },
  {
    id: "qr-014",
    tempatPelayanan: "TP Kantor Pos",
    via: "PTK",
    tanggalSertifikat: "2026-06-12",
    nomorDokumen: "K-T/2026/06/00612",
    daerahAsal: "Malang",
    daerahTujuan: "Sorong",
    bidang: "Tumbuhan",
    statusLaluLintas: "Domestik Masuk",
    komoditasList: [
      { id: "c-15", komoditas: "Bibit Bunga Anggrek Hias", volume: 350, satuan: "pcs", nilaiEkonomi: 17500000 }
    ],
    komoditasSummary: "Bibit Bunga Anggrek Hias",
    totalVolume: 350,
    totalNilaiEkonomi: 17500000,
    linkSertifikat: "https://karantina.go.id/sertifikat/verify?id=K-T-2026-06-00612",
    createdAt: "2026-06-12T10:30:00Z"
  },
  {
    id: "qr-015",
    tempatPelayanan: "TP Pelabuhan Laut",
    via: "SSM",
    tanggalSertifikat: "2026-06-13",
    nomorDokumen: "K-SB/2026/06/00092",
    daerahAsal: "Sorong",
    daerahTujuan: "Kuala Lumpur",
    negaraTujuan: "Malaysia",
    bidang: "Hewan",
    statusLaluLintas: "Ekspor",
    komoditasList: [
      { id: "c-16", komoditas: "Kulit Sapi Kering (Leather Raw)", volume: 8, satuan: "ton", nilaiEkonomi: 320000000 }
    ],
    komoditasSummary: "Kulit Sapi Kering (Leather Raw)",
    totalVolume: 8,
    totalNilaiEkonomi: 320000000,
    linkSertifikat: "https://karantina.go.id/sertifikat/verify?id=K-SB-2026-06-00092",
    createdAt: "2026-06-13T13:00:00Z"
  }
];

export const googleAppsScriptTemplate = `/**
 * Google Apps Script Backend for BKHIT Papua Barat Daya Quarantine Database
 * 
 * DIKEMBANGKAN UNTUK:
 * Laporan Operasional Perkarantinaan BKHIT Papua Barat Daya
 * 
 * CARA PENGGUNAAN:
 * 1. Buka Google Sheets (Buat Spreadsheet Baru).
 * 2. Klik menu "Ekstensi" -> "Apps Script".
 * 3. Hapus kode default, lalu salin dan tempel seluruh kode di bawah ini.
 * 4. Klik ikon Simpan (Save) dan jalankan fungsi "setupSheet" sekali untuk membuat header.
 * 5. Klik "Terapkan" (Deploy) -> "Terapkan Baru" (New Deployment).
 * 6. Pilih tipe: "Aplikasi Web" (Web App).
 * 7. Setel: "Yang memiliki akses" (Who has access) menjadi "Siapa saja" (Anyone) atau "Anyone, even anonymous" (wajib agar aplikasi React bisa mengakses).
 * 8. Izinkan akses (Authorize) saat diminta.
 * 9. Salin URL Aplikasi Web hasil deploy lalu tempel di konfigurasi Sync Aplikasi Web di aplikasi React Anda.
 */

const SHEET_NAME = 'Laporan_Karantina';
const COMMODITY_SHEET_NAME = 'Detail_Komoditas';

// Setup database awal: buat sheet jika belum ada dan buat baris header
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. SHEET RINGKASAN REKAP
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  const headers = [
    "ID", "Tempat Pelayanan", "Via", "Tanggal Sertifikat", "Nomor Dokumen", 
    "Daerah Asal", "Daerah Tujuan", "Negara Tujuan", "Bidang", "Status Lalu Lintas", 
    "Komoditas Detail", "Total Volume", "Total Nilai Ekonomi", "Link Sertifikat", "Created At"
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#125c34").setFontColor("#ffffff");
  sheet.autoResizeColumns(1, headers.length);
  
  // 2. SHEET DETAIL KOMODITAS FLAT/TERURAI (COCOK UNTUK PIVOT TABLE)
  let cmdSheet = ss.getSheetByName(COMMODITY_SHEET_NAME);
  if (!cmdSheet) {
    cmdSheet = ss.insertSheet(COMMODITY_SHEET_NAME);
  }
  const cmdHeaders = [
    "ID Dokumen", "Nomor Dokumen", "Tanggal Sertifikat", "Via", "Tempat Pelayanan", 
    "Bidang", "Nama Komoditas", "Volume", "Satuan", "Nilai Ekonomi Komoditas (IDR)", 
    "Daerah Asal", "Daerah Tujuan", "Negara Tujuan", "Status Lalu Lintas", "Link Sertifikat"
  ];
  cmdSheet.getRange(1, 1, 1, cmdHeaders.length).setValues([cmdHeaders]);
  cmdSheet.getRange(1, 1, 1, cmdHeaders.length).setFontWeight("bold").setBackground("#166534").setFontColor("#ffffff");
  cmdSheet.autoResizeColumns(1, cmdHeaders.length);
  
  Logger.log("Setup Selesai! Sudah siap Tab Ringkasan & Tab Detail Komoditas.");
  return { status: "success", message: "Database siap dengan 2 tab: Ringkasan & Detail Komoditas!" };
}

// Menangani permintaan GET - Mengambil semua data ringkasan
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    setupSheet();
    sheet = ss.getSheetByName(SHEET_NAME);
  }
  
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const record = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = row[j];
    }
    data.push(record);
  }
  
  const result = {
    status: 'success',
    data: data
  };
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Menangani permintaan POST - Menambahkan/Menyimpan data baru (Mendukung Satuan & Batch Array)
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      setupSheet();
      sheet = ss.getSheetByName(SHEET_NAME);
    }
    
    // Parse data parameter
    let rawData;
    if (e.postData && e.postData.contents) {
      rawData = JSON.parse(e.postData.contents);
    } else {
      rawData = e.parameter;
    }
    
    // Support single record or array of batch records
    const recordsList = Array.isArray(rawData) ? rawData : [rawData];
    let cmdSheet = ss.getSheetByName(COMMODITY_SHEET_NAME);
    if (!cmdSheet) {
      cmdSheet = ss.insertSheet(COMMODITY_SHEET_NAME);
    }

    recordsList.forEach(function(postData) {
      const id = postData.id || 'qr-' + Date.now();
      const tempatPelayanan = postData.tempatPelayanan || '';
      const via = postData.via || '';
      const tanggalSertifikat = postData.tanggalSertifikat || '';
      const nomorDokumen = postData.nomorDokumen || '';
      const daerahAsal = postData.daerahAsal || '';
      const daerahTujuan = postData.daerahTujuan || '';
      const negaraTujuan = postData.negaraTujuan || '';
      const bidang = postData.bidang || '';
      const statusLaluLintas = postData.statusLaluLintas || '';
      const komoditasSummary = postData.komoditasSummary || '';
      const totalVolume = Number(postData.totalVolume) || 0;
      const totalNilaiEkonomi = Number(postData.totalNilaiEkonomi) || 0;
      const linkSertifikat = postData.linkSertifikat || '';
      const createdAt = postData.createdAt || new Date().toISOString();
      
      const newRowData = [
        id,
        tempatPelayanan,
        via,
        tanggalSertifikat,
        nomorDokumen,
        daerahAsal,
        daerahTujuan,
        negaraTujuan,
        bidang,
        statusLaluLintas,
        komoditasSummary,
        totalVolume,
        totalNilaiEkonomi,
        linkSertifikat,
        createdAt
      ];

      // Cek apakah action adalah update atau ID dokumen sudah ada
      let isUpdated = false;
      if (postData.action === 'update') {
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          const idRange = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
          for (let r = 0; r < idRange.length; r++) {
            if (idRange[r][0] === id || idRange[r][4] === nomorDokumen) {
              sheet.getRange(r + 2, 1, 1, newRowData.length).setValues([newRowData]);
              isUpdated = true;
              break;
            }
          }
        }
      }

      // Jika bukan update atau data belum ada, tambahkan baris baru
      if (!isUpdated) {
        sheet.appendRow(newRowData);
      }
      
      // 2. Tulis Rincian Komoditas Secara Terurai ke Tab Detail_Komoditas jika ada list-nya
      if (postData.komoditasList && Array.isArray(postData.komoditasList)) {
        postData.komoditasList.forEach(function(item) {
          cmdSheet.appendRow([
            id,
            nomorDokumen,
            tanggalSertifikat,
            via,
            tempatPelayanan,
            bidang,
            item.komoditas || '',
            Number(item.volume) || 0,
            item.satuan || 'kg',
            Number(item.nilaiEkonomi) || 0,
            daerahAsal,
            daerahTujuan,
            negaraTujuan,
            statusLaluLintas,
            linkSertifikat
          ]);
        });
      }
    });
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success', 
      message: 'Data berhasil disinkronkan ke kedua Tab Google Sheet!',
      count: recordsList.length 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
