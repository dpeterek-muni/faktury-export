export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { invoices, options } = req.body;

    if (!invoices || invoices.length === 0) {
      return res.status(400).json({ error: 'No invoices provided' });
    }

    const xml = generateInvoicesXML(invoices, options);

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

function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function generateInvoicesXML(invoices, options = {}) {
  const today = new Date().toISOString().split('T')[0];
  const dueInDays = options?.dueInDays || 14;

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<Invoices exportDate="${today}" count="${invoices.length}">\n`;

  invoices.forEach((invoice, index) => {
    const invoiceNumber = `FAK${today.replace(/-/g, '')}${String(index + 1).padStart(3, '0')}`;
    const variableSymbol = `${today.replace(/-/g, '').slice(2)}${String(index + 1).padStart(3, '0')}`;
    const issuedDate = today;
    const duzp = invoice.taxableFulfillmentDue || today;
    const dueDate = addDays(issuedDate, dueInDays);
    const currency = invoice.currency || 'CZK';

    const totalWithoutVat = invoice.lines.reduce((sum, line) => {
      return sum + (line.editedPrice || line.unitPrice || 0);
    }, 0);
    const totalWithVat = invoice.lines.reduce((sum, line) => {
      const price = line.editedPrice || line.unitPrice || 0;
      const vatRate = line.editedVatRate || 0;
      return sum + price * (1 + vatRate / 100);
    }, 0);
    const totalVat = totalWithVat - totalWithoutVat;

    xml += '  <Invoice>\n';

    // Invoice header
    xml += `    <InvoiceNumber>${escapeXml(invoiceNumber)}</InvoiceNumber>\n`;
    xml += `    <VariableSymbol>${escapeXml(variableSymbol)}</VariableSymbol>\n`;
    xml += `    <IssuedOn>${issuedDate}</IssuedOn>\n`;
    xml += `    <TaxableFulfillmentDue>${duzp}</TaxableFulfillmentDue>\n`;
    xml += `    <DueOn>${dueDate}</DueOn>\n`;
    xml += `    <Currency>${escapeXml(currency)}</Currency>\n`;
    xml += `    <PaymentMethod>bank_transfer</PaymentMethod>\n`;
    xml += `    <Status>open</Status>\n`;

    // Client / Subject
    xml += '    <Subject>\n';
    xml += `      <Name>${escapeXml(invoice.nazevKlienta)}</Name>\n`;
    xml += `      <RegistrationNo>${escapeXml(invoice.ico)}</RegistrationNo>\n`;
    xml += `      <Country>${escapeXml(invoice.stat)}</Country>\n`;
    xml += '    </Subject>\n';

    // Invoice lines
    xml += '    <Lines>\n';
    invoice.lines.forEach((line) => {
      const price = line.editedPrice || line.unitPrice || 0;
      const vatRate = line.editedVatRate || 0;
      const vatAmount = price * (vatRate / 100);
      const totalLine = price + vatAmount;

      xml += '      <Line>\n';
      xml += `        <Name>${escapeXml(line.editedName || line.name)}</Name>\n`;
      xml += `        <Quantity>1</Quantity>\n`;
      xml += `        <UnitName>ks</UnitName>\n`;
      xml += `        <UnitPrice>${price.toFixed(2)}</UnitPrice>\n`;
      xml += `        <VatRate>${vatRate}</VatRate>\n`;
      xml += `        <VatAmount>${vatAmount.toFixed(2)}</VatAmount>\n`;
      xml += `        <TotalWithoutVat>${price.toFixed(2)}</TotalWithoutVat>\n`;
      xml += `        <TotalWithVat>${totalLine.toFixed(2)}</TotalWithVat>\n`;
      xml += '      </Line>\n';
    });
    xml += '    </Lines>\n';

    // Totals
    xml += '    <Summary>\n';
    xml += `      <TotalWithoutVat>${totalWithoutVat.toFixed(2)}</TotalWithoutVat>\n`;
    xml += `      <TotalVat>${totalVat.toFixed(2)}</TotalVat>\n`;
    xml += `      <TotalWithVat>${totalWithVat.toFixed(2)}</TotalWithVat>\n`;
    xml += '    </Summary>\n';

    xml += '  </Invoice>\n';
  });

  xml += '</Invoices>';

  return xml;
}
