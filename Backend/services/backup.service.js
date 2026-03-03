const fs = require('fs');
const path = require('path');
const { writeAudit } = require('./audit.service');

const backupDir = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
}

function createBackup(operation, data) {
  ensureBackupDir();

  const backupId = `${operation}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filePath = path.join(backupDir, `${backupId}.json`);
  const payload = {
    backupId,
    operation,
    createdAt: new Date().toISOString(),
    data,
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  writeAudit('backup_created', { backupId, operation, filePath });

  return payload;
}

function getBackup(backupId) {
  ensureBackupDir();
  const filePath = path.join(backupDir, `${backupId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

module.exports = {
  createBackup,
  getBackup,
};
