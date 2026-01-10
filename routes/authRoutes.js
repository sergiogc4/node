// ============================================
// RUTES D'AUTENTICACIÓ
// ============================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation
} = require('../middleware/validators/authValidators');

// ============================================
// RUTES PÚBLIQUES
// ============================================

// POST /api/auth/register - Registrar nou usuari
router.post('/register', registerValidation, authController.register);

// POST /api/auth/login - Iniciar sessió
router.post('/login', loginValidation, authController.login);

// ============================================
// RUTES PROTEGIDES (requereixen autenticació)
// ============================================

// GET /api/auth/me - Obtenir perfil de l'usuari actual
router.get('/me', auth, authController.getMe);

// PUT /api/auth/profile - Actualitzar perfil d'usuari
router.put('/profile', auth, updateProfileValidation, authController.updateProfile);

// PUT /api/auth/change-password - Canviar contrasenya
router.put('/change-password', auth, changePasswordValidation, authController.changePassword);

// ============================================
// EXPORTAR ROUTER
// ============================================

module.exports = router;