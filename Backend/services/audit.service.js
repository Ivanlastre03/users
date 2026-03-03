const fs = require('fs');
const path = require('path');

const auditFile = process.env.AUDIT_LOG_FILE || path.join(__dirname, '..', 'logs', 'audit.log');

function ensureDirExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeAudit(event, payload = {}) {
  const auditEnabled = process.env.AUDIT_ENABLED !== 'false';
  if (!auditEnabled) return;

  ensureDirExists(auditFile);
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    ...payload,
  };

  fs.appendFileSync(auditFile, `${JSON.stringify(entry)}\n`);
  console.log(`[AUDIT] ${event}`, payload);
}

module.exports = {
  writeAudit,
};
