/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  QuarantineRecord, 
  CommodityDetail, 
  TEMPAT_PELAYANAN_LIST, 
  VIA_LIST, 
  BIDANG_LIST, 
  STATUS_LALU_LINTAS_LIST, 
  SATUAN_LIST, 
  DAERAH_SUGGESTIONS, 
  NEGARA_SUGGESTIONS 
} from '../types';
import { 
  Pencil, X, Save, AlertTriangle, ShieldAlert, 
  Lock, Plus, Trash2, CheckCircle2, KeyRound 
} from 'lucide-react';

interface EditRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: QuarantineRecord | null;
  onSaveEdit: (updatedRecord: QuarantineRecord) => void;
  isAdmin?: boolean;
}

export default function EditRecordModal({
  isOpen,
  onClose,
  record,
  onSaveEdit,
  isAdmin = false
}: EditRecordModalProps) {
  if (!isOpen || !record) return null;

  // Form states initialized with existing record data
  const [tempatPelayanan, setTempatPelayanan] = useState<string>(record.tempatPelayanan || TEMPAT_PELAYANAN_LIST[0]);
  const [via, setVia] = useState<'PTK' | 'SSM'>(record.via || 'PTK');
  const [tanggalSertifikat, setTanggalSertifikat] = useState<string>(record.tanggalSertifikat || '');
  const [nomorDokumen, setNomorDokumen] = useState<string>(record.nomorDokumen || '');
  const [bidang, setBidang] = useState<'Hewan' | 'Ikan' | 'Tumbuhan'>(record.bidang || 'Hewan');
  const [statusLaluLintas, setStatusLaluLintas] = useState<'Domestik Keluar' | 'Domestik Masuk' | 'Ekspor' | 'Impor'>(record.statusLaluLintas || 'Domestik Keluar');
  const [daerahAsal, setDaerahAsal] = useState<string>(record.daerahAsal || '');
  const [daerahTujuan, setDaerahTujuan] = useState<string>(record.daerahTujuan || '');
  const [negaraTujuan, setNegaraTujuan] = useState<string>(record.negaraTujuan || '');
  const [linkSertifikat, setLinkSertifikat] = useState<string>(record.linkSertifikat || '');

  // Commodities state
  const [commodities, setCommodities] = useState<CommodityDetail[]>(
    record.komoditasList && record.komoditasList.length > 0
      ? record.komoditasList.map(c => ({ ...c }))
      : [{ id: `com-${Date.now()}`, komoditas: record.komoditasSummary || 'Komoditas', volume: record.totalVolume || 1, satuan: 'kg', nilaiEkonomi: record.totalNilaiEkonomi || 0 }]
  );

  // Admin override passcode state
  const [showAdminUnlock, setShowAdminUnlock] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [passError, setPassError] = useState('');

  // Edit quota status
  const currentEditCount = record.editCount || (record.isEdited ? 1 : 0);
  const isLocked = currentEditCount >= 1 && !isAdmin && !adminUnlocked;

  // Commodity handlers
  const handleAddCommodity = () => {
    const defaultUnit = (bidang === 'Hewan' || bidang === 'Ikan') ? 'ekor' : 'kg';
    setCommodities(prev => [
      ...prev,
      {
        id: `com-${Date.now()}-${prev.length + 1}`,
        komoditas: '',
        volume: 1,
        satuan: defaultUnit,
        nilaiEkonomi: 0
      }
    ]);
  };

  const handleRemoveCommodity = (id: string) => {
    if (commodities.length <= 1) return;
    setCommodities(prev => prev.filter(c => c.id !== id));
  };

  const handleCommodityChange = (id: string, field: keyof CommodityDetail, value: any) => {
    setCommodities(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Admin passcode verification
  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasscode === 'bkhitpbd2025' || adminPasscode === 'karanti123' || adminPasscode === 'admin123') {
      setAdminUnlocked(true);
      setShowAdminUnlock(false);
      setPassError('');
    } else {
      setPassError('Sandi Administrator salah.');
    }
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      alert('Data ini telah mencapai batas maksimal 1x edit untuk menjaga integritas database.');
      return;
    }

    if (!nomorDokumen.trim()) {
      alert('Nomor Dokumen wajib diisi.');
      return;
    }

    // Calculate totals
    const totalVol = commodities.reduce((acc, c) => acc + (Number(c.volume) || 0), 0);
    const totalVal = commodities.reduce((acc, c) => acc + (Number(c.nilaiEkonomi) || 0), 0);
    const summary = commodities.map(c => `${c.komoditas || 'Komoditas'} (${c.volume} ${c.satuan})`).join(', ');

    const updatedRecord: QuarantineRecord = {
      ...record,
      tempatPelayanan,
      via,
      tanggalSertifikat,
      nomorDokumen: nomorDokumen.trim(),
      daerahAsal: daerahAsal.trim(),
      daerahTujuan: daerahTujuan.trim(),
      negaraTujuan: statusLaluLintas === 'Ekspor' ? negaraTujuan.trim() : '',
      bidang,
      statusLaluLintas,
      komoditasList: commodities,
      komoditasSummary: summary,
      totalVolume: totalVol,
      totalNilaiEkonomi: totalVal,
      linkSertifikat: linkSertifikat.trim(),
      isEdited: true,
      editCount: currentEditCount + 1,
      editedAt: new Date().toISOString()
    };

    onSaveEdit(updatedRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Edit Data Sertifikat Karantina
                </h3>
                {isLocked ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Terkunci (Sudah Diedit 1x)
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                    Kesempatan Edit: 1x
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                No. Dokumen: <span className="text-amber-200 font-bold">{record.nomorDokumen}</span>
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
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Policy Notice Box */}
          {!isLocked ? (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-800">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Ketentuan Pengeditan Data (Sistem 1x Edit):</span>
                <p className="mt-0.5 text-amber-700 leading-relaxed">
                  Untuk menjaga integritas dan validitas database operasional BKHIT Papua Barat Daya, setiap pengguna hanya diberikan <b>1 kali kesempatan revisi</b> untuk data yang telah tersimpan. Setelah disimpan, tombol edit pada baris ini akan terkunci secara permanen.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-800">
              <div className="flex items-start gap-2.5">
                <Lock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-900">Data Ini Telah Terkunci (Batas 1x Edit Telah Digunakan)</p>
                  <p className="mt-0.5 text-rose-700">
                    Data ini sudah pernah direvisi pada <b>{record.editedAt ? new Date(record.editedAt).toLocaleString('id-ID') : 'sebelumnya'}</b>. Akses formulir edit dinonaktifkan untuk mencegah perubahan data ganda.
                  </p>
                </div>
              </div>

              {/* Admin Unlock Toggle */}
              {!adminUnlocked && (
                <div className="pt-2 border-t border-rose-200/80 flex items-center justify-between">
                  <span className="text-[11px] text-rose-600">Perlu koreksi darurat oleh Administrator?</span>
                  <button
                    type="button"
                    onClick={() => setShowAdminUnlock(!showAdminUnlock)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1"
                  >
                    <KeyRound className="w-3.5 h-3.5" /> Buka Kunci Admin
                  </button>
                </div>
              )}

              {/* Passcode input box */}
              {showAdminUnlock && !adminUnlocked && (
                <div className="mt-2 p-3 bg-white border border-rose-200 rounded-lg space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">Masukkan Sandi Administrator:</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={adminPasscode}
                      onChange={(e) => setAdminPasscode(e.target.value)}
                      placeholder="Sandi Admin..."
                      className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg flex-1 focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyPasscode}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors"
                    >
                      Buka Kunci
                    </button>
                  </div>
                  {passError && <p className="text-[10px] text-rose-600 font-bold">{passError}</p>}
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <form id="edit-record-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Row 1: Nomor Dokumen & Tanggal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Dokumen / Sertifikat: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={nomorDokumen}
                  onChange={(e) => setNomorDokumen(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 disabled:bg-slate-100 disabled:text-slate-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Sertifikat: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  disabled={isLocked}
                  value={tanggalSertifikat}
                  onChange={(e) => setTanggalSertifikat(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 disabled:bg-slate-100 disabled:text-slate-500"
                  required
                />
              </div>
            </div>

            {/* Row 2: Tempat Pelayanan, Via, Bidang, Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tempat Pelayanan:</label>
                <select
                  disabled={isLocked}
                  value={tempatPelayanan}
                  onChange={(e) => setTempatPelayanan(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                >
                  {TEMPAT_PELAYANAN_LIST.map((tp) => (
                    <option key={tp} value={tp}>{tp}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pengajuan Via:</label>
                <select
                  disabled={isLocked}
                  value={via}
                  onChange={(e) => setVia(e.target.value as 'PTK' | 'SSM')}
                  className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                >
                  {VIA_LIST.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bidang:</label>
                <select
                  disabled={isLocked}
                  value={bidang}
                  onChange={(e) => setBidang(e.target.value as 'Hewan' | 'Ikan' | 'Tumbuhan')}
                  className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                >
                  {BIDANG_LIST.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status Lalu Lintas:</label>
                <select
                  disabled={isLocked}
                  value={statusLaluLintas}
                  onChange={(e) => setStatusLaluLintas(e.target.value as any)}
                  className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                >
                  {STATUS_LALU_LINTAS_LIST.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Daerah Asal, Tujuan, Negara Tujuan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Daerah Asal:</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={daerahAsal}
                  onChange={(e) => setDaerahAsal(e.target.value)}
                  placeholder="Contoh: Sorong"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Daerah Tujuan:</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={daerahTujuan}
                  onChange={(e) => setDaerahTujuan(e.target.value)}
                  placeholder="Contoh: Jakarta"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                />
              </div>

              {statusLaluLintas === 'Ekspor' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Negara Tujuan (Ekspor):</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={negaraTujuan}
                    onChange={(e) => setNegaraTujuan(e.target.value)}
                    placeholder="Contoh: Singapura"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                  />
                </div>
              )}
            </div>

            {/* Row 4: Komoditas & Volume */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Rincian Komoditas & Volume ({commodities.length})
                </span>
                {!isLocked && (
                  <button
                    type="button"
                    onClick={handleAddCommodity}
                    className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Komoditas
                  </button>
                )}
              </div>

              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {commodities.map((item, idx) => (
                  <div key={item.id || idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="flex-1 min-w-[140px]">
                      <input
                        type="text"
                        disabled={isLocked}
                        value={item.komoditas}
                        onChange={(e) => handleCommodityChange(item.id, 'komoditas', e.target.value)}
                        placeholder="Nama Komoditas..."
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                        required
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        disabled={isLocked}
                        value={item.volume}
                        onChange={(e) => handleCommodityChange(item.id, 'volume', parseFloat(e.target.value) || 0)}
                        placeholder="Volume"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 text-right disabled:bg-slate-100 font-semibold"
                        required
                      />
                    </div>
                    <div className="w-24">
                      <select
                        disabled={isLocked}
                        value={item.satuan}
                        onChange={(e) => handleCommodityChange(item.id, 'satuan', e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                      >
                        {SATUAN_LIST.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        min="0"
                        disabled={isLocked}
                        value={item.nilaiEkonomi}
                        onChange={(e) => handleCommodityChange(item.id, 'nilaiEkonomi', parseFloat(e.target.value) || 0)}
                        placeholder="Nilai (Rp)"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 text-right disabled:bg-slate-100"
                      />
                    </div>
                    {!isLocked && commodities.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCommodity(item.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Baris"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Row 5: Link Sertifikat */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Link Dokumen / Tautan Verifikasi (Opsional):
              </label>
              <input
                type="url"
                disabled={isLocked}
                value={linkSertifikat}
                onChange={(e) => setLinkSertifikat(e.target.value)}
                placeholder="https://..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
              />
            </div>

          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors"
          >
            Tutup / Batal
          </button>

          {!isLocked && (
            <button
              type="submit"
              form="edit-record-form"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
            >
              <Save className="w-4 h-4" />
              Simpan Perubahan (Gunakan Kesempatan 1x Edit)
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
