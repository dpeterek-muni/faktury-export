const FAKTUROID_API_URL = 'https://app.fakturoid.cz/api/v3';

function getHeaders(apiKey, email) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
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
    const { slug, apiKey, email } = req.body;

    if (!slug || !apiKey || !email) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const url = `${FAKTUROID_API_URL}/accounts/${slug}/account.json`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(apiKey, email),
    });

    if (!response.ok) {
      const error = await response.json();
      return res.json({ success: false, error });
    }

    const account = await response.json();
    res.json({ success: true, account });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
