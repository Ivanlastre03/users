const { writeAudit } = require('../services/audit.service');

function requireRole(allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;

    if (!role || !allowedRoles.includes(role)) {
      writeAudit('rbac_denied', {
        userId: req.user?.id,
        role,
        allowedRoles,
        path: req.originalUrl,
        method: req.method,
      });

      return res.status(403).json({ error: 'No autorizado para esta acción' });
    }

    return next();
  };
}

module.exports = {
  requireRole,
};
