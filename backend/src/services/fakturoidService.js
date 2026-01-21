/**
 * Fakturoid API v3 Service
 * Dokumentace: https://www.fakturoid.cz/api/v3
 */

const FAKTUROID_API_URL = 'https://app.fakturoid.cz/api/v3';

/**
 * Vytvori hlavicky pro Fakturoid API
 */
function getHeaders(apiKey, email) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'User-Agent': `FakturyExport (${email})`,
  };
}

/**
 * Vyhledá subjekt (klienta) podle IČO
 * @param {string} slug - Název účtu ve Fakturoidu
 * @param {string} apiKey - API klíč
 * @param {string} email - Kontaktní email
 * @param {string} ico - IČO pro vyhledání
 * @returns {Object|null} - Nalezený subjekt nebo null
 */
export async function findSubjectByICO(slug, apiKey, email, ico) {
  const url = `${FAKTUROID_API_URL}/accounts/${slug}/subjects/search.json?query=${encodeURIComponent(ico)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(apiKey, email),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Fakturoid API error: ${JSON.stringify(error)}`);
    }

    const subjects = await response.json();

    // Hledáme přesnou shodu IČO
    const normalizedICO = ico.replace(/[-\s]/g, '');
    const match = subjects.find(s =>
      s.registration_no && s.registration_no.replace(/[-\s]/g, '') === normalizedICO
    );

    return match || null;
  } catch (error) {
    console.error(`Error finding subject by ICO ${ico}:`, error);
    throw error;
  }
}

/**
 * Vytvoří fakturu ve Fakturoidu
 * @param {string} slug - Název účtu ve Fakturoidu
 * @param {string} apiKey - API klíč
 * @param {string} email - Kontaktní email
 * @param {Object} invoiceData - Data faktury
 * @returns {Object} - Vytvořená faktura
 */
export async function createInvoice(slug, apiKey, email, invoiceData) {
  const url = `${FAKTUROID_API_URL}/accounts/${slug}/invoices.json`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(apiKey, email),
      body: JSON.stringify(invoiceData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Fakturoid API error: ${JSON.stringify(error)}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
}

/**
 * Připraví data faktury z položek evidence
 * @param {Object} group - Skupina položek podle IČO
 * @param {number} subjectId - ID subjektu ve Fakturoidu
 * @param {Object} options - Konfigurace formátu
 * @returns {Object} - Data pro vytvoření faktury
 */
export function prepareInvoiceData(group, subjectId, options = {}) {
  const {
    includePeriodinName = true,
    vatRate = 21,
    currency = 'CZK',
    dueInDays = 14,
    language = 'cz',
  } = options;

  // Najdi první položku pro určení dat
  const firstItem = group.items[0];

  // Vytvoř položky faktury
  const lines = group.items.map(item => {
    let name = item.sluzba || 'Licence';

    if (includePeriodinName && item.datumAktivace && item.datumKonceFO) {
      const startDate = formatDateCZ(item.datumAktivace);
      const endDate = formatDateCZ(item.datumKonceFO);
      name = `${name} (${startDate} - ${endDate})`;
    }

    return {
      name: name,
      quantity: 1,
      unit_name: 'ks',
      unit_price: item.fakturovanaHodnota || 0,
      vat_rate: item.platceDPH ? vatRate : 0,
    };
  });

  // Urči datum plnění (DUZP) - použij datum aktivace první položky nebo dnešek
  const taxableFulfillmentDue = firstItem.datumAktivace || new Date().toISOString().split('T')[0];

  // Urči datum vystavení
  const issuedOn = new Date().toISOString().split('T')[0];

  return {
    subject_id: subjectId,
    issued_on: issuedOn,
    taxable_fulfillment_due: taxableFulfillmentDue,
    due: dueInDays,
    currency: currency,
    language: language,
    lines: lines,
    // Faktura bude ve stavu "otevřená" (k odeslání)
    status: 'open',
  };
}

/**
 * Formátuje datum do českého formátu
 */
function formatDateCZ(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Ověří připojení k Fakturoid API
 */
export async function testConnection(slug, apiKey, email) {
  const url = `${FAKTUROID_API_URL}/accounts/${slug}/account.json`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(apiKey, email),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error };
    }

    const account = await response.json();
    return { success: true, account };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Zpracuje skupinu položek a vytvoří fakturu
 */
export async function processGroupAndCreateInvoice(slug, apiKey, email, group, options) {
  // 1. Najdi subjekt podle IČO
  const subject = await findSubjectByICO(slug, apiKey, email, group.ico);

  if (!subject) {
    return {
      success: false,
      ico: group.ico,
      nazev: group.nazevKlienta,
      error: `Subjekt s IČO ${group.ico} nebyl nalezen ve Fakturoidu`,
    };
  }

  // 2. Připrav data faktury
  const invoiceData = prepareInvoiceData(group, subject.id, options);

  // 3. Vytvoř fakturu
  try {
    const invoice = await createInvoice(slug, apiKey, email, invoiceData);
    return {
      success: true,
      ico: group.ico,
      nazev: group.nazevKlienta,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      totalAmount: invoice.total,
    };
  } catch (error) {
    return {
      success: false,
      ico: group.ico,
      nazev: group.nazevKlienta,
      error: error.message,
    };
  }
}
