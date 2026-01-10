// ============================================
// CONTROLADOR DE TASQUES (MODIFICAT)
// ============================================

const Task = require('../models/Task');
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
// CONTROLADORS MODIFICATS PER AUTENTICACIÓ
// ============================================

// Obtenir totes les tasques DE L'USUARI AUTENTICAT
const getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user._id });
    
    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('❌ Error al obtenir tasques:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtenir les tasques',
      error: error.message
    });
  }
};

// Obtenir tasca per ID (només si pertany a l'usuari)
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tasca no trobada'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('❌ Error al obtenir tasca:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtenir la tasca',
      error: error.message
    });
  }
};

// Crear nova tasca (associada automàticament a l'usuari)
const createTask = async (req, res) => {
  try {
    const taskData = req.body;

    if (!taskData.title || taskData.title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El títol és obligatori'
      });
    }

    // Afegir l'ID de l'usuari a la tasca
    taskData.user = req.user._id;

    const newTask = await Task.create(taskData);

    res.status(201).json({
      success: true,
      message: 'Tasca creada correctament',
      data: newTask
    });
  } catch (error) {
    console.error('❌ Error al crear tasca:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la tasca',
      error: error.message
    });
  }
};

// Actualitzar tasca (només si pertany a l'usuari)
const updateTask = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { 
        _id: req.params.id, 
        user: req.user._id 
      },
      req.body,
      { 
        new: true, 
        runValidators: true 
      }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tasca no trobada'
      });
    }

    res.json({
      success: true,
      message: 'Tasca actualitzada correctament',
      data: task
    });
  } catch (error) {
    console.error('❌ Error al actualitzar tasca:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualitzar la tasca',
      error: error.message
    });
  }
};

// Eliminar tasca (només si pertany a l'usuari)
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tasca no trobada'
      });
    }

    // Eliminar imatge local associada
    deleteLocalImage(task.image);

    res.json({
      success: true,
      message: 'Tasca i imatge associada eliminades correctament',
      data: task
    });
  } catch (error) {
    console.error('❌ Error al eliminar tasca:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la tasca',
      error: error.message
    });
  }
};

// Actualitzar imatge (només si pertany a l'usuari)
const updateTaskImage = async (req, res) => {
  try {
    const { image } = req.body;

    if (!image || image.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'La URL de la imatge és obligatòria'
      });
    }

    // Buscar tasca per verificar propietat i obtenir imatge actual
    const existingTask = await Task.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Tasca no trobada'
      });
    }

    // Eliminar imatge local anterior
    deleteLocalImage(existingTask.image);

    // Actualitzar imatge
    const task = await Task.findOneAndUpdate(
      { 
        _id: req.params.id, 
        user: req.user._id 
      },
      { image },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Imatge actualitzada correctament',
      data: task
    });
  } catch (error) {
    console.error('❌ Error al actualitzar imatge:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualitzar la imatge',
      error: error.message
    });
  }
};

// Restablir imatge per defecte (només si pertany a l'usuari)
const resetTaskImageToDefault = async (req, res) => {
  try {
    // Buscar tasca per verificar propietat i obtenir imatge actual
    const existingTask = await Task.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Tasca no trobada'
      });
    }

    // Eliminar imatge local anterior
    deleteLocalImage(existingTask.image);

    // Restablir imatge per defecte
    const task = await Task.findOneAndUpdate(
      { 
        _id: req.params.id, 
        user: req.user._id 
      },
      { 
        image: 'http://localhost:3000/images/default-task.jpg' 
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Imatge restablerta a la per defecte',
      data: task
    });
  } catch (error) {
    console.error('❌ Error al restablir imatge:', error);
    res.status(500).json({
      success: false,
      message: 'Error al restablir la imatge',
      error: error.message
    });
  }
};

// Obtenir estadístiques (només de les tasques de l'usuari)
const getTaskStats = async (req, res) => {
  try {
    const stats = await Task.getStats(req.user._id);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error al obtenir estadístiques:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtenir estadístiques',
      error: error.message
    });
  }
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