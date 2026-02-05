export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { invoices } = req.body;

    if (!invoices || invoices.length === 0) {
      return res.status(400).json({ error: 'No invoices provided' });
    }

    // Generate XML
    const xml = generateInvoicesXML(invoices);

    // Return XML as downloadable file
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="faktury-${new Date().toISOString().split('T')[0]}.xml"`);
    res.status(200).send(xml);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateInvoicesXML(invoices) {
  const today = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<Invoices xmlns="http://munipolis.cz/invoices" version="1.0" exportDate="' + today + '">\n';

  invoices.forEach((invoice, index) => {
    const invoiceNumber = `FAK${today.replace(/-/g, '')}${String(index + 1).padStart(3, '0')}`;
    const totalWithVat = invoice.lines.reduce((sum, line) => {
      const price = line.editedPrice || line.unitPrice || 0;
      const vatRate = line.editedVatRate || 0;
      return sum + price * (1 + vatRate / 100);
    }, 0);
    const totalVat = totalWithVat - invoice.total;

    xml += '  <Invoice>\n';
    xml += `    <InvoiceNumber>${escapeXml(invoiceNumber)}</InvoiceNumber>\n`;
    xml += `    <IssuedDate>${today}</IssuedDate>\n`;
    xml += `    <TaxableFulfillmentDate>${escapeXml(invoice.taxableFulfillmentDue || today)}</TaxableFulfillmentDate>\n`;
    xml += `    <Currency>${escapeXml(invoice.currency || 'CZK')}</Currency>\n`;

    // Client information
    xml += '    <Client>\n';
    xml += `      <ICO>${escapeXml(invoice.ico)}</ICO>\n`;
    xml += `      <Name>${escapeXml(invoice.nazevKlienta)}</Name>\n`;
    xml += `      <Country>${escapeXml(invoice.stat)}</Country>\n`;
    xml += '    </Client>\n';

    // Invoice items
    xml += '    <Items>\n';
    invoice.lines.forEach((line) => {
      const price = line.editedPrice || line.unitPrice || 0;
      const vatRate = line.editedVatRate || 0;
      const priceWithVat = price * (1 + vatRate / 100);

      xml += '      <Item>\n';
      xml += `        <Name>${escapeXml(line.editedName || line.name)}</Name>\n`;
      xml += `        <Quantity>1</Quantity>\n`;
      xml += `        <UnitPrice>${price.toFixed(2)}</UnitPrice>\n`;
      xml += `        <VATRate>${vatRate}</VATRate>\n`;
      xml += `        <VATAmount>${(priceWithVat - price).toFixed(2)}</VATAmount>\n`;
      xml += `        <TotalWithVAT>${priceWithVat.toFixed(2)}</TotalWithVAT>\n`;
      xml += '      </Item>\n';
    });
    xml += '    </Items>\n';

    // Totals
    xml += '    <Totals>\n';
    xml += `      <TotalWithoutVAT>${invoice.total.toFixed(2)}</TotalWithoutVAT>\n`;
    xml += `      <TotalVAT>${totalVat.toFixed(2)}</TotalVAT>\n`;
    xml += `      <TotalWithVAT>${totalWithVat.toFixed(2)}</TotalWithVAT>\n`;
    xml += '    </Totals>\n';

    xml += '  </Invoice>\n';
  });

  xml += '</Invoices>';

  return xml;
}
