const { body, param } = require('express-validator');
const Role = require('../../models/Role');
const Permission = require('../../models/Permission');

const validateCreateRole = [
  body('name')
    .notEmpty().withMessage('El nom del rol és obligatori')
    .trim()
    .toLowerCase()
    .custom(async (value) => {
      const existingRole = await Role.findOne({ name: value });
      if (existingRole) {
        throw new Error('Ja existeix un rol amb aquest nom');
      }
      return true;
    }),
  
  body('description')
    .notEmpty().withMessage('La descripció és obligatòria')
    .trim()
    .isLength({ max: 500 }).withMessage('La descripció no pot superar els 500 caràcters'),
  
  body('permissions')
    .optional()
    .isArray().withMessage('Els permisos han de ser un array')
    .custom(async (permissionIds) => {
      if (permissionIds && permissionIds.length > 0) {
        const permissions = await Permission.find({ _id: { $in: permissionIds } });
        if (permissions.length !== permissionIds.length) {
          throw new Error('Un o més permisos no existeixen');
        }
      }
      return true;
    })
];

const validateUpdateRole = [
  param('id')
    .notEmpty().withMessage('ID del rol és obligatori')
    .isMongoId().withMessage('ID del rol no és vàlid'),
  
  body('name')
    .optional()
    .trim()
    .toLowerCase()
    .custom(async (value, { req }) => {
      if (value) {
        const existingRole = await Role.findOne({ 
          name: value, 
          _id: { $ne: req.params.id } 
        });
        if (existingRole) {
          throw new Error('Ja existeix un rol amb aquest nom');
        }
        
        // Verificar si és un rol del sistema
        const role = await Role.findById(req.params.id);
        if (role && role.isSystemRole) {
          throw new Error('No es pot renombrar un rol del sistema');
        }
      }
      return true;
    }),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('La descripció no pot superar els 500 caràcters'),
  
  body('permissions')
    .optional()
    .isArray().withMessage('Els permisos han de ser un array')
    .custom(async (permissionIds, { req }) => {
      if (permissionIds && permissionIds.length > 0) {
        const permissions = await Permission.find({ _id: { $in: permissionIds } });
        if (permissions.length !== permissionIds.length) {
          throw new Error('Un o més permisos no existeixen');
        }
      }
      return true;
    })
];

const validateRoleId = [
  param('id')
    .notEmpty().withMessage('ID del rol és obligatori')
    .isMongoId().withMessage('ID del rol no és vàlid')
];

module.exports = {
  validateCreateRole,
  validateUpdateRole,
  validateRoleId
};
