import { useState, useEffect } from 'react';

const CURRENCY_BY_COUNTRY = {
  CZE: 'CZK',      // Česko
  SVK: 'EUR',      // Slovensko
  HUN: 'HUF',      // Maďarsko
  DEU: 'EUR',      // Německo
  AUT: 'EUR',      // Rakousko
  POL: 'PLN',      // Polsko
  CHE: 'CHF',      // Švýcarsko
  BEL: 'EUR',      // Belgie
  NLD: 'EUR',      // Nizozemsko
  FRA: 'EUR',      // Francie
  ITA: 'EUR',      // Itálie
  ESP: 'EUR',      // Španělsko
  PRT: 'EUR',      // Portugalsko
  ROU: 'RON',      // Rumunsko
  BGR: 'BGN',      // Bulharsko
  HRV: 'EUR',      // Chorvatsko
  SVN: 'EUR',      // Slovinsko
  SRB: 'RSD',      // Srbsko
  BIH: 'BAM',      // Bosna a Hercegovina
  UKR: 'UAH',      // Ukrajina
  GBR: 'GBP',      // Velká Británie
  USA: 'USD',      // USA
};

const VAT_RATE_BY_COUNTRY = {
  CZE: 21,   // Česko
  SVK: 20,   // Slovensko
  HUN: 27,   // Maďarsko
  DEU: 19,   // Německo
  AUT: 20,   // Rakousko
  POL: 23,   // Polsko
  CHE: 7.7,  // Švýcarsko
  BEL: 21,   // Belgie
  NLD: 21,   // Nizozemsko
  FRA: 20,   // Francie
  ITA: 22,   // Itálie
  ESP: 21,   // Španělsko
  PRT: 23,   // Portugalsko
  ROU: 19,   // Rumunsko
  BGR: 20,   // Bulharsko
  HRV: 25,   // Chorvatsko
  SVN: 22,   // Slovinsko
  SRB: 20,   // Srbsko
  BIH: 17,   // Bosna a Hercegovina
  UKR: 20,   // Ukrajina
  GBR: 20,   // Velká Británie
  USA: 0,    // USA (state sales tax varies, default to 0)
};

const CURRENCIES = ['CZK', 'EUR', 'HUF', 'PLN', 'CHF', 'RON', 'BGN', 'RSD', 'BAM', 'UAH', 'GBP', 'USD'];

function InvoicePreview({ invoices, options, onInvoicesChange }) {
  const [editableInvoices, setEditableInvoices] = useState([]);

  // Initialize editable invoices with auto-detected currency, VAT, and DUZP
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const globalDuzp = options?.duzp || today;
    const withDefaults = invoices.map((inv) => ({
      ...inv,
      currency: inv.currency || CURRENCY_BY_COUNTRY[inv.stat] || 'CZK',
      taxableFulfillmentDue: globalDuzp,
      lines: inv.lines.map((line) => ({
        ...line,
        editedPrice: line.unitPrice,
        editedName: line.name,
        // Use country-based VAT rate, ignore original vatRate (usually 0)
        editedVatRate: VAT_RATE_BY_COUNTRY[inv.stat] ?? 21,
      })),
    }));
    setEditableInvoices(withDefaults);
  }, [invoices]);

  // Notify parent of changes
  useEffect(() => {
    if (onInvoicesChange && editableInvoices.length > 0) {
      onInvoicesChange(editableInvoices);
    }
  }, [editableInvoices, onInvoicesChange]);

  const handlePriceChange = (invoiceIndex, lineIndex, newPrice) => {
    setEditableInvoices((prev) => {
      const updated = [...prev];
      updated[invoiceIndex] = {
        ...updated[invoiceIndex],
        lines: updated[invoiceIndex].lines.map((line, idx) =>
          idx === lineIndex ? { ...line, editedPrice: parseFloat(newPrice) || 0 } : line
        ),
      };
      // Recalculate total
      updated[invoiceIndex].total = updated[invoiceIndex].lines.reduce(
        (sum, line) => sum + (line.editedPrice || 0),
        0
      );
      return updated;
    });
  };

  const handleCurrencyChange = (invoiceIndex, newCurrency) => {
    setEditableInvoices((prev) => {
      const updated = [...prev];
      updated[invoiceIndex] = {
        ...updated[invoiceIndex],
        currency: newCurrency,
      };
      return updated;
    });
  };

  const handleDuzpChange = (invoiceIndex, newDuzp) => {
    setEditableInvoices((prev) => {
      const updated = [...prev];
      updated[invoiceIndex] = {
        ...updated[invoiceIndex],
        taxableFulfillmentDue: newDuzp,
      };
      return updated;
    });
  };

  const handleLineNameChange = (invoiceIndex, lineIndex, newName) => {
    setEditableInvoices((prev) => {
      const updated = [...prev];
      updated[invoiceIndex] = {
        ...updated[invoiceIndex],
        lines: updated[invoiceIndex].lines.map((line, idx) =>
          idx === lineIndex ? { ...line, editedName: newName } : line
        ),
      };
      return updated;
    });
  };

  const handleVatRateChange = (invoiceIndex, lineIndex, newVatRate) => {
    setEditableInvoices((prev) => {
      const updated = [...prev];
      updated[invoiceIndex] = {
        ...updated[invoiceIndex],
        lines: updated[invoiceIndex].lines.map((line, idx) =>
          idx === lineIndex ? { ...line, editedVatRate: parseFloat(newVatRate) || 0 } : line
        ),
      };
      return updated;
    });
  };

  const formatCurrency = (value, currency = 'CZK') => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const totalSum = editableInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-blue-600">Celkem faktur</p>
            <p className="text-2xl font-bold text-blue-900">{editableInvoices.length}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-600">Celková hodnota (orientační)</p>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalSum)}</p>
          </div>
        </div>
      </div>

      {/* Info about editing */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
        Ceny, názvy položek, DPH, měna a DUZP jsou editovatelné. Měna a DPH se nastavují automaticky podle státu.
      </div>

      {/* Country breakdown */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="font-medium mb-3">Rozdělení podle států</h3>
        <div className="flex flex-wrap gap-4">
          {Array.from(new Set(editableInvoices.map((i) => i.stat)))
            .sort()
            .map((stat, idx) => {
              const countryInvoices = editableInvoices.filter((i) => i.stat === stat);
              const count = countryInvoices.length;
              if (count === 0) return null;

              const currency = CURRENCY_BY_COUNTRY[stat] || 'EUR';
              const sum = countryInvoices.reduce((s, i) => s + (i.total || 0), 0);

              const colors = [
                'bg-blue-50',
                'bg-green-50',
                'bg-orange-50',
                'bg-purple-50',
                'bg-pink-50',
                'bg-indigo-50',
                'bg-yellow-50',
                'bg-red-50',
              ];

              return (
                <div
                  key={stat}
                  className={`flex-1 min-w-[150px] p-3 rounded-lg ${colors[idx % colors.length]}`}
                >
                  <p className="text-sm font-medium">
                    {stat} ({currency})
                  </p>
                  <p className="text-lg font-bold">{count} faktur</p>
                  <p className="text-sm text-gray-600">{formatCurrency(sum, currency)}</p>
                </div>
              );
            })}
        </div>
      </div>

      {/* Invoice list */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-medium">Náhled faktur (kliknutím upravte ceny)</h3>
        </div>

        <div className="divide-y">
          {editableInvoices.map((invoice, index) => (
            <div key={index} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium">{invoice.nazevKlienta}</h4>
                  <p className="text-sm text-gray-500">
                    IČO: {invoice.ico} | {invoice.stat}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end mb-2">
                    <select
                      value={invoice.currency}
                      onChange={(e) => handleCurrencyChange(index, e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <p className="font-bold text-lg">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <label className="text-xs text-gray-500">DUZP:</label>
                    <input
                      type="date"
                      value={invoice.taxableFulfillmentDue || ''}
                      onChange={(e) => handleDuzpChange(index, e.target.value)}
                      className="text-xs border rounded px-2 py-1"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-500 mb-2">
                  Položky faktury ({invoice.itemCount}):
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="pb-1">Název</th>
                      <th className="pb-1 text-right">Cena</th>
                      <th className="pb-1 text-right">DPH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines.map((line, lineIndex) => (
                      <tr key={lineIndex}>
                        <td className="py-1">
                          <input
                            type="text"
                            value={line.editedName || line.name}
                            onChange={(e) => handleLineNameChange(index, lineIndex, e.target.value)}
                            className="w-full border rounded px-2 py-0.5 text-sm"
                          />
                        </td>
                        <td className="py-1 text-right">
                          <input
                            type="number"
                            value={line.editedPrice || ''}
                            onChange={(e) => handlePriceChange(index, lineIndex, e.target.value)}
                            className="w-32 text-right border rounded px-2 py-1 text-sm"
                            min="0"
                            step="0.01"
                            lang="en"
                          />
                        </td>
                        <td className="py-1 text-right">
                          <input
                            type="number"
                            value={line.editedVatRate ?? line.vatRate ?? 0}
                            onChange={(e) => handleVatRateChange(index, lineIndex, e.target.value)}
                            className="w-20 text-right border rounded px-2 py-1 text-sm"
                            min="0"
                            max="100"
                            step="0.1"
                            lang="en"
                          />
                          <span className="ml-1">%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default InvoicePreview;
