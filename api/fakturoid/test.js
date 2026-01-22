const FAKTUROID_API_URL = 'https://app.fakturoid.cz/api/v3';

// Get OAuth access token from Client ID and Secret
async function getAccessToken(clientId, clientSecret) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${FAKTUROID_API_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OAuth error: ${error.error_description || error.error}`);
  }

  const data = await response.json();
  return data.access_token;
}

function getHeaders(accessToken, email) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'User-Agent': `FakturyExport (${email})`,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { slug, clientId, clientSecret, email } = req.body;

    if (!slug || !clientId || !clientSecret || !email) {
      return res.status(400).json({ error: 'Missing required parameters: slug, clientId, clientSecret, email' });
    }

    // Get OAuth access token
    const accessToken = await getAccessToken(clientId, clientSecret);

    // Test connection
    const url = `${FAKTUROID_API_URL}/accounts/${slug}/account.json`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(accessToken, email),
    });

    if (!response.ok) {
      const error = await response.json();
      return res.json({ success: false, error });
    }

    const account = await response.json();
    res.json({ success: true, account, accessToken });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
