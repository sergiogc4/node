const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');

/**
 * @desc    Registrar usuari
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validacions
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

    // Obtenir permisos
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
    console.error('Error al registrar:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Iniciar sessió
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validar email i contrasenya
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Si us plau, introdueix email i contrasenya'
      });
    }

    // Buscar usuari amb contrasenya
    const user = await User.findOne({ email })
      .select('+password')
      .populate({
        path: 'roles',
        populate: {
          path: 'permissions',
          model: 'Permission'
        }
      });

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

    // ✅ CORREGIT: usar comparePassword
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Credencials invàlides'
      });
    }

    // Generar token
    const token = user.generateAuthToken();

    // Actualitzar últim login
    await user.updateLastLogin();

    // Obtenir permisos efectius
    const permissions = await user.getEffectivePermissions();

    res.status(200).json({
      success: true,
      message: 'Login correcte',
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
    console.error('Error al login:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Obtenir perfil d'usuari
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'roles',
        populate: {
          path: 'permissions',
          model: 'Permission'
        }
      });

    // Obtenir permisos efectius
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
};

/**
 * @desc    Tancar sessió
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Sessió tancada correctament',
    data: {}
  });
};

/**
 * @desc    Actualitzar contrasenya
 * @route   PUT /api/auth/updatepassword
 * @access  Private
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Si us plau, introdueix la contrasenya actual i la nova'
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    // ✅ CORREGIT: usar comparePassword
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Contrasenya actual incorrecta'
      });
    }

    user.password = newPassword;
    await user.save();

    const token = user.generateAuthToken();

    res.status(200).json({
      success: true,
      message: 'Contrasenya actualitzada correctament',
      token
    });
  } catch (error) {
    console.error('Error al actualitzar contrasenya:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Verificar permís d'usuari
 * @route   POST /api/auth/check-permission
 * @access  Private
 */
exports.checkUserPermission = async (req, res, next) => {
  try {
    const { permission } = req.body;

    if (!permission) {
      return res.status(400).json({
        success: false,
        error: 'El permís és obligatori'
      });
    }

    // Verificar que el permís existeix
    const permissionExists = await Permission.findOne({ name: permission });
    
    if (!permissionExists) {
      return res.status(400).json({
        success: false,
        error: `El permís "${permission}" no existeix`
      });
    }

    // Verificar si l'usuari té el permís
    const user = await User.findById(req.user._id);
    const hasPermission = await user.hasPermission(permission);

    const statusCode = hasPermission ? 200 : 403;

    res.status(statusCode).json({
      success: true,
      hasPermission,
      permission,
      message: hasPermission 
        ? 'Tens permís per fer aquesta acció'
        : 'No tens permís per fer aquesta acció'
    });
  } catch (error) {
    console.error('Error al verificar permís:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};
