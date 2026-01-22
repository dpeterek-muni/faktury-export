const FAKTUROID_API_URL = 'https://app.fakturoid.cz/api/v3';

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

async function findSubjectByICO(slug, accessToken, email, ico) {
  const url = `${FAKTUROID_API_URL}/accounts/${slug}/subjects/search.json?query=${encodeURIComponent(ico)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(accessToken, email),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const subjects = await response.json();
  const normalizedICO = ico.replace(/[-\s]/g, '');
  const match = subjects.find(s =>
    s.registration_no && s.registration_no.replace(/[-\s]/g, '') === normalizedICO
  );

  return match || null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Get credentials from request body (user-provided) or env vars (server)
    const { icos, clientId: bodyClientId, clientSecret: bodyClientSecret, slug: bodySlug, email: bodyEmail } = req.body || {};

    // Prioritize user-provided credentials over server env vars
    const hasUserCredentials = bodyClientId && bodyClientSecret && bodySlug;

    const clientId = hasUserCredentials ? bodyClientId : process.env.FAKTUROID_CLIENT_ID;
    const clientSecret = hasUserCredentials ? bodyClientSecret : process.env.FAKTUROID_CLIENT_SECRET;
    const slug = hasUserCredentials ? bodySlug : process.env.FAKTUROID_SLUG;
    const email = (hasUserCredentials ? bodyEmail : process.env.FAKTUROID_EMAIL) || 'noreply@example.com';

    if (!clientId || !clientSecret || !slug) {
      return res.status(400).json({ error: 'Fakturoid credentials required', needsCredentials: true });
    }

    if (!icos || !Array.isArray(icos)) {
      return res.status(400).json({ error: 'Missing icos array' });
    }

    // Get OAuth access token
    const accessToken = await getAccessToken(clientId, clientSecret);

    const results = [];
    for (const ico of icos) {
      try {
        const subject = await findSubjectByICO(slug, accessToken, email, ico);
        results.push({
          ico,
          found: !!subject,
          subjectId: subject?.id,
          subjectName: subject?.name,
        });
      } catch (error) {
        results.push({
          ico,
          found: false,
          error: error.message,
        });
      }
    }

    const found = results.filter(r => r.found).length;
    const notFound = results.filter(r => !r.found).length;

    res.json({
      success: true,
      total: icos.length,
      found,
      notFound,
      results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
