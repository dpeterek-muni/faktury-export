export default function handler(req, res) {
  res.setHeader('Set-Cookie', 'auth_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  res.json({ success: true });
}
