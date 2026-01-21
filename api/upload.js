import * as XLSX from 'xlsx';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

function normalizeICO(ico) {
  if (!ico) return null;
  return String(ico).replace(/[-\s]/g, '').trim();
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '' || value === '-') return 0;
  if (typeof value === 'number') return value;
  return parseFloat(String(value).replace(/\s/g, '').replace(',', '.')) || 0;
}

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
  } catch (e) {}
  return null;
}

function canBeInvoiced(row) {
  const hodnota = parseNumber(row['Fakturovaná hodnota']);
  const vyfakturovano = row['Vyfakturováno'];
  return hodnota > 0 && vyfakturovano !== 'ano' && vyfakturovano !== 'áno';
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileData, filename } = req.body;

    if (!fileData) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    // Decode base64
    const buffer = Buffer.from(fileData, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    const mainSheet = workbook.Sheets['Databáza klientov'] || workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(mainSheet, { defval: null });

    const clients = rawData.map((row, index) => ({
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
      hodnotaObjednavky: parseNumber(row['Hodnota objednávky']),
      fakturovanaHodnota: parseNumber(row['Fakturovaná hodnota']),
      datumAktivace: parseDate(row['Datum aktivace']),
      datumKonceFO: parseDate(row['Datum konca fakturačného obdobia']),
      mesiacZaciatku: row['Mesiac začiatku licencie'],
      vyfakturovano: row['Vyfakturováno'],
      mesiacFakturace: parseDate(row['Měsíc fakturace (typicky používáme první den měsíce)']),
      platceDPH: row['Platce DPH (ano/ne)'] === 'ano',
      poznamkaFakturace: row['Poznámka\nk fakturaci'],
      selected: false,
      canInvoice: canBeInvoiced(row),
    }));

    res.json({
      success: true,
      filename,
      sheets: workbook.SheetNames,
      totalClients: clients.length,
      clients,
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: error.message });
  }
}
