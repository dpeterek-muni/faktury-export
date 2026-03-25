import { verifyAuth } from '../_utils/auth.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyAuth(req);

  if (!user) {
    return res.json({ authenticated: false });
  }

  res.json({
    authenticated: true,
    user: { email: user.email, name: user.name, picture: user.picture },
  });
}
