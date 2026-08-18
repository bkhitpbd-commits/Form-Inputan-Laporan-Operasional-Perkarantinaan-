/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CommodityDetail {
  id: string;
  komoditas: string;
  volume: number;
  satuan: string;
  nilaiEkonomi: number;
}

export interface QuarantineRecord {
  id: string; // Dynamic ID (could be sheet row index)
  tempatPelayanan: string;
  via: 'PTK' | 'SSM';
  tanggalSertifikat: string; // YYYY-MM-DD
  nomorDokumen: string;
  daerahAsal: string;
  daerahTujuan: string;
  negaraTujuan?: string; // Optional (only if Ekspor)
  bidang: 'Hewan' | 'Ikan' | 'Tumbuhan';
  statusLaluLintas: 'Domestik Keluar' | 'Domestik Masuk' | 'Ekspor' | 'Impor';
  komoditasList: CommodityDetail[];
  // Summary fields compiled for easy flattening in tabular view & sheet writes
  komoditasSummary: string; // comma-separated or first commodity
  totalVolume: number;
  totalNilaiEkonomi: number;
  linkSertifikat: string;
  createdAt?: string;
  editCount?: number; // Quota tracker: how many times this record was edited (Max 1 for normal user)
  isEdited?: boolean; // Flag indicating if the record has been revised
  editedAt?: string;  // Timestamp of the revision
}

export type StorageMode = 'DEMO' | 'GOOGLE_SHEETS_API' | 'APPS_SCRIPT_WEBAPP';

export interface StorageConfig {
  mode: StorageMode;
  spreadsheetId: string;
  sheetName: string;
  appsScriptUrl: string;
  logoUrl?: string;
}

export const TEMPAT_PELAYANAN_LIST = [
  'TP Pelabuhan Laut',
  'TP Bandara DEO',
  'TP Pelabuhan Rakyat',
  'TP Kantor Pos',
  'TP Raja Ampat'
] as const;

export const VIA_LIST = ['PTK', 'SSM'] as const;

export const BIDANG_LIST = ['Hewan', 'Ikan', 'Tumbuhan'] as const;

export const STATUS_LALU_LINTAS_LIST = [
  'Domestik Keluar',
  'Domestik Masuk',
  'Ekspor',
  'Impor'
] as const;

export const SATUAN_LIST = [
  'kg',
  'ekor',
  'pcs',
  'liter',
  'box',
  'buah/butir/batang',
  'kemasan',
  'ton',
  'gram'
] as const;

export const DAERAH_SUGGESTIONS = [
  'Sorong',
  'Raja Ampat (Waisai)',
  'Sorong Selatan',
  'Maybrat',
  'Tambrauw',
  'Manokwari',
  'Fakfak',
  'Kaimana',
  'Bintuni',
  'Wondama',
  'Jayapura',
  'Merauke',
  'Timika',
  'Biak',
  'Jakarta',
  'Surabaya',
  'Makassar',
  'Ambon',
  'Bitung',
  'Manado',
  'Medan',
  'Semarang',
  'Denpasar'
];

export const NEGARA_SUGGESTIONS = [
  'Singapura',
  'Malaysia',
  'Tiongkok',
  'Jepang',
  'Saudi Arabia',
  'Korea Selatan',
  'Australia',
  'Vietnam',
  'Thailand',
  'Filipina',
  'Timor Leste',
  'Amerika Serikat',
  'India',
  'Papua Nugini',
  'Belanda'
];
