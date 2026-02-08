const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Role = require('../models/Role');
const checkPermission = require('../middleware/checkPermission');

/**
 * @route   POST /api/admin/users/:userId/roles
 * @desc    Assignar rol a usuari
 * @access  Private/Admin (users:manage)
 */
router.post('/:userId/roles', 
  checkPermission('users:manage'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { roleId } = req.body;

      if (!roleId) {
        return res.status(400).json({
          success: false,
          error: 'ID del rol és obligatori'
        });
      }

      // Verificar si l'usuari existeix
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuari no trobat'
        });
      }

      // Verificar si el rol existeix
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(404).json({
          success: false,
          error: 'Rol no trobat'
        });
      }

      // Verificar si l'usuari ja té aquest rol
      if (user.roles.includes(roleId)) {
        return res.status(400).json({
          success: false,
          error: 'L\'usuari ja té aquest rol assignat'
        });
      }

      // Assignar rol
      await user.addRole(roleId);
      await user.populate({
        path: 'roles',
        populate: {
          path: 'permissions',
          model: 'Permission'
        }
      });

      res.status(200).json({
        success: true,
        message: 'Rol assignat correctament',
        data: {
          userId: user._id,
          roles: user.roles
        }
      });
    } catch (error) {
      console.error('Error al assignar rol:', error);
      res.status(500).json({
        success: false,
        error: 'Error intern del servidor'
      });
    }
  }
);

/**
 * @route   DELETE /api/admin/users/:userId/roles/:roleId
 * @desc    Eliminar rol d'usuari
 * @access  Private/Admin (users:manage)
 */
router.delete('/:userId/roles/:roleId',
  checkPermission('users:manage'),
  async (req, res) => {
    try {
      const { userId, roleId } = req.params;

      // Verificar si l'usuari existeix
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuari no trobat'
        });
      }

      // Verificar si el rol existeix
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(404).json({
          success: false,
          error: 'Rol no trobat'
        });
      }

      // Verificar si l'usuari té aquest rol
      if (!user.roles.includes(roleId)) {
        return res.status(400).json({
          success: false,
          error: 'L\'usuari no té aquest rol assignat'
        });
      }

      // Verificar que no es treu l'últim rol
      if (user.roles.length === 1) {
        return res.status(400).json({
          success: false,
          error: 'No es pot treure l\'últim rol d\'un usuari'
        });
      }

      // Verificar si és un rol del sistema (admin/user)
      if (role.isSystemRole && role.name === 'admin') {
        // Comptar quants usuaris tenen rol admin
        const adminUsers = await User.find({ roles: roleId });
        if (adminUsers.length === 1) {
          return res.status(400).json({
            success: false,
            error: 'No es pot treure l\'últim administrador del sistema'
          });
        }
      }

      // Eliminar rol
      await user.removeRole(roleId);
      await user.populate({
        path: 'roles',
        populate: {
          path: 'permissions',
          model: 'Permission'
        }
      });

      res.status(200).json({
        success: true,
        message: 'Rol eliminat correctament',
        data: {
          userId: user._id,
          roles: user.roles
        }
      });
    } catch (error) {
      console.error('Error al eliminar rol:', error);
      res.status(500).json({
        success: false,
        error: 'Error intern del servidor'
      });
    }
  }
);

/**
 * @route   GET /api/admin/users/:userId/permissions
 * @desc    Obtenir permisos efectius d'un usuari
 * @access  Private/Admin (users:read)
 */
router.get('/:userId/permissions',
  checkPermission('users:read'),
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Verificar si l'usuari existeix
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuari no trobat'
        });
      }

      // Obtenir permisos efectius
      const permissions = await user.getEffectivePermissions();
      await user.populate({
        path: 'roles',
        populate: {
          path: 'permissions',
          model: 'Permission'
        }
      });

      res.status(200).json({
        success: true,
        data: {
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          roles: user.roles.map(role => ({
            id: role._id,
            name: role.name,
            description: role.description,
            permissions: role.permissions.map(perm => ({
              id: perm._id,
              name: perm.name,
              description: perm.description,
              category: perm.category
            }))
          })),
          effectivePermissions: permissions
        }
      });
    } catch (error) {
      console.error('Error al obtenir permisos:', error);
      res.status(500).json({
        success: false,
        error: 'Error intern del servidor'
      });
    }
  }
);

/**
 * @route   GET /api/admin/users
 * @desc    Obtenir tots els usuaris
 * @access  Private/Admin (users:read)
 */
router.get('/',
  checkPermission('users:read'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, role } = req.query;
      
      // Construir query
      const query = {};
      if (role) {
        const roleDoc = await Role.findOne({ name: role });
        if (roleDoc) {
          query.roles = roleDoc._id;
        }
      }
      
      // Paginació
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Obtenir usuaris
      const users = await User.find(query)
        .populate('roles')
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      // Comptar total
      const total = await User.countDocuments(query);
      
      res.status(200).json({
        success: true,
        count: users.length,
        total,
        pages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        data: users
      });
    } catch (error) {
      console.error('Error al obtenir usuaris:', error);
      res.status(500).json({
        success: false,
        error: 'Error intern del servidor'
      });
    }
  }
);

module.exports = router;
