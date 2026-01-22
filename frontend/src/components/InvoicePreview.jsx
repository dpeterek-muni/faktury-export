import { useState, useEffect } from 'react';

const CURRENCY_BY_COUNTRY = {
  CZE: 'CZK',
  SVK: 'EUR',
  HUN: 'HUF',
};

const CURRENCIES = ['CZK', 'EUR', 'HUF', 'USD', 'GBP'];

function InvoicePreview({ invoices, options, onInvoicesChange }) {
  const [editableInvoices, setEditableInvoices] = useState([]);

  // Initialize editable invoices with auto-detected currency
  useEffect(() => {
    const withCurrency = invoices.map((inv) => ({
      ...inv,
      currency: inv.currency || CURRENCY_BY_COUNTRY[inv.stat] || 'CZK',
      lines: inv.lines.map((line) => ({
        ...line,
        editedPrice: line.unitPrice,
      })),
    }));
    setEditableInvoices(withCurrency);
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
        Ceny jsou editovatelné - klikněte na cenu pro úpravu. Měna se nastavuje automaticky podle státu.
      </div>

      {/* Country breakdown */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="font-medium mb-3">Rozdělení podle států</h3>
        <div className="flex gap-4">
          {['CZE', 'SVK', 'HUN'].map((stat) => {
            const countryInvoices = editableInvoices.filter((i) => i.stat === stat);
            const count = countryInvoices.length;
            if (count === 0) return null;

            const currency = CURRENCY_BY_COUNTRY[stat];
            const sum = countryInvoices.reduce((s, i) => s + (i.total || 0), 0);

            return (
              <div
                key={stat}
                className={`flex-1 p-3 rounded-lg ${
                  stat === 'CZE'
                    ? 'bg-blue-50'
                    : stat === 'SVK'
                    ? 'bg-green-50'
                    : 'bg-orange-50'
                }`}
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
                  <div className="flex items-center gap-2 justify-end mb-1">
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
                  <p className="text-xs text-gray-500">
                    DUZP: {invoice.taxableFulfillmentDue || 'neuvedeno'}
                  </p>
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
                      <th className="pb-1 text-right">Cena (Excel)</th>
                      <th className="pb-1 text-right">Cena (finální)</th>
                      <th className="pb-1 text-right">DPH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines.map((line, lineIndex) => (
                      <tr key={lineIndex}>
                        <td className="py-1">{line.name}</td>
                        <td className="py-1 text-right text-gray-400 text-xs">
                          {formatCurrency(line.unitPrice, 'CZK')}
                        </td>
                        <td className="py-1 text-right">
                          <input
                            type="number"
                            value={line.editedPrice || ''}
                            onChange={(e) => handlePriceChange(index, lineIndex, e.target.value)}
                            className="w-24 text-right border rounded px-2 py-0.5 text-sm"
                            min="0"
                            step="1"
                          />
                        </td>
                        <td className="py-1 text-right">{line.vatRate}%</td>
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
