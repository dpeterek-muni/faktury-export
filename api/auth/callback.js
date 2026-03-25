import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.redirect('/?error=no_code');
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.AUTH_REDIRECT_URI || `https://${req.headers.host}/api/auth/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.id_token) {
      return res.redirect('/?error=google_error');
    }

    // Decode id_token payload (base64url)
    const payload = JSON.parse(
      Buffer.from(tokenData.id_token.split('.')[1], 'base64url').toString()
    );

    const { email, name, picture } = payload;

    // Validate email domain: must be @munipolis.*
    const domain = email.split('@')[1];
    if (!domain || !domain.match(/^munipolis\./)) {
      return res.redirect('/?error=unauthorized_domain');
    }

    // Sign JWT
    const token = jwt.sign(
      { email, name, picture },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set httpOnly cookie
    const isLocal = req.headers.host?.includes('localhost');
    res.setHeader(
      'Set-Cookie',
      `auth_token=${token}; HttpOnly; ${isLocal ? '' : 'Secure; '}SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`
    );

    res.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/?error=auth_failed');
  }
}
