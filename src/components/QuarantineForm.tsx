/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TEMPAT_PELAYANAN_LIST, 
  VIA_LIST, 
  BIDANG_LIST, 
  STATUS_LALU_LINTAS_LIST, 
  SATUAN_LIST, 
  DAERAH_SUGGESTIONS, 
  NEGARA_SUGGESTIONS,
  QuarantineRecord,
  CommodityDetail
} from '../types';
import { FilePlus, Trash2, Plus, Info, Check, HelpCircle } from 'lucide-react';
import { getLocalDateString } from '../utils';

interface QuarantineFormProps {
  onAddRecord: (record: Omit<QuarantineRecord, 'id' | 'komoditasSummary' | 'totalVolume' | 'totalNilaiEkonomi'> & {
    komoditasList: CommodityDetail[];
  }) => void;
  isLoading?: boolean;
}

export default function QuarantineForm({ onAddRecord, isLoading = false }: QuarantineFormProps) {
  // Main form states
  const [tempatPelayanan, setTempatPelayanan] = useState<string>(TEMPAT_PELAYANAN_LIST[0]);
  const [via, setVia] = useState<'PTK' | 'SSM'>('PTK');
  const [tanggalSertifikat, setTanggalSertifikat] = useState<string>(
    getLocalDateString()
  );
  const [nomorDokumen, setNomorDokumen] = useState<string>('');
  
  // Advanced autocompletes
  const [daerahAsal, setDaerahAsal] = useState<string>('');
  const [showAsalSuggest, setShowAsalSuggest] = useState(false);
  const [filteredAsal, setFilteredAsal] = useState<string[]>(DAERAH_SUGGESTIONS);

  const [daerahTujuan, setDaerahTujuan] = useState<string>('');
  const [showTujuanSuggest, setShowTujuanSuggest] = useState(false);
  const [filteredTujuan, setFilteredTujuan] = useState<string[]>(DAERAH_SUGGESTIONS);

  const [negaraTujuan, setNegaraTujuan] = useState<string>('');
  const [showNegaraSuggest, setShowNegaraSuggest] = useState(false);
  const [filteredNegara, setFilteredNegara] = useState<string[]>(NEGARA_SUGGESTIONS);

  const [bidang, setBidang] = useState<'Hewan' | 'Ikan' | 'Tumbuhan'>('Hewan');
  const [statusLaluLintas, setStatusLaluLintas] = useState<'Domestik Keluar' | 'Domestik Masuk' | 'Ekspor' | 'Impor'>('Domestik Keluar');
  const [linkSertifikat, setLinkSertifikat] = useState<string>('');

  // Dynamic commodites list (at least one)
  const [commodities, setCommodities] = useState<CommodityDetail[]>([
    { id: 'initial-1', komoditas: '', volume: 1, satuan: 'ekor', nilaiEkonomi: 0 }
  ]);

  // Handle autocomplete filters
  useEffect(() => {
    setFilteredAsal(
      DAERAH_SUGGESTIONS.filter(item => 
        item.toLowerCase().includes(daerahAsal.toLowerCase())
      )
    );
  }, [daerahAsal]);

  useEffect(() => {
    setFilteredTujuan(
      DAERAH_SUGGESTIONS.filter(item => 
        item.toLowerCase().includes(daerahTujuan.toLowerCase())
      )
    );
  }, [daerahTujuan]);

  useEffect(() => {
    setFilteredNegara(
      NEGARA_SUGGESTIONS.filter(item => 
        item.toLowerCase().includes(negaraTujuan.toLowerCase())
      )
    );
  }, [negaraTujuan]);

  // Validation rules for SSM / Via selection automatically updating Status
  useEffect(() => {
    if (statusLaluLintas === 'Ekspor' || statusLaluLintas === 'Impor') {
      setVia('SSM');
    } else {
      setVia('PTK');
    }
  }, [statusLaluLintas]);

  // Synchronize unit of first empty row when changing bidang categories
  useEffect(() => {
    if (commodities.length === 1 && !commodities[0].komoditas) {
      const defaultUnit = (bidang === 'Hewan' || bidang === 'Ikan') ? 'ekor' : 'kg';
      setCommodities([{
        ...commodities[0],
        satuan: defaultUnit
      }]);
    }
  }, [bidang]);

  // Commodity state updates
  const handleAddCommodityRow = () => {
    const defaultUnit = (bidang === 'Hewan' || bidang === 'Ikan') ? 'ekor' : 'kg';
    setCommodities([
      ...commodities,
      { id: `c-${Date.now()}`, komoditas: '', volume: 1, satuan: defaultUnit, nilaiEkonomi: 0 }
    ]);
  };

  const handleRemoveCommodityRow = (id: string) => {
    if (commodities.length > 1) {
      setCommodities(commodities.filter(c => c.id !== id));
    }
  };

  const handleUpdateCommodity = (id: string, field: keyof Omit<CommodityDetail, 'id'>, value: string | number) => {
    setCommodities(
      commodities.map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Error validations states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<boolean>(false);

  // Checks if this is an export and the country field is filled
  const isExportWithCountry = statusLaluLintas === 'Ekspor' && negaraTujuan.trim() !== '';
  const isDaerahTujuanRequired = !isExportWithCountry;

  // Totals calculations
  const totalVolume = commodities.reduce((sum, c) => sum + (Number(c.volume) || 0), 0);
  const totalNilaiEkonomi = commodities.reduce((sum, c) => sum + (Number(c.nilaiEkonomi) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Basic Validations
    if (!nomorDokumen.trim()) {
      setErrorMsg('Wajib mengisi Nomor Dokumen!');
      return;
    }
    if (!daerahAsal.trim()) {
      setErrorMsg('Wajib mengisi Daerah Asal!');
      return;
    }
    if (isDaerahTujuanRequired && !daerahTujuan.trim()) {
      setErrorMsg('Wajib mengisi Daerah Tujuan (kecuali jika negara tujuan ekspor sudah terisi)!');
      return;
    }

    // Required Negara if Export ("Wajib diisi jika menginput ekspor")
    if (statusLaluLintas === 'Ekspor' && !negaraTujuan.trim()) {
      setErrorMsg('Negara Tujuan WAJIB DIISI jika status lalu lintas adalah EKSPOR!');
      return;
    }

    // Commodity check
    const emptyCommodity = commodities.some(c => !c.komoditas.trim());
    if (emptyCommodity) {
      setErrorMsg('Harap isi semua kolom nama Komoditas!');
      return;
    }

    // Call submit function on app parent
    onAddRecord({
      tempatPelayanan,
      via,
      tanggalSertifikat,
      nomorDokumen,
      daerahAsal,
      daerahTujuan,
      negaraTujuan: statusLaluLintas === 'Ekspor' ? negaraTujuan : '',
      bidang,
      statusLaluLintas,
      komoditasList: commodities,
      linkSertifikat: linkSertifikat || '-'
    });

    // Reset Form
    setNomorDokumen('');
    setDaerahAsal('');
    setDaerahTujuan('');
    setNegaraTujuan('');
    setLinkSertifikat('');
    const defaultUnit = (bidang === 'Hewan' || bidang === 'Ikan') ? 'ekor' : 'kg';
    setCommodities([
      { id: `c-${Date.now()}`, komoditas: '', volume: 1, satuan: defaultUnit, nilaiEkonomi: 0 }
    ]);
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3000);
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div id="quarantine-form-card" className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-left">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700">
          <FilePlus className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-semibold text-lg text-slate-800 leading-tight">Input Data Sertifikat Kesehatan (KT-3,KH-1,KI-1,Dll...)</h2>
          <p className="text-xs text-slate-500 mt-1">Form Inputan Laporan Operasional Karantina (Hewan, Ikan, Tumbuhan)</p>
        </div>
      </div> 

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Row 1: Tempat Pelayanan & Via */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Tempat Pelayanan <span className="text-red-500">*</span></label>
            <select
              value={tempatPelayanan}
              onChange={(e) => setTempatPelayanan(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-250 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white"
            >
              {TEMPAT_PELAYANAN_LIST.map((place) => (
                <option key={place} value={place}>{place}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block flex justify-between">
              <span>Pengajuan Via</span>
              <span className="text-[10px] text-slate-500 font-normal">Auto-sync dari status lalu lintas</span>
            </label>
            <div className="flex gap-2.5">
               {VIA_LIST.map((viaOption) => (
                <button
                  type="button"
                  key={viaOption}
                  onClick={() => setVia(viaOption)}
                  disabled={statusLaluLintas === 'Ekspor' || statusLaluLintas === 'Impor'}
                  className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg border text-center transition-all ${
                    via === viaOption
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {viaOption === 'PTK' ? 'PTK (Domestik)' : 'SSM (Ekspor/Impor)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Tanggal & Nomor Dokumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Tanggal Terbit Sertifikat <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={tanggalSertifikat}
              onChange={(e) => setTanggalSertifikat(e.target.value)}
              required
              className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-250 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Nomor Dokumen <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="Contoh: 2026-T3.0-9600.0-K.T.3-000000"
              value={nomorDokumen}
              onChange={(e) => setNomorDokumen(e.target.value)}
              required
              className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-250 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white placeholder-slate-400"
            />
          </div>
        </div>

        {/* Row 3: Bidang (Radio buttons) & Status Lalu Lintas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Bidang Karantina <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {BIDANG_LIST.map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => setBidang(b)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg border text-center transition-all ${
                    bidang === b
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-250 hover:bg-slate-100'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Status Lalu Lintas <span className="text-red-500">*</span></label>
            <select
              value={statusLaluLintas}
              onChange={(e) => setStatusLaluLintas(e.target.value as any)}
              className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-250 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white"
            >
              {STATUS_LALU_LINTAS_LIST.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 4: Daerah Asal, Daerah Tujuan & Negara Tujuan (Dynamic) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Daerah Asal with Autocomplete */}
          <div className="space-y-1.5 relative">
            <label className="text-xs font-semibold text-slate-700 block">Daerah Asal <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="Ketik asal daerah..."
              value={daerahAsal}
              onChange={(e) => setDaerahAsal(e.target.value)}
              onFocus={() => setShowAsalSuggest(true)}
              onBlur={() => setTimeout(() => setShowAsalSuggest(false), 200)}
              required
              className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-250 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white"
            />
            {showAsalSuggest && filteredAsal.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-30">
                {filteredAsal.map((city, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onMouseDown={() => setDaerahAsal(city)}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-100/80 font-medium text-slate-700 block transition-colors"
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Daerah Tujuan with Autocomplete */}
          <div className="space-y-1.5 relative">
            <label className="text-xs font-semibold text-slate-700 block flex items-center gap-1">
              <span>Daerah / Kota Tujuan</span>
              {isDaerahTujuanRequired ? (
                <span className="text-red-500 font-bold">*</span>
              ) : (
                <span className="text-slate-400 font-normal italic">(Opsional - Dilewati)</span>
              )}
            </label>
            <input
              type="text"
              placeholder={isDaerahTujuanRequired ? "Ketik tujuan daerah..." : "Bisa dilewati untuk Ekspor"}
              value={daerahTujuan}
              onChange={(e) => setDaerahTujuan(e.target.value)}
              onFocus={() => setShowTujuanSuggest(true)}
              onBlur={() => setTimeout(() => setShowTujuanSuggest(false), 200)}
              required={isDaerahTujuanRequired}
              className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-250 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white"
            />
            {showTujuanSuggest && filteredTujuan.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-30">
                {filteredTujuan.map((city, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onMouseDown={() => setDaerahTujuan(city)}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-100/80 font-medium text-slate-700 block transition-colors"
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Negara Tujuan - REQUIRED ONLY if Ekspor ("Wajib diisi jika menginput ekspor") */}
          <div className="space-y-1.5 relative text-left">
            <label className="text-xs font-semibold text-slate-700 block flex items-center gap-1">
              <span>Negara Tujuan</span>
              {statusLaluLintas === 'Ekspor' ? (
                <span className="text-red-500 font-bold">* (Wajib Ekspor)</span>
              ) : (
                <span className="text-slate-400 font-normal italic">(Opsional)</span>
              )}
            </label>
            <input
              type="text"
              placeholder={statusLaluLintas === 'Ekspor' ? "Ketik negara tujuan..." : "Biarkan kosong jika Domestik"}
              value={negaraTujuan}
              onChange={(e) => setNegaraTujuan(e.target.value)}
              onFocus={() => setShowNegaraSuggest(true)}
              onBlur={() => setTimeout(() => setShowNegaraSuggest(false), 200)}
              disabled={statusLaluLintas !== 'Ekspor' && statusLaluLintas !== 'Impor'}
              className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-250 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white disabled:bg-slate-100 disabled:text-slate-450 disabled:border-slate-200 transition-colors"
            />
            {showNegaraSuggest && filteredNegara.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-30">
                {filteredNegara.map((country, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onMouseDown={() => setNegaraTujuan(country)}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-100/80 font-medium text-slate-700 block transition-colors"
                  >
                    {country}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Segment: Dynamic Commodity List */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-left">
          <div className="flex items-center justify-between gap-2 mb-3.5 border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold text-slate-805 tracking-wide uppercase flex items-center gap-1">
              <Info className="w-4 h-4 text-indigo-600" /> Detail Komoditas ({commodities.length})
            </h3>
            <button
              type="button"
              onClick={handleAddCommodityRow}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4" /> Tambah Baris
            </button>
          </div>

          <div className="space-y-3">
            {commodities.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 bg-white rounded-lg border border-slate-200">
                <div className="md:col-span-5 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase">Komoditas <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Nama Komoditas / Spesies (misal: Kepiting Bakau)"
                    value={item.komoditas}
                    required
                    onChange={(e) => handleUpdateCommodity(item.id, 'komoditas', e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-250 focus:outline-none focus:border-indigo-600 bg-white text-slate-800"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase">Volume</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={item.volume}
                    onChange={(e) => handleUpdateCommodity(item.id, 'volume', Number(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-250 focus:outline-none focus:border-indigo-650 bg-white text-slate-800"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase">Satuan</label>
                  <select
                    value={item.satuan}
                    onChange={(e) => handleUpdateCommodity(item.id, 'satuan', e.target.value)}
                    className="w-full text-xs px-2.5 py-2 rounded-md border border-slate-250 focus:outline-none focus:border-indigo-650 bg-white text-slate-800"
                  >
                    {SATUAN_LIST.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 space-y-11 md:space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase">Nilai Ekonomi (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Rp"
                    value={item.nilaiEkonomi}
                    required
                    onChange={(e) => handleUpdateCommodity(item.id, 'nilaiEkonomi', Number(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-250 focus:outline-none focus:border-indigo-600 bg-white text-slate-800"
                  />
                </div>

                <div className="md:col-span-1 flex justify-center pb-0.5">
                  <button
                    type="button"
                    onClick={() => handleRemoveCommodityRow(item.id)}
                    disabled={commodities.length <= 1}
                    className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Commodity Compiled Indicators */}
          <div className="mt-3 flex justify-between flex-wrap text-slate-655 font-medium text-[11px] px-2.5">
            <div>Jumlah Item: <b className="text-slate-800">{commodities.length}</b></div>
            <div>Estimasi Total Volume: <b className="text-slate-800">{totalVolume}</b></div>
            <div>Total Nilai Ekonomi: <b className="text-indigo-700">{formatIDR(totalNilaiEkonomi)}</b></div>
          </div>
        </div>

        {/* Link Sertifikat */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">Link Sertifikat Best Trust (Doc Signed)</label>
          <input
            type="text"
            placeholder="https://karantina.go.id/verify?id=..."
            value={linkSertifikat}
            onChange={(e) => setLinkSertifikat(e.target.value)}
            className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-250 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white placeholder-slate-400"
          />
        </div>

        {/* Controls, Error Messages & Success States */}
        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-800 border border-red-200 text-xs font-semibold rounded-lg">
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-semibold rounded-lg flex items-center gap-1.5">
            <Check className="w-4 h-4 text-indigo-600 animate-bounce" /> Data laporan karantina sukses tersimpan dan disinkronkan ke Google Sheet!
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm transition-all hover:shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {isLoading ? 'Sedang Menyimpan Laporan...' : 'Kirim & Simpan ke Sheets'}
        </button>
      </form>
    </div>
  );
}
