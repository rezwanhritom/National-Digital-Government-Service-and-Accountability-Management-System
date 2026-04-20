/**
 * Simple admin gate for course/demo: send header `x-admin-key` matching env ADMIN_KEY.
 */
export function requireAdminKey(req, res, next) {
  const expected = process.env.ADMIN_KEY || 'dev-secret-admin';
  const sent = req.get('x-admin-key');
  if (typeof sent === 'string' && sent === expected) {
    return next();
  }
  return res.status(401).json({ message: 'Admin API key required (x-admin-key header)' });
}
