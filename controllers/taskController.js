// ============================================
// CONTROLADOR DE TASQUES
// ============================================

const TaskModel = require('../models/Task');
const fs = require('fs');
const path = require('path');

// ============================================
// FUNCIONS AUXILIARS
// ============================================

// Eliminar imatge local si existeix
const deleteLocalImage = (imageUrl) => {
  if (imageUrl && imageUrl.includes('/uploads/')) {
    const filename = imageUrl.split('/uploads/')[1];
    const filePath = path.join(__dirname, '..', 'uploads', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('✅ Imatge local eliminada:', filename);
    }
  }
};

// ============================================
// CONTROLADORS
// ============================================

// Obtenir totes les tasques
const getAllTasks = (req, res) => {
  TaskModel.getAll()
    .then(tasks => {
      res.json({
        success: true,
        count: tasks.length,
        data: tasks
      });
    })
    .catch(error => {
      res.status(500).json({
        success: false,
        message: 'Error al obtenir les tasques',
        error: error.message
      });
    });
};

// Obtenir tasca per ID
const getTaskById = (req, res) => {
  const { id } = req.params;

  TaskModel.getById(id)
    .then(task => {
      res.json({
        success: true,
        data: task
      });
    })
    .catch(error => {
      res.status(404).json({
        success: false,
        message: error.message
      });
    });
};

// Crear nova tasca
const createTask = (req, res) => {
  const taskData = req.body;

  if (!taskData.title || taskData.title.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'El títol és obligatori'
    });
  }

  TaskModel.create(taskData)
    .then(newTask => {
      res.status(201).json({
        success: true,
        message: 'Tasca creada correctament',
        data: newTask
      });
    })
    .catch(error => {
      res.status(500).json({
        success: false,
        message: 'Error al crear la tasca',
        error: error.message
      });
    });
};

// Actualitzar tasca
const updateTask = (req, res) => {
  const { id } = req.params;
  const taskData = req.body;

  TaskModel.update(id, taskData)
    .then(updatedTask => {
      res.json({
        success: true,
        message: 'Tasca actualitzada correctament',
        data: updatedTask
      });
    })
    .catch(error => {
      res.status(404).json({
        success: false,
        message: error.message
      });
    });
};

// Eliminar tasca
const deleteTask = (req, res) => {
  const { id } = req.params;

  TaskModel.getById(id)
    .then(task => {
      deleteLocalImage(task.image);
      return TaskModel.delete(id);
    })
    .then(deletedTask => {
      res.json({
        success: true,
        message: 'Tasca i imatge associada eliminades correctament',
        data: deletedTask
      });
    })
    .catch(error => {
      res.status(404).json({
        success: false,
        message: error.message
      });
    });
};

// Actualitzar imatge
const updateTaskImage = (req, res) => {
  const { id } = req.params;
  const { image } = req.body;

  if (!image || image.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'La URL de la imatge és obligatòria'
    });
  }

  TaskModel.getById(id)
    .then(task => {
      deleteLocalImage(task.image);
      return TaskModel.update(id, { image });
    })
    .then(updatedTask => {
      res.json({
        success: true,
        message: 'Imatge actualitzada correctament',
        data: updatedTask
      });
    })
    .catch(error => {
      res.status(404).json({
        success: false,
        message: error.message
      });
    });
};

// Restablir imatge per defecte
const resetTaskImageToDefault = (req, res) => {
  const { id } = req.params;

  TaskModel.getById(id)
    .then(task => {
      deleteLocalImage(task.image);
      return TaskModel.resetImageToDefault(id);
    })
    .then(updatedTask => {
      res.json({
        success: true,
        message: 'Imatge restablerta a la per defecte',
        data: updatedTask
      });
    })
    .catch(error => {
      res.status(404).json({
        success: false,
        message: error.message
      });
    });
};

// Obtenir estadístiques
const getTaskStats = (req, res) => {
  TaskModel.getStats()
    .then(stats => {
      res.json({
        success: true,
        data: stats
      });
    })
    .catch(error => {
      res.status(500).json({
        success: false,
        message: 'Error al obtenir estadístiques',
        error: error.message
      });
    });
};

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskImage,
  resetTaskImageToDefault,
  getTaskStats
};
