const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { validateCreatePermission, validateUpdatePermission, validatePermissionId } = require('../middleware/validators/permissionValidators');
const checkPermission = require('../middleware/checkPermission');

// Totes les rutes requereixen autenticació i permisos d'admin
router.use(checkPermission('permissions:read'));

// @route   POST /api/admin/permissions
// @desc    Crear nou permís
// @access  Private/Admin (permissions:manage)
router.post('/', 
  checkPermission('permissions:manage'),
  validateCreatePermission,
  permissionController.createPermission
);

// @route   GET /api/admin/permissions
// @desc    Obtenir tots els permisos
// @access  Private/Admin (permissions:read)
router.get('/', permissionController.getAllPermissions);

// @route   GET /api/admin/permissions/categories
// @desc    Obtenir categories de permisos
// @access  Private/Admin (permissions:read)
router.get('/categories', permissionController.getCategories);

// @route   GET /api/admin/permissions/check/:name
// @desc    Verificar si un permís existeix
// @access  Private/Admin (permissions:read)
router.get('/check/:name', permissionController.checkPermissionExists);

// @route   PUT /api/admin/permissions/:id
// @desc    Actualitzar permís
// @access  Private/Admin (permissions:manage)
router.put('/:id',
  checkPermission('permissions:manage'),
  validatePermissionId,
  validateUpdatePermission,
  permissionController.updatePermission
);

// @route   DELETE /api/admin/permissions/:id
// @desc    Eliminar permís
// @access  Private/Admin (permissions:manage)
router.delete('/:id',
  checkPermission('permissions:manage'),
  validatePermissionId,
  permissionController.deletePermission
);

module.exports = router;
