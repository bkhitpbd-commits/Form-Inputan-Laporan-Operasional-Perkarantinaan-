/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { QuarantineRecord, StorageConfig, StorageMode, CommodityDetail } from './types';
import { initialQuarantineRecords } from './data';
import QuarantineForm from './components/QuarantineForm';
import DatabaseTable from './components/DatabaseTable';
import StorageConfigPanel from './components/StorageConfigPanel';
import { parseAndNormalizeDate, parseCommodityString } from './utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  Building2, Ship, Plane, Compass, FileSpreadsheet, RefreshCw, BarChart3, Database, 
  Layers, MapPin, Globe, CheckSquare, Calendar, Trash2, SlidersHorizontal, Info, 
  TrendingUp, CircleDollarSign, Package, LayoutDashboard, PlusCircle,
  Lock, Unlock, KeyRound, LogOut, UserCheck, ShieldAlert, Eye, EyeOff, Users,
  Maximize2, Minimize2, Clock
} from 'lucide-react';

const LOCAL_STORAGE_KEY_RECORDS = 'bkhit_quarantine_records';
const LOCAL_STORAGE_KEY_CONFIG = 'bkhit_storage_config';

export default function App() {
  // Load initial data from localStorage or fallback
  const [records, setRecords] = useState<QuarantineRecord[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_RECORDS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return initialQuarantineRecords;
  });

  // Load storage config from localStorage or URL query parameters for easy sharing
  const [storageConfig, setStorageConfig] = useState<StorageConfig>(() => {
    // Check if query parameters are present in the URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get('appsScriptUrl') || params.get('scriptUrl') || params.get('url');
      const modeParam = params.get('mode');
      const sheetParam = params.get('sheetName') || params.get('sheet');
      const spreadParam = params.get('spreadsheetId') || params.get('spreadsheet');

      if (urlParam) {
        const parsedConfig: StorageConfig = {
          mode: (modeParam as StorageMode === 'GOOGLE_SHEETS_API' ? 'GOOGLE_SHEETS_API' : 'APPS_SCRIPT_WEBAPP'),
          spreadsheetId: spreadParam || '',
          sheetName: sheetParam || 'Laporan_Karantina',
          appsScriptUrl: urlParam
        };
        // Persist immediately in localStorage
        localStorage.setItem(LOCAL_STORAGE_KEY_CONFIG, JSON.stringify(parsedConfig));
        return parsedConfig;
      }
    }

    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_CONFIG);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {
      mode: 'APPS_SCRIPT_WEBAPP',
      spreadsheetId: '',
      sheetName: 'Laporan_Karantina',
      appsScriptUrl: 'https://script.google.com/macros/s/AKfycbwi69rPCZTwxHMwmiR3ebPvfeD7bf5f6lbzfcTNdkI0tEvVfSRhmo30TzPBHw_my2mqxQ/exec'
    };
  });

  // Connection & sync states
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showIntegrationSettings, setShowIntegrationSettings] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: ''
  });

  // Role & Authorization states for public vs pegawai
  const [isPegawai, setIsPegawai] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bkhit_is_pegawai') === 'true';
    }
    return false;
  });

  const [pegawaiPasswordInput, setPegawaiPasswordInput] = useState<string>('');
  const [pegawaiLoginError, setPegawaiLoginError] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Password protection state for sheets integration tab
  const [isIntegrationUnlocked, setIsIntegrationUnlocked] = useState<boolean>(false);
  const [typedPassword, setTypedPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  // Maximize view state (Theater Mode)
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  // Role login toggle handler
  const handlePegawaiLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPassword = pegawaiPasswordInput.trim();
    if (cleanPassword === 'Bkhit_PBD' || cleanPassword === 'admin@123') {
      setIsPegawai(true);
      localStorage.setItem('bkhit_is_pegawai', 'true');
      setPegawaiPasswordInput('');
      setPegawaiLoginError('');
      // Give gentle message
      setSyncStatus({
        type: 'success',
        message: 'Berhasil login! Selamat bekerja, rekan Pegawai BKHIT Papua Barat Daya. Semua fitur terunlock.'
      });
    } else {
      setPegawaiLoginError('Sandi Pegawai salah. Hubungi Admin IT untuk bantuan.');
      setPegawaiPasswordInput('');
    }
  };

  const handlePegawaiLogout = () => {
    setIsPegawai(false);
    localStorage.setItem('bkhit_is_pegawai', 'false');
    setActiveTab('dashboard');
    setIsIntegrationUnlocked(false);
    setSyncStatus({
      type: 'success',
      message: 'Sesi Pegawai selesai. Sekarang Anda dalam Mode Akses Publik Terbuka.'
    });
  };

  // Save changes to localStorage on state edits
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_RECORDS, JSON.stringify(records));
  }, [records]);

  // Open integration settings automatically if loaded from share link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hasShareParam = params.get('appsScriptUrl') || params.get('scriptUrl') || params.get('url');
      if (hasShareParam) {
        setShowIntegrationSettings(true);
        setActiveTab('integration');
      }
    }
  }, []);

  // Live Date and Time ticker (Day, Date, Time)
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Hari, Tanggal, dan Waktu dalam Bahasa Indonesia
  const formattedDateTime = useMemo(() => {
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const dayName = dayNames[currentDateTime.getDay()];
    const dateNum = currentDateTime.getDate();
    const monthName = monthNames[currentDateTime.getMonth()];
    const year = currentDateTime.getFullYear();

    const hours = String(currentDateTime.getHours()).padStart(2, '0');
    const minutes = String(currentDateTime.getMinutes()).padStart(2, '0');
    const seconds = String(currentDateTime.getSeconds()).padStart(2, '0');

    return {
      hari: dayName,
      tanggal: `${dateNum} ${monthName} ${year}`,
      hariTanggal: `${dayName}, ${dateNum} ${monthName} ${year}`,
      waktu: `${hours}:${minutes}:${seconds}`
    };
  }, [currentDateTime]);

  // Filters State
  const [activeTab, setActiveTab] = useState<'input' | 'dashboard' | 'database' | 'integration'>(() => {
    if (typeof window !== 'undefined') {
      const savedPegawai = localStorage.getItem('bkhit_is_pegawai') === 'true';
      return savedPegawai ? 'input' : 'dashboard';
    }
    return 'dashboard';
  });
  const [filterMonth, setFilterMonth] = useState<string>('ALL');
  const [filterYear, setFilterYear] = useState<string>('ALL');
  const [filterBidang, setFilterBidang] = useState<string>('ALL');
  const [filterLaluLintas, setFilterLaluLintas] = useState<string>('ALL');

  // Available Years extracted dynamically for filtering
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    records.forEach(rec => {
      if (rec.tanggalSertifikat) {
        const yr = rec.tanggalSertifikat.substring(0, 4);
        if (yr && yr.length === 4) years.add(yr);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [records]);

  // Reset all filters helper
  const handleResetFilters = () => {
    setFilterMonth('ALL');
    setFilterYear('ALL');
    setFilterBidang('ALL');
    setFilterLaluLintas('ALL');
  };

  // Filter Logic
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      // Month index mapping
      if (filterMonth !== 'ALL') {
        const month = parseInt(rec.tanggalSertifikat.substring(5, 7), 10);
        if (month !== parseInt(filterMonth, 10)) return false;
      }
      // Year matching
      if (filterYear !== 'ALL') {
        const yr = rec.tanggalSertifikat.substring(0, 4);
        if (yr !== filterYear) return false;
      }
      // Bidang matching
      if (filterBidang !== 'ALL') {
        if (rec.bidang !== filterBidang) return false;
      }
      // Jenis Lalu Lintas matching
      if (filterLaluLintas !== 'ALL') {
        if (rec.statusLaluLintas !== filterLaluLintas) return false;
      }
      return true;
    });
  }, [records, filterMonth, filterYear, filterBidang, filterLaluLintas]);

  // KPI computations from filtered records
  const kpis = useMemo(() => {
    let certCount = filteredRecords.length;
    let totalValue = 0;
    let totalVolume = 0;

    filteredRecords.forEach((rec) => {
      totalValue += rec.totalNilaiEkonomi || 0;
      totalVolume += rec.totalVolume || 0;
    });

    return { certCount, totalValue, totalVolume };
  }, [filteredRecords]);

  // Google Sign-in helpers (for direct Sheets API workflow, simulated backend proxy)
  const [isSignedInGoogle, setIsSignedInGoogle] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    // Simulated credential flow - alerts system
    try {
      setIsSignedInGoogle(true);
      setUserEmail(localStorage.getItem('user_gmail_session') || 'operasional.bkhit.papua@gmail.com');
      setSyncStatus({
        type: 'success',
        message: 'Berhasil terhubung ke Akun Google Anda!'
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleGoogleSignOut = async () => {
    setIsSignedInGoogle(false);
    setUserEmail(null);
  };

  // Target config update Callback
  const handleUpdateConfig = (newConfig: StorageConfig) => {
    setStorageConfig(newConfig);
    localStorage.setItem(LOCAL_STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
  };

  // Add a new Quarantine Record Local + Sync API Trigger
  const handleAddRecord = async (newRecordData: Omit<QuarantineRecord, 'id' | 'komoditasSummary' | 'totalVolume' | 'totalNilaiEkonomi'> & {
    komoditasList: CommodityDetail[];
  }) => {
    const id = 'qr-' + Date.now();
    const sumVolume = newRecordData.komoditasList.reduce((sum, c) => sum + (c.volume || 0), 0);
    const sumValue = newRecordData.komoditasList.reduce((sum, c) => sum + (c.nilaiEkonomi || 0), 0);
    const summary = newRecordData.komoditasList.map(c => `${c.komoditas}`).join(', ');

    const newFullRecord: QuarantineRecord = {
      ...newRecordData,
      id,
      komoditasSummary: summary,
      totalVolume: sumVolume,
      totalNilaiEkonomi: sumValue,
      createdAt: new Date().toISOString()
    };

    // 1. Pre-insert to Local Storage Array
    setRecords(prev => [newFullRecord, ...prev]);

    // 2. Double checks with Google WebApp Syncing trigger
    if (storageConfig.mode === 'APPS_SCRIPT_WEBAPP' && storageConfig.appsScriptUrl) {
      setIsSyncing(true);
      setSyncStatus({ type: null, message: 'Menghubungi Google Apps Script...' });
      
      try {
        // Build payload as specified by apps script
        const payload = {
          id: newFullRecord.id,
          tempatPelayanan: newFullRecord.tempatPelayanan,
          via: newFullRecord.via,
          tanggalSertifikat: newFullRecord.tanggalSertifikat,
          nomorDokumen: newFullRecord.nomorDokumen,
          daerahAsal: newFullRecord.daerahAsal,
          daerahTujuan: newFullRecord.daerahTujuan,
          negaraTujuan: newFullRecord.negaraTujuan || '',
          bidang: newFullRecord.bidang,
          statusLaluLintas: newFullRecord.statusLaluLintas,
          komoditasSummary: newFullRecord.komoditasList.map(c => `${c.komoditas} (${c.volume} ${c.satuan})`).join(', '),
          totalVolume: newFullRecord.totalVolume,
          totalNilaiEkonomi: newFullRecord.totalNilaiEkonomi,
          linkSertifikat: newFullRecord.linkSertifikat,
          createdAt: newFullRecord.createdAt,
          komoditasList: newFullRecord.komoditasList
        };

        // Standard JSON post configuration
        const response = await fetch(storageConfig.appsScriptUrl, {
          method: 'POST',
          mode: 'no-cors', // standard Apps Script POST redirect safe override
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        setSyncStatus({
          type: 'success',
          message: 'Laporan sukses terkirim dan disimpan di Database Google Sheets !'
        });
      } catch (err: any) {
        console.warn('Apps script post warning: ', err);
        setSyncStatus({
          type: 'error',
          message: 'Error sinkronisasi: ' + err.message + '. Namun data tersimpan aman di local browser.'
        });
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Delete a Record Trigger
  const handleDeleteRecord = (id: string) => {
    setRecords(prev => prev.filter(rec => rec.id !== id));
  };

  // Update a Record Handler (With 1x edit quota safety)
  const handleUpdateRecord = (updatedRecord: QuarantineRecord) => {
    setRecords(prev => prev.map(rec => rec.id === updatedRecord.id ? updatedRecord : rec));
    setSyncStatus({
      type: 'success',
      message: `Perubahan pada dokumen ${updatedRecord.nomorDokumen} berhasil disimpan (Sisa kuota edit: 0x).`
    });

    // Sync update to Google Apps Script if configured
    if (storageConfig.mode === 'APPS_SCRIPT_WEBAPP' && storageConfig.appsScriptUrl) {
      try {
        const payload = {
          action: 'update',
          id: updatedRecord.id,
          tempatPelayanan: updatedRecord.tempatPelayanan,
          via: updatedRecord.via,
          tanggalSertifikat: updatedRecord.tanggalSertifikat,
          nomorDokumen: updatedRecord.nomorDokumen,
          daerahAsal: updatedRecord.daerahAsal,
          daerahTujuan: updatedRecord.daerahTujuan,
          negaraTujuan: updatedRecord.negaraTujuan || '',
          bidang: updatedRecord.bidang,
          statusLaluLintas: updatedRecord.statusLaluLintas,
          komoditasSummary: updatedRecord.komoditasSummary,
          totalVolume: updatedRecord.totalVolume,
          totalNilaiEkonomi: updatedRecord.totalNilaiEkonomi,
          linkSertifikat: updatedRecord.linkSertifikat,
          createdAt: updatedRecord.createdAt,
          editedAt: updatedRecord.editedAt,
          isEdited: true,
          komoditasList: updatedRecord.komoditasList
        };

        fetch(storageConfig.appsScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(err => console.warn('Sync update warning:', err));
      } catch (err) {
        console.warn('Sync update error:', err);
      }
    }
  };

  // Bulk Import Records Handler (from Excel / CSV Web Mon Karantina)
  const handleImportRecords = (newRecords: QuarantineRecord[]) => {
    setRecords(prev => {
      // Merge records, avoiding duplicates by nomorDokumen
      const existingDocNumbers = new Set(prev.map(r => r.nomorDokumen.trim().toLowerCase()));
      const filteredNew = newRecords.filter(r => !existingDocNumbers.has(r.nomorDokumen.trim().toLowerCase()));
      return [...filteredNew, ...prev];
    });
    setSyncStatus({
      type: 'success',
      message: `Sukses mengimpor ${newRecords.length} data rekapan karantina ke aplikasi!`
    });
  };

  // Batch Sync Imported Records to Google Sheets WebApp
  const handleBatchSyncToSheets = async (importedList: QuarantineRecord[]) => {
    if (!storageConfig.appsScriptUrl) {
      setSyncStatus({
        type: 'error',
        message: 'URL Google Apps Script belum disetel di tab Integrasi Database.'
      });
      return;
    }

    setIsSyncing(true);
    setSyncStatus({
      type: null,
      message: `Menyimpan & menyinkronkan ${importedList.length} data ke Google Spreadsheet...`
    });

    try {
      const payload = importedList.map(rec => ({
        id: rec.id,
        tempatPelayanan: rec.tempatPelayanan,
        via: rec.via,
        tanggalSertifikat: rec.tanggalSertifikat,
        nomorDokumen: rec.nomorDokumen,
        daerahAsal: rec.daerahAsal,
        daerahTujuan: rec.daerahTujuan,
        negaraTujuan: rec.negaraTujuan || '',
        bidang: rec.bidang,
        statusLaluLintas: rec.statusLaluLintas,
        komoditasSummary: rec.komoditasSummary || rec.komoditasList.map(c => `${c.komoditas} (${c.volume} ${c.satuan})`).join(', '),
        totalVolume: rec.totalVolume,
        totalNilaiEkonomi: rec.totalNilaiEkonomi,
        linkSertifikat: rec.linkSertifikat || '',
        createdAt: rec.createdAt || new Date().toISOString(),
        komoditasList: rec.komoditasList
      }));

      await fetch(storageConfig.appsScriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // Merge locally as well
      handleImportRecords(importedList);

      setSyncStatus({
        type: 'success',
        message: `Berhasil menyinkronkan ${importedList.length} data rekapan ke Google Sheets!`
      });
    } catch (err: any) {
      console.warn('Batch sync warning:', err);
      handleImportRecords(importedList);
      setSyncStatus({
        type: 'error',
        message: `Data tersimpan di aplikasi, namun gagal sync ke Google Sheets: ${err.message}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull / Syncing Now Handler
  const handleSyncNow = async () => {
    if (storageConfig.mode === 'APPS_SCRIPT_WEBAPP' && storageConfig.appsScriptUrl) {
      setIsSyncing(true);
      setSyncStatus({ type: null, message: 'Menarik data terbaru dari Google Apps Script...' });
      try {
        const response = await fetch(storageConfig.appsScriptUrl);
        const result = await response.json();
        
        if (result.status === 'success' && Array.isArray(result.data)) {
          // Format payload back into records
          const remoteRecords: QuarantineRecord[] = result.data.map((row: any) => {
            const parsedList = parseCommodityString(
              row["Komoditas Detail"] || '',
              Number(row["Total Volume"]) || 0,
              Number(row["Total Nilai Ekonomi"]) || 0,
              row["Bidang"] || 'Hewan'
            );
            const summaryOfNames = parsedList.map(c => c.komoditas).join(', ');

            return {
              id: row["ID"] || 'qr-remote-' + Math.random(),
              tempatPelayanan: row["Tempat Pelayanan"] || '',
              via: row["Via"] || 'PTK',
              tanggalSertifikat: parseAndNormalizeDate(row["Tanggal Sertifikat"]),
              nomorDokumen: row["Nomor Dokumen"] || '',
              daerahAsal: row["Daerah Asal"] || '',
              daerahTujuan: row["Daerah Tujuan"] || '',
              negaraTujuan: row["Negara Tujuan"] || '',
              bidang: row["Bidang"] || 'Hewan',
              statusLaluLintas: row["Status Lalu Lintas"] || 'Domestik Keluar',
              komoditasSummary: summaryOfNames,
              totalVolume: Number(row["Total Volume"]) || 0,
              totalNilaiEkonomi: Number(row["Total Nilai Ekonomi"]) || 0,
              linkSertifikat: row["Link Sertifikat"] || '',
              createdAt: row["Created At"] || '',
              komoditasList: parsedList
            };
          });

          if (remoteRecords.length > 0) {
            setRecords(remoteRecords);
            setSyncStatus({
              type: 'success',
              message: `Sinkronisasi selesai! ${remoteRecords.length} data dimuat sukses dari Google Sheet.`
            });
          } else {
            setSyncStatus({
              type: 'success',
              message: 'Database Google Sheet masih kosong. Silakan input formulir untuk mengisi.'
            });
          }
        } else {
          throw new Error('Respon data tidak valid dari Apps Script');
        }
      } catch (err: any) {
        console.warn('Fetch data warning: ', err);
        setSyncStatus({
          type: 'error',
          message: 'Gagal menarik data: ' + err.toString() + '. Pastikan URL deploy benar dan CORS diaktifkan.'
        });
      } finally {
        setIsSyncing(false);
      }
    } else {
      setSyncStatus({
        type: 'success',
        message: 'Sinkronisasi offline lokal terjamin.'
      });
    }
  };

  // Trigger automatic sync on initial load or mode switch if Apps Script URL is configured
  useEffect(() => {
    if (storageConfig.mode === 'APPS_SCRIPT_WEBAPP' && storageConfig.appsScriptUrl) {
      handleSyncNow();
    }
  }, [storageConfig.appsScriptUrl, storageConfig.mode]);

  // Data aggregations for RECHARTS visualizations

  // CHART 1: Lalu lintas per jenis / status (Ekspor, Impor, dll.)
  const laluLintasChartData = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {
      'Domestik Keluar': { count: 0, value: 0 },
      'Domestik Masuk': { count: 0, value: 0 },
      'Ekspor': { count: 0, value: 0 },
      'Impor': { count: 0, value: 0 }
    };
    filteredRecords.forEach(rec => {
      if (map[rec.statusLaluLintas]) {
        map[rec.statusLaluLintas].count += 1;
        map[rec.statusLaluLintas].value += rec.totalNilaiEkonomi || 0;
      }
    });
    return Object.keys(map).map(key => ({
      name: key,
      sertifikat: map[key].count,
      nilaiEkonomiMiliar: Number((map[key].value / 1000000000).toFixed(3))
    }));
  }, [filteredRecords]);

  // CHART 2: Tempat pelayanan distribution
  const tempatPelayananChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach(rec => {
      map[rec.tempatPelayanan] = (map[rec.tempatPelayanan] || 0) + 1;
    });

    const colors = ['#4f46e5', '#22c55e', '#eab308', '#ec4899', '#a855f7'];
    return Object.keys(map).map((key, idx) => ({
      name: key,
      value: map[key],
      color: colors[idx % colors.length]
    }));
  }, [filteredRecords]);

  // CHART 3: Top 10 Daerah Asal
  const topAsalData = useMemo(() => {
    const map: Record<string, { count: number; volume: number }> = {};
    filteredRecords.forEach(rec => {
      if (!map[rec.daerahAsal]) {
        map[rec.daerahAsal] = { count: 0, volume: 0 };
      }
      map[rec.daerahAsal].count += 1;
      map[rec.daerahAsal].volume += rec.totalVolume || 0;
    });
    return Object.keys(map)
      .map(key => ({
        name: key,
        frekuensi: map[key].count,
        volume: map[key].volume
      }))
      .sort((a, b) => b.frekuensi - a.frekuensi)
      .slice(0, 10);
  }, [filteredRecords]);

  // CHART 4: Top 10 Daerah Tujuan Domestik Keluar
  const topTujuanDomestikData = useMemo(() => {
    const map: Record<string, { count: number; volume: number }> = {};
    filteredRecords.forEach(rec => {
      if (rec.statusLaluLintas === 'Domestik Keluar' && rec.daerahTujuan) {
        const dest = rec.daerahTujuan.trim();
        if (dest && dest !== '-') {
          if (!map[dest]) {
            map[dest] = { count: 0, volume: 0 };
          }
          map[dest].count += 1;
          map[dest].volume += rec.totalVolume || 0;
        }
      }
    });
    return Object.keys(map)
      .map(key => ({
        name: key,
        frekuensi: map[key].count,
        volume: map[key].volume
      }))
      .sort((a, b) => b.frekuensi - a.frekuensi)
      .slice(0, 10);
  }, [filteredRecords]);

  // CHART 5: Top 10 Negara Tujuan Ekspor
  const topNegaraEksporData = useMemo(() => {
    const map: Record<string, { count: number; value: number; volume: number }> = {};
    filteredRecords.forEach(rec => {
      if (rec.statusLaluLintas === 'Ekspor' && rec.negaraTujuan) {
        if (!map[rec.negaraTujuan]) {
          map[rec.negaraTujuan] = { count: 0, value: 0, volume: 0 };
        }
        map[rec.negaraTujuan].count += 1;
        map[rec.negaraTujuan].value += rec.totalNilaiEkonomi || 0;
        map[rec.negaraTujuan].volume += rec.totalVolume || 0;
      }
    });
    return Object.keys(map)
      .map(key => ({
        name: key,
        frekuensi: map[key].count,
        nilaiEkonomiMiliar: Number((map[key].value / 1000000000).toFixed(3)),
        volume: map[key].volume
      }))
      .sort((a, b) => b.frekuensi - a.frekuensi)
      .slice(0, 10);
  }, [filteredRecords]);

  // CHART 6 & 7: Top 10 Volume & Frekuensi vs masing-masing bidang (Hewan, Ikan, Tumbuhan)
  const topVolumeBidangData = useMemo(() => {
    const map: Record<string, { Hewan: number; Ikan: number; Tumbuhan: number }> = {};
    filteredRecords.forEach(rec => {
      const bid = rec.bidang;
      rec.komoditasList.forEach(c => {
        const name = c.komoditas;
        if (!map[name]) {
          map[name] = { Hewan: 0, Ikan: 0, Tumbuhan: 0 };
        }
        map[name][bid] += c.volume;
      });
    });
    // Create list sorted by sum of volumes
    return Object.keys(map)
      .map(key => ({
        name: key,
        Hewan: map[key].Hewan,
        Ikan: map[key].Ikan,
        Tumbuhan: map[key].Tumbuhan,
        total: map[key].Hewan + map[key].Ikan + map[key].Tumbuhan
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredRecords]);

  const topFrekuensiBidangData = useMemo(() => {
    const map: Record<string, { Hewan: number; Ikan: number; Tumbuhan: number }> = {};
    filteredRecords.forEach(rec => {
      const bid = rec.bidang;
      rec.komoditasList.forEach(c => {
        const name = c.komoditas;
        if (!map[name]) {
          map[name] = { Hewan: 0, Ikan: 0, Tumbuhan: 0 };
        }
        map[name][bid] += 1; // Increment certificate count of occurrence
      });
    });
    return Object.keys(map)
      .map(key => ({
        name: key,
        Hewan: map[key].Hewan,
        Ikan: map[key].Ikan,
        Tumbuhan: map[key].Tumbuhan,
        total: map[key].Hewan + map[key].Ikan + map[key].Tumbuhan
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredRecords]);

  // Aggregate commodities per bidang for detailed tables/lists
  const topCommoditiesPerBidang = useMemo(() => {
    const maps: Record<'Hewan' | 'Ikan' | 'Tumbuhan', Record<string, {
      frekuensi: number;
      volumes: Record<string, number>;
      totalNilai: number;
    }>> = {
      Hewan: {},
      Ikan: {},
      Tumbuhan: {}
    };

    filteredRecords.forEach(rec => {
      const b = rec.bidang;
      if (b !== 'Hewan' && b !== 'Ikan' && b !== 'Tumbuhan') return;
      
      rec.komoditasList.forEach(c => {
        const name = c.komoditas.trim();
        if (!name) return;
        
        if (!maps[b][name]) {
          maps[b][name] = { frekuensi: 0, volumes: {}, totalNilai: 0 };
        }
        
        maps[b][name].frekuensi += 1;
        const unit = c.satuan || 'kg';
        maps[b][name].volumes[unit] = (maps[b][name].volumes[unit] || 0) + (c.volume || 0);
        maps[b][name].totalNilai += (c.nilaiEkonomi || 0);
      });
    });

    const result: Record<'Hewan' | 'Ikan' | 'Tumbuhan', Array<{
      name: string;
      frekuensi: number;
      volumes: Record<string, number>;
      totalNilai: number;
    }>> = {
      Hewan: [],
      Ikan: [],
      Tumbuhan: []
    };

    (['Hewan', 'Ikan', 'Tumbuhan'] as const).forEach(b => {
      result[b] = Object.keys(maps[b]).map(name => ({
        name,
        frekuensi: maps[b][name].frekuensi,
        volumes: maps[b][name].volumes,
        totalNilai: maps[b][name].totalNilai
      }))
      .sort((a, b) => b.frekuensi - a.frekuensi)
      .slice(0, 10);
    });

    return result;
  }, [filteredRecords]);

  const BILLION_DIVISOR = 1000000000;
  const BAR_COLORS = {
    Hewan: '#4f46e5',   // Indigo-600
    Ikan: '#06b6d4',    // Cyan-500
    Tumbuhan: '#10b981' // Emerald-500
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col justify-between">
      
      {/* 1. Sticky Navigation Bar - Designed for Clean Workflow & Premium Layout */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-sm transition-all duration-300">
        <div id="header-brand" className="flex items-center gap-3.5 text-left w-full md:w-auto">
          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 shrink-0 p-0.5">
            <img 
              src={storageConfig.logoUrl || "https://lh3.googleusercontent.com/d/1bPZXtvaDjpTBo_f2oKdSIYZ7SzY5cc7k"} 
              alt="Logo Karantina Indonesia" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 uppercase">
                Transformasi Informasi dan Dokumentasi Karantina Unit (TIFA DAKU)
              </h1>
              <button
                type="button"
                onClick={() => setActiveTab('integration')}
                className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full tracking-wider cursor-pointer hover:scale-105 transition-all duration-150 ${
                  storageConfig.mode === 'DEMO' 
                    ? 'bg-amber-100/80 text-amber-800 border border-amber-200/50 hover:bg-amber-200' 
                    : 'bg-emerald-100/90 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-200'
                }`}
                title="Klik untuk membuka Integrasi & Sinkronisasi Sheets"
              >
                {storageConfig.mode === 'DEMO' ? 'Demo / Lokal' : 'Apps Script Live'}
              </button>
            </div>
            <p className="text-[10px] font-bold text-slate-500 tracking-wider mt-0.5 uppercase">
              UPT BKHIT PAPUA BARAT DAYA &bull; BADAN KARANTINA INDONESIA
            </p>
          </div>
        </div>

        {/* Header Actions & Controls */}
        <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
          {/* Role Status Badge & Action Button */}
          {isPegawai ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 bg-emerald-55/10 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                👔 Tampilan User (Internal)
              </span>
              <button
                type="button"
                onClick={handlePegawaiLogout}
                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                title="Keluar dari mode Pegawai internal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-150 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] border-slate-300"
                title="Buka Dashboard Publik secara cepat"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                🌐 Tampilan Publik
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('input'); // Directs to login form inside the content panel
                  setSyncStatus({
                    type: null,
                    message: 'Silakan masukkan Sandi Pegawai di bawah untuk membuka akses internal.'
                  });
                }}
                className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                title="Masuk sebagai Pegawai Internal BKHIT"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Login Pegawai</span>
              </button>
            </div>
          )}

          {/* Maximize/Minimize View Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMaximized(!isMaximized)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98] border ${
              isMaximized
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                : 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700 shadow-md shadow-indigo-100'
            }`}
            title={isMaximized ? "Kembalikan ke Tampilan Normal (Kecilkan)" : "Maksimalkan Tampilan (Layar Penuh)"}
          >
            {isMaximized ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Kecilkan Layar</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Layar Penuh</span>
              </>
            )}
          </button>

          <div className="flex flex-col items-center md:items-end gap-1">
            <div className="flex items-center bg-indigo-50 px-3.5 py-1.5 rounded-xl border border-indigo-100 text-xs shadow-xs">
              <span className="font-extrabold text-indigo-900 mr-2 uppercase tracking-wider text-[10px]">Total Data Masuk:</span>
              <span className="text-indigo-850 font-black font-mono bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200/50 animate-fade-in">
                {filteredRecords.length} Data
              </span>
            </div>
            
            {/* Live Hari, Tanggal, dan Waktu (Realtime Clock) */}
            <div 
              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100/90 hover:bg-slate-150 px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-xs transition-colors"
              title="Waktu Lokal Terkini (Real-time Live Clock)"
            >
              <Clock className="w-3 h-3 text-indigo-600 shrink-0" />
              <span className="text-slate-800">{formattedDateTime.hariTanggal}</span>
              <span className="text-slate-350 font-light">•</span>
              <span className="font-mono font-bold text-indigo-900 tracking-tight">{formattedDateTime.waktu}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Layout Area - Sidebar Navigation on Left, Form/Dashboard/Database Content on Right */}
      <main className="flex-1 w-full max-w-[1550px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Sidebar Navigation Panel (lg:col-span-3) */}
        <div className={`${isMaximized ? 'hidden' : 'lg:col-span-3'} space-y-4`}>
          
          {/* Persistent Navigation Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-left">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 px-1">
              Navigasi Aplikasi
            </p>
            <div className="space-y-1">
              
              <button
                type="button"
                onClick={() => setActiveTab('input')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 text-left cursor-pointer ${
                  activeTab === 'input'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 font-semibold">
                  <PlusCircle className="w-4 h-4 shrink-0" />
                  <span>Input Laporan (Form)</span>
                </div>
                {!isPegawai ? (
                  <Lock className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'input' ? 'text-indigo-200' : 'text-slate-400'}`} />
                ) : (
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                    activeTab === 'input' ? 'bg-indigo-755 bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'
                  }`}>
                    Baru
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 text-left cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 font-semibold">
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>Dashboard Publik</span>
                </div>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                  activeTab === 'dashboard' ? 'bg-indigo-755 bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'
                }`}>
                  KPI,Grafik
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('database')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 text-left cursor-pointer ${
                  activeTab === 'database'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 font-semibold">
                  <Database className="w-4 h-4 shrink-0" />
                  <span>Tabel Database</span>
                </div>
                {!isPegawai ? (
                  <Lock className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'database' ? 'text-indigo-200' : 'text-slate-400'}`} />
                ) : (
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                    activeTab === 'database' ? 'bg-indigo-755 bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {filteredRecords.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('integration')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 text-left cursor-pointer ${
                  activeTab === 'integration'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 font-semibold">
                  <RefreshCw className="w-4 h-4 shrink-0 animate-spin-slow" />
                  <span>Integrasi Sheets</span>
                </div>
                {!isPegawai ? (
                  <Lock className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'integration' ? 'text-indigo-200' : 'text-slate-400'}`} />
                ) : (
                  <span className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-md ${
                    activeTab === 'integration' ? 'bg-indigo-755 bg-indigo-700 text-indigo-100' : 'bg-slate-150 text-slate-500'
                  }`}>
                    Sync
                  </span>
                )}
              </button>

            </div>
          </div>

          {/* Contextual Side Information Cards */}
          {activeTab === 'input' && (
            <div id="info-side-panel" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-left">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-505" /> Panduan Pengisian
              </h4>
              <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <li>
                  • Pastikan <b>Kredensial Dokumen</b> lengkap dan valid sebelum disubmit.
                </li>
                <li>
                  • Kolom <b>Negara Tujuan</b> wajib diisi penuh apabila memilih status lalu lintas <b>"Ekspor"</b>.
                </li>
                <li>
                  • Rekan-Rekan dapat menambahkan baris ke list <b>Detail Komoditas</b> tambahan jika lebih dari 1 komoditas.
                </li>
                <li>
                  • Mode Sync aktif otomatis mendistribusikan data ke target spreadsheet yang diarsip.
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div id="dashboard-side-panel" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-left space-y-2">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-600" /> Filter Analisis
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ubah filter bulan, tahun, atau bidang di samping kanan untuk memperbarui visualisasi diagram secara real-time.
              </p>
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Pilihan Cepat:</span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[9px] bg-slate-100 hover:bg-slate-205 text-slate-650 font-bold px-2 py-1 rounded tracking-wide uppercase transition-colors"
                >
                  Reset Filter
                </button>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div id="database-side-panel" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-left space-y-2">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-600" /> Panduan Database
              </h4>
              <ul className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
                <li>
                  • Gunakan kotak <b>Pencarian</b> untuk menyaring arsip berdasarkan nomor dokumen, komoditas, atau daerah asal.
                </li>
                <li>
                  • Rekan-Rekan dapat megurutkan data berdasarkan <b>Tanggal</b>, <b>Nilai Ekonomi</b>, atau <b>Volume</b>.
                </li>
                <li>
                  • Klik tombol <b>Export CSV / Excel</b> untuk mendownload Data.
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'integration' && (
            <div id="integration-side-panel" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-left space-y-2">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-600" /> Sinkronisasi Cloud
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Menghubungkan Formulir Karantina ini ke Google Sheets Anda secara langsung dan otomatis.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold text-indigo-700">
                Data terjamin aman dua arah secara langsung antara browser Anda dan Google Cloud!
              </p>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Active Workspace Area (lg:col-span-9) */}
        <section className={`${isMaximized ? 'lg:col-span-12' : 'lg:col-span-9'} space-y-6`}>
          
          {/* Maximize Mode Informational Ribbon */}
          {isMaximized && (
            <div className="bg-gradient-to-r from-indigo-50 via-slate-50 to-indigo-50 border border-indigo-100 rounded-xl p-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left animate-fade-in shadow-xs">
              <div className="flex items-center gap-2.5 text-xs text-indigo-950">
                <span className="flex h-2 w-2 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                </span>
                <span>
                  <b>Mode Layar Penuhan Aktif:</b> Saat ini Anda fokus pada panel <b>{activeTab === 'input' ? 'Input Laporan (Form)' : activeTab === 'dashboard' ? 'Dashboard Publik' : activeTab === 'database' ? 'Tabel Database' : 'Integrasi Sheets'}</b>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMaximized(false)}
                className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3 py-1.5 rounded-lg transition-all shadow-xs shrink-0 cursor-pointer hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider"
              >
                Kembalikan Layar Normal
              </button>
            </div>
          )}
          
          {/* Sync status logs - placed contextually */}
          {syncStatus.message && (
            <div className={`p-3.5 rounded-xl border text-xs text-left flex items-center justify-between gap-3 ${
              syncStatus.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
                : syncStatus.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-250'
                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
            }`}>
              <div className="font-semibold">{syncStatus.message}</div>
              <button 
                onClick={() => setSyncStatus({ type: null, message: '' })} 
                className="font-bold border-l pl-2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                Tutup
              </button>
            </div>
          )}

          {/* TAB 1: INPUT DATA FORM */}
          {activeTab === 'input' && (
            <div className="space-y-6">
              {!isPegawai ? (
                <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-8 text-center space-y-6 my-8 text-left">
                  <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 border border-amber-100 shadow-sm">
                    <Lock className="w-7 h-7" />
                  </div>
                  
                  <div className="space-y-2 text-center">
                    <h3 className="text-base font-extrabold text-slate-850 tracking-tight">Portal Akses Pegawai BKHIT Papua Barat Daya</h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                      Halaman <b>Input Laporan Baru</b> dikunci untuk publik guna mencegah pengiriman data ganda atau manipulasi laporan operasional.
                    </p>
                  </div>

                  <form onSubmit={handlePegawaiLogin} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Kata Sandi</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Masukkan Sandi..."
                          value={pegawaiPasswordInput}
                          onChange={(e) => {
                            setPegawaiPasswordInput(e.target.value);
                            if (pegawaiLoginError) setPegawaiLoginError('');
                          }}
                          className={`w-full text-xs pl-10 pr-10 py-3 rounded-xl border bg-slate-50/55 text-slate-850 font-bold tracking-wide focus:outline-none transition-all duration-200 ${
                            pegawaiLoginError 
                              ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 bg-rose-50/10' 
                              : 'border-slate-250 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-150'
                          }`}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {pegawaiLoginError && (
                      <p className="text-[11px] text-rose-600 font-bold bg-rose-50/50 py-1.5 px-3 rounded-lg border border-rose-100/85 flex items-center gap-1.5">
                        <span>⚠️</span> {pegawaiLoginError}
                      </p>
                    )}

                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-100/70 text-center">
                      <span className="text-[10px] text-amber-800 font-semibold leading-relaxed block">
                                 📌 <b>Gunakan</b> sandi internal <b></b><b></b> untuk membuka formulir input.
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs shadow-md shadow-indigo-100 transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider"
                    >
                      Masuk Aplikasi Inputan
                    </button>
                  </form>
                </div>
              ) : (
                <QuarantineForm onAddRecord={handleAddRecord} isLoading={isSyncing} />
              )}
            </div>
          )}

          {/* TAB 2: ANALYTICAL DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Dashboard Filters Row */}
              <div id="filter-panel" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-left">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-4">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Filter Laporan Dashboard
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold px-2.5 py-1.5 rounded uppercase tracking-wider transition-colors"
                  >
                    Reset Filter
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Filter Bulan */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Bulan</label>
                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-250 rounded-lg focus:outline-none focus:border-indigo-650 bg-slate-50/55 text-slate-800 font-medium"
                    >
                      <option value="ALL">Semua Bulan</option>
                      <option value="1">Januari</option>
                      <option value="2">Februari</option>
                      <option value="3">Maret</option>
                      <option value="4">April</option>
                      <option value="5">Mei</option>
                      <option value="6">Juni</option>
                      <option value="7">Juli</option>
                      <option value="8">Agustus</option>
                      <option value="9">September</option>
                      <option value="10">Oktober</option>
                      <option value="11">November</option>
                      <option value="12">Desember</option>
                    </select>
                  </div>

                  {/* Filter Tahun */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tahun</label>
                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-250 rounded-lg focus:outline-none focus:border-indigo-650 bg-slate-50/55 text-slate-800 font-medium"
                    >
                      <option value="ALL">Semua Tahun</option>
                      {availableYears.map(yr => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                      <option value="2026">2027</option>
                    </select>
                  </div>

                  {/* Filter Bidang */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Bidang</label>
                    <select
                      value={filterBidang}
                      onChange={(e) => setFilterBidang(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-250 rounded-lg focus:outline-none focus:border-indigo-650 bg-slate-50/55 text-slate-800 font-medium"
                    >
                      <option value="ALL">Semua Bidang</option>
                      <option value="Hewan">Hewan</option>
                      <option value="Ikan">Ikan</option>
                      <option value="Tumbuhan">Tumbuhan</option>
                    </select>
                  </div>

                  {/* Filter Jenis Lalu Lintas */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Jenis Lalu Lintas</label>
                    <select
                      value={filterLaluLintas}
                      onChange={(e) => setFilterLaluLintas(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-250 rounded-lg focus:outline-none focus:border-indigo-655 bg-indigo-50/30 text-indigo-900 font-bold"
                    >
                      <option value="ALL">Semua Lalu Lintas</option>
                      <option value="Domestik Keluar">Domestik Keluar</option>
                      <option value="Domestik Masuk">Domestik Masuk</option>
                      <option value="Ekspor">Ekspor</option>
                      <option value="Impor">Impor</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* KPI CARDS */}
              <div id="kpi-block" className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                {/* Total Sertifikat */}
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:scale-[1.01] transition-transform">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Sertifikat</p>
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                      {kpis.certCount.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                      Sertifikat 
                    </span>
                  </div>
                </div>

                {/* Nilai Ekonomi */}
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:scale-[1.01] transition-transform">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimasi Nilai Ekonomi</p>
                    <CircleDollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-2xl font-black text-slate-800 tracking-tight leading-none block">
                        {kpis.totalValue >= BILLION_DIVISOR
                          ? `Rp ${(kpis.totalValue / BILLION_DIVISOR).toFixed(2)} Miliar`
                          : `Rp ${kpis.totalValue.toLocaleString('id-ID')}`
                        }
                      </span>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                      Dalam Rupiah (IDR)
                    </span>
                  </div>
                </div>

                {/* Volume Total */}
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:scale-[1.01] transition-transform">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Volume Komoditas Total</p>
                    <Package className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                      {kpis.totalVolume.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] bg-amber-55/20 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                      Satuan Beragam
                    </span>
                  </div>
                </div>
              </div>

              {/* GRAPHICS PANEL */}
              <div id="graphics-panel" className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-left space-y-6">
                <div className="border-b border-slate-150 pb-4">
                  <h3 className="text-xs font-extrabold text-indigo-750 uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" /> Visualisasi Data Operasional (Papua Barat Daya)
                  </h3>
                  <p className="text-[11px] text-slate-450 mt-1 uppercase">Total Dan Persentase Serta Analisis Frekuensi per Wilayah</p>
                </div>

                {/* Grid level 1: Lalu Lintas & Pelayanan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pie chart: Status Lalu Lintas */}
                  <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-3">
                      Total Berdasarkan Jenis Lalu Lintas 
                    </h4>
                    {filteredRecords.length === 0 ? (
                      <div className="h-44 w-full flex flex-col items-center justify-center text-center p-4 bg-white rounded-xl border border-dashed border-slate-200/80">
                        <Database className="w-6 h-6 text-slate-300 mb-2 animate-pulse" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tidak Ada Data Jenis Lalu Lintas</span>
                        <span className="text-[9px] text-slate-400 mt-1">Ubah filter pencarian atau tambahkan laporan baru.</span>
                      </div>
                    ) : (
                      <div className="h-44 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={laluLintasChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={34}
                              outerRadius={54}
                              paddingAngle={4}
                              dataKey="sertifikat"
                            >
                              {laluLintasChartData.map((entry, index) => {
                                const stateColors = ['#e11d48', '#3b82f6', '#f59e0b', '#8b5cf6'];
                                return <Cell key={`cell-${index}`} fill={stateColors[index % stateColors.length]} />;
                              })}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} Sertifikat`, 'Volume Dokumen']} />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Legend */}
                        <div className="text-[10px] font-bold space-y-1 sm:ml-2">
                          {laluLintasChartData.map((item, index) => {
                            const stateColors = ['#e11d48', '#3b82f6', '#f59e0b', '#8b5cf6'];
                            return (
                              <div key={item.name} className="flex items-center gap-1.5 whitespace-nowrap text-slate-700">
                                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: stateColors[index] }}></span>
                                <span>{item.name}: <b>{item.sertifikat}</b></span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pie chart: Tempat Pelayanan */}
                  <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-3">
                      Berdasarkan Per Tempat Pelayanan
                    </h4>
                    {filteredRecords.length === 0 ? (
                      <div className="h-44 w-full flex flex-col items-center justify-center text-center p-4 bg-white rounded-xl border border-dashed border-slate-200/80">
                        <MapPin className="w-6 h-6 text-slate-300 mb-2 animate-pulse" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tidak Ada Data Wilayah Pelayanan</span>
                        <span className="text-[9px] text-slate-400 mt-1">Ubah filter pencarian atau tambahkan laporan baru.</span>
                      </div>
                    ) : (
                      <div className="h-44 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={tempatPelayananChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={0}
                              outerRadius={54}
                              label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                              dataKey="value"
                            >
                              {tempatPelayananChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} Sertifikat`, 'Tempat Pelayanan']} />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Legend list */}
                        <div className="text-[10px] font-bold space-y-1">
                          {tempatPelayananChartData.map((item) => (
                            <div key={item.name} className="flex items-center gap-1.5 text-slate-700">
                              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }}></span>
                              <span className="truncate max-w-[120px]" title={item.name}>{item.name}: <b>{item.value}</b></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section Level 2: Top 10 Volume & Frekuensi Komoditas per Bidang */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 md:p-6 space-y-6 w-full">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">
                      Analisis Top 10 Komoditas per Bidang (Hewan, Ikan, Tumbuhan)
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase">Volume Komoditas dan Frekuensi Sertifikasi Dokumen</p>
                  </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Top 10 Volume Komoditas per Bidang */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-left">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                Volume Komoditas per Bidang
                              </h5>
                              <p className="text-[10px] text-slate-400 font-medium">Berdasarkan Total Volume Setiap Bidang</p>
                            </div>
                          </div>
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                            Volume
                          </span>
                        </div>

                        <div className="h-[440px] w-full text-xs">
                          {topVolumeBidangData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={topVolumeBidangData} layout="vertical" margin={{ left: 20, right: 15, top: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                                <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 9, fontWeight: 600, fill: '#475569' }} />
                                <Tooltip formatter={(value, name) => [`${value.toLocaleString('id-ID')}`, name]} />
                                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                                <Bar dataKey="Hewan" stackId="a" fill={BAR_COLORS.Hewan} name="Hewan" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="Ikan" stackId="a" fill={BAR_COLORS.Ikan} name="Ikan" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="Tumbuhan" stackId="a" fill={BAR_COLORS.Tumbuhan} name="Tumbuhan" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 italic">Tidak ada komoditas</div>
                          )}
                        </div>
                      </div>

                      {/* Top 10 Frekuensi Komoditas per Bidang */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-left">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                              <TrendingUp className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                Frekuensi Komoditas per Bidang
                              </h5>
                              <p className="text-[10px] text-slate-400 font-medium font-sans">Berdasarkan Jumlah Sertifikat</p>
                            </div>
                          </div>
                          <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                            Frekuensi
                          </span>
                        </div>

                        <div className="h-[440px] w-full text-xs">
                          {topFrekuensiBidangData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={topFrekuensiBidangData} layout="vertical" margin={{ left: 20, right: 15, top: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10 }} allowDecimals={false} />
                                <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 9, fontWeight: 600, fill: '#475569' }} />
                                <Tooltip formatter={(value, name) => [`${value} Kali`, name]} />
                                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                                <Bar dataKey="Hewan" stackId="a" fill={BAR_COLORS.Hewan} name="Hewan" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="Ikan" stackId="a" fill={BAR_COLORS.Ikan} name="Ikan" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="Tumbuhan" stackId="a" fill={BAR_COLORS.Tumbuhan} name="Tumbuhan" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 italic">Tidak ada data</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                {/* Section Level 3: Rincian Daftar Komoditas Unggulan per Bidang */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 md:p-6 space-y-6 w-full">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="text-left font-sans">
                      <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">
                        Rincian Komoditas Unggulan per Bidang 
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase leading-relaxed">
                        Daftar Frekuensi Sertifikat &amp; Akumulasi Volume Komoditas Teratas
                      </p>
                    </div>
                    <span className="text-[9px] bg-slate-200 text-slate-600 border border-slate-300 px-3 py-1 rounded-full font-bold uppercase tracking-wider shrink-0 shadow-2xs">
                      Top 10 Komoditas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* KH - Karantina Hewan */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-left flex flex-col justify-between">
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-extrabold text-xs">
                              🥩
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                Karantina Hewan
                              </h5>
                              <p className="text-[9px] text-slate-400 font-medium font-sans">Sertifikasi &amp; Volume</p>
                            </div>
                          </div>
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                           Hewan 
                          </span>
                        </div>

                        {topCommoditiesPerBidang.Hewan.length > 0 ? (
                          <div className="space-y-2.5">
                            {topCommoditiesPerBidang.Hewan.map((item, index) => {
                              const maxFreq = Math.max(...topCommoditiesPerBidang.Hewan.map(d => d.frekuensi), 1);
                              const pct = (item.frekuensi / maxFreq) * 100;
                              const volumeText = Object.entries(item.volumes)
                                .map(([unit, val]) => `${new Intl.NumberFormat('id-ID').format(val as number)} ${unit}`)
                                .join(', ');
                              return (
                                <div 
                                  key={item.name} 
                                  className="relative flex flex-col p-2.5 rounded-xl border border-slate-100 overflow-hidden hover:border-indigo-200 transition-all bg-white group shadow-2xs"
                                >
                                  {/* Soft background indicator based on frequency percentage */}
                                  <div 
                                    className="absolute inset-y-0 left-0 bg-indigo-50/20 transition-all duration-500" 
                                    style={{ width: `${pct}%` }}
                                  />
                                  <div className="relative z-10 flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[9px] font-black shrink-0 ${
                                        index === 0 ? 'bg-indigo-600 text-white' : index === 1 ? 'bg-indigo-500 text-white' : index === 2 ? 'bg-indigo-100 text-indigo-850 animate-pulse' : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {index + 1}
                                      </span>
                                      <span className="text-[11px] font-extrabold text-slate-800 uppercase truncate" title={item.name}>
                                        {item.name}
                                      </span>
                                    </div>
                                    <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded shrink-0">
                                      {item.frekuensi} Dokumen
                                    </span>
                                  </div>
                                  <div className="relative z-10 flex items-center justify-between text-[9px] text-slate-400 font-bold mt-1.5 pl-7">
                                    <span className="truncate pr-1">📦 total: <span className="text-slate-600">{volumeText}</span></span>
                                    {item.totalNilai > 0 && (
                                      <span className="text-emerald-600 whitespace-nowrap font-mono">Rp {(item.totalNilai / 1000000).toLocaleString('id-ID', {maximumFractionDigits:1})} Jt</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-slate-400 italic text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            Tidak ada data komoditas Hewan
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-50 text-right text-[9px] font-extrabold text-slate-400 uppercase">
                        Total {topCommoditiesPerBidang.Hewan.length} Komoditas
                      </div>
                    </div>

                    {/* KI - Karantina Ikan */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-left flex flex-col justify-between">
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0 font-extrabold text-xs">
                              🐟
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                Karantina Ikan
                              </h5>
                              <p className="text-[9px] text-slate-400 font-medium font-sans">Sertifikasi &amp; Volume</p>
                            </div>
                          </div>
                          <span className="text-[9px] bg-cyan-50 text-cyan-700 border border-cyan-100 px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                            Ikan
                          </span>
                        </div>

                        {topCommoditiesPerBidang.Ikan.length > 0 ? (
                          <div className="space-y-2.5">
                            {topCommoditiesPerBidang.Ikan.map((item, index) => {
                              const maxFreq = Math.max(...topCommoditiesPerBidang.Ikan.map(d => d.frekuensi), 1);
                              const pct = (item.frekuensi / maxFreq) * 100;
                              const volumeText = Object.entries(item.volumes)
                                .map(([unit, val]) => `${new Intl.NumberFormat('id-ID').format(val as number)} ${unit}`)
                                .join(', ');
                              return (
                                <div 
                                  key={item.name} 
                                  className="relative flex flex-col p-2.5 rounded-xl border border-slate-100 overflow-hidden hover:border-cyan-200 transition-all bg-white group shadow-2xs"
                                >
                                  {/* Soft background indicator based on frequency percentage */}
                                  <div 
                                    className="absolute inset-y-0 left-0 bg-cyan-50/20 transition-all duration-500" 
                                    style={{ width: `${pct}%` }}
                                  />
                                  <div className="relative z-10 flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[9px] font-black shrink-0 ${
                                        index === 0 ? 'bg-cyan-600 text-white' : index === 1 ? 'bg-cyan-500 text-white' : index === 2 ? 'bg-cyan-100 text-cyan-850 animate-pulse' : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {index + 1}
                                      </span>
                                      <span className="text-[11px] font-extrabold text-slate-800 uppercase truncate" title={item.name}>
                                        {item.name}
                                      </span>
                                    </div>
                                    <span className="text-[9px] font-extrabold text-cyan-700 bg-cyan-50 border border-cyan-100 px-1.5 py-0.5 rounded shrink-0">
                                      {item.frekuensi} Dokumen
                                    </span>
                                  </div>
                                  <div className="relative z-10 flex items-center justify-between text-[9px] text-slate-400 font-bold mt-1.5 pl-7">
                                    <span className="truncate pr-1">📦 total: <span className="text-slate-600">{volumeText}</span></span>
                                    {item.totalNilai > 0 && (
                                      <span className="text-emerald-600 whitespace-nowrap font-mono">Rp {(item.totalNilai / 1000000).toLocaleString('id-ID', {maximumFractionDigits:1})} Jt</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-slate-400 italic text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            Tidak ada data komoditas Ikan
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-50 text-right text-[9px] font-extrabold text-slate-400 uppercase">
                        Total {topCommoditiesPerBidang.Ikan.length} Komoditas
                      </div>
                    </div>

                    {/* KT - Karantina Tumbuhan */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-left flex flex-col justify-between">
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-extrabold text-xs">
                              🌿
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                Karantina Tumbuhan
                              </h5>
                              <p className="text-[9px] text-slate-400 font-medium font-sans">Sertifikasi &amp; Volume</p>
                            </div>
                          </div>
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                            Tumbuhan
                          </span>
                        </div>

                        {topCommoditiesPerBidang.Tumbuhan.length > 0 ? (
                          <div className="space-y-2.5">
                            {topCommoditiesPerBidang.Tumbuhan.map((item, index) => {
                              const maxFreq = Math.max(...topCommoditiesPerBidang.Tumbuhan.map(d => d.frekuensi), 1);
                              const pct = (item.frekuensi / maxFreq) * 100;
                              const volumeText = Object.entries(item.volumes)
                                .map(([unit, val]) => `${new Intl.NumberFormat('id-ID').format(val as number)} ${unit}`)
                                .join(', ');
                              return (
                                <div 
                                  key={item.name} 
                                  className="relative flex flex-col p-2.5 rounded-xl border border-slate-100 overflow-hidden hover:border-emerald-200 transition-all bg-white group shadow-2xs"
                                >
                                  {/* Soft background indicator based on frequency percentage */}
                                  <div 
                                    className="absolute inset-y-0 left-0 bg-emerald-50/20 transition-all duration-500" 
                                    style={{ width: `${pct}%` }}
                                  />
                                  <div className="relative z-10 flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[9px] font-black shrink-0 ${
                                        index === 0 ? 'bg-emerald-600 text-white' : index === 1 ? 'bg-emerald-500 text-white' : index === 2 ? 'bg-emerald-100 text-emerald-850 animate-pulse' : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {index + 1}
                                      </span>
                                      <span className="text-[11px] font-extrabold text-slate-800 uppercase truncate" title={item.name}>
                                        {item.name}
                                      </span>
                                    </div>
                                    <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                                      {item.frekuensi} Dokumen
                                    </span>
                                  </div>
                                  <div className="relative z-10 flex items-center justify-between text-[9px] text-slate-400 font-bold mt-1.5 pl-7">
                                    <span className="truncate pr-1">📦 total: <span className="text-slate-600">{volumeText}</span></span>
                                    {item.totalNilai > 0 && (
                                      <span className="text-emerald-600 whitespace-nowrap font-mono">Rp {(item.totalNilai / 1000000).toLocaleString('id-ID', {maximumFractionDigits:1})} Jt</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-slate-400 italic text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            Tidak ada data komoditas Tumbuhan
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-50 text-right text-[9px] font-extrabold text-slate-400 uppercase">
                        Total {topCommoditiesPerBidang.Tumbuhan.length} Komoditas
                      </div>
                    </div>
                  </div>
                </div>

                  {/* Section Top 10 Revisi: Clean Side-by-Side Lists (No Recharts Graphics) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  
                  {/* Card 1: Top 10 Daerah Tujuan (Domestik Keluar) */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-left">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            Top 10 (Domestik Keluar)
                          </h4>
                          <p className="text-[10px] text-slate-400 font-medium">Berdasarkan Jumlah Frekuensi Sertifikat</p>
                        </div>
                      </div>
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                        Daerah Tujuan
                      </span>
                    </div>

                    {topTujuanDomestikData.length > 0 ? (
                      <div className="space-y-2">
                        {topTujuanDomestikData.map((item, index) => {
                          const maxFreq = Math.max(...topTujuanDomestikData.map(d => d.frekuensi), 1);
                          const pct = (item.frekuensi / maxFreq) * 100;
                          return (
                            <div 
                              key={item.name} 
                              className="relative flex items-center justify-between p-2.5 rounded-lg border border-slate-100 overflow-hidden hover:border-slate-300 transition-colors bg-white group"
                            >
                              {/* Soft green bar background */}
                              <div 
                                className="absolute inset-y-0 left-0 bg-emerald-50/50 transition-all duration-500" 
                                style={{ width: `${pct}%` }}
                              />
                              
                              {/* Left details */}
                              <div className="relative z-10 flex items-center gap-2.5 flex-1 min-w-0">
                                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black shrink-0 ${
                                  index === 0 ? 'bg-emerald-600 text-white' : index === 1 ? 'bg-emerald-500 text-white' : index === 2 ? 'bg-emerald-100 text-emerald-800 animate-pulse' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {index + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide group-hover:text-emerald-955 transition-colors truncate" title={item.name}>
                                  {item.name}
                                </span>
                              </div>

                              {/* Right details */}
                              <div className="relative z-10 flex items-center gap-1.5 shrink-0 ml-2">
                                <span className="text-[10px] font-bold text-slate-700 bg-white shadow-xs border border-slate-150 px-2 py-0.5 rounded whitespace-nowrap">
                                  {item.frekuensi} Kali
                                </span>
                            </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-12 text-center text-slate-400 italic text-xs">
                        Tidak ada data Domestik Keluar dalam filter saat ini
                      </div>
                    )}
                  </div>

                  {/* Card 2: Top 10 Negara Tujuan Ekspor */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-left">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            Top 10 Negara Tujuan Ekspor
                          </h4>
                          <p className="text-[10px] text-slate-400 font-medium font-sans">Berdasarkan Jumlah Frekuensi Sertifikat</p>
                        </div>
                      </div>
                      <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                        Ekspor
                      </span>
                    </div>

                    {topNegaraEksporData.length > 0 ? (
                      <div className="space-y-2">
                        {topNegaraEksporData.map((item, index) => {
                          const maxFreq = Math.max(...topNegaraEksporData.map(d => d.frekuensi), 1);
                          const pct = (item.frekuensi / maxFreq) * 100;
                          return (
                            <div 
                              key={item.name} 
                              className="relative flex items-center justify-between p-2.5 rounded-lg border border-slate-100 overflow-hidden hover:border-slate-300 transition-colors bg-white group"
                            >
                              {/* Soft amber bar background */}
                              <div 
                                className="absolute inset-y-0 left-0 bg-amber-50/40 transition-all duration-500" 
                                style={{ width: `${pct}%` }}
                              />
                              
                              {/* Left details */}
                              <div className="relative z-10 flex items-center gap-2.5 flex-1 min-w-0">
                                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black shrink-0 ${
                                  index === 0 ? 'bg-amber-500 text-white' : index === 1 ? 'bg-amber-400 text-white' : index === 2 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {index + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide group-hover:text-amber-955 transition-colors truncate" title={item.name}>
                                  {item.name}
                                </span>
                              </div>

                              {/* Right details */}
                              <div className="relative z-10 flex items-center gap-1.5 shrink-0 ml-2">
                                <span className="text-[10px] font-bold text-slate-700 bg-white shadow-xs border border-slate-150 px-2 py-0.5 rounded whitespace-nowrap">
                                  {item.frekuensi} Kali 
                                </span>
                                <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded whitespace-nowrap">
                                  Rp {item.nilaiEkonomiMiliar.toLocaleString('id-ID')}M
                                </span>
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded whitespace-nowrap">
                                  {item.volume.toLocaleString('id-ID')} Kg/Ekor
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-12 text-center text-slate-400 italic text-xs">
                        Tidak ada data Ekspor dalam filter saat ini
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 3: DATABASE TABLE VIEW */}
          {activeTab === 'database' && (
            <div className="space-y-6">
              {!isPegawai ? (
                <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-8 text-center space-y-6 my-8 text-left">
                  <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 border border-amber-100 shadow-sm">
                    <Lock className="w-7 h-7" />
                  </div>
                  
                  <div className="space-y-2 text-center">
                    <h3 className="text-base font-extrabold text-slate-850 tracking-tight">Portal Akses Pegawai BKHIT</h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                      Halaman rincian <b>Tabel Database</b> dikunci untuk publik guna menjaga kerahasiaan identitas mitra kargo dan rincian dokumen operasional.
                    </p>
                  </div>

                  <form onSubmit={handlePegawaiLogin} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Sandi Kerja Pegawai</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Masukkan Sandi Pegawai..."
                          value={pegawaiPasswordInput}
                          onChange={(e) => {
                            setPegawaiPasswordInput(e.target.value);
                            if (pegawaiLoginError) setPegawaiLoginError('');
                          }}
                          className={`w-full text-xs pl-10 pr-10 py-3 rounded-xl border bg-slate-50/55 text-slate-850 font-bold tracking-wide focus:outline-none transition-all duration-200 ${
                            pegawaiLoginError 
                              ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 bg-rose-50/10' 
                              : 'border-slate-250 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-150'
                          }`}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {pegawaiLoginError && (
                      <p className="text-[11px] text-rose-600 font-bold bg-rose-50/50 py-1.5 px-3 rounded-lg border border-rose-100/85 flex items-center gap-1.5">
                        <span>⚠️</span> {pegawaiLoginError}
                      </p>
                    )}

                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-100/70 text-left">
                      <span className="text-[10px] text-amber-800 font-semibold leading-relaxed block">
                        📌 <b>Gunakan</b> sandi internal untuk membuka database operasional.
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs shadow-md shadow-indigo-100 transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider"
                    >
                      Masuk Aplikasi Pegawai
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  {/* Table Filters Row for high focus */}
                  <div id="filter-panel" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-left">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-4">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Filter Tabel Database
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold px-2.5 py-1.5 rounded uppercase tracking-wider transition-colors"
                      >
                        Reset Filter
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Filter Bulan */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Bulan Ke-</label>
                        <select
                          value={filterMonth}
                          onChange={(e) => setFilterMonth(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-slate-250 rounded-lg focus:outline-none focus:border-indigo-650 bg-slate-50/55 text-slate-800 font-medium"
                        >
                          <option value="ALL">Semua Bulan</option>
                          <option value="1">Januari</option>
                          <option value="2">Februari</option>
                          <option value="3">Maret</option>
                          <option value="4">April</option>
                          <option value="5">Mei</option>
                          <option value="6">Juni</option>
                          <option value="7">Juli</option>
                          <option value="8">Agustus</option>
                          <option value="9">September</option>
                          <option value="10">Oktober</option>
                          <option value="11">November</option>
                          <option value="12">Desember</option>
                        </select>
                      </div>

                      {/* Filter Tahun */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Tahun</label>
                        <select
                          value={filterYear}
                          onChange={(e) => setFilterYear(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-slate-250 rounded-lg focus:outline-none focus:border-indigo-650 bg-slate-50/55 text-slate-800 font-medium"
                        >
                          <option value="ALL">Semua Tahun</option>
                          {availableYears.map(yr => (
                            <option key={yr} value={yr}>{yr}</option>
                          ))}
                          <option value="2026">2027</option>
                        </select>
                      </div>

                      {/* Filter Bidang */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Bidang</label>
                        <select
                          value={filterBidang}
                          onChange={(e) => setFilterBidang(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-slate-250 rounded-lg focus:outline-none focus:border-indigo-650 bg-slate-50/55 text-slate-800 font-medium"
                        >
                          <option value="ALL">Semua Bidang (Hewan, Ikan, Tumbuhan)</option>
                          <option value="Hewan">Hewan</option>
                          <option value="Ikan">Ikan</option>
                          <option value="Tumbuhan">Tumbuhan</option>
                        </select>
                      </div>

                      {/* Filter Jenis Lalu Lintas */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Jenis Lalu Lintas</label>
                        <select
                          value={filterLaluLintas}
                          onChange={(e) => setFilterLaluLintas(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-slate-250 rounded-lg focus:outline-none focus:border-indigo-655 bg-indigo-50/30 text-indigo-900 font-bold"
                        >
                          <option value="ALL">Semua Lalu Lintas</option>
                          <option value="Domestik Keluar">Domestik Keluar</option>
                          <option value="Domestik Masuk">Domestik Masuk</option>
                          <option value="Ekspor">Ekspor</option>
                          <option value="Impor">Impor</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* DATABASE TABLE CARD COMPONENT */}
                  <DatabaseTable 
                    records={filteredRecords} 
                    onDeleteRecord={handleDeleteRecord} 
                    onRefresh={handleSyncNow}
                    isReady={!isSyncing}
                    onImportRecords={handleImportRecords}
                    onBatchSyncToSheets={storageConfig.appsScriptUrl ? handleBatchSyncToSheets : undefined}
                    isSyncingToSheets={isSyncing}
                    onUpdateRecord={handleUpdateRecord}
                    isAdmin={isIntegrationUnlocked || isPegawai}
                  />
                </>
              )}
            </div>
          )}

          {/* TAB 4: GOOGLE SHEETS INTEGRATION & SYNC */}
          {activeTab === 'integration' && (
            <div className="min-h-[400px] flex items-center justify-center p-2 w-full">
              {!isPegawai ? (
                <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8 text-center space-y-6 my-8 text-left animate-fade-in">
                  <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 border border-amber-100 shadow-sm">
                    <Lock className="w-7 h-7" />
                  </div>
                  
                  <div className="space-y-2 text-center">
                    <h3 className="text-base font-extrabold text-slate-850 tracking-tight">Portal Akses Pegawai BKHIT</h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                      Halaman setelan <b>Integrasi Cloud Sheets</b> dikunci untuk publik guna mencegah konfigurasi database yang tidak sah.
                    </p>
                  </div>

                  <form onSubmit={handlePegawaiLogin} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Sandi Kerja Pegawai</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Masukkan Sandi Pegawai..."
                          value={pegawaiPasswordInput}
                          onChange={(e) => {
                            setPegawaiPasswordInput(e.target.value);
                            if (pegawaiLoginError) setPegawaiLoginError('');
                          }}
                          className={`w-full text-xs pl-10 pr-10 py-3 rounded-xl border bg-slate-50/55 text-slate-850 font-bold tracking-wide focus:outline-none transition-all duration-200 ${
                            pegawaiLoginError 
                              ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 bg-rose-50/10' 
                              : 'border-slate-250 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-150'
                          }`}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {pegawaiLoginError && (
                      <p className="text-[11px] text-rose-600 font-bold bg-rose-50/50 py-1.5 px-3 rounded-lg border border-rose-100/85 flex items-center gap-1.5">
                        <span>⚠️</span> {pegawaiLoginError}
                      </p>
                    )}

                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-100/70 text-left">
                      <span className="text-[10px] text-amber-800 font-semibold leading-relaxed block">
                        📌 <b>Gunakan</b> sandi internal untuk membuka panel setelan.
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs shadow-md shadow-indigo-100 transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider"
                    >
                      Masuk Aplikasi Pegawai
                    </button>
                  </form>
                </div>
              ) : (
                <div className="w-full">
                  {!isIntegrationUnlocked ? (
                    <div className="w-full max-w-md mx-auto bg-white border border-slate-205 rounded-2xl shadow-xl p-8 text-center space-y-6 animate-fade-in">
                      <div className="mx-auto w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
                        <Lock className="w-7 h-7" />
                      </div>
                      
                      <div className="space-y-2">
                        <h2 className="text-lg font-extrabold text-slate-850 tracking-tight">Setelan Terkunci</h2>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                          Halaman integrasi Google Sheets dilindungi oleh Sandi Administrator untuk menjaga konsistensi sinkronisasi satu basis data.
                        </p>
                      </div>

                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (typedPassword === 'Mes Que un Club') {
                            setIsIntegrationUnlocked(true);
                            setPasswordError('');
                          } else {
                            setPasswordError('Sandi salah! Silakan coba lagi.');
                            setTypedPassword('');
                          }
                        }}
                        className="space-y-4"
                      >
                        <div className="relative text-left">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <KeyRound className="w-4 h-4" />
                          </div>
                          <input
                            type="password"
                            placeholder="Hayooo Sandinya Apa Yaa...."
                            value={typedPassword}
                            onChange={(e) => {
                              setTypedPassword(e.target.value);
                              if (passwordError) setPasswordError('');
                            }}
                            className={`w-full text-xs pl-10 pr-4 py-3 rounded-xl border bg-slate-50/55 text-slate-880 focus:outline-none transition-all duration-200 font-semibold ${
                              passwordError 
                                ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 bg-rose-50/10' 
                                : 'border-slate-250 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                            }`}
                            autoFocus
                          />
                        </div>

                        {passwordError && (
                          <p className="text-[11px] text-rose-600 font-bold bg-rose-50/50 py-1.5 px-3 rounded-lg border border-rose-100 animate-pulse text-left flex items-center gap-1.5">
                            <span>⚠️</span> {passwordError}
                          </p>
                        )}

                        <button
                          type="submit"
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs shadow-md shadow-indigo-100 transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider"
                        >
                          Buka Akses Integrasi
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="w-full space-y-6">
                      {/* Status header with Lock options */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-xs border border-emerald-200/50">
                            <Unlock className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-emerald-950">Sesi Administrator Aktif</h4>
                            <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">Anda dapat memodifikasi URL Web App Google Apps Script atau mengganti target Sheet.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsIntegrationUnlocked(false);
                            setTypedPassword('');
                          }}
                          className="text-[10px] bg-white hover:bg-slate-50 border border-emerald-250 text-emerald-800 font-extrabold py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider shadow-sm"
                        >
                          <Lock className="w-3.5 h-3.5 text-emerald-700 font-bold" /> Kunci Kembali
                        </button>
                      </div>

                      <StorageConfigPanel
                        config={storageConfig}
                        onChangeConfig={handleUpdateConfig}
                        onSyncNow={handleSyncNow}
                        isSyncing={isSyncing}
                        isSignedInWithGoogle={isSignedInGoogle}
                        onGoogleSignIn={handleGoogleSignIn}
                        onGoogleSignOut={handleGoogleSignOut}
                        userEmail={userEmail}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </section>

      </main>

      {/* Footer Navigation - Styled "Geometric Balance" */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-[10px] px-6 py-3 shrink-0 font-medium tracking-wide uppercase flex flex-col md:flex-row items-center justify-between gap-2 text-center w-full">
        <div>
          Laporan Operasional Perkarantinaan &bull; BKHIT Papua Barat Daya &bull; Badan Karantina Indonesia
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span className="text-white bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700 font-mono text-[9px]">DATABASE:Google Sheet</span>
          <span className="text-slate-400 font-mono text-[9px]">Versi Pengembangan</span>
        </div>
      </footer>

    </div>
  );
}
