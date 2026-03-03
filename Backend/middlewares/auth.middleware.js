const { writeAudit } = require('../services/audit.service');

function authenticate(req, res, next) {
  const userId = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];

  if (!userId || !role) {
    writeAudit('auth_missing', { path: req.originalUrl, method: req.method });
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  req.user = {
    id: userId,
    role: String(role).toUpperCase(),
  };

  return next();
}

module.exports = {
  authenticate,
};
