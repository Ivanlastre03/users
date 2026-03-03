// CRUD de productos
const db = require('../db');
const { createBackup } = require('../services/backup.service');
const { writeAudit } = require('../services/audit.service');

// Obtener todos los productos
exports.getProductos = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM productos');
    res.json(rows);
  } catch (error) {
    writeAudit('productos_list_error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

// Crear producto
exports.createProducto = async (req, res) => {
  let productId;

  try {
    const { nombre, descripcion, precio, categoria, tiraje, premium } = req.body;

    const backup = createBackup('create_producto', {
      before: null,
      request: { nombre, descripcion, precio, categoria, tiraje, premium: premium || false },
    });

    const [result] = await db.query(
      `INSERT INTO productos 
       (nombre, descripcion, precio, categoria, tiraje, premium)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, descripcion, precio, categoria, tiraje, premium || false]
    );

    productId = result.insertId;

    if (req.headers['x-simulate-error'] === 'true') {
      throw new Error('Error simulado después de crear producto');
    }

    writeAudit('producto_created', { productId, backupId: backup.backupId, userId: req.user?.id });
    res.json({ message: 'Producto creado', id: productId, backupId: backup.backupId });
  } catch (error) {
    if (productId) {
      await db.query('DELETE FROM productos WHERE id=?', [productId]);
      writeAudit('rollback_executed', { operation: 'create_producto', productId, reason: error.message });
    }

    res.status(500).json({ error: error.message });
  }
};

// Actualizar producto
exports.updateProducto = async (req, res) => {
  const { id } = req.params;
  let previous;

  try {
    const [rows] = await db.query('SELECT * FROM productos WHERE id=?', [id]);
    previous = rows[0];

    if (!previous) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const { nombre, descripcion, precio, categoria, tiraje, estado } = req.body;

    const backup = createBackup('update_producto', {
      before: previous,
      request: { nombre, descripcion, precio, categoria, tiraje, estado },
    });

    await db.query(
      `UPDATE productos 
       SET nombre=?, descripcion=?, precio=?, categoria=?, tiraje=?, estado=? 
       WHERE id=?`,
      [nombre, descripcion, precio, categoria, tiraje, estado, id]
    );

    if (req.headers['x-simulate-error'] === 'true') {
      throw new Error('Error simulado después de actualizar producto');
    }

    writeAudit('producto_updated', { productId: id, backupId: backup.backupId, userId: req.user?.id });
    res.json({ message: 'Producto actualizado', backupId: backup.backupId });
  } catch (error) {
    if (previous) {
      await db.query(
        `UPDATE productos SET nombre=?, descripcion=?, precio=?, categoria=?, tiraje=?, estado=?, premium=? WHERE id=?`,
        [
          previous.nombre,
          previous.descripcion,
          previous.precio,
          previous.categoria,
          previous.tiraje,
          previous.estado,
          previous.premium,
          id,
        ]
      );
      writeAudit('rollback_executed', { operation: 'update_producto', productId: id, reason: error.message });
    }

    res.status(500).json({ error: error.message });
  }
};

// Eliminar producto
exports.deleteProducto = async (req, res) => {
  const { id } = req.params;
  let previous;

  try {
    const [rows] = await db.query('SELECT * FROM productos WHERE id=?', [id]);
    previous = rows[0];

    if (!previous) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const backup = createBackup('delete_producto', { before: previous });

    await db.query('DELETE FROM productos WHERE id=?', [id]);

    if (req.headers['x-simulate-error'] === 'true') {
      throw new Error('Error simulado después de eliminar producto');
    }

    writeAudit('producto_deleted', { productId: id, backupId: backup.backupId, userId: req.user?.id });
    res.json({ message: 'Producto eliminado', backupId: backup.backupId });
  } catch (error) {
    if (previous) {
      await db.query(
        `INSERT INTO productos (id, nombre, descripcion, precio, categoria, tiraje, estado, premium)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         nombre=VALUES(nombre), descripcion=VALUES(descripcion), precio=VALUES(precio), categoria=VALUES(categoria), tiraje=VALUES(tiraje), estado=VALUES(estado), premium=VALUES(premium)`,
        [
          previous.id,
          previous.nombre,
          previous.descripcion,
          previous.precio,
          previous.categoria,
          previous.tiraje,
          previous.estado,
          previous.premium,
        ]
      );
      writeAudit('rollback_executed', { operation: 'delete_producto', productId: id, reason: error.message });
    }

    res.status(500).json({ error: error.message });
  }
};
