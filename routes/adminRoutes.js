// ============================================
// RUTES D'ADMINISTRACIÓ
// ============================================

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// ============================================
// APLICAR MIDDLEWARE D'AUTENTICACIÓ I ADMIN
// ============================================

router.use(auth);
router.use(roleCheck(['admin']));

// ============================================
// RUTES D'ADMINISTRACIÓ
// ============================================

// GET /api/admin/users - Obtenir tots els usuaris
router.get('/users', adminController.getAllUsers);

// GET /api/admin/tasks - Obtenir totes les tasques
router.get('/tasks', adminController.getAllTasks);

// DELETE /api/admin/users/:id - Eliminar usuari i les seves tasques
router.delete('/users/:id', adminController.deleteUser);

// PUT /api/admin/users/:id/role - Canviar rol d'usuari
router.put('/users/:id/role', adminController.changeUserRole);

// ============================================
// EXPORTAR ROUTER
// ============================================

module.exports = router;