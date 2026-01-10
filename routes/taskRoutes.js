// ============================================
// RUTES DE TASQUES (MODIFICAT)
// ============================================

const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');

// ============================================
// APLICAR MIDDLEWARE D'AUTENTICACIÓ A TOTES LES RUTES
// ============================================

router.use(auth);

// ============================================
// RUTES
// ============================================

// GET /api/tasks/stats - Obtenir estadístiques (només de l'usuari)
router.get('/stats', taskController.getTaskStats);

// GET /api/tasks - Obtenir totes les tasques (només de l'usuari)
router.get('/', taskController.getAllTasks);

// GET /api/tasks/:id - Obtenir tasca per ID (només si pertany a l'usuari)
router.get('/:id', taskController.getTaskById);

// POST /api/tasks - Crear nova tasca (associada a l'usuari)
router.post('/', taskController.createTask);

// PUT /api/tasks/:id - Actualitzar tasca (només si pertany a l'usuari)
router.put('/:id', taskController.updateTask);

// DELETE /api/tasks/:id - Eliminar tasca (només si pertany a l'usuari)
router.delete('/:id', taskController.deleteTask);

// PUT /api/tasks/:id/image - Actualitzar imatge de tasca (només si pertany a l'usuari)
router.put('/:id/image', taskController.updateTaskImage);

// PUT /api/tasks/:id/image/reset - Restablir imatge per defecte (només si pertany a l'usuari)
router.put('/:id/image/reset', taskController.resetTaskImageToDefault);

// ============================================
// EXPORTAR ROUTER
// ============================================

module.exports = router;