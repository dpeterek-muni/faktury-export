import { useState } from 'react';

function ExportPanel({ config, onConfigChange, clients, options, preview }) {
  const [isExporting, setIsExporting] = useState(false);
  const [checkingSubjects, setCheckingSubjects] = useState(false);
  const [subjectCheck, setSubjectCheck] = useState(null);
  const [exportResult, setExportResult] = useState(null);

  const handleCheckSubjects = async () => {
    if (!config.connected) {
      alert('Nejprve se připojte k Fakturoidu');
      return;
    }

    setCheckingSubjects(true);
    setSubjectCheck(null);

    try {
      const icos = [...new Set(preview.map((p) => p.ico))];

      const response = await fetch('/api/fakturoid/check-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icos }),
      });

      const data = await response.json();
      setSubjectCheck(data);
    } catch (error) {
      alert('Chyba: ' + error.message);
    } finally {
      setCheckingSubjects(false);
    }
  };

  const handleExport = async () => {
    if (!config.connected) {
      alert('Nejprve se připojte k Fakturoidu');
      return;
    }

    if (
      !confirm(
        `Opravdu chcete vytvořit ${preview.length} faktur ve Fakturoidu?\n\nFaktury budou vytvořeny ve stavu "k odeslání".`
      )
    ) {
      return;
    }

    setIsExporting(true);
    setExportResult(null);

    try {
      const response = await fetch('/api/fakturoid/create-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients, options }),
      });

      const data = await response.json();
      setExportResult(data);
    } catch (error) {
      setExportResult({ success: false, error: error.message });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Connection & Check */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="font-semibold mb-4">1. Ověření připojení</h3>

          {config.connected ? (
            <div className="flex items-center text-green-600 mb-4">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Připojeno k Fakturoidu ({config.slug})
            </div>
          ) : (
            <div className="text-amber-600 mb-4">
              <p className="font-medium">Nepřipojeno k Fakturoidu</p>
              <p className="text-sm">Vraťte se na první krok a nastavte API přístup</p>
            </div>
          )}

          <button
            onClick={handleCheckSubjects}
            disabled={!config.connected || checkingSubjects}
            className="w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            {checkingSubjects ? 'Kontroluji...' : 'Zkontrolovat subjekty ve Fakturoidu'}
          </button>

          {subjectCheck && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between mb-2">
                <span>Nalezeno:</span>
                <span className="font-medium text-green-600">
                  {subjectCheck.found} z {subjectCheck.total}
                </span>
              </div>
              {subjectCheck.notFound > 0 && (
                <div className="text-amber-600 text-sm">
                  <p className="font-medium">Nenalezené subjekty ({subjectCheck.notFound}):</p>
                  <ul className="mt-1 max-h-32 overflow-y-auto">
                    {subjectCheck.results
                      .filter((r) => !r.found)
                      .map((r) => (
                        <li key={r.ico}>IČO: {r.ico}</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="font-semibold mb-4">2. Export faktur</h3>

          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-sm">
              <span>Počet faktur:</span>
              <span className="font-medium">{preview?.length || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Stát:</span>
              <span className="font-medium">CZE + SVK (první fáze)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Stav po vytvoření:</span>
              <span className="font-medium">K odeslání</span>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={!config.connected || isExporting || !preview?.length}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            {isExporting
              ? 'Exportuji...'
              : `Vytvořit ${preview?.length || 0} faktur ve Fakturoidu`}
          </button>

          <p className="text-xs text-gray-500 mt-2 text-center">
            Faktury budou vytvořeny ve stavu "k odeslání"
          </p>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="font-semibold mb-4">Výsledek exportu</h3>

        {!exportResult ? (
          <div className="text-center text-gray-400 py-8">
            <svg
              className="w-12 h-12 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p>Výsledky se zobrazí po spuštění exportu</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div
              className={`p-4 rounded-lg ${
                exportResult.errorCount === 0
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-amber-50 border border-amber-200'
              }`}
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-medium text-green-700">
                    Úspěšně vytvořeno: {exportResult.successCount}
                  </p>
                  {exportResult.errorCount > 0 && (
                    <p className="font-medium text-red-600">
                      Chyby: {exportResult.errorCount}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {exportResult.results?.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded text-sm ${
                    result.success ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{result.nazev}</p>
                      <p className="text-xs text-gray-500">IČO: {result.ico}</p>
                    </div>
                    {result.success ? (
                      <span className="text-green-600 text-xs">
                        Faktura #{result.invoiceNumber}
                      </span>
                    ) : (
                      <span className="text-red-600 text-xs">{result.error}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExportPanel;
