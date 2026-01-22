import { useState } from 'react';

function FakturoidSettings({ config, onConfigChange }) {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTestConnection = async () => {
    if (!config.slug || !config.clientId || !config.clientSecret || !config.email) {
      setTestResult({ success: false, error: 'Vyplňte všechna pole' });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/fakturoid/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: config.slug,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          email: config.email,
        }),
      });

      const data = await response.json();
      setTestResult(data);

      if (data.success) {
        onConfigChange({ ...config, connected: true, accessToken: data.accessToken });
      }
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-lg font-semibold mb-4">Fakturoid API</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slug účtu
          </label>
          <input
            type="text"
            value={config.slug}
            onChange={(e) => onConfigChange({ ...config, slug: e.target.value, connected: false })}
            placeholder="danielpeterek"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Název účtu z URL Fakturoidu
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client ID
          </label>
          <input
            type="text"
            value={config.clientId}
            onChange={(e) => onConfigChange({ ...config, clientId: e.target.value, connected: false })}
            placeholder="e2cf868116f6d3af..."
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono text-xs"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Secret
          </label>
          <input
            type="password"
            value={config.clientSecret}
            onChange={(e) => onConfigChange({ ...config, clientSecret: e.target.value, connected: false })}
            placeholder="47ed55e10d5ecde..."
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kontaktní email
          </label>
          <input
            type="email"
            value={config.email}
            onChange={(e) => onConfigChange({ ...config, email: e.target.value, connected: false })}
            placeholder="vas@email.cz"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={handleTestConnection}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
        >
          {isLoading ? 'Testuji...' : 'Otestovat připojení'}
        </button>

        {testResult && (
          <div
            className={`p-3 rounded-lg text-sm ${
              testResult.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {testResult.success ? (
              <div>
                <p className="font-medium">Připojení úspěšné!</p>
                {testResult.account && (
                  <p className="text-xs mt-1">
                    Účet: {testResult.account.name || testResult.account.subdomain}
                  </p>
                )}
              </div>
            ) : (
              <p>Chyba: {JSON.stringify(testResult.error)}</p>
            )}
          </div>
        )}

        {config.connected && (
          <div className="flex items-center text-green-600 text-sm">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Připojeno k Fakturoidu
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t text-xs text-gray-500">
        <p className="font-medium mb-1">Kde najít API údaje?</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Přihlaste se do Fakturoidu</li>
          <li>Nastavení → API a webhooky</li>
          <li>Vytvořte API přístupové údaje</li>
          <li>Zkopírujte Client ID a Client Secret</li>
        </ol>
      </div>
    </div>
  );
}

export default FakturoidSettings;
