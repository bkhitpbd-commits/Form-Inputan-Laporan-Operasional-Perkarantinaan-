/**
 * Utility functions for date processing
 */

/**
 * Gets current local date formatted as YYYY-MM-DD
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

/**
 * Normalizes date input safely to YYYY-MM-DD local format
 */
export function parseAndNormalizeDate(dateInput: any): string {
  if (!dateInput) return '';
  const dateStr = String(dateInput).trim();
  
  // If it's empty, return it
  if (!dateStr || dateStr === '-') return '';

  // If it's a simple YYYY-MM-DD string with nothing else, return it directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // If it starts with YYYY-MM-DD and is followed by space/time without timezone info (e.g. "2026-06-14 12:00:00")
  if (/^\d{4}-\d{2}-\d{2}\s/.test(dateStr)) {
    return dateStr.substring(0, 10);
  }

  // Parse using Date object and output local year-month-date parts to bypass UTC shift issues
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return getLocalDateString(d);
    }
  } catch (e) {
    console.error("Failed to parse and normalize date: ", dateStr, e);
  }
  
  // Fallback to substring
  return dateStr.substring(0, 10);
}

interface ParsedCommodity {
  id: string;
  komoditas: string;
  volume: number;
  satuan: string;
  nilaiEkonomi: number;
}

/**
 * Parses flat commodity string representation e.g. "Jeruk (400 kg), Apel (200 kg)"
 * back into discrete list of individual commodities with proportional weights.
 */
export function parseCommodityString(
  stringInput: string,
  totalVolume: number,
  totalValue: number,
  bidang?: string
): ParsedCommodity[] {
  const isAnimalOrFish = bidang && (bidang.toLowerCase() === 'hewan' || bidang.toLowerCase() === 'ikan');
  const defaultUnit = isAnimalOrFish ? 'ekor' : 'kg';

  if (!stringInput || typeof stringInput !== 'string') {
    return [
      {
        id: 'c-fake-' + Math.random(),
        komoditas: '-',
        volume: totalVolume || 0,
        satuan: defaultUnit,
        nilaiEkonomi: totalValue || 0
      }
    ];
  }

  const trimmed = stringInput.trim();
  if (!trimmed || trimmed === '-') {
    return [
      {
        id: 'c-fake-' + Math.random(),
        komoditas: '-',
        volume: totalVolume || 0,
        satuan: defaultUnit,
        nilaiEkonomi: totalValue || 0
      }
    ];
  }

  // Regex split to split on commas NOT inside parentheses e.g. "A (1), B (2)" -> ["A (1)", "B (2)"]
  const parts = trimmed.split(/,(?![^(]*\))/);
  const results: ParsedCommodity[] = [];

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    // Pattern: Name (Volume Unit)
    // Matches "Jeruk (400 kg)" or "Jeruk (400,00 kg)" or "Kayu (1.500 m³)"
    const regex = /^(.+?)\s*\(\s*([\d\.,\s]+)\s*([a-zA-Z³²\u00B2\u00B3/]+.*?)\s*\)$/;
    const match = part.match(regex);

    if (match) {
      const name = match[1].trim();
      const volStr = match[2].trim();
      const unit = match[3].trim();

      // Clean digits & separators
      let sanitizedVol = volStr;
      if (volStr.includes('.') && volStr.includes(',')) {
        if (volStr.indexOf('.') < volStr.indexOf(',')) {
          sanitizedVol = volStr.replace(/\./g, '').replace(/,/g, '.');
        } else {
          sanitizedVol = volStr.replace(/,/g, '');
        }
      } else if (volStr.includes(',')) {
        const commaCount = (volStr.match(/,/g) || []).length;
        if (commaCount === 1) {
          const partsComma = volStr.split(',');
          if (partsComma[1].length <= 2) {
            sanitizedVol = volStr.replace(/,/g, '.');
          } else {
            sanitizedVol = volStr.replace(/,/g, '');
          }
        } else {
          sanitizedVol = volStr.replace(/,/g, '');
        }
      } else if (volStr.includes('.')) {
        const dotCount = (volStr.match(/\./g) || []).length;
        if (dotCount === 1) {
          const partsDot = volStr.split('.');
          if (partsDot[1].length <= 2) {
            sanitizedVol = volStr;
          } else {
            sanitizedVol = volStr.replace(/\./g, '');
          }
        } else {
          sanitizedVol = volStr.replace(/\./g, '');
        }
      }

      let parsedVol = parseFloat(sanitizedVol);
      if (isNaN(parsedVol)) parsedVol = 0;

      results.push({
        id: 'c-fake-' + Math.random(),
        komoditas: name,
        volume: parsedVol,
        satuan: unit,
        nilaiEkonomi: 0 // assigned later
      });
    } else {
      results.push({
        id: 'c-fake-' + Math.random(),
        komoditas: part,
        volume: 0,
        satuan: defaultUnit,
        nilaiEkonomi: 0
      });
    }
  }

  if (results.length === 0) {
    return [
      {
        id: 'c-fake-' + Math.random(),
        komoditas: trimmed,
        volume: totalVolume || 0,
        satuan: defaultUnit,
        nilaiEkonomi: totalValue || 0
      }
    ];
  }

  // Calculate sum of parsed volumes
  const totalParsedVolume = results.reduce((sum, item) => sum + item.volume, 0);

  results.forEach(item => {
    if (totalParsedVolume > 0 && item.volume > 0) {
      item.nilaiEkonomi = Math.round((item.volume / totalParsedVolume) * (totalValue || 0));
    } else {
      item.nilaiEkonomi = Math.round((totalValue || 0) / results.length);
      item.volume = totalVolume > 0 ? Number((totalVolume / results.length).toFixed(2)) : 0;
    }
  });

  return results;
}

