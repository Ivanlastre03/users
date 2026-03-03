const express = require('express');
const router = express.Router();
const controller = require('../controllers/productos.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');
const { requireCriticalConfirmation } = require('../middlewares/confirm.middleware');

router.use(authenticate);

router.get('/', controller.getProductos);
router.post('/', requireRole(['ADMIN']), requireCriticalConfirmation, controller.createProducto);
router.put('/:id', requireRole(['ADMIN']), requireCriticalConfirmation, controller.updateProducto);
router.delete('/:id', requireRole(['ADMIN']), requireCriticalConfirmation, controller.deleteProducto);

module.exports = router;
