const { writeAudit } = require('../services/audit.service');

function requireCriticalConfirmation(req, res, next) {
  const enabled = process.env.CRITICAL_CONFIRMATION_ENABLED !== 'false';
  if (!enabled) return next();

  const mode = process.env.CRITICAL_CONFIRMATION_MODE || 'header';
  const expected = process.env.CRITICAL_CONFIRMATION_VALUE || 'CONFIRM';
  const received = req.headers['x-confirm-action'];

  if (mode === 'header' && received !== expected) {
    writeAudit('critical_confirmation_missing', {
      userId: req.user?.id,
      role: req.user?.role,
      path: req.originalUrl,
      method: req.method,
    });

    return res.status(412).json({
      error: 'Acción crítica requiere confirmación',
      confirmationHeader: 'X-Confirm-Action',
    });
  }

  return next();
}

module.exports = {
  requireCriticalConfirmation,
};
