const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

process.env.AUDIT_ENABLED = 'false';
process.env.CRITICAL_CONFIRMATION_ENABLED = 'true';
process.env.CRITICAL_CONFIRMATION_VALUE = 'CONFIRM';
process.env.BACKUP_DIR = path.join(__dirname, 'tmp_backups');

const db = require('../db');
const app = require('../app');

function cleanupBackups() {
  if (fs.existsSync(process.env.BACKUP_DIR)) {
    fs.rmSync(process.env.BACKUP_DIR, { recursive: true, force: true });
  }
}

function request(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address();
      const options = {
        hostname: '127.0.0.1',
        port: address.port,
        path: url,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      const req = require('http').request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          server.close();
          let parsed = {};
          try {
            parsed = data ? JSON.parse(data) : {};
          } catch (_) {
            parsed = { raw: data };
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      });

      req.on('error', (error) => {
        server.close();
        reject(error);
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  });
}

test.beforeEach(() => {
  cleanupBackups();
});

test.after(() => {
  cleanupBackups();
});

test('permite acceso PLAYER a listar productos', async () => {
  db.query = async (sql) => {
    if (sql.includes('SELECT * FROM productos')) {
      return [[{ id: 1, nombre: 'A' }]];
    }
    return [[]];
  };

  const response = await request('GET', '/api/productos', null, {
    'X-User-Id': '20',
    'X-User-Role': 'PLAYER',
  });

  assert.equal(response.status, 200);
  assert.equal(response.body[0].id, 1);
});

test('bloquea PLAYER en acciones de administrador', async () => {
  const response = await request('POST', '/api/productos', { nombre: 'X' }, {
    'X-User-Id': '20',
    'X-User-Role': 'PLAYER',
    'X-Confirm-Action': 'CONFIRM',
  });

  assert.equal(response.status, 403);
});

test('bloquea acción crítica sin confirmación', async () => {
  const response = await request('POST', '/api/productos', { nombre: 'X' }, {
    'X-User-Id': '1',
    'X-User-Role': 'ADMIN',
  });

  assert.equal(response.status, 412);
});

test('permite acción crítica con confirmación', async () => {
  db.query = async (sql) => {
    if (sql.includes('INSERT INTO productos')) {
      return [{ insertId: 99 }];
    }
    return [[]];
  };

  const response = await request('POST', '/api/productos', { nombre: 'X' }, {
    'X-User-Id': '1',
    'X-User-Role': 'ADMIN',
    'X-Confirm-Action': 'CONFIRM',
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.id, 99);
});

test('crea backup antes de actualizar', async () => {
  db.query = async (sql) => {
    if (sql.includes('SELECT * FROM productos WHERE id')) {
      return [[{ id: 1, nombre: 'Antes', descripcion: 'd', precio: 10, categoria: 'c', tiraje: 1, estado: 'activo', premium: 0 }]];
    }
    return [[]];
  };

  const response = await request('PUT', '/api/productos/1', { nombre: 'Despues' }, {
    'X-User-Id': '1',
    'X-User-Role': 'ADMIN',
    'X-Confirm-Action': 'CONFIRM',
  });

  const files = fs.readdirSync(process.env.BACKUP_DIR);
  assert.equal(response.status, 200);
  assert.ok(files.length > 0);
});

test('ejecuta rollback cuando hay error luego del cambio', async () => {
  const calls = [];
  db.query = async (sql, params) => {
    calls.push(sql);
    if (sql.includes('SELECT * FROM productos WHERE id')) {
      return [[{ id: 1, nombre: 'Antes', descripcion: 'd', precio: 10, categoria: 'c', tiraje: 1, estado: 'activo', premium: 0 }]];
    }
    if (sql.includes('UPDATE productos')) {
      return [{}];
    }
    return [[]];
  };

  const response = await request('PUT', '/api/productos/1', { nombre: 'Despues' }, {
    'X-User-Id': '1',
    'X-User-Role': 'ADMIN',
    'X-Confirm-Action': 'CONFIRM',
    'X-Simulate-Error': 'true',
  });

  assert.equal(response.status, 500);
  const updateCalls = calls.filter((sql) => sql.includes('UPDATE productos'));
  assert.ok(updateCalls.length >= 2);
});
