const FAKTUROID_API_URL = 'https://app.fakturoid.cz/api/v3';

async function getAccessToken(clientId, clientSecret) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${FAKTUROID_API_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OAuth error: ${error.error_description || error.error}`);
  }

  const data = await response.json();
  return data.access_token;
}

function getHeaders(accessToken, email) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'User-Agent': `FakturyExport (${email})`,
  };
}

async function findSubjectByICO(slug, accessToken, email, ico) {
  const url = `${FAKTUROID_API_URL}/accounts/${slug}/subjects/search.json?query=${encodeURIComponent(ico)}`;
  const response = await fetch(url, { method: 'GET', headers: getHeaders(accessToken, email) });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const subjects = await response.json();
  const normalizedICO = ico.replace(/[-\s]/g, '');
  return subjects.find(s => s.registration_no?.replace(/[-\s]/g, '') === normalizedICO) || null;
}

async function createInvoice(slug, accessToken, email, invoiceData) {
  const url = `${FAKTUROID_API_URL}/accounts/${slug}/invoices.json`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(accessToken, email),
    body: JSON.stringify(invoiceData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(JSON.stringify(error));
  }
  return await response.json();
}

// Prepare invoice data from the edited preview
function prepareInvoiceData(invoice, subjectId, options = {}) {
  const { dueInDays = 14 } = options;

  // Use the edited prices from preview
  const lines = invoice.lines.map(line => ({
    name: line.name,
    quantity: 1,
    unit_name: 'ks',
    unit_price: line.editedPrice ?? line.unitPrice ?? 0,
    vat_rate: line.vatRate ?? 0,
  }));

  return {
    subject_id: subjectId,
    issued_on: new Date().toISOString().split('T')[0],
    taxable_fulfillment_due: invoice.taxableFulfillmentDue || new Date().toISOString().split('T')[0],
    due: dueInDays,
    currency: invoice.currency || 'CZK',
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
    // Get credentials from request body (user-provided) or env vars (server)
    const { invoices, options, clientId: bodyClientId, clientSecret: bodyClientSecret, slug: bodySlug, email: bodyEmail } = req.body || {};

    // Prioritize user-provided credentials over server env vars
    const hasUserCredentials = bodyClientId && bodyClientSecret && bodySlug;

    const clientId = hasUserCredentials ? bodyClientId : process.env.FAKTUROID_CLIENT_ID;
    const clientSecret = hasUserCredentials ? bodyClientSecret : process.env.FAKTUROID_CLIENT_SECRET;
    const slug = hasUserCredentials ? bodySlug : process.env.FAKTUROID_SLUG;
    const email = (hasUserCredentials ? bodyEmail : process.env.FAKTUROID_EMAIL) || 'noreply@example.com';

    if (!clientId || !clientSecret || !slug) {
      return res.status(400).json({ error: 'Fakturoid credentials required', needsCredentials: true });
    }

    if (!invoices || !Array.isArray(invoices)) {
      return res.status(400).json({ error: 'Missing invoices data' });
    }

    // Get OAuth access token
    const accessToken = await getAccessToken(clientId, clientSecret);

    // Filter invoices - only those with valid IČO and CZE/SVK (for first phase)
    const validInvoices = invoices.filter(inv =>
      inv.ico &&
      inv.ico !== 'BEZ IČO' &&
      ['CZE', 'SVK'].includes(inv.stat)
    );

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const invoice of validInvoices) {
      try {
        const subject = await findSubjectByICO(slug, accessToken, email, invoice.ico);

        if (!subject) {
          results.push({
            success: false,
            ico: invoice.ico,
            nazev: invoice.nazevKlienta,
            error: `Subjekt s IČO ${invoice.ico} nebyl nalezen`,
          });
          errorCount++;
          continue;
        }

        const invoiceData = prepareInvoiceData(invoice, subject.id, options || {});
        const createdInvoice = await createInvoice(slug, accessToken, email, invoiceData);

        results.push({
          success: true,
          ico: invoice.ico,
          nazev: invoice.nazevKlienta,
          invoiceId: createdInvoice.id,
          invoiceNumber: createdInvoice.number,
          totalAmount: createdInvoice.total,
          currency: invoice.currency,
        });
        successCount++;
      } catch (error) {
        results.push({
          success: false,
          ico: invoice.ico,
          nazev: invoice.nazevKlienta,
          error: error.message,
        });
        errorCount++;
      }
    }

    res.json({
      success: true,
      totalInvoices: validInvoices.length,
      successCount,
      errorCount,
      results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
