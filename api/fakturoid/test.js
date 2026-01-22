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
    // Hybrid: use env vars if available, otherwise accept from request body
    const envClientId = process.env.FAKTUROID_CLIENT_ID;
    const envClientSecret = process.env.FAKTUROID_CLIENT_SECRET;
    const envSlug = process.env.FAKTUROID_SLUG;
    const envEmail = process.env.FAKTUROID_EMAIL;

    const hasServerCredentials = envClientId && envClientSecret && envSlug;

    // If request body has credentials and server doesn't have them, use request body
    const { clientId: bodyClientId, clientSecret: bodyClientSecret, slug: bodySlug, email: bodyEmail } = req.body || {};

    const clientId = hasServerCredentials ? envClientId : bodyClientId;
    const clientSecret = hasServerCredentials ? envClientSecret : bodyClientSecret;
    const slug = hasServerCredentials ? envSlug : bodySlug;
    const email = (hasServerCredentials ? envEmail : bodyEmail) || 'noreply@example.com';

    if (!clientId || !clientSecret || !slug) {
      return res.status(400).json({
        success: false,
        needsCredentials: true,
        error: 'Zadejte Fakturoid API credentials (Client ID, Client Secret, Slug)',
      });
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
    res.json({ success: true, account, useServerCredentials: hasServerCredentials });
  } catch (error) {
    // If OAuth fails, prompt user to enter their own credentials
    if (error.message.includes('OAuth') || error.message.includes('invalid_client')) {
      return res.status(400).json({
        success: false,
        needsCredentials: true,
        error: error.message,
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
}
