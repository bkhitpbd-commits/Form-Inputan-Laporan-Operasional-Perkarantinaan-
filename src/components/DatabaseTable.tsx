/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { QuarantineRecord } from '../types';
import { 
  Search, Download, Trash2, ExternalLink, RefreshCw, Calendar, 
  ArrowUpDown, ChevronDown, FileSpreadsheet, UploadCloud, Pencil, Lock
} from 'lucide-react';
import ImportModal from './ImportModal';
import EditRecordModal from './EditRecordModal';

interface DatabaseTableProps {
  records: QuarantineRecord[];
  onDeleteRecord: (id: string) => void;
  onRefresh?: () => void;
  isReady?: boolean;
  onImportRecords?: (newRecords: QuarantineRecord[]) => void;
  onBatchSyncToSheets?: (records: QuarantineRecord[]) => Promise<void>;
  isSyncingToSheets?: boolean;
  onUpdateRecord?: (updatedRecord: QuarantineRecord) => void;
  isAdmin?: boolean;
}

export default function DatabaseTable({ 
  records, 
  onDeleteRecord, 
  onRefresh,
  isReady = true,
  onImportRecords,
  onBatchSyncToSheets,
  isSyncingToSheets = false,
  onUpdateRecord,
  isAdmin = false
}: DatabaseTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // State for Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // State for Edit Modal
  const [selectedEditRecord, setSelectedEditRecord] = useState<QuarantineRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // State for export options dropdown
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sorting columns
  const [sortBy, setSortBy] = useState<'date' | 'value' | 'volume'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Search filtering
  const filteredRecords = records.filter(rec => {
    const term = searchTerm.toLowerCase();
    const matchesDoc = rec.nomorDokumen.toLowerCase().includes(term);
    const matchesPlace = rec.tempatPelayanan.toLowerCase().includes(term);
    const matchesCommodity = rec.komoditasList.some(c => c.komoditas.toLowerCase().includes(term));
    const matchesCountry = (rec.negaraTujuan || '').toLowerCase().includes(term);
    const matchesAsal = rec.daerahAsal.toLowerCase().includes(term);
    const matchesTujuan = rec.daerahTujuan.toLowerCase().includes(term);
    const matchesStatus = rec.statusLaluLintas.toLowerCase().includes(term);
    const matchesBidang = rec.bidang.toLowerCase().includes(term);

    return matchesDoc || matchesPlace || matchesCommodity || matchesCountry || matchesAsal || matchesTujuan || matchesStatus || matchesBidang;
  });

  // Sorting logic
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = new Date(a.tanggalSertifikat).getTime();
      const dateB = new Date(b.tanggalSertifikat).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    } else if (sortBy === 'value') {
      const valA = a.totalNilaiEkonomi || 0;
      const valB = b.totalNilaiEkonomi || 0;
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    } else {
      const volA = a.totalVolume || 0;
      const volB = b.totalVolume || 0;
      return sortOrder === 'desc' ? volB - volA : volA - volB;
    }
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = sortedRecords.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleToggleSort = (type: 'date' | 'value' | 'volume') => {
    if (sortBy === type) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortOrder('desc');
    }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
       maximumFractionDigits: 0
    }).format(val);
  };

  const formatVolume = (val: number, list: any[]) => {
    const defaultUnit = list[0]?.satuan || 'kg';
    return `${val.toLocaleString('id-ID')} ${defaultUnit}`;
  };

  // Safe Deletion Flow with User Confirmation Dialogue as required by Workspace Skill Guidelines
  const handleDeleteConfirm = (id: string, docNum: string) => {
    const confirmation = window.confirm(
      `Apakah Anda yakin ingin menghapus data Laporan Karantina dengan Nomor Dokumen: "${docNum}" dari database? Tindakan ini akan menghapus data secara permanen.`
    );
    if (confirmation) {
      onDeleteRecord(id);
    }
  };

  // Export to CSV (Ringkasan) Function - Menggunakan Blob & BOM \uFEFF agar Unicode (seperti simbol volume/satuan) terbaca sempurna di Microsoft Excel
  const handleExportCSV = () => {
    const headers = [
      "No",
      "Nomor Dokumen",
      "Tanggal Sertifikat",
      "Via",
      "Tempat Pelayanan",
      "Bidang",
      "Komoditas Detail (Ringkas)",
      "Total Volume",
      "Total Nilai Karantina (IDR)",
      "Daerah Asal",
      "Daerah Tujuan",
      "Negara Tujuan",
      "Status Lalu Lintas",
      "Link Sertifikat"
    ];

    const rows = records.map((rec, index) => [
      index + 1,
      `"${rec.nomorDokumen}"`,
      rec.tanggalSertifikat,
      rec.via,
      `"${rec.tempatPelayanan}"`,
      rec.bidang,
      `"${rec.komoditasList.map(c => `${c.komoditas} (${c.volume} ${c.satuan})`).join(', ')}"`,
      rec.totalVolume,
      rec.totalNilaiEkonomi,
      `"${rec.daerahAsal}"`,
      `"${rec.daerahTujuan}"`,
      `"${rec.negaraTujuan || '-'}"`,
      `"${rec.statusLaluLintas}"`,
      `"${rec.linkSertifikat}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BKHIT_Ringkasan_Dokumen_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportDropdown(false);
  };

  // Export to CSV (Detail Komoditas per baris terpisah - Cocok untuk Pivot Table Excel)
  const handleExportIndividualCommoditiesCSV = () => {
    const headers = [
      "No",
      "Nomor Dokumen",
      "Tanggal Sertifikat",
      "Via",
      "Tempat Pelayanan",
      "Bidang",
      "Nama Komoditas",
      "Volume",
      "Satuan",
      "Nilai Ekonomi Komoditas (IDR)",
      "Daerah Asal",
      "Daerah Tujuan",
      "Negara Tujuan",
      "Status Lalu Lintas",
      "Link Sertifikat"
    ];

    const rows: any[] = [];
    let noCounter = 1;

    records.forEach((rec) => {
      if (!rec.komoditasList || rec.komoditasList.length === 0) {
        // Jika tidak ada list komoditas (pengaman), isi default
        rows.push([
          noCounter++,
          `"${rec.nomorDokumen}"`,
          rec.tanggalSertifikat,
          rec.via,
          `"${rec.tempatPelayanan}"`,
          rec.bidang,
          "-",
          0,
          "-",
          0,
          `"${rec.daerahAsal}"`,
          `"${rec.daerahTujuan}"`,
          `"${rec.negaraTujuan || '-'}"`,
          `"${rec.statusLaluLintas}"`,
          `"${rec.linkSertifikat}"`
        ]);
      } else {
        // Urai setiap komoditas menjadi baris tersendiri agar bisa langsung di-olahkan di Excel (Pivot, Chart, dll)
        rec.komoditasList.forEach((c) => {
          rows.push([
            noCounter++,
            `"${rec.nomorDokumen}"`,
            rec.tanggalSertifikat,
            rec.via,
            `"${rec.tempatPelayanan}"`,
            rec.bidang,
            `"${c.komoditas}"`,
            c.volume || 0,
            `"${c.satuan || 'kg'}"`,
            c.nilaiEkonomi || 0,
            `"${rec.daerahAsal}"`,
            `"${rec.daerahTujuan}"`,
            `"${rec.negaraTujuan || '-'}"`,
            `"${rec.statusLaluLintas}"`,
            `"${rec.linkSertifikat}"`
          ]);
        });
      }
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BKHIT_Detail_Komoditas_Sertifikasi_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportDropdown(false);
  };

  return (
    <div id="database-table-card" className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden text-left">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-semibold text-lg text-slate-800 leading-tight">Database Laporan Karantina</h2>
          <p className="text-xs text-slate-500 mt-1">Daftar arsip operasional lalu lintas komoditas Papua Barat Daya</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Import Button */}
          {onImportRecords && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-[0.98]"
              title="Import data rekapan dari Web Mon Karantina (IQFAST) atau Excel"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import Rekapan (Jan - Jul)</span>
            </button>
          )}

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
              title="Refresh Data Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${!isReady ? 'animate-spin' : ''}`} />
              <span className="text-xs font-semibold md:inline hidden">Refresh</span>
            </button>
          )}

          {/* Export Dropdown Container */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV / Excel</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 animate-fade-in text-left">
                <div className="px-3.5 py-1.5 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Metode Pengunduhan</span>
                </div>
                
                {/* Opsi 1: Ringkasan Dokumen */}
                <button
                  onClick={handleExportCSV}
                  className="w-full px-4 py-3 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-900 transition-colors flex items-start gap-2.5 cursor-pointer text-left"
                >
                  <FileSpreadsheet className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold leading-normal">Ringkasan Dokumen</p>
                    <p className="text-[10px] text-slate-450 mt-0.5">Satu baris per sertifikat. Komoditas digabung dalam satu kolom.</p>
                  </div>
                </button>

                {/* Opsi 2: Detail Komoditas Terurai */}
                <button
                  onClick={handleExportIndividualCommoditiesCSV}
                  className="w-full px-4 py-3 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-900 transition-colors flex items-start gap-2.5 border-t border-slate-50 cursor-pointer text-left"
                >
                  <Download className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold leading-normal">Detail Komoditas (Terurai)</p>
                    <p className="text-[10px] text-slate-450 mt-0.5 font-medium text-emerald-700 bg-emerald-50/50 px-1.5 py-0.5 rounded border border-emerald-100 inline-block mt-1">
                      Cocok untuk Pivot Table & Grafik
                    </p>
                    <p className="text-[10px] text-slate-450 mt-1">Memisah setiap komoditas menjadi baris tersendiri di Excel.</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari dokumen, komoditas, daerah asal, negara..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-white rounded-lg border border-slate-250 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 w-full sm:w-auto justify-end">
          <span className="font-medium">Urutkan:</span>
          <button
            onClick={() => handleToggleSort('date')}
            className={`px-3 py-1.5 rounded-md border flex items-center gap-1 font-semibold ${
              sortBy === 'date' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            Tanggal {sortBy === 'date' && (sortOrder === 'desc' ? '▼' : '▲')}
          </button>
          <button
            onClick={() => handleToggleSort('value')}
            className={`px-3 py-1.5 rounded-md border flex items-center gap-1 font-semibold ${
              sortBy === 'value' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            Nilai Ekonomi {sortBy === 'value' && (sortOrder === 'desc' ? '▼' : '▲')}
          </button>
          <button
            onClick={() => handleToggleSort('volume')}
            className={`px-3 py-1.5 rounded-md border flex items-center gap-1 font-semibold ${
              sortBy === 'volume' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            Volume {sortBy === 'volume' && (sortOrder === 'desc' ? '▼' : '▲')}
          </button>
        </div>
      </div>

      {/* Responsive Table Grid */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-left">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-[11px] font-bold tracking-wider uppercase">
              <th className="py-3 px-4 w-12 text-center">No</th>
              <th className="py-3 px-4">Nomor Dokumen</th>
              <th className="py-3 px-4">Via & Tempel</th>
              <th className="py-3 px-4">Bidang & Komoditas</th>
              <th className="py-3 px-4 text-right">Volume</th>
              <th className="py-3 px-4 text-right">Nilai Komoditas</th>
              <th className="py-3 px-4">Daerah Asal & Tujuan</th>
              <th className="py-3 px-4">Negara Tujuan</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Tautan</th>
              <th className="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 text-xs text-slate-700">
            {paginatedRecords.length > 0 ? (
              paginatedRecords.map((rec, index) => {
                const serialNumber = startIndex + index + 1;
                return (
                  <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* 1. Nomor (ID/serial) */}
                    <td className="py-3.5 px-4 font-mono text-center text-slate-500 font-semibold">{serialNumber}</td>
                    
                    {/* 2. Nomor Dokumen */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">{rec.nomorDokumen}</span>
                        {rec.isEdited && (
                          <span 
                            className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300/80 rounded font-bold"
                            title={`Data ini telah direvisi 1x pada ${rec.editedAt ? new Date(rec.editedAt).toLocaleString('id-ID') : 'sebelumnya'}`}
                          >
                            <Pencil className="w-2.5 h-2.5 text-amber-600" /> Diedit 1x
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-350" /> {rec.tanggalSertifikat}
                      </div>
                    </td>

                    {/* 3. Via dan Tempel */}
                    <td className="py-3.5 px-4 text-left">
                      <div className="font-medium text-slate-800">{rec.via}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{rec.tempatPelayanan}</div>
                    </td>

                    {/* 4. Bidang dan Komoditas */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2 py-0.5 text-[10px] items-center font-bold tracking-wide rounded-md mb-1 ${
                        rec.bidang === 'Hewan' ? 'bg-blue-100 text-blue-850' : 
                        rec.bidang === 'Ikan' ? 'bg-cyan-100 text-cyan-850' : 
                        'bg-emerald-100 text-emerald-850'
                      }`}>
                        {rec.bidang}
                      </span>
                      <div className="font-medium text-slate-800 line-clamp-2" title={rec.komoditasSummary}>
                        {rec.komoditasSummary}
                      </div>
                    </td>

                    {/* 5. Volume */}
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-850">
                      {formatVolume(rec.totalVolume, rec.komoditasList)}
                    </td>

                    {/* 6. Nilai Komoditas */}
                    <td className="py-3.5 px-4 text-right font-bold text-indigo-700">
                      {formatIDR(rec.totalNilaiEkonomi)}
                    </td>

                    {/* 7. Daerah Asal & Tujuan */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-semibold text-slate-800">{rec.daerahAsal}</div>
                      <div className="text-[10px] text-slate-400 mt-1 uppercase">Menuju</div>
                      <div className="text-xs font-semibold text-slate-700">{rec.daerahTujuan}</div>
                    </td>

                    {/* 8. Negara Tujuan */}
                    <td className="py-3.5 px-4 font-medium text-slate-850">
                      {rec.negaraTujuan ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 font-semibold text-slate-800">
                          🗺️ {rec.negaraTujuan}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Domestik</span>
                      )}
                    </td>

                    {/* 9. Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase rounded-full ${
                        rec.statusLaluLintas === 'Ekspor' ? 'bg-amber-100 text-amber-850 border border-amber-200' :
                        rec.statusLaluLintas === 'Impor' ? 'bg-violet-100 text-violet-850 border border-violet-200' :
                        rec.statusLaluLintas === 'Domestik Keluar' ? 'bg-rose-100 text-rose-850 border border-rose-200' :
                        'bg-blue-100 text-blue-850 border border-blue-200'
                      }`}>
                        {rec.statusLaluLintas}
                      </span>
                    </td>

                    {/* 10. Link sertifikat */}
                    <td className="py-3.5 px-4 text-center">
                      {rec.linkSertifikat && rec.linkSertifikat !== '-' ? (
                        <a 
                          href={rec.linkSertifikat} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex p-1.5 bg-slate-50 rounded-md text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 border border-slate-200 transition-colors"
                          title="Buka Link Verifikasi"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-slate-450 italic">-</span>
                      )}
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onUpdateRecord && (
                          <button
                            onClick={() => {
                              setSelectedEditRecord(rec);
                              setIsEditModalOpen(true);
                            }}
                            className={`p-1.5 rounded-lg transition-all ${
                              (rec.editCount && rec.editCount >= 1) || rec.isEdited
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/80'
                                : 'hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800'
                            }`}
                            title={
                              (rec.editCount && rec.editCount >= 1) || rec.isEdited
                                ? 'Telah Diedit 1x (Terkunci Demi Keamanan Database)'
                                : 'Edit Data (Kuota: 1x Kesempatan)'
                            }
                          >
                            {((rec.editCount && rec.editCount >= 1) || rec.isEdited) ? (
                              <div className="relative flex items-center justify-center">
                                <Pencil className="w-3.5 h-3.5 opacity-60" />
                                <Lock className="w-2.5 h-2.5 text-amber-700 absolute -bottom-1 -right-1" />
                              </div>
                            ) : (
                              <Pencil className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteConfirm(rec.id, rec.nomorDokumen)}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 hover:text-rose-800 rounded-lg transition-colors"
                          title="Hapus Data"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={11} className="py-10 text-center text-slate-450 font-medium">
                  Informasi tidak ditemukan. Coba hapus filter pencarian atau buat entri laporan baru.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Menampilkan <b className="text-slate-850">{Math.min(filteredRecords.length, startIndex + 1)}</b> s/d{' '}
            <b className="text-slate-850">{Math.min(filteredRecords.length, startIndex + itemsPerPage)}</b> dari{' '}
            <b className="text-slate-850">{filteredRecords.length}</b> total data
          </span>

          <div className="inline-flex gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-md border text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Sebelumnya
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => handlePageChange(i + 1)}
                className={`w-8 h-8 rounded-md text-xs font-bold leading-8 text-center transition-colors ${
                  currentPage === i + 1
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border text-slate-700 hover:bg-slate-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 rounded-md border text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
      {/* Import Modal */}
      {onImportRecords && (
        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={(newRecords) => {
            onImportRecords(newRecords);
            setIsImportModalOpen(false);
          }}
          onBatchSyncToSheets={onBatchSyncToSheets}
          isSyncingToSheets={isSyncingToSheets}
        />
      )}

      {/* Edit Record Modal with 1x Quota Safety */}
      {onUpdateRecord && (
        <EditRecordModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEditRecord(null);
          }}
          record={selectedEditRecord}
          onSaveEdit={(updatedRecord) => {
            onUpdateRecord(updatedRecord);
            setIsEditModalOpen(false);
            setSelectedEditRecord(null);
          }}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
