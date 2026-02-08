const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { validateCreateRole, validateUpdateRole, validateRoleId } = require('../middleware/validators/roleValidators');
const checkPermission = require('../middleware/checkPermission');

// Totes les rutes requereixen autenticació i permisos d'admin
router.use(checkPermission('roles:read'));

// @route   POST /api/admin/roles
// @desc    Crear nou rol
// @access  Private/Admin (roles:manage)
router.post('/',
  checkPermission('roles:manage'),
  validateCreateRole,
  roleController.createRole
);

// @route   GET /api/admin/roles
// @desc    Obtenir tots els rols
// @access  Private/Admin (roles:read)
router.get('/', roleController.getAllRoles);

// @route   GET /api/admin/roles/:id
// @desc    Obtenir rol per ID
// @access  Private/Admin (roles:read)
router.get('/:id', validateRoleId, roleController.getRoleById);

// @route   PUT /api/admin/roles/:id
// @desc    Actualitzar rol
// @access  Private/Admin (roles:manage)
router.put('/:id',
  checkPermission('roles:manage'),
  validateRoleId,
  validateUpdateRole,
  roleController.updateRole
);

// @route   DELETE /api/admin/roles/:id
// @desc    Eliminar rol
// @access  Private/Admin (roles:manage)
router.delete('/:id',
  checkPermission('roles:manage'),
  validateRoleId,
  roleController.deleteRole
);

// @route   POST /api/admin/roles/:id/permissions
// @desc    Afegir permís a rol
// @access  Private/Admin (roles:manage)
router.post('/:id/permissions',
  checkPermission('roles:manage'),
  validateRoleId,
  roleController.addPermissionToRole
);

// @route   DELETE /api/admin/roles/:id/permissions/:permissionId
// @desc    Eliminar permís de rol
// @access  Private/Admin (roles:manage)
router.delete('/:id/permissions/:permissionId',
  checkPermission('roles:manage'),
  validateRoleId,
  roleController.removePermissionFromRole
);

module.exports = router;
