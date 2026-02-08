const User = require('../models/User');
const Role = require('../models/Role');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Obtenir tots els usuaris
 * @route   GET /api/admin/users
 * @access  Private/Admin (users:read)
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { 
      role, 
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Construir query
    let query = {};

    // Filtrar per rol
    if (role) {
      const roleDoc = await Role.findOne({ name: role });
      if (roleDoc) {
        query.roles = roleDoc._id;
      }
    }

    // Cerca global
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Paginació
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Executar consulta
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .populate({
          path: 'roles',
          populate: {
            path: 'permissions',
            model: 'Permission'
          }
        })
        .sort(sort)
        .skip(skip)
        .limit(limitInt),
      User.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limitInt),
      currentPage: pageInt,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtenir usuari per ID
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin (users:read)
 */
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate({
        path: 'roles',
        populate: {
          path: 'permissions',
          model: 'Permission'
        }
      });

    if (!user) {
      return next(new ErrorResponse(`Usuari no trobat amb ID ${req.params.id}`, 404));
    }

    // Obtenir permisos efectius
    const permissions = await user.getEffectivePermissions();

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        effectivePermissions: permissions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Crear nou usuari (admin)
 * @route   POST /api/admin/users
 * @access  Private/Admin (users:manage)
 */
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, roles } = req.body;

    // Verificar que l'email no existeixi
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ErrorResponse(`Ja existeix un usuari amb l'email ${email}`, 400));
    }

    // Verificar rols si s'especifiquen
    let roleIds = [];
    if (roles && roles.length > 0) {
      const validRoles = await Role.find({ _id: { $in: roles } });
      
      if (validRoles.length !== roles.length) {
        return next(new ErrorResponse('Un o més rols no existeixen', 400));
      }
      
      roleIds = roles;
    } else {
      // Assignar rol 'user' per defecte
      const defaultRole = await Role.findOne({ name: 'user' });
      if (defaultRole) {
        roleIds = [defaultRole._id];
      }
    }

    // Crear usuari
    const user = await User.create({
      name,
      email,
      password,
      roles: roleIds
    });

    // Populate rols
    await user.populate({
      path: 'roles',
      populate: {
        path: 'permissions',
        model: 'Permission'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Usuari creat correctament',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Actualitzar usuari
 * @route   PUT /api/admin/users/:id
 * @access  Private/Admin (users:manage)
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, roles } = req.body;

    const user = await User.findById(id);
    
    if (!user) {
      return next(new ErrorResponse(`Usuari no trobat amb ID ${id}`, 404));
    }

    // Verificar que l'email no estigui en ús
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return next(new ErrorResponse(`Ja existeix un usuari amb l'email ${email}`, 400));
      }
      user.email = email;
    }

    // Actualitzar nom
    if (name !== undefined) user.name = name;

    // Actualitzar rols si es proporcionen
    if (roles) {
      // Verificar que tots els rols existeixin
      const validRoles = await Role.find({ _id: { $in: roles } });
      
      if (validRoles.length !== roles.length) {
        return next(new ErrorResponse('Un o més rols no existeixen', 400));
      }
      
      user.roles = roles;
    }

    await user.save();

    // Populate rols
    await user.populate({
      path: 'roles',
      populate: {
        path: 'permissions',
        model: 'Permission'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Usuari actualitzat correctament',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Eliminar usuari
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin (users:manage)
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    
    if (!user) {
      return next(new ErrorResponse(`Usuari no trobat amb ID ${id}`, 404));
    }

    // No permetre eliminar-se a si mateix
    if (user._id.toString() === req.user.id) {
      return next(new ErrorResponse('No pots eliminar el teu propi compte', 400));
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Usuari eliminat correctament',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assignar rol a usuari
 * @route   POST /api/admin/users/:userId/roles
 * @access  Private/Admin (users:manage)
 */
exports.assignRoleToUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return next(new ErrorResponse(`Usuari no trobat amb ID ${userId}`, 404));
    }

    const role = await Role.findById(roleId);
    if (!role) {
      return next(new ErrorResponse(`Rol no trobat amb ID ${roleId}`, 404));
    }

    // Verificar que el rol no estigui ja assignat
    if (user.roles.includes(roleId)) {
      return next(new ErrorResponse('Aquest rol ja està assignat a l\'usuari', 400));
    }

    user.roles.push(roleId);
    await user.save();
    
    // Populate rols
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
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Eliminar rol d'usuari
 * @route   DELETE /api/admin/users/:userId/roles/:roleId
 * @access  Private/Admin (users:manage)
 */
exports.removeRoleFromUser = async (req, res, next) => {
  try {
    const { userId, roleId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return next(new ErrorResponse(`Usuari no trobat amb ID ${userId}`, 404));
    }

    // Verificar que l'usuari tingui el rol
    if (!user.roles.includes(roleId)) {
      return next(new ErrorResponse('Aquest rol no està assignat a l\'usuari', 400));
    }

    // Verificar que l'usuari no quedi sense rols
    if (user.roles.length === 1) {
      return next(new ErrorResponse('L\'usuari ha de tenir almenys un rol', 400));
    }

    // Eliminar el rol
    user.roles = user.roles.filter(
      role => role.toString() !== roleId
    );
    
    await user.save();
    
    // Populate rols
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
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtenir permisos efectius d'usuari
 * @route   GET /api/admin/users/:userId/permissions
 * @access  Private/Admin (users:read)
 */
exports.getUserPermissions = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate({
        path: 'roles',
        populate: {
          path: 'permissions',
          model: 'Permission'
        }
      });

    if (!user) {
      return next(new ErrorResponse(`Usuari no trobat amb ID ${userId}`, 404));
    }

    // Obtenir permisos efectius
    const permissions = await user.getEffectivePermissions();

    // Agrupar permisos per categoria
    const Permission = require('../models/Permission');
    const allPermissions = await Permission.find({ name: { $in: permissions } });
    
    const groupedPermissions = allPermissions.reduce((acc, permission) => {
      const category = permission.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        name: permission.name,
        description: permission.description
      });
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        },
        roles: user.roles.map(role => ({
          id: role._id,
          name: role.name,
          description: role.description
        })),
        permissions: {
          list: permissions,
          grouped: groupedPermissions,
          count: permissions.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
