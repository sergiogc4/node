// ============================================
// CONTROLADOR D'ADMINISTRACIÓ
// ============================================

const User = require('../models/User');
const Task = require('../models/Task');

// ============================================
// FUNCIONS DEL CONTROLADOR
// ============================================

/**
 * Obtenir tots els usuaris (només admin)
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('❌ Error al obtenir usuaris:', error);
    res.status(500).json({
      success: false,
      error: 'Error del servidor al obtenir usuaris'
    });
  }
};

/**
 * Obtenir totes les tasques (només admin)
 */
const getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('❌ Error al obtenir tasques:', error);
    res.status(500).json({
      success: false,
      error: 'Error del servidor al obtenir tasques'
    });
  }
};

/**
 * Eliminar usuari i totes les seves tasques (només admin)
 */
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // 1. Comprovar que l'admin no s'elimina a si mateix
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'No pots eliminar el teu propi compte'
      });
    }

    // 2. Buscar l'usuari a eliminar
    const userToDelete = await User.findById(userId);
    
    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        error: 'Usuari no trobat'
      });
    }

    // 3. Eliminar totes les tasques de l'usuari
    await Task.deleteMany({ user: userId });

    // 4. Eliminar l'usuari
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'Usuari i les seves tasques eliminats correctament',
      data: {
        deletedUserId: userId,
        deletedUserName: userToDelete.name,
        deletedUserEmail: userToDelete.email
      }
    });
  } catch (error) {
    console.error('❌ Error al eliminar usuari:', error);
    res.status(500).json({
      success: false,
      error: 'Error del servidor al eliminar usuari'
    });
  }
};

/**
 * Canviar rol d'usuari (només admin)
 */
const changeUserRole = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    // 1. Validar rol
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Rol no vàlid. Ha de ser "user" o "admin"'
      });
    }

    // 2. Comprovar que l'admin no es canvia el rol a si mateix
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'No pots canviar el teu propi rol'
      });
    }

    // 3. Buscar i actualitzar usuari
    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuari no trobat'
      });
    }

    res.json({
      success: true,
      message: `Rol de l'usuari canviat a "${role}" correctament`,
      data: user
    });
  } catch (error) {
    console.error('❌ Error al canviar rol:', error);
    res.status(500).json({
      success: false,
      error: 'Error del servidor al canviar rol'
    });
  }
};

module.exports = {
  getAllUsers,
  getAllTasks,
  deleteUser,
  changeUserRole
};