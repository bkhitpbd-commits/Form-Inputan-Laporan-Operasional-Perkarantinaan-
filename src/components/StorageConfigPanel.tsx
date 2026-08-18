/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StorageConfig, StorageMode } from '../types';
import { googleAppsScriptTemplate } from '../data';
import { Database, FileSpreadsheet, Code, Copy, Check, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, Share2, Image } from 'lucide-react';

interface StorageConfigPanelProps {
  config: StorageConfig;
  onChangeConfig: (newConfig: StorageConfig) => void;
  onSyncNow?: () => Promise<void>;
  isSyncing?: boolean;
  isSignedInWithGoogle: boolean;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  userEmail?: string | null;
}

export function convertGoogleDriveLink(url: string): string {
  const cleanUrl = url.trim();
  if (!cleanUrl) return '';
  
  // Pattern 1: https://drive.google.com/file/d/FILE_ID/view...
  const fileDRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const matchD = cleanUrl.match(fileDRegex);
  if (matchD && matchD[1]) {
    return `https://lh3.googleusercontent.com/d/${matchD[1]}`;
  }

  // Pattern 2: https://drive.google.com/open?id=FILE_ID or uc?id=FILE_ID or uc?export=download&id=FILE_ID
  const idParamRegex = /[?&]id=([a-zA-Z0-9_-]+)/;
  const matchId = cleanUrl.match(idParamRegex);
  if (matchId && matchId[1]) {
    return `https://lh3.googleusercontent.com/d/${matchId[1]}`;
  }

  return cleanUrl; // Return as-is if it's already a direct link or not Google Drive
}

export default function StorageConfigPanel({
  config,
  onChangeConfig,
  onSyncNow,
  isSyncing = false,
  isSignedInWithGoogle,
  onGoogleSignIn,
  onGoogleSignOut,
  userEmail
}: StorageConfigPanelProps) {
  const [showScript, setShowScript] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Local inputs
  const [tempSpreadsheetId, setTempSpreadsheetId] = useState(config.spreadsheetId || '');
  const [tempSheetName, setTempSheetName] = useState(config.sheetName || 'Laporan_Karantina');
  const [tempAppsScriptUrl, setTempAppsScriptUrl] = useState(config.appsScriptUrl || '');
  const [tempLogoUrl, setTempLogoUrl] = useState(config.logoUrl || '');

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(googleAppsScriptTemplate);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleCopyShareLink = async () => {
    if (!tempAppsScriptUrl) return;
    try {
      // Build parameters in URL
      const shareUrl = `${window.location.origin}${window.location.pathname}?appsScriptUrl=${encodeURIComponent(tempAppsScriptUrl)}&mode=APPS_SCRIPT_WEBAPP`;
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy share link: ', err);
    }
  };

  const handleSaveConfig = (mode: StorageMode) => {
    const formattedLogoUrl = convertGoogleDriveLink(tempLogoUrl);
    onChangeConfig({
      mode,
      spreadsheetId: tempSpreadsheetId,
      sheetName: tempSheetName,
      appsScriptUrl: tempAppsScriptUrl,
      logoUrl: formattedLogoUrl
    });
    // Sync local state as well
    if (formattedLogoUrl !== tempLogoUrl) {
      setTempLogoUrl(formattedLogoUrl);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div id="storage-config-panel" className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden text-left">
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-800 px-6 py-4 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-200" />
          <div>
            <h2 className="font-semibold text-lg leading-tight">Integrasi & Sinkronisasi Database</h2>
            <p className="text-xs text-indigo-100 mt-1">Gunakan Google Sheets atau Apps Script sebagai database Anda</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
            config.mode === 'DEMO'
              ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
              : 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30'
          }`}>
            Aktif: {config.mode === 'DEMO' ? 'Mode Demo / Local' : config.mode === 'GOOGLE_SHEETS_API' ? 'Direct Sheets API' : 'Google Apps Script URL'}
          </span>
        </div>
      </div>

      <div className="p-6">
        {/* Toggle Mode */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Demo Mode Card */}
          <button
            id="mode-demo-btn"
            onClick={() => handleSaveConfig('DEMO')}
            className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all hover:scale-[1.01] ${
              config.mode === 'DEMO'
                ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                : 'border-slate-250 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2 font-medium">
              <Database className={`w-5 h-5 ${config.mode === 'DEMO' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="text-sm font-semibold">Mode Demo & Local Storage</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Data disimpan secara lokal di browser. Sangat cocok untuk menguji aplikasi tanpa konfigurasi pihak ketiga.
            </p>
          </button>

          {/* Apps Script Mode Card */}
          <button
            id="mode-webapp-btn"
            onClick={() => handleSaveConfig('APPS_SCRIPT_WEBAPP')}
            className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all hover:scale-[1.01] ${
              config.mode === 'APPS_SCRIPT_WEBAPP'
                ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                : 'border-slate-250 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2 font-medium">
              <Code className={`w-5 h-5 ${config.mode === 'APPS_SCRIPT_WEBAPP' ? 'text-indigo-650' : 'text-slate-400'}`} />
              <span className="text-sm font-semibold text-slate-800">Google Apps Script Web App</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Hubungkan aplikasi dengan menyalin kode Apps Script ke Spreadsheet Anda, lalu aktifkan URL Aplikasi Web sebagai penampung inputan otomatis.
            </p>
          </button>

          {/* Sheets API Card */}
          <button
            id="mode-sheets-btn"
            onClick={() => handleSaveConfig('GOOGLE_SHEETS_API')}
            className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all hover:scale-[1.01] ${
              config.mode === 'GOOGLE_SHEETS_API'
                ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                : 'border-slate-250 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2 font-medium">
              <FileSpreadsheet className={`w-5 h-5 ${config.mode === 'GOOGLE_SHEETS_API' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="text-sm font-semibold">Hubungkan Sheets Langsung</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Masuk dengan akun Google Anda dan tulis data langsung ke ID Spreadsheet yang Anda tetapkan secara real-time.
            </p>
          </button>
        </div>

        {/* Dynamic Config Controls */}
        {config.mode === 'DEMO' && (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/60 text-amber-900 text-xs flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Berjalan dalam Mode demo / offline lokal</span>
              Data quarantine realistis untuk Papua Barat Daya telah dimuat. Setiap inputan baru akan disimpan di memori browser (LocalStorage). Anda bisa mengubah mode sinkronisasi menjadi Google Sheets kapan saja di menu ini untuk mendeposisi data baru ke spreadsheet sungguhan.
            </div>
          </div>
        )}

        {config.mode === 'APPS_SCRIPT_WEBAPP' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs leading-relaxed space-y-2">
              <div className="font-semibold text-indigo-800 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Panduan Google Apps Script:
              </div>
              <ol className="list-decimal list-inside space-y-1.5 pl-1">
                <li>Buka Google Sheet Anda, klik <b>Ekstensi</b> lalu pilih <b>Apps Script</b>.</li>
                <li>Klik tombol <b>"Lihat Kode Google Apps Script"</b> di bawah untuk membuka template kode kami.</li>
                <li>Salin kode tersebut dan tempel (paste) di editor Apps Script Anda. Klik simpan.</li>
                <li>Jalankan fungsi <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">setupSheet</code> sekali untuk membuat format header database di sheet Anda otomatis.</li>
                <li>Pilih <b>Terapkan (Deploy)</b> &gt; <b>Terapkan Baru (New Deployment)</b>, pilih tipe <b>Aplikasi Web (Web App)</b>, setel akses untuk <b>Siapa saja (Anyone)</b>.</li>
                <li>Salin Tautan Aplikasi Web yang dihasilkan oleh Google, tempel di kolom di bawah ini dan klik <b>Simpan Konfigurasi</b>.</li>
              </ol>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-150">
              <div className="md:col-span-9 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block text-left">
                  Tautan Aplikasi Web Google Apps Script (URL Deploy)
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={tempAppsScriptUrl}
                  onChange={(e) => setTempAppsScriptUrl(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-250 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <div className="md:col-span-3">
                <button
                  type="button"
                  onClick={() => handleSaveConfig('APPS_SCRIPT_WEBAPP')}
                  className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Simpan Tautan
                </button>
              </div>
            </div>

            {tempAppsScriptUrl && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div className="space-y-0.5">
                  <div className="font-bold text-xs text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 text-indigo-600 animate-pulse" /> Bagikan Aplikasi Terintegrasi
                  </div>
                  <p className="text-[11px] text-indigo-750 font-medium">
                    Gunakan tautan khusus di bawah ini agar rekan tim Anda langsung terhubung ke Google Sheets ini tanpa konfigurasi manual!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 shrink-0 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  {shareCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 animate-bounce" />
                      Tautan Tersalin!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      Salin Link Share Tim
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Apps Script Code Exposer */}
            <div>
              <button
                type="button"
                onClick={() => setShowScript(!showScript)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-750 focus:outline-none"
              >
                {showScript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showScript ? 'Sembunyikan' : 'Lihat'} Kode Google Apps Script (.gs) Untuk Google Sheets Anda
              </button>

              {showScript && (
                <div className="mt-2.5 rounded-xl border border-slate-200 overflow-hidden text-left shadow-inner">
                  <div className="bg-slate-800 text-slate-400 px-4 py-2 flex items-center justify-between font-mono text-xs">
                    <span>GoogleAppsScript_BKHIT_PapuaBaratDaya.gs</span>
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="text-white bg-slate-700 hover:bg-slate-600 text-xs px-2.5 py-1.5 rounded flex items-center gap-1 transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-indigo-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Tersalin' : 'Salin Kode'}
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-xs overflow-auto max-h-72 leading-relaxed">
                    <code>{googleAppsScriptTemplate}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {config.mode === 'GOOGLE_SHEETS_API' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 leading-relaxed">
              <div className="font-semibold text-indigo-705 flex items-center gap-1.5 text-sm">
                <FileSpreadsheet className="w-4 h-4" /> Menulis Langsung via Google Sheets API (Otentikasi Google):
              </div>
              <p>
                Mode ini mengaktifkan komunikasi browser langsung dengan spreadsheet Anda. Anda perlu login menggunakan akun Google yang memiliki izin akses ke spreadsheet tersebut.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {isSignedInWithGoogle ? (
                  <div className="flex items-center gap-2 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-200">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    <span className="font-semibold">{userEmail || 'Terhubung'}</span>
                    <button
                      type="button"
                      onClick={onGoogleSignOut}
                      className="ml-2 font-bold text-indigo-950 hover:underline border-l border-indigo-200 pl-2"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onGoogleSignIn}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Hubungkan / Login Google Account
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-700 block">
                  Spreadsheet ID Google Sheet Anda
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 1a2b3c4d5e6f7g8h9i0j..."
                  value={tempSpreadsheetId}
                  onChange={(e) => setTempSpreadsheetId(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-250 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  ID ini terdapat pada url spreadsheet: <span className="font-mono">https://docs.google.com/spreadsheets/d/<b>[SPREADSHEET_ID]</b>/edit...</span>
                </span>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-700 block">
                  Nama Sheet / Tab Worksheet
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Laporan_Karantina"
                  value={tempSheetName}
                  onChange={(e) => setTempSheetName(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-250 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Set standar ke tab utama, default: <span className="font-mono">Laporan_Karantina</span>
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleSaveConfig('GOOGLE_SHEETS_API')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Simpan Pengaturan
              </button>

              {onSyncNow && (
                <button
                  type="button"
                  disabled={isSyncing || !tempSpreadsheetId}
                  onClick={onSyncNow}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing ? (
                    <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                  {isSyncing ? 'Sinkronisasi...' : 'Tarik Data Sheet'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Custom Logo Card Section - Universal Configuration */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-left space-y-4">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-800">Kustomisasi Logo Unit (Google Drive / Link Gambar)</h3>
              <p className="text-[11px] text-slate-500">Sesuaikan logo instansi di pojok kiri atas aplikasi</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3 leading-relaxed">
            <span className="font-bold text-indigo-800 block">💡 Cara Menggunakan Link Google Drive:</span>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1">
              <li>Unggah gambar logo ke Google Drive Anda.</li>
              <li>Klik kanan pada file, pilih <b>Bagikan (Share)</b>, lalu ubah akses umum menjadi <b>Siapa saja yang memiliki link (Anyone with link can view)</b>.</li>
              <li>Salin link bagikan tersebut dan tempelkan di bawah ini. Tautan berformat <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">https://drive.google.com/file/d/...</code> akan otomatis dikonversi agar bisa langsung me-render gambar dengan baik!</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-9 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block text-left">
                Tautan Logo Google Drive / Direct Image URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Masukkan link Google Drive Anda di sini (Contoh: https://drive.google.com/file/d/xxxxxx/view)"
                  value={tempLogoUrl}
                  onChange={(e) => setTempLogoUrl(e.target.value)}
                  className="w-full text-xs pl-3 pr-10 py-2.5 rounded-lg border border-slate-250 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium"
                />
                {tempLogoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setTempLogoUrl('');
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
            <div className="md:col-span-3">
              <button
                type="button"
                onClick={() => handleSaveConfig(config.mode)}
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer"
              >
                <Check className="w-4 h-4" /> Simpan Logo
              </button>
            </div>
          </div>

          {config.logoUrl && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-150 p-3 rounded-lg text-xs text-emerald-800">
              <div className="w-10 h-10 bg-white rounded border border-emerald-200 p-1 flex items-center justify-center shrink-0">
                <img 
                  src={config.logoUrl} 
                  alt="Preview Logo Kustom" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="font-bold block">Pratinjau Logo Aktif Berhasil Dimuat</span>
                <p className="text-[10px] text-emerald-600 mt-0.5">Logo telah diset dan disimpan di pengaturan lokal Anda.</p>
              </div>
            </div>
          )}
        </div>

        {isSaved && (
          <div className="mt-3 p-2 bg-indigo-50 text-indigo-800 text-xs font-semibold text-center rounded-lg border border-indigo-200 flex items-center justify-center gap-1.5 animate-fade-in">
            <Check className="w-4 h-4 animate-bounce text-indigo-605" /> Pengaturan database berhasil disimpan dan diperbarui!
          </div>
        )}
      </div>
    </div>
  );
}
