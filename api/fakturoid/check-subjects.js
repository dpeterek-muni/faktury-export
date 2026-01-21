const FAKTUROID_API_URL = 'https://app.fakturoid.cz/api/v3';

function getHeaders(apiKey, email) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'User-Agent': `FakturyExport (${email})`,
  };
}

async function findSubjectByICO(slug, apiKey, email, ico) {
  const url = `${FAKTUROID_API_URL}/accounts/${slug}/subjects/search.json?query=${encodeURIComponent(ico)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(apiKey, email),
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
    const { slug, apiKey, email, icos } = req.body;

    if (!slug || !apiKey || !email || !icos) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const results = [];
    for (const ico of icos) {
      try {
        const subject = await findSubjectByICO(slug, apiKey, email, ico);
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
