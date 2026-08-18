/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { QuarantineRecord, CommodityDetail, TEMPAT_PELAYANAN_LIST } from '../types';
import { 
  Upload, FileText, CheckCircle2, AlertTriangle, 
  ArrowRight, X, Copy, Database, HelpCircle, Eye, RefreshCw
} from 'lucide-react';
import { parseAndNormalizeDate } from '../utils';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (newRecords: QuarantineRecord[]) => void;
  onBatchSyncToSheets?: (records: QuarantineRecord[]) => Promise<void>;
  isSyncingToSheets?: boolean;
}

export default function ImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  onBatchSyncToSheets,
  isSyncingToSheets = false
}: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedRecords, setParsedRecords] = useState<QuarantineRecord[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Helper to normalize dates from various formats (Excel serial number, DD/MM/YYYY, YYYY-MM-DD, etc.)
  const normalizeImportDate = (rawDate: any): string => {
    if (!rawDate) return new Date().toISOString().substring(0, 10);

    // If it's an Excel numeric date serial (e.g., 45312)
    if (typeof rawDate === 'number' || (!isNaN(Number(rawDate)) && Number(rawDate) > 30000 && Number(rawDate) < 60000)) {
      try {
        const utc_days = Math.floor(Number(rawDate) - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        return date_info.toISOString().substring(0, 10);
      } catch (e) {
        // fallback
      }
    }

    const str = String(rawDate).trim();
    
    // Check if DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // Check if YYYY-MM-DD
    const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return parseAndNormalizeDate(str) || new Date().toISOString().substring(0, 10);
  };

  // Helper to parse numbers safely (removes Rp, dots as thousand separators, replaces comma with dot)
  const parseCleanNumber = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    
    let str = String(val).trim().replace(/[Rr][Pp]\.?\s*/g, '');
    
    // If it has dot and comma (e.g. 1.500,50 or 1,500.50)
    if (str.includes('.') && str.includes(',')) {
      if (str.indexOf('.') < str.indexOf(',')) {
        str = str.replace(/\./g, '').replace(/,/g, '.');
      } else {
        str = str.replace(/,/g, '');
      }
    } else if (str.includes(',')) {
      // Indonesian decimal comma or thousand separator
      const parts = str.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        str = str.replace(',', '.');
      } else {
        str = str.replace(/,/g, '');
      }
    } else if (str.includes('.')) {
      const parts = str.split('.');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        str = str.replace(/\./g, '');
      }
    }

    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  // Helper to detect Tempat Pelayanan from specific port/location string
  const detectTempatPelayananFromPort = (
    portName: string, 
    fallbackSatpel: string = '', 
    fallbackTempatPeriksa: string = ''
  ): string => {
    const combined = `${portName || ''} ${fallbackSatpel || ''} ${fallbackTempatPeriksa || ''}`.toLowerCase();
    if (combined.includes('deo') || combined.includes('bandara') || combined.includes('domine') || combined.includes('udara')) {
      return 'TP Bandara DEO';
    }
    if (combined.includes('rakyat') || combined.includes('pelra')) {
      return 'TP Pelabuhan Rakyat';
    }
    if (combined.includes('pos') || combined.includes('kantor pos')) {
      return 'TP Kantor Pos';
    }
    if (combined.includes('raja ampat') || combined.includes('waisai')) {
      return 'TP Raja Ampat';
    }
    if (combined.includes('laut') || combined.includes('sorong') || combined.includes('pelabuhan')) {
      return 'TP Pelabuhan Laut';
    }
    return 'TP Pelabuhan Laut'; // Default
  };

  // Helper to detect Bidang
  const detectBidang = (klasifikasi: string, komoditas: string): 'Hewan' | 'Ikan' | 'Tumbuhan' => {
    const k = (klasifikasi || '').toLowerCase();
    const c = (komoditas || '').toLowerCase();

    if (k.includes('hewan') || k === 'kh' || k === 'h' || c.includes('sapi') || c.includes('kambing') || c.includes('ayam') || c.includes('daging') || c.includes('unggas')) {
      return 'Hewan';
    }
    if (k.includes('ikan') || k === 'ki' || k === 'i' || c.includes('ikan') || c.includes('kepiting') || c.includes('udang') || c.includes('tuna') || c.includes('cakalang') || c.includes('kerapu')) {
      return 'Ikan';
    }
    if (k.includes('tumbuh') || k === 'kt' || k === 't' || c.includes('kayu') || c.includes('gaharu') || c.includes('buah') || c.includes('sayur') || c.includes('bibit') || c.includes('kelapa') || c.includes('pala')) {
      return 'Tumbuhan';
    }
    return 'Tumbuhan'; // Default
  };

  // Helper to detect Status Lalu Lintas
  const detectStatusLaluLintas = (
    asal: string, 
    tujuan: string, 
    daerahAsal: string, 
    daerahTujuan: string,
    noDokumen: string
  ): 'Domestik Keluar' | 'Domestik Masuk' | 'Ekspor' | 'Impor' => {
    const fullAsal = `${asal || ''} ${daerahAsal || ''}`.toLowerCase();
    const fullTujuan = `${tujuan || ''} ${daerahTujuan || ''}`.toLowerCase();
    const doc = (noDokumen || '').toLowerCase();

    if (doc.includes('ekspor') || fullTujuan.includes('singapura') || fullTujuan.includes('china') || fullTujuan.includes('tiongkok') || fullTujuan.includes('japan') || fullTujuan.includes('jepang') || fullTujuan.includes('malaysia') || fullTujuan.includes('vietnam') || fullTujuan.includes('australia')) {
      return 'Ekspor';
    }
    if (doc.includes('impor') || fullAsal.includes('singapura') || fullAsal.includes('china') || fullAsal.includes('tiongkok') || fullAsal.includes('japan') || fullAsal.includes('jepang') || fullAsal.includes('malaysia') || fullAsal.includes('vietnam') || fullAsal.includes('australia')) {
      return 'Impor';
    }

    // Domestik: Check if Asal is Sorong / PBD -> Keluar, or if Tujuan is Sorong / PBD -> Masuk
    const isSorongAsal = fullAsal.includes('sorong') || fullAsal.includes('papua barat daya') || fullAsal.includes('raja ampat') || fullAsal.includes('tambrauw') || fullAsal.includes('maybrat');
    const isSorongTujuan = fullTujuan.includes('sorong') || fullTujuan.includes('papua barat daya') || fullTujuan.includes('raja ampat') || fullTujuan.includes('tambrauw') || fullTujuan.includes('maybrat');

    if (isSorongAsal && !isSorongTujuan) {
      return 'Domestik Keluar';
    }
    if (!isSorongAsal && isSorongTujuan) {
      return 'Domestik Masuk';
    }

    return 'Domestik Keluar'; // default
  };

  // Convert raw row object (from XLSX or TSV) into a standard QuarantineRecord
  const mapRawRowToRecord = (row: Record<string, any>, index: number): QuarantineRecord | null => {
    // Find key case-insensitively
    const getVal = (...keys: string[]): any => {
      for (const k of keys) {
        const matched = Object.keys(row).find(
          rk => rk.trim().toLowerCase() === k.trim().toLowerCase() ||
                rk.trim().toLowerCase().replace(/[\.\s_]/g, '') === k.trim().toLowerCase().replace(/[\.\s_]/g, '')
        );
        if (matched && row[matched] !== undefined && row[matched] !== null && String(row[matched]).trim() !== '') {
          return row[matched];
        }
      }
      return '';
    };

    const nomorDokumen = String(getVal('Nomor Dokumen', 'No. Dokumen', 'No Dokumen', 'No. K.1.1', 'No K11', 'No. Seri', 'No. Aju', 'No Aju') || `DOK-${Date.now()}-${index + 1}`).trim();
    const rawDate = getVal('Tgl Dokumen', 'Tanggal Dokumen', 'Tgl K.1.1', 'Tgl Aju', 'Tanggal', 'Tgl Periksa');
    const tanggalSertifikat = normalizeImportDate(rawDate);

    const satpel = String(getVal('Satpel', 'UPT', 'Tempat Periksa', 'Tempat Pelayanan', 'TP') || '').trim();
    const tempatPeriksa = String(getVal('Tempat Periksa', 'Alamat Tempat Periksa') || '').trim();
    const pengajuanVia = String(getVal('Pengajuan via', 'Via', 'Pengajuan Via') || '').toUpperCase().includes('SSM') ? 'SSM' : 'PTK';

    const asal = String(getVal('Daerah Asal', 'Asal', 'Pelabuhan Asal') || 'Sorong').trim();
    const tujuan = String(getVal('Daerah Tujuan', 'Tujuan', 'Pelabuhan Tujuan') || 'Jakarta').trim();
    const negaraTujuan = String(getVal('Negara Tujuan') || '').trim();

    const pelabuhanAsal = String(getVal('Pelabuhan Asal', 'Pelabuhan Muat', 'Pel. Asal', 'Pel. Muat') || '').trim();
    const pelabuhanTujuan = String(getVal('Pelabuhan Tujuan', 'Pelabuhan Bongkar', 'Pel. Tujuan', 'Pel. Bongkar') || '').trim();

    const klasifikasi = String(getVal('Klasifikasi', 'Bidang') || '').trim();
    const komoditasRaw = String(getVal('Komoditas', 'Nama Tercetak', 'Nama Komoditas', 'Ringkasan Komoditas') || 'Komoditas Karantina').trim();
    const bidang = detectBidang(klasifikasi, komoditasRaw);
    const statusLaluLintas = detectStatusLaluLintas(asal, tujuan, asal, tujuan, nomorDokumen);

    // Tempat Pelayanan logic:
    // - Dokel & Ekspor -> ambil dari Pelabuhan Muat / Pelabuhan Asal
    // - Domestik Masuk & Impor -> ambil dari Pelabuhan Bongkar / Pelabuhan Tujuan
    let chosenPort = '';
    if (statusLaluLintas === 'Domestik Keluar' || statusLaluLintas === 'Ekspor') {
      chosenPort = pelabuhanAsal;
    } else {
      chosenPort = pelabuhanTujuan;
    }
    const tempatPelayanan = detectTempatPelayananFromPort(chosenPort, satpel, tempatPeriksa);

    // Calculate volume: Utamakan Netto P8 sesuai instruksi, jika 0 fallback ke Vol P8 atau Netto lainnya
    let totalVol = parseCleanNumber(getVal('Netto P8', 'NettoP8'));
    if (totalVol === 0) {
      totalVol = parseCleanNumber(getVal('Vol P8', 'VolP8'));
    }
    if (totalVol === 0) {
      // Fallback ke akumulasi netto P1..P7 jika P8 kosong
      for (let p = 1; p <= 7; p++) {
        totalVol += parseCleanNumber(getVal(`Netto P${p}`, `NettoP${p}`, `Vol P${p}`, `VolP${p}`));
      }
    }
    if (totalVol === 0) {
      totalVol = parseCleanNumber(getVal('Vol Lain', 'VolLain', 'Jumlah Kemasan', 'Volume', 'Total Volume', 'Netto'));
    }

    // Detect unit
    let satuan = String(getVal('Satuan Netto', 'Satuan Bruto', 'Satuan Lain', 'Satuan') || '').trim();
    if (!satuan) {
      satuan = (bidang === 'Hewan' || bidang === 'Ikan') ? 'ekor' : 'kg';
    }

    // Economic Value
    const totalNilaiEkonomi = parseCleanNumber(getVal('Harga Barang (Rp)', 'Harga Barang', 'Nilai Barang', 'Total Nilai Ekonomi', 'Nilai Ekonomi'));

    // If volume is still 0, try parsing from commodity text e.g. "Kepiting 500 kg"
    let finalKomoditas = komoditasRaw;
    if (totalVol === 0) {
      const volMatch = komoditasRaw.match(/(\d+[\.,]?\d*)\s*([a-zA-Z³²\/]+)?/);
      if (volMatch) {
        totalVol = parseCleanNumber(volMatch[1]);
        if (volMatch[2]) satuan = volMatch[2];
        finalKomoditas = komoditasRaw.replace(/\(\s*\d+.*?\)/, '').trim();
      }
    }

    const docLink = String(getVal('Dokumen Pendukung', 'Link Sertifikat', 'Link Dokumen', 'Link') || '').trim();

    const commodityList: CommodityDetail[] = [
      {
        id: `com-${Date.now()}-${index}`,
        komoditas: finalKomoditas,
        volume: totalVol || 1,
        satuan: satuan || 'kg',
        nilaiEkonomi: totalNilaiEkonomi || 0
      }
    ];

    const record: QuarantineRecord = {
      id: `imp-${tanggalSertifikat.replace(/-/g, '')}-${index + 1}-${Math.floor(Math.random() * 1000)}`,
      tempatPelayanan,
      via: pengajuanVia,
      tanggalSertifikat,
      nomorDokumen,
      daerahAsal: asal,
      daerahTujuan: tujuan,
      negaraTujuan: statusLaluLintas === 'Ekspor' ? (negaraTujuan || tujuan) : '',
      bidang,
      statusLaluLintas,
      komoditasList: commodityList,
      komoditasSummary: `${finalKomoditas} (${totalVol} ${satuan})`,
      totalVolume: totalVol || 1,
      totalNilaiEkonomi: totalNilaiEkonomi || 0,
      linkSertifikat: docLink,
      createdAt: `${tanggalSertifikat}T08:00:00.000Z`
    };

    return record;
  };

  // Process uploaded Excel / CSV file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setParseError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON array of objects
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawData || rawData.length === 0) {
          throw new Error('File Excel tidak memiliki baris data atau kosong.');
        }

        const validRecords: QuarantineRecord[] = [];
        rawData.forEach((row, idx) => {
          const rec = mapRawRowToRecord(row, idx);
          if (rec) validRecords.push(rec);
        });

        if (validRecords.length === 0) {
          throw new Error('Tidak ada data yang dapat dipetakan dari file ini.');
        }

        setParsedRecords(validRecords);
      } catch (err: any) {
        console.error('Failed to parse excel:', err);
        setParseError(`Gagal membaca file: ${err.message || 'Format tidak dikenali'}`);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setParseError('Gagal membaca file dari komputer.');
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  // Process pasted TSV / CSV text
  const handleProcessPastedText = () => {
    if (!pasteText.trim()) {
      setParseError('Silakan tempel (paste) data dari tabel Web Monitoring Karantina terlebih dahulu.');
      return;
    }

    setIsProcessing(true);
    setParseError(null);

    try {
      const lines = pasteText.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        throw new Error('Data yang ditempel harus menyertakan baris header dan minimal 1 baris data.');
      }

      // Check delimiter (Tab vs Comma vs Semicolon)
      const firstLine = lines[0];
      let delimiter = '\t';
      if (firstLine.includes('\t')) {
        delimiter = '\t';
      } else if (firstLine.includes(';')) {
        delimiter = ';';
      } else if (firstLine.includes(',')) {
        delimiter = ',';
      }

      const headers = firstLine.split(delimiter).map(h => h.trim());
      const rawData: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter).map(c => c.trim());
        const rowObj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cols[idx] || '';
        });
        rawData.push(rowObj);
      }

      const validRecords: QuarantineRecord[] = [];
      rawData.forEach((row, idx) => {
        const rec = mapRawRowToRecord(row, idx);
        if (rec) validRecords.push(rec);
      });

      if (validRecords.length === 0) {
        throw new Error('Tidak ada baris data yang berhasil dipetakan.');
      }

      setParsedRecords(validRecords);
    } catch (err: any) {
      console.error('Failed to parse pasted text:', err);
      setParseError(err.message || 'Gagal memproses teks.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate clean table for direct copy to Google Sheets
  const handleCopyForGoogleSheets = () => {
    if (parsedRecords.length === 0) return;

    // Google Sheets Tabular columns:
    // ID | Tempat Pelayanan | Via | Tanggal Sertifikat | Nomor Dokumen | Daerah Asal | Daerah Tujuan | Negara Tujuan | Bidang | Status Lalu Lintas | Ringkasan Komoditas | Total Volume | Total Nilai Ekonomi | Link Sertifikat | CreatedAt
    const rows = parsedRecords.map(r => [
      r.id,
      r.tempatPelayanan,
      r.via,
      r.tanggalSertifikat,
      r.nomorDokumen,
      r.daerahAsal,
      r.daerahTujuan,
      r.negaraTujuan || '-',
      r.bidang,
      r.statusLaluLintas,
      r.komoditasSummary,
      r.totalVolume,
      r.totalNilaiEkonomi,
      r.linkSertifikat || '-',
      r.createdAt || new Date().toISOString()
    ].join('\t'));

    const fullTsv = rows.join('\n');
    navigator.clipboard.writeText(fullTsv).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    });
  };

  // Apply to app state
  const handleApplyToApp = () => {
    if (parsedRecords.length === 0) return;
    onImportSuccess(parsedRecords);
    onClose();
  };

  // Batch sync to Google Sheets
  const handleSyncToSheets = async () => {
    if (parsedRecords.length === 0 || !onBatchSyncToSheets) return;
    await onBatchSyncToSheets(parsedRecords);
    onClose();
  };

  // Calculate summary stats of parsed data
  const totalVolumeSum = parsedRecords.reduce((acc, r) => acc + (r.totalVolume || 0), 0);
  const totalNilaiSum = parsedRecords.reduce((acc, r) => acc + (r.totalNilaiEkonomi || 0), 0);
  const dateRangeMin = parsedRecords.length > 0 ? parsedRecords.reduce((min, r) => r.tanggalSertifikat < min ? r.tanggalSertifikat : min, parsedRecords[0].tanggalSertifikat) : '-';
  const dateRangeMax = parsedRecords.length > 0 ? parsedRecords.reduce((max, r) => r.tanggalSertifikat > max ? r.tanggalSertifikat : max, parsedRecords[0].tanggalSertifikat) : '-';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Import Rekapan Data Monitoring Karantina (Januari – Juli)
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  Auto-Parser IQFAST
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Pindahkan ratusan data sertifikat lama dari Web Mon Karantina ke aplikasi dalam 1 kali klik.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Method Selection Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => { setActiveTab('upload'); setParseError(null); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload File Excel / CSV (.xlsx / .csv)
            </button>
            <button
              onClick={() => { setActiveTab('paste'); setParseError(null); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'paste'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Copy - Paste Teks Tabel Langsung
            </button>
          </div>

          {/* TAB 1: File Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/70 transition-all rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".xlsx, .xls, .csv, .tsv"
                  className="hidden" 
                />
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform mb-3">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  {fileName ? `File Terpilih: ${fileName}` : 'Klik untuk memilih file hasil download dari Web Mon Karantina'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  Mendukung format file <b>.xlsx, .xls, atau .csv</b> dengan 62 kolom asli tanpa perlu Anda ubah strukturnya terlebih dahulu.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Direct Paste */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Tempel (Paste) Seluruh Tabel dari Web Monitoring Karantina (Termasuk Baris Header):
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Contoh: No.	Pengajuan via	No. Aju	Tgl Aju	...&#10;1	PTK	2026.1.1201...	2026-01-15	..."
                rows={6}
                className="w-full text-xs font-mono p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white text-slate-800"
              />
              <button
                onClick={handleProcessPastedText}
                disabled={isProcessing || !pasteText.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Proses & Petakan Data Teks
              </button>
            </div>
          )}

          {/* Error Message */}
          {parseError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold">Terjadi Kesalahan Saat Membaca Data:</p>
                <p className="mt-0.5">{parseError}</p>
              </div>
            </div>
          )}

          {/* PARSED PREVIEW SECTION */}
          {parsedRecords.length > 0 && (
            <div className="space-y-4 border-t border-slate-200 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    {parsedRecords.length}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-emerald-950">
                      {parsedRecords.length} Data Sertifikat Berhasil Dipetakan & Siap Diselamatkan!
                    </h5>
                    <p className="text-[11px] text-emerald-700">
                      Rentang Tanggal: <b>{dateRangeMin}</b> s/d <b>{dateRangeMax}</b> | Total Volume: <b>{totalVolumeSum.toLocaleString('id-ID')}</b> | Nilai: <b>Rp {totalNilaiSum.toLocaleString('id-ID')}</b>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyForGoogleSheets}
                    className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                    title="Salin baris yang sudah dirapikan untuk langsung dipaste ke sheet Laporan_Karantina"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copySuccess ? 'Tersalin ke Clipboard!' : 'Copy Format Google Sheets'}
                  </button>
                </div>
              </div>

              {/* Sample Table Preview (First 5 records) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-slate-500" />
                    Pratinjau 5 Data Pertama dari Total {parsedRecords.length} Data:
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Format otomatis terpisah: Tanggal, Dokumen, Asal-Tujuan, Bidang, Komoditas & Volume
                  </span>
                </div>
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Tanggal</th>
                        <th className="p-2.5">No. Dokumen</th>
                        <th className="p-2.5">Tempat Layanan</th>
                        <th className="p-2.5">Bidang / Status</th>
                        <th className="p-2.5">Rute (Asal → Tujuan)</th>
                        <th className="p-2.5">Komoditas & Volume</th>
                        <th className="p-2.5 text-right">Nilai Barang</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRecords.slice(0, 5).map((rec, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="p-2.5 font-medium whitespace-nowrap">{rec.tanggalSertifikat}</td>
                          <td className="p-2.5 font-mono text-[11px] text-indigo-700 font-bold whitespace-nowrap">{rec.nomorDokumen}</td>
                          <td className="p-2.5 whitespace-nowrap">{rec.tempatPelayanan}</td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px] mr-1">
                              {rec.bidang}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium text-[10px]">
                              {rec.statusLaluLintas}
                            </span>
                          </td>
                          <td className="p-2.5 text-[11px] whitespace-nowrap">{rec.daerahAsal} → {rec.daerahTujuan}</td>
                          <td className="p-2.5 font-medium text-slate-800">{rec.komoditasSummary}</td>
                          <td className="p-2.5 text-right font-medium text-emerald-700 whitespace-nowrap">
                            Rp {(rec.totalNilaiEkonomi || 0).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Guide Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
            <h6 className="font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              Bagaimana Parser Memetakan Kolom Otomatis?
            </h6>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1 text-[11px]">
              <li><b>Volume:</b> Diambil secara spesifik dari kolom <code>Netto P8</code> (dengan fallback otomatis ke <code>Vol P8</code> atau akumulasi netto jika kosong).</li>
              <li><b>Tempat Pelayanan:</b> Diambil dari <b>Pelabuhan Muat / Pelabuhan Asal</b> untuk status <i>Dokel & Ekspor</i>, dan dari <b>Pelabuhan Bongkar / Pelabuhan Tujuan</b> untuk status <i>Domestik Masuk</i> (diarahkan ke 5 Satpel BKHIT Papua Barat Daya: Bandara DEO, Pelabuhan Laut, Pelabuhan Rakyat, Kantor Pos, Raja Ampat).</li>
              <li><b>Bidang & Status:</b> Klasifikasi <code>KH</code>/<code>H</code> → Hewan, <code>KI</code>/<code>I</code> → Ikan, <code>KT</code>/<code>T</code> → Tumbuhan. Status rute dideteksi otomatis (Domestik Keluar, Domestik Masuk, Ekspor, Impor).</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            {onBatchSyncToSheets && (
              <button
                onClick={handleSyncToSheets}
                disabled={parsedRecords.length === 0 || isSyncingToSheets}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
                title="Kirim dan simpan semua data langsung ke Google Sheets"
              >
                {isSyncingToSheets ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                Simpan & Sync Langsung ke Google Sheets ({parsedRecords.length})
              </button>
            )}

            <button
              onClick={handleApplyToApp}
              disabled={parsedRecords.length === 0}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Terapkan ke Aplikasi ({parsedRecords.length} Data)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
