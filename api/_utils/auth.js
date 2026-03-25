import jwt from 'jsonwebtoken';

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    })
  );
}

export function verifyAuth(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies['auth_token'];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export function requireAuth(req, res) {
  const user = verifyAuth(req);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated', authenticated: false });
    return null;
  }
  return user;
}
