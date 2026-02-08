const { body, param } = require('express-validator');
const Permission = require('../../models/Permission');

const validateCreatePermission = [
  body('name')
    .notEmpty().withMessage('El nom del permís és obligatori')
    .trim()
    .toLowerCase()
    .matches(/^[a-z]+:[a-z]+$/).withMessage('El format del nom ha de ser: categoria:acció (ex: tasks:create)')
    .custom(async (value) => {
      const existingPermission = await Permission.findOne({ name: value });
      if (existingPermission) {
        throw new Error('Ja existeix un permís amb aquest nom');
      }
      return true;
    }),
  
  body('description')
    .notEmpty().withMessage('La descripció és obligatòria')
    .trim()
    .isLength({ max: 500 }).withMessage('La descripció no pot superar els 500 caràcters'),
  
  body('category')
    .notEmpty().withMessage('La categoria és obligatòria')
    .trim()
    .toLowerCase()
    .isIn(['tasks', 'users', 'roles', 'permissions', 'audit', 'reports', 'system'])
    .withMessage('Categoria no vàlida')
];

const validateUpdatePermission = [
  param('id')
    .notEmpty().withMessage('ID del permís és obligatori')
    .isMongoId().withMessage('ID del permís no és vàlid'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('La descripció no pot superar els 500 caràcters'),
  
  body('category')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(['tasks', 'users', 'roles', 'permissions', 'audit', 'reports', 'system'])
    .withMessage('Categoria no vàlida')
];

const validatePermissionId = [
  param('id')
    .notEmpty().withMessage('ID del permís és obligatori')
    .isMongoId().withMessage('ID del permís no és vàlid')
];

module.exports = {
  validateCreatePermission,
  validateUpdatePermission,
  validatePermissionId
};
