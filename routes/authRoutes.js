const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Role = require('../models/Role');

// @route   POST /api/auth/register
// @desc    Registrar nou usuari
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validacions bàsiques
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Si us plau, introdueix nom, email i contrasenya'
      });
    }
    
    // Verificar si l'usuari ja existeix
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Ja existeix un usuari amb aquest email'
      });
    }
    
    // Obtenir rol "user" per defecte
    const userRole = await Role.findOne({ name: 'user' });
    if (!userRole) {
      return res.status(500).json({
        success: false,
        error: 'Error de configuració del sistema: Rol "user" no trobat'
      });
    }
    
    // Crear usuari
    const user = await User.create({
      name,
      email,
      password,
      roles: [userRole._id]
    });
    
    // Generar token
    const token = user.generateAuthToken();
    
    // Obtenir permisos de l'usuari
    const permissions = await user.getEffectivePermissions();
    
    res.status(201).json({
      success: true,
      message: 'Usuari registrat correctament',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          roles: [userRole.name]
        },
        token,
        permissions
      }
    });
  } catch (error) {
    console.error('Error al registrar usuari:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Iniciar sessió d'usuari
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validacions bàsiques
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Si us plau, introdueix email i contrasenya'
      });
    }
    
    // Buscar usuari
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credencials invàlides'
      });
    }
    
    // Verificar si l'usuari està actiu
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Compte desactivat. Contacta amb l\'administrador.'
      });
    }
    
    // Verificar contrasenya
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Credencials invàlides'
      });
    }
    
    // Generar token
    const token = user.generateAuthToken();
    
    // Actualitzar últim login
    await user.updateLastLogin();
    
    // Obtenir rols i permisos
    await user.populate('roles');
    const permissions = await user.getEffectivePermissions();
    
    res.status(200).json({
      success: true,
      message: 'Sessió iniciada correctament',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          roles: user.roles.map(role => role.name)
        },
        token,
        permissions
      }
    });
  } catch (error) {
    console.error('Error al iniciar sessió:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Obtenir perfil de l'usuari actual
// @access  Private
router.get('/me', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'No autenticat'
      });
    }
    
    // Obtenir informació completa de l'usuari
    const user = await User.findById(req.user._id)
      .populate({
        path: 'roles',
        populate: {
          path: 'permissions',
          model: 'Permission'
        }
      });
    
    const permissions = await user.getEffectivePermissions();
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          roles: user.roles,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        },
        permissions
      }
    });
  } catch (error) {
    console.error('Error al obtenir perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
});

module.exports = router;
