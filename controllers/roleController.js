const Role = require('../models/Role');
const Permission = require('../models/Permission');
const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * @desc    Crear nou rol
 * @route   POST /api/admin/roles
 * @access  Private/Admin (roles:manage)
 */
exports.createRole = async (req, res) => {
  try {
    // Validar errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, description, permissions = [] } = req.body;

    // Verificar que tots els permisos existeixen
    if (permissions.length > 0) {
      const existingPermissions = await Permission.find({ _id: { $in: permissions } });
      if (existingPermissions.length !== permissions.length) {
        return res.status(400).json({
          success: false,
          error: 'Un o més permisos no existeixen'
        });
      }
    }

    // Crear rol
    const role = await Role.create({
      name: name.toLowerCase(),
      description,
      permissions
    });

    // Poblar permisos per a la resposta
    await role.populate('permissions');

    res.status(201).json({
      success: true,
      message: 'Rol creat correctament',
      data: role
    });
  } catch (error) {
    console.error('Error al crear rol:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Obtenir tots els rols
 * @route   GET /api/admin/roles
 * @access  Private/Admin (roles:read)
 */
exports.getAllRoles = async (req, res) => {
  try {
    const { page = 1, limit = 20, includeSystem = false } = req.query;
    
    // Construir query
    const query = {};
    if (includeSystem === 'false') {
      query.isSystemRole = false;
    }
    
    // Paginació
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Obtenir rols amb permisos poblats
    const roles = await Role.find(query)
      .populate('permissions')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Comptar total
    const total = await Role.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: roles.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: roles
    });
  } catch (error) {
    console.error('Error al obtenir rols:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Obtenir rol per ID
 * @route   GET /api/admin/roles/:id
 * @access  Private/Admin (roles:read)
 */
exports.getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findById(id).populate('permissions');
    
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Rol no trobat'
      });
    }

    res.status(200).json({
      success: true,
      data: role
    });
  } catch (error) {
    console.error('Error al obtenir rol:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Actualitzar rol
 * @route   PUT /api/admin/roles/:id
 * @access  Private/Admin (roles:manage)
 */
exports.updateRole = async (req, res) => {
  try {
    // Validar errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { name, description, permissions } = req.body;

    // Verificar si el rol existeix
    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Rol no trobat'
      });
    }

    // No permetre actualitzar rols del sistema (excepte permisos)
    if (role.isSystemRole && name && name.toLowerCase() !== role.name) {
      return res.status(403).json({
        success: false,
        error: 'No es pot renombrar un rol del sistema'
      });
    }

    // Verificar permisos si s'envien
    if (permissions && Array.isArray(permissions)) {
      const existingPermissions = await Permission.find({ _id: { $in: permissions } });
      if (existingPermissions.length !== permissions.length) {
        return res.status(400).json({
          success: false,
          error: 'Un o més permisos no existeixen'
        });
      }
    }

    // Preparar dades d'actualització
    const updateData = {};
    if (name) updateData.name = name.toLowerCase();
    if (description) updateData.description = description;
    if (permissions) updateData.permissions = permissions;

    const updatedRole = await Role.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('permissions');

    res.status(200).json({
      success: true,
      message: 'Rol actualitzat correctament',
      data: updatedRole
    });
  } catch (error) {
    console.error('Error al actualitzar rol:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Eliminar rol
 * @route   DELETE /api/admin/roles/:id
 * @access  Private/Admin (roles:manage)
 */
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el rol existeix
    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Rol no trobat'
      });
    }

    // No permetre eliminar rols del sistema
    if (role.isSystemRole) {
      return res.status(403).json({
        success: false,
        error: 'No es pot eliminar un rol del sistema'
      });
    }

    // Verificar si hi ha usuaris amb aquest rol
    const usersWithRole = await User.find({ roles: id });
    if (usersWithRole.length > 0) {
      return res.status(400).json({
        success: false,
        error: `No es pot eliminar el rol perquè ${usersWithRole.length} usuari(s) el tenen assignat`
      });
    }

    // Eliminar rol
    await Role.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Rol eliminat correctament'
    });
  } catch (error) {
    console.error('Error al eliminar rol:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Afegir permís a rol
 * @route   POST /api/admin/roles/:id/permissions
 * @access  Private/Admin (roles:manage)
 */
exports.addPermissionToRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissionId } = req.body;

    if (!permissionId) {
      return res.status(400).json({
        success: false,
        error: 'ID del permís és obligatori'
      });
    }

    // Verificar si el rol existeix
    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Rol no trobat'
      });
    }

    // Verificar si el permís existeix
    const permission = await Permission.findById(permissionId);
    if (!permission) {
      return res.status(404).json({
        success: false,
        error: 'Permís no trobat'
      });
    }

    // Verificar si el rol ja té aquest permís
    if (role.permissions.includes(permissionId)) {
      return res.status(400).json({
        success: false,
        error: 'El rol ja té aquest permís'
      });
    }

    // Afegir permís
    await role.addPermission(permissionId);
    await role.populate('permissions');

    res.status(200).json({
      success: true,
      message: 'Permís afegit correctament',
      data: role
    });
  } catch (error) {
    console.error('Error al afegir permís a rol:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Eliminar permís de rol
 * @route   DELETE /api/admin/roles/:id/permissions/:permissionId
 * @access  Private/Admin (roles:manage)
 */
exports.removePermissionFromRole = async (req, res) => {
  try {
    const { id, permissionId } = req.params;

    // Verificar si el rol existeix
    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Rol no trobat'
      });
    }

    // Verificar si el permís existeix
    const permission = await Permission.findById(permissionId);
    if (!permission) {
      return res.status(404).json({
        success: false,
        error: 'Permís no trobat'
      });
    }

    // Verificar si el permís és del sistema i el rol també
    if (permission.isSystemPermission && role.isSystemRole) {
      return res.status(403).json({
        success: false,
        error: 'No es pot eliminar un permís del sistema d\'un rol del sistema'
      });
    }

    // Eliminar permís
    await role.removePermission(permissionId);
    await role.populate('permissions');

    res.status(200).json({
      success: true,
      message: 'Permís eliminat correctament',
      data: role
    });
  } catch (error) {
    console.error('Error al eliminar permís de rol:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};
