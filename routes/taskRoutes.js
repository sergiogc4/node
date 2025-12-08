// ============================================
// RUTES DE TASQUES
// ============================================

const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

// ============================================
// RUTES
// ============================================

// GET /api/tasks/stats - Obtenir estadístiques
router.get('/stats', taskController.getTaskStats);

// GET /api/tasks - Obtenir totes les tasques
router.get('/', taskController.getAllTasks);

// GET /api/tasks/:id - Obtenir tasca per ID
router.get('/:id', taskController.getTaskById);

// POST /api/tasks - Crear nova tasca
router.post('/', taskController.createTask);

// PUT /api/tasks/:id - Actualitzar tasca
router.put('/:id', taskController.updateTask);

// DELETE /api/tasks/:id - Eliminar tasca
router.delete('/:id', taskController.deleteTask);

// PUT /api/tasks/:id/image - Actualitzar imatge de tasca
router.put('/:id/image', taskController.updateTaskImage);

// PUT /api/tasks/:id/image/reset - Restablir imatge per defecte
router.put('/:id/image/reset', taskController.resetTaskImageToDefault);

// ============================================
// EXPORTAR ROUTER
// ============================================

module.exports = router;
