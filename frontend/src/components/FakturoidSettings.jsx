import { useState, useEffect } from 'react';

function FakturoidSettings({ config, onConfigChange }) {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [needsCredentials, setNeedsCredentials] = useState(null);
  const [localCredentials, setLocalCredentials] = useState({
    clientId: '',
    clientSecret: '',
    slug: '',
    email: '',
  });

  // Load saved credentials from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('fakturoidCredentials');
    if (saved) {
      try {
        setLocalCredentials(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const handleTestConnection = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      // First try without credentials (server might have them)
      const body = needsCredentials === true ? {
        clientId: localCredentials.clientId,
        clientSecret: localCredentials.clientSecret,
        slug: localCredentials.slug,
        email: localCredentials.email,
      } : {};

      const response = await fetch('/api/fakturoid/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      setTestResult(data);

      if (data.needsCredentials) {
        setNeedsCredentials(true);
      } else if (data.success) {
        setNeedsCredentials(data.useServerCredentials ? false : true);

        // Save credentials to sessionStorage if user provided them
        if (!data.useServerCredentials && localCredentials.clientId) {
          sessionStorage.setItem('fakturoidCredentials', JSON.stringify(localCredentials));
        }

        onConfigChange({
          ...config,
          connected: true,
          account: data.account,
          useServerCredentials: data.useServerCredentials,
          ...(data.useServerCredentials ? {} : localCredentials),
        });
      }
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialChange = (field, value) => {
    setLocalCredentials(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-lg font-semibold mb-4">Fakturoid API</h2>

      <div className="space-y-4">
        {needsCredentials === null && (
          <p className="text-sm text-gray-600">
            Klikněte na tlačítko pro otestování připojení.
          </p>
        )}

        {needsCredentials === true && (
          <div className="space-y-3">
            <p className="text-sm text-amber-600">
              Server nemá nastavené credentials. Zadejte své vlastní:
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
              <input
                type="text"
                value={localCredentials.clientId}
                onChange={(e) => handleCredentialChange('clientId', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Váš Fakturoid Client ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
              <input
                type="password"
                value={localCredentials.clientSecret}
                onChange={(e) => handleCredentialChange('clientSecret', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Váš Fakturoid Client Secret"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (název účtu)</label>
              <input
                type="text"
                value={localCredentials.slug}
                onChange={(e) => handleCredentialChange('slug', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="např. mojefrima"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (volitelné)</label>
              <input
                type="email"
                value={localCredentials.email}
                onChange={(e) => handleCredentialChange('email', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="vas@email.cz"
              />
            </div>
            <p className="text-xs text-gray-500">
              Credentials se ukládají pouze v prohlížeči (sessionStorage) a nejsou odesílány na server.
            </p>
          </div>
        )}

        {needsCredentials === false && !config.connected && (
          <p className="text-sm text-gray-600">
            Server má nastavené credentials. Klikněte pro otestování.
          </p>
        )}

        <button
          onClick={handleTestConnection}
          disabled={isLoading || (needsCredentials === true && !localCredentials.clientId)}
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
                {testResult.useServerCredentials && (
                  <p className="text-xs mt-1 text-gray-500">Používám serverové credentials</p>
                )}
              </div>
            ) : (
              <p>Chyba: {typeof testResult.error === 'string' ? testResult.error : JSON.stringify(testResult.error)}</p>
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
    </div>
  );
}

export default FakturoidSettings;
