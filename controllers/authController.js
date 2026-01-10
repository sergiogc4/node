// ============================================
// CONTROLADOR D'AUTENTICACIÓ
// ============================================

const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');

// ============================================
// FUNCIONS DEL CONTROLADOR
// ============================================

/**
 * Registrar nou usuari
 */
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Comprovar si l'email ja existeix
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Aquest email ja està registrat'
      });
    }

    // 2. Crear nou usuari
    const user = await User.create({
      name,
      email,
      password
    });

    // 3. Generar token
    const token = generateToken(user);

    // 4. Retornar resposta
    res.status(201).json({
      success: true,
      message: 'Usuari registrat correctament',
      data: {
        token,
        user
      }
    });
  } catch (error) {
    console.error('❌ Error al registrar usuari:', error);
    
    // Error de duplicat de MongoDB
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Aquest email ja està registrat'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error del servidor al registrar usuari'
    });
  }
};

/**
 * Iniciar sessió
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Buscar usuari per email (incloent contrasenya)
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credencials incorrectes'
      });
    }

    // 2. Comparar contrasenyes
    const isPasswordCorrect = await user.comparePassword(password);
    
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        error: 'Credencials incorrectes'
      });
    }

    // 3. Generar token
    const token = generateToken(user);

    // 4. Eliminar contrasenya de la resposta
    const userWithoutPassword = user.toJSON();

    // 5. Retornar resposta
    res.json({
      success: true,
      message: 'Sessió iniciada correctament',
      data: {
        token,
        user: userWithoutPassword
      }
    });
  } catch (error) {
    console.error('❌ Error al iniciar sessió:', error);
    res.status(500).json({
      success: false,
      error: 'Error del servidor al iniciar sessió'
    });
  }
};

/**
 * Obtenir perfil de l'usuari actual
 */
const getMe = async (req, res) => {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('❌ Error al obtenir perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error del servidor al obtenir perfil'
    });
  }
};

/**
 * Actualitzar perfil d'usuari
 */
const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const updateData = {};

    // 1. Preparar dades a actualitzar
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    // 2. Si canvia l'email, comprovar que no estigui en ús
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Aquest email ja està registrat'
        });
      }
    }

    // 3. Actualitzar usuari
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    // 4. Retornar resposta
    res.json({
      success: true,
      message: 'Perfil actualitzat correctament',
      data: updatedUser
    });
  } catch (error) {
    console.error('❌ Error al actualitzar perfil:', error);
    
    // Error de duplicat de MongoDB
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Aquest email ja està registrat'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error del servidor al actualitzar perfil'
    });
  }
};

/**
 * Canviar contrasenya
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 1. Obtenir usuari complet (amb contrasenya)
    const user = await User.findById(req.user._id).select('+password');

    // 2. Verificar contrasenya actual
    const isPasswordCorrect = await user.comparePassword(currentPassword);
    
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        error: 'La contrasenya actual és incorrecta'
      });
    }

    // 3. Actualitzar amb nova contrasenya
    user.password = newPassword;
    await user.save();

    // 4. Retornar resposta
    res.json({
      success: true,
      message: 'Contrasenya actualitzada correctament'
    });
  } catch (error) {
    console.error('❌ Error al canviar contrasenya:', error);
    res.status(500).json({
      success: false,
      error: 'Error del servidor al canviar contrasenya'
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword
};