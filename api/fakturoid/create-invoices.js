const FAKTUROID_API_URL = 'https://app.fakturoid.cz/api/v3';

function getHeaders(apiKey, email) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'User-Agent': `FakturyExport (${email})`,
  };
}

function groupByICO(clients) {
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

function formatDateCZ(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

async function findSubjectByICO(slug, apiKey, email, ico) {
  const url = `${FAKTUROID_API_URL}/accounts/${slug}/subjects/search.json?query=${encodeURIComponent(ico)}`;
  const response = await fetch(url, { method: 'GET', headers: getHeaders(apiKey, email) });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const subjects = await response.json();
  const normalizedICO = ico.replace(/[-\s]/g, '');
  return subjects.find(s => s.registration_no?.replace(/[-\s]/g, '') === normalizedICO) || null;
}

async function createInvoice(slug, apiKey, email, invoiceData) {
  const url = `${FAKTUROID_API_URL}/accounts/${slug}/invoices.json`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(apiKey, email),
    body: JSON.stringify(invoiceData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(JSON.stringify(error));
  }
  return await response.json();
}

function prepareInvoiceData(group, subjectId, options = {}) {
  const { includePeriodinName = true, vatRate = 21, dueInDays = 14, currency = 'CZK' } = options;
  const firstItem = group.items[0];

  const lines = group.items.map(item => {
    let name = item.sluzba || 'Licence';
    if (includePeriodinName && item.datumAktivace && item.datumKonceFO) {
      name = `${name} (${formatDateCZ(item.datumAktivace)} - ${formatDateCZ(item.datumKonceFO)})`;
    }
    return {
      name,
      quantity: 1,
      unit_name: 'ks',
      unit_price: item.fakturovanaHodnota || 0,
      vat_rate: item.platceDPH ? vatRate : 0,
    };
  });

  return {
    subject_id: subjectId,
    issued_on: new Date().toISOString().split('T')[0],
    taxable_fulfillment_due: firstItem.datumAktivace || new Date().toISOString().split('T')[0],
    due: dueInDays,
    currency,
    lines,
    status: 'open',
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { slug, apiKey, email, clients, options } = req.body;

    if (!slug || !apiKey || !email || !clients) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const groups = groupByICO(clients);
    const filteredGroups = groups.filter(g => ['CZE', 'SVK'].includes(g.items[0]?.stat));

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const group of filteredGroups) {
      try {
        const subject = await findSubjectByICO(slug, apiKey, email, group.ico);

        if (!subject) {
          results.push({
            success: false,
            ico: group.ico,
            nazev: group.nazevKlienta,
            error: `Subjekt s IČO ${group.ico} nebyl nalezen`,
          });
          errorCount++;
          continue;
        }

        const invoiceData = prepareInvoiceData(group, subject.id, options || {});
        const invoice = await createInvoice(slug, apiKey, email, invoiceData);

        results.push({
          success: true,
          ico: group.ico,
          nazev: group.nazevKlienta,
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          totalAmount: invoice.total,
        });
        successCount++;
      } catch (error) {
        results.push({
          success: false,
          ico: group.ico,
          nazev: group.nazevKlienta,
          error: error.message,
        });
        errorCount++;
      }
    }

    res.json({
      success: true,
      totalGroups: filteredGroups.length,
      successCount,
      errorCount,
      results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
