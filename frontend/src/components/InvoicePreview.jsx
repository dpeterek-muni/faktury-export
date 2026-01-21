function InvoicePreview({ invoices, options }) {
  const formatCurrency = (value, currency = 'CZK') => {
    if (!value) return '-';
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const totalSum = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-blue-600">Celkem faktur</p>
            <p className="text-2xl font-bold text-blue-900">{invoices.length}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-600">Celková hodnota</p>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalSum)}</p>
          </div>
        </div>
      </div>

      {/* Country breakdown */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="font-medium mb-3">Rozdělení podle států</h3>
        <div className="flex gap-4">
          {['CZE', 'SVK', 'HUN'].map((stat) => {
            const count = invoices.filter((i) => i.stat === stat).length;
            const sum = invoices
              .filter((i) => i.stat === stat)
              .reduce((s, i) => s + (i.total || 0), 0);

            if (count === 0) return null;

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
                <p className="text-sm font-medium">{stat}</p>
                <p className="text-lg font-bold">{count} faktur</p>
                <p className="text-sm text-gray-600">{formatCurrency(sum)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice list */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-medium">Náhled faktur</h3>
        </div>

        <div className="divide-y">
          {invoices.map((invoice, index) => (
            <div key={index} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium">{invoice.nazevKlienta}</h4>
                  <p className="text-sm text-gray-500">
                    IČO: {invoice.ico} | {invoice.stat}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatCurrency(invoice.total)}</p>
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
                      <th className="pb-1 text-right">Cena</th>
                      <th className="pb-1 text-right">DPH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines.map((line, lineIndex) => (
                      <tr key={lineIndex}>
                        <td className="py-1">{line.name}</td>
                        <td className="py-1 text-right">
                          {formatCurrency(line.unitPrice)}
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
