import { useState } from 'react';
import FileUpload from './components/FileUpload';
import ClientsTable from './components/ClientsTable';
import FakturoidSettings from './components/FakturoidSettings';
import InvoicePreview from './components/InvoicePreview';
import ExportPanel from './components/ExportPanel';

function App() {
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [fakturoidConfig, setFakturoidConfig] = useState({
    slug: '',
    apiKey: '',
    email: '',
    connected: false,
  });
  const [invoiceOptions, setInvoiceOptions] = useState({
    includePeriodinName: true,
    vatRate: 21,
    dueInDays: 14,
    currency: 'CZK',
  });
  const [preview, setPreview] = useState(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Select, 3: Preview, 4: Export

  const handleFileUpload = (data) => {
    setClients(data.clients);
    setSelectedClients([]);
    setPreview(null);
    setStep(2);
  };

  const handleSelectionChange = (selected) => {
    setSelectedClients(selected);
  };

  const handleGeneratePreview = async () => {
    if (selectedClients.length === 0) {
      alert('Vyberte alespoň jednoho klienta');
      return;
    }

    try {
      const response = await fetch('/api/fakturoid/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clients: selectedClients,
          options: invoiceOptions,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPreview(data.preview);
        setStep(3);
      } else {
        alert('Chyba při generování náhledu: ' + data.error);
      }
    } catch (error) {
      alert('Chyba: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Evidence licencí → Fakturoid
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Export licencí a služeb do fakturačního systému
          </p>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-center space-x-4 mb-6">
          {[
            { num: 1, label: 'Nahrát soubor' },
            { num: 2, label: 'Vybrat položky' },
            { num: 3, label: 'Náhled faktur' },
            { num: 4, label: 'Export' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s.num
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s.num}
              </div>
              <span
                className={`ml-2 text-sm ${
                  step >= s.num ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {s.label}
              </span>
              {i < 3 && (
                <div
                  className={`w-12 h-0.5 mx-4 ${
                    step > s.num ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pb-8">
        {/* Step 1: File Upload */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <FileUpload onUpload={handleFileUpload} />
            </div>
            <div>
              <FakturoidSettings
                config={fakturoidConfig}
                onConfigChange={setFakturoidConfig}
              />
            </div>
          </div>
        )}

        {/* Step 2: Select Clients */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Výběr položek k fakturaci</h2>
                <p className="text-sm text-gray-500">
                  Celkem {clients.length} záznamů, vybráno {selectedClients.length}
                </p>
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
                >
                  Zpět
                </button>
                <button
                  onClick={handleGeneratePreview}
                  disabled={selectedClients.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generovat náhled ({selectedClients.length})
                </button>
              </div>
            </div>

            {/* Invoice Options */}
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h3 className="font-medium mb-3">Nastavení položek faktury</h3>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={invoiceOptions.includePeriodinName}
                    onChange={(e) =>
                      setInvoiceOptions({
                        ...invoiceOptions,
                        includePeriodinName: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Zahrnout období v názvu položky</span>
                </label>
                <div className="flex items-center space-x-2">
                  <label className="text-sm">Sazba DPH:</label>
                  <select
                    value={invoiceOptions.vatRate}
                    onChange={(e) =>
                      setInvoiceOptions({
                        ...invoiceOptions,
                        vatRate: parseInt(e.target.value),
                      })
                    }
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value={0}>0%</option>
                    <option value={10}>10%</option>
                    <option value={12}>12%</option>
                    <option value={21}>21%</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm">Splatnost (dní):</label>
                  <input
                    type="number"
                    value={invoiceOptions.dueInDays}
                    onChange={(e) =>
                      setInvoiceOptions({
                        ...invoiceOptions,
                        dueInDays: parseInt(e.target.value),
                      })
                    }
                    className="border rounded px-2 py-1 text-sm w-16"
                  />
                </div>
              </div>
            </div>

            <ClientsTable
              clients={clients}
              selectedClients={selectedClients}
              onSelectionChange={handleSelectionChange}
            />
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && preview && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Náhled faktur</h2>
                <p className="text-sm text-gray-500">
                  Bude vytvořeno {preview.length} faktur
                </p>
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
                >
                  Zpět k výběru
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Pokračovat k exportu
                </button>
              </div>
            </div>

            <InvoicePreview invoices={preview} options={invoiceOptions} />
          </div>
        )}

        {/* Step 4: Export */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Export do Fakturoidu</h2>
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Zpět k náhledu
              </button>
            </div>

            <ExportPanel
              config={fakturoidConfig}
              onConfigChange={setFakturoidConfig}
              clients={selectedClients}
              options={invoiceOptions}
              preview={preview}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
