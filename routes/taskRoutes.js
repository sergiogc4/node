const express = require('express');
const router = express.Router();
const checkPermission = require('../middleware/checkPermission');

// Ruta GET /api/tasks
router.get('/', checkPermission('tasks:read'), (req, res) => {
  res.json({ 
    success: true, 
    message: 'Tasques obtingudes', 
    data: [] 
  });
});

// Ruta POST /api/tasks
router.post('/', checkPermission('tasks:create'), (req, res) => {
  res.status(201).json({ 
    success: true, 
    message: 'Tasca creada',
    data: { 
      id: 'temp_' + Date.now(),
      title: req.body.title || 'Nova tasca',
      description: req.body.description || '',
      createdAt: new Date()
    }
  });
});

// Ruta PUT /api/tasks/:id
router.put('/:id', checkPermission('tasks:update'), (req, res) => {
  res.json({ 
    success: true, 
    message: 'Tasca actualitzada',
    data: { 
      id: req.params.id,
      ...req.body,
      updatedAt: new Date()
    }
  });
});

// Ruta DELETE /api/tasks/:id
router.delete('/:id', checkPermission('tasks:delete'), (req, res) => {
  res.json({ 
    success: true, 
    message: 'Tasca eliminada' 
  });
});

// EXPORT CORRECTE - AQUEST ÉS EL QUE FALTAVA!
module.exports = router;
