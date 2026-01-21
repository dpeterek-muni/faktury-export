import * as XLSX from 'xlsx';

/**
 * Parsuje Excel soubor s evidenci licenci
 * @param {Buffer} buffer - Buffer s Excel souborem
 * @returns {Object} - Parsovana data
 */
export function parseExcelFile(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  const result = {
    clients: [],
    sheets: workbook.SheetNames,
  };

  // Hlavni sheet s klienty
  const mainSheet = workbook.Sheets['Databáza klientov'] || workbook.Sheets[workbook.SheetNames[0]];

  if (mainSheet) {
    const rawData = XLSX.utils.sheet_to_json(mainSheet, { defval: null });

    result.clients = rawData.map((row, index) => ({
      id: index + 1,
      originalId: row['ID'],
      ico: normalizeICO(row['IČO']),
      kodObce: row['Kód obce'],
      nazevKlienta: row['Názov klienta'],
      okres: row['Okres'],
      kraj: row['Kraj'],
      stat: row['Štát'],
      pocetObyvatel: row['Počet obyvatel / zamestnancov'],
      typKlienta: row['Typ klienta'],
      konzultant: row['Konzultant'],
      typCinnosti: row['Typ činnosti'],
      sluzba: row['Zakoupená služba'],
      intervalPlatby: row['Interval platby (v rokoch)'],
      vazanost: row['Väzanost\n(počet let)'],
      hodnotaObjednavky: parseNumber(row['Hodnota objednávky']),
      fakturovanaHodnota: parseNumber(row['Fakturovaná hodnota']),
      datumAktivace: parseDate(row['Datum aktivace']),
      datumKonceFO: parseDate(row['Datum konca fakturačného obdobia']),
      datumUkonceni: parseDate(row['Datum ukončenia']),
      mesiacZaciatku: row['Mesiac začiatku licencie'],
      vyfakturovano: row['Vyfakturováno'],
      mesiacFakturace: parseDate(row['Měsíc fakturace (typicky používáme první den měsíce)']),
      platceDPH: row['Platce DPH (ano/ne)'] === 'ano',
      poznamkaFakturace: row['Poznámka\nk fakturaci'],
      vysledekPokracovani: row['Výsledek pokračování'],
      autoprolongace: row['Autoprolongace'],
      // Computed fields
      selected: false,
      canInvoice: canBeInvoiced(row),
    }));
  }

  return result;
}

/**
 * Normalizuje ICO - odstrani pomlcky a mezery
 */
function normalizeICO(ico) {
  if (!ico) return null;
  return String(ico).replace(/[-\s]/g, '').trim();
}

/**
 * Parsuje cislo z ruznych formatu
 */
function parseNumber(value) {
  if (value === null || value === undefined || value === '' || value === '-') return 0;
  if (typeof value === 'number') return value;
  return parseFloat(String(value).replace(/\s/g, '').replace(',', '.')) || 0;
}

/**
 * Parsuje datum
 */
function parseDate(value) {
  if (!value || value === '-' || value === 'NaT') return null;
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    // ignore
  }
  return null;
}

/**
 * Urcuje, zda lze radek fakturovat
 */
function canBeInvoiced(row) {
  const hodnota = parseNumber(row['Fakturovaná hodnota']);
  const vyfakturovano = row['Vyfakturováno'];

  // Lze fakturovat pokud ma hodnotu a neni jeste vyfakturovano
  return hodnota > 0 && vyfakturovano !== 'ano' && vyfakturovano !== 'áno';
}

/**
 * Seskupi polozky podle ICO pro vytvoreni faktur s vice polozkami
 */
export function groupByICO(clients) {
  const groups = new Map();

  for (const client of clients) {
    if (!client.ico) continue;

    if (!groups.has(client.ico)) {
      groups.set(client.ico, {
        ico: client.ico,
        nazevKlienta: client.nazevKlienta,
        stat: client.stat,
        platceDPH: client.platceDPH,
        items: [],
      });
    }

    groups.get(client.ico).items.push(client);
  }

  return Array.from(groups.values());
}
