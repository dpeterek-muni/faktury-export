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

function canBeInvoiced(row, fakturovanaHodnota, vyfakturovano) {
  return fakturovanaHodnota > 0 && vyfakturovano !== 'ano' && vyfakturovano !== 'áno' && vyfakturovano !== 'částečně' && vyfakturovano !== 'čiastočne';
}

// Find column by partial match (handles encoding issues)
function findColumn(row, ...patterns) {
  const keys = Object.keys(row);
  for (const pattern of patterns) {
    const found = keys.find(k =>
      k.toLowerCase().includes(pattern.toLowerCase()) ||
      k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(pattern.toLowerCase())
    );
    if (found && row[found] !== undefined) return row[found];
  }
  return null;
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

    const clients = rawData.map((row, index) => {
      const fakturovanaHodnota = parseNumber(findColumn(row, 'fakturovan', 'Fakturovaná hodnota'));
      const vyfakturovano = findColumn(row, 'vyfakturov', 'Vyfakturováno') || '-';

      return {
        id: index + 1,
        originalId: row['ID'],
        ico: normalizeICO(findColumn(row, 'IČO', 'ICO', 'ičo')),
        kodObce: findColumn(row, 'Kód obce', 'kod obce'),
        nazevKlienta: findColumn(row, 'Názov klienta', 'nazov klienta', 'Název'),
        okres: row['Okres'],
        kraj: row['Kraj'],
        stat: findColumn(row, 'Štát', 'Stat', 'štát'),
        pocetObyvatel: findColumn(row, 'Počet obyvatel', 'pocet obyvatel'),
        typKlienta: findColumn(row, 'Typ klienta'),
        konzultant: row['Konzultant'],
        typCinnosti: findColumn(row, 'Typ činnosti', 'typ cinnosti'),
        sluzba: findColumn(row, 'Zakoupená služba', 'zakoupena sluzba', 'služba'),
        intervalPlatby: findColumn(row, 'Interval platby'),
        hodnotaObjednavky: parseNumber(findColumn(row, 'Hodnota objednávky', 'hodnota objednavky')),
        fakturovanaHodnota,
        datumAktivace: parseDate(findColumn(row, 'Datum aktivace')),
        datumKonceFO: parseDate(findColumn(row, 'Datum konca faktura', 'datum konca')),
        mesiacZaciatku: findColumn(row, 'Mesiac začiatku', 'mesiac zaciatku'),
        vyfakturovano,
        mesiacFakturace: parseDate(findColumn(row, 'Měsíc fakturace', 'mesic fakturace')),
        platceDPH: findColumn(row, 'Platce DPH') === 'ano',
        poznamkaFakturace: findColumn(row, 'Poznámka', 'poznamka'),
        selected: false,
        canInvoice: canBeInvoiced(row, fakturovanaHodnota, vyfakturovano),
      };
    });

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
