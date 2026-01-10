// ============================================
// VALIDADORS D'AUTENTICACIÓ
// ============================================

const { body, validationResult } = require('express-validator');

// Funció per gestionar errors de validació
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

// Validadors per al registre
const registerValidation = [
  body('name')
    .optional()
    .isLength({ min: 2 }).withMessage('El nom ha de tenir mínim 2 caràcters')
    .trim()
    .escape(),
  
  body('email')
    .isEmail().withMessage('Si us plau, introdueix un email vàlid')
    .normalizeEmail()
    .trim(),
  
  body('password')
    .isLength({ min: 6 }).withMessage('La contrasenya ha de tenir mínim 6 caràcters')
    .trim(),
  
  handleValidationErrors
];

// Validadors per al login
const loginValidation = [
  body('email')
    .isEmail().withMessage('Si us plau, introdueix un email vàlid')
    .normalizeEmail()
    .trim(),
  
  body('password')
    .notEmpty().withMessage('La contrasenya és obligatòria')
    .trim(),
  
  handleValidationErrors
];

// Validadors per actualitzar perfil
const updateProfileValidation = [
  body('name')
    .optional()
    .isLength({ min: 2 }).withMessage('El nom ha de tenir mínim 2 caràcters')
    .trim()
    .escape(),
  
  body('email')
    .optional()
    .isEmail().withMessage('Si us plau, introdueix un email vàlid')
    .normalizeEmail()
    .trim(),
  
  handleValidationErrors
];

// Validadors per canviar contrasenya
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('La contrasenya actual és obligatòria')
    .trim(),
  
  body('newPassword')
    .isLength({ min: 6 }).withMessage('La nova contrasenya ha de tenir mínim 6 caràcters')
    .trim()
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('La nova contrasenya no pot ser igual a l\'actual');
      }
      return true;
    }),
  
  handleValidationErrors
];

module.exports = {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation
};