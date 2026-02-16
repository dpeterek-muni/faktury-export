import { useState } from 'react';

function ExportPanel({ config, onConfigChange, clients, options, preview }) {
  const [isExporting, setIsExporting] = useState(false);
  const [checkingSubjects, setCheckingSubjects] = useState(false);
  const [subjectCheck, setSubjectCheck] = useState(null);
  const [exportResult, setExportResult] = useState(null);
  const [isDownloadingXML, setIsDownloadingXML] = useState(false);
  const [xmlPreview, setXmlPreview] = useState(null);
  const [showXmlModal, setShowXmlModal] = useState(false);

  const handleCheckSubjects = async () => {
    if (!config.connected) {
      alert('Nejprve se připojte k Fakturoidu');
      return;
    }

    setCheckingSubjects(true);
    setSubjectCheck(null);

    try {
      const icos = [...new Set(preview.map((p) => p.ico))];

      // Include credentials if user provided their own (not using server credentials)
      const body = { icos };
      if (!config.useServerCredentials && config.clientId) {
        body.clientId = config.clientId;
        body.clientSecret = config.clientSecret;
        body.slug = config.slug;
        body.email = config.email;
      }

      const response = await fetch('/api/fakturoid/check-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      // Send the preview data (with edited prices and currency) directly
      const body = { invoices: preview, options };
      if (!config.useServerCredentials && config.clientId) {
        body.clientId = config.clientId;
        body.clientSecret = config.clientSecret;
        body.slug = config.slug;
        body.email = config.email;
      }

      const response = await fetch('/api/fakturoid/create-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      setExportResult(data);
    } catch (error) {
      setExportResult({ success: false, error: error.message });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreviewXML = async () => {
    if (!preview || preview.length === 0) {
      alert('Nejsou žádné faktury k exportu');
      return;
    }

    try {
      const response = await fetch('/api/munipolis/export-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices: preview, options }),
      });

      if (!response.ok) {
        throw new Error('XML preview failed');
      }

      const xmlText = await response.text();
      setXmlPreview(xmlText);
      setShowXmlModal(true);
    } catch (error) {
      alert('Chyba při načítání XML náhledu: ' + error.message);
    }
  };

  const handleDownloadXML = async () => {
    if (!preview || preview.length === 0) {
      alert('Nejsou žádné faktury k exportu');
      return;
    }

    setIsDownloadingXML(true);

    try {
      const response = await fetch('/api/munipolis/export-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices: preview, options }),
      });

      if (!response.ok) {
        throw new Error('XML export failed');
      }

      // Download the XML file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `faktury-${new Date().toISOString().split('T')[0]}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Chyba při stahování XML: ' + error.message);
    } finally {
      setIsDownloadingXML(false);
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
              Připojeno k Fakturoidu {config.account?.subdomain && `(${config.account.subdomain})`}
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
              <span>Státy:</span>
              <span className="font-medium">
                {preview ? [...new Set(preview.map((p) => p.stat))].sort().join(', ') : '-'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Stav po vytvoření:</span>
              <span className="font-medium">K odeslání</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleExport}
              disabled={!config.connected || isExporting || !preview?.length}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {isExporting
                ? 'Exportuji...'
                : `Vytvořit ${preview?.length || 0} faktur ve Fakturoidu`}
            </button>

            <div className="flex gap-2">
              <button
                onClick={handlePreviewXML}
                disabled={!preview?.length}
                className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                Náhled XML
              </button>
              <button
                onClick={handleDownloadXML}
                disabled={isDownloadingXML || !preview?.length}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {isDownloadingXML ? 'Stahuji...' : 'Stáhnout'}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-2 text-center">
            Fakturoid: faktury budou ve stavu "k odeslání"<br />
            XML: univerzální formát pro import
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

      {/* XML Preview Modal */}
      {showXmlModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowXmlModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold text-lg">Náhled XML</h3>
              <button
                onClick={() => setShowXmlModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto">
                <code>{xmlPreview}</code>
              </pre>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(xmlPreview);
                  alert('XML zkopírováno do schránky');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Kopírovat
              </button>
              <button
                onClick={() => setShowXmlModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExportPanel;
