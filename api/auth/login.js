export default function handler(req, res) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.AUTH_REDIRECT_URI || `https://${req.headers.host}/api/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
  });
  res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
