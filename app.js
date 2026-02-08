const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ============================================
// MIDDLEWARE BÀSIC
// ============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware per logs de peticions
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ============================================
// CONNEXIÓ A MONGODB
// ============================================
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/task-manager', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log(`✅ MongoDB connectat: ${conn.connection.host}`);
    
    // Executar seeds si la BD està buida
    const Permission = require('./models/Permission');
    const Role = require('./models/Role');
    
    const permCount = await Permission.countDocuments();
    const roleCount = await Role.countDocuments();
    
    if (permCount === 0) {
      console.log('🌱 Executant seed de permisos...');
      const seedPermissions = require('./utils/seedPermissions');
      await seedPermissions();
    }
    
    if (roleCount === 0) {
      console.log('🌱 Executant seed de rols...');
      const seedRoles = require('./utils/seedRoles');
      await seedRoles();
    }
    
  } catch (error) {
    console.error('❌ Error de connexió a MongoDB:', error.message);
    process.exit(1);
  }
};

// Connectar a la base de dades
connectDB();

// ============================================
// IMPORTS DE MODELS
// ============================================
const User = require('./models/User');
const Role = require('./models/Role');
const Permission = require('./models/Permission');
const AuditLog = require('./models/AuditLog');

// ============================================
// IMPORTS DE MIDDLEWARE
// ============================================
const auth = require('./middleware/auth');

// Middleware de verificació de permisos
const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'No autenticat'
        });
      }

      const user = await User.findById(req.user._id);
      const hasPermission = await user.hasPermission(permission);

      if (!hasPermission) {
        // Registrar intent d'accés denegat
        await AuditLog.log({
          userId: req.user._id,
          userName: req.user.name,
          action: permission,
          resource: req.path,
          resourceType: 'system',
          status: 'error',
          errorMessage: 'Permission denied',
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });

        return res.status(403).json({
          success: false,
          error: 'No tens permís per fer aquesta acció',
          permission
        });
      }

      next();
    } catch (error) {
      console.error('Error al verificar permís:', error);
      res.status(500).json({
        success: false,
        error: 'Error intern del servidor'
      });
    }
  };
};

// Middleware d'auditoria
const auditMiddleware = (action) => {
  return async (req, res, next) => {
    // Guardar el mètode original res.json
    const originalJson = res.json.bind(res);

    // Sobreescriure res.json per capturar la resposta
    res.json = function(data) {
      // Registrar l'auditoria
      if (req.user) {
        AuditLog.log({
          userId: req.user._id,
          userName: req.user.name,
          action: action || `${req.method}:${req.path}`,
          resource: req.params.id || req.path,
          resourceType: determineResourceType(req.path),
          status: res.statusCode < 400 ? 'success' : 'error',
          changes: req.body,
          errorMessage: data.error || null,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }).catch(err => console.error('Error al registrar auditoria:', err));
      }

      // Cridar al mètode original
      return originalJson(data);
    };

    next();
  };
};

// Funció helper per determinar el tipus de recurs
function determineResourceType(path) {
  if (path.includes('/tasks')) return 'task';
  if (path.includes('/users')) return 'user';
  if (path.includes('/roles')) return 'role';
  if (path.includes('/permissions')) return 'permission';
  if (path.includes('/audit')) return 'audit';
  return 'other';
}

// ============================================
// RUTES PÚBLIQUES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Sistema de rols i permisos funcionant correctament',
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      audit: 'active',
      permissions: 'active'
    }
  });
});

// ============================================
// RUTES D'AUTENTICACIÓ (PÚBLIQUES)
// ============================================
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// ============================================
// RUTES PROTEGIDES (requereixen autenticació)
// ============================================

// -----------------
// PERMISOS (Admin)
// -----------------
app.post('/api/admin/permissions', 
  auth, 
  checkPermission('permissions:manage'),
  auditMiddleware('permissions:create'),
  async (req, res) => {
    try {
      const { name, description, category } = req.body;

      if (!name || !description || !category) {
        return res.status(400).json({
          success: false,
          error: 'Tots els camps són obligatoris'
        });
      }

      const existingPerm = await Permission.findOne({ name });
      if (existingPerm) {
        return res.status(400).json({
          success: false,
          error: 'Ja existeix un permís amb aquest nom'
        });
      }

      const permission = await Permission.create({
        name: name.toLowerCase(),
        description,
        category: category.toLowerCase(),
        isSystemPermission: false
      });

      res.status(201).json({
        success: true,
        message: 'Permís creat correctament',
        data: permission
      });
    } catch (error) {
      console.error('Error al crear permís:', error);
      res.status(500).json({
        success: false,
        error: 'Error intern del servidor'
      });
    }
  }
);

app.get('/api/admin/permissions',
  auth,
  checkPermission('permissions:read'),
  async (req, res) => {
    try {
      const permissions = await Permission.find().sort({ category: 1, name: 1 });

      res.json({
        success: true,
        count: permissions.length,
        data: permissions
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

app.get('/api/admin/permissions/categories',
  auth,
  checkPermission('permissions:read'),
  async (req, res) => {
    try {
      const categories = await Permission.getCategories();

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error al obtenir categories:', error);
      res.status(500).json({
        success: false,
        error: 'Error intern del servidor'
      });
    }
  }
);

// -----------------
// ROLS (Admin)
// -----------------
app.post('/api/admin/roles',
  auth,
  checkPermission('roles:manage'),
  auditMiddleware('roles:create'),
  async (req, res) => {
    try {
      const { name, description, permissions } = req.body;

      if (!name || !description) {
        return res.status(400).json({
          success: false,
          error: 'El nom i la descripció són obligatoris'
        });
      }

      const existingRole = await Role.findOne({ name: name.toLowerCase() });
      if (existingRole) {
        return res.status(400).json({
          success: false,
          error: 'Ja existeix un rol amb aquest nom'
        });
      }

      // Validar que els permisos existeixen
      let permissionIds = [];
      if (permissions && permissions.length > 0) {
        // Suportar tant noms com IDs
        if (mongoose.Types.ObjectId.isValid(permissions[0])) {
          permissionIds = permissions;
        } else {
          const perms = await Permission.find({ name: { $in: permissions } });
          if (perms.length !== permissions.length) {
            return res.status(400).json({
              success: false,
              error: 'Un o més permisos no existeixen'
            });
          }
          permissionIds = perms.map(p => p._id);
        }
      }

      const role = await Role.create({
        name: name.toLowerCase(),
        description,
        permissions: permissionIds,
        isSystemRole: false
      });

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
  }
);

app.get('/api/admin/roles',
  auth,
  checkPermission('roles:read'),
  async (req, res) => {
    try {
      const roles = await Role.find().populate('permissions');

      res.json({
        success: true,
        count: roles.length,
        data: roles
      });
    } catch (error) {
      console.error('Error al obtenir rols:', error);
      res.status(500).json({
        success: false,
        error: 'Error intern del servidor'
      });
    }
  }
);

app.get('/api/admin/roles/:id',
  auth,
  checkPermission('roles:read'),
  async (req, res) => {
    try {
      const role = await Role.findById(req.params.id).populate('permissions');

      if (!role) {
        return res.status(404).json({
          success: false,
          error: 'Rol no trobat'
        });
      }

      res.json({
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
  }
);

app.put('/api/admin/roles/:id',
  auth,
  checkPermission('roles:manage'),
  auditMiddleware('roles:update'),
  async (req, res) => {
    try {
      const role = await Role.findById(req.params.id);

      if (!role) {
        return res.status(404).json({
          success: false,
          error: 'Rol no trobat'
        });
      }

      if (role.isSystemRole && req.body.name && req.body.name !== role.name) {
        return res.status(403).json({
          success: false,
          error: 'No pots renombrar un rol del sistema'
        });
      }

      const { description, permissions } = req.body;

      if (description) role.description = description;

      if (permissions) {
        let permissionIds = [];
        if (mongoose.Types.ObjectId.isValid(permissions[0])) {
          permissionIds = permissions;
        } else {
          const perms = await Permission.find({ name: { $in: permissions } });
          permissionIds = perms.map(p => p._id);
        }
        role.permissions = permissionIds;
      }

      await role.save();
      await role.populate('permissions');

      res.json({
        success: true,
        message: 'Rol actualitzat correctament',
        data: role
      });
    } catch (error) {
      console.error('Error al actualitzar rol:', error);
      res.status(500).json({
        success: false,
        error: 'Error intern del servidor'
      });
    }
  }
);

app.delete('/api/admin/roles/:id',
  auth,
  checkPermission('roles:manage'),
  auditMiddleware('roles:delete'),
  async (req, res) => {
    try {
      const role = await Role.findById(req.params.id);

      if (!role) {
        return res.status(404).json({
          success: false,
          error: 'Rol no trobat'
        });
      }

      if (role.isSystemRole) {
        return res.status(403).json({
          success: false,
          error: 'No pots eliminar un rol del sistema'
        });
      }

      await role.deleteOne();

      res.json({
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
  }
);

// -----------------
// USUARIS (Admin)
// -----------------
app.post('/api/admin/users/:userId/roles',
  auth,
  checkPermission('users:manage'),
  auditMiddleware('users:assign-role'),
  async (req, res) => {
    try {
      const { roleId } = req.body;

      if (!roleId) {
        return res.status(400).json({
          success: false,
          error: 'El roleId és obligatori'
        });
      }

      const user = await User.findById(req.params.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuari no trobat'
        });
      }

      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(404).json({
          success: false,
          error: 'Rol no trobat'
        });
      }

      await user.addRole(roleId);
      await user.populate('roles');

      res.json({
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

app.delete('/api/admin/users/:userId/roles/:roleId',
  auth,
  checkPermission('users:manage'),
  auditMiddleware('users:remove-role'),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuari no trobat'
        });
      }

      if (user.roles.length <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Un usuari ha de tenir almenys un rol'
        });
      }

      await user.removeRole(req.params.roleId);
      await user.populate('roles');

      res.json({
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

app.get('/api/admin/users/:userId/permissions',
  auth,
  checkPermission('users:read'),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.userId).populate('roles');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuari no trobat'
        });
      }

      const permissions = await user.getEffectivePermissions();

      res.json({
        success: true,
        data: {
          userId: user._id,
          userName: user.name,
          roles: user.roles.map(r => r.name),
          permissions
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

// -----------------
// AUDITORIA (Admin)
// -----------------
app.get('/api/admin/audit-logs',
  auth,
  checkPermission('audit:read'),
  async (req, res) => {
    try {
      const { userId, action, page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      let query = {};
      if (userId) query.userId = userId;
      if (action) query.action = action;

      const logs = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .populate('userId', 'name email');

      const count = await AuditLog.countDocuments(query);

      res.json({
        success: true,
        count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
        data: logs
      });
    } catch (error) {
      console.error('Error al obtenir logs:', error);
      res.status(500).json({
        success: false,
        error: 'Error intern del servidor'
      });
    }
  }
);

app.get('/api/admin/audit-logs/user/:userId',
  auth,
  checkPermission('audit:read'),
  async (req, res) => {
    try {
      const logs = await AuditLog.getByUser(req.params.userId, 50, 0);

      res.json({
        success: true,
        count: logs.length,
        data: logs
      });
    } catch (error) {
      console.error('Error al obtenir logs:', error);
      res.status(500).json({
        success: false,
        error: 'Error intern del servidor'
      });
    }
  }
);

app.get('/api/admin/audit-logs/stats',
  auth,
  checkPermission('audit:read'),
  async (req, res) => {
    try {
      const stats = await AuditLog.getStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error al obtenir estadístiques:', error);
      res.status(500).json({
        success: false,
        error: 'Error intern del servidor'
      });
    }
  }
);

// -----------------
// TASQUES (amb permisos)
// -----------------
app.get('/api/tasks',
  auth,
  checkPermission('tasks:read'),
  async (req, res) => {
    res.json({
      success: true,
      message: 'Tasques obtingudes (exemple)',
      data: [
        { id: '1', title: 'Tasca 1', status: 'pending' },
        { id: '2', title: 'Tasca 2', status: 'completed' }
      ]
    });
  }
);

app.post('/api/tasks',
  auth,
  checkPermission('tasks:create'),
  auditMiddleware('tasks:create'),
  async (req, res) => {
    res.status(201).json({
      success: true,
      message: 'Tasca creada (exemple)',
      data: {
        id: Date.now().toString(),
        title: req.body.title || 'Nova tasca',
        status: 'pending'
      }
    });
  }
);

// ============================================
// ERROR HANDLERS
// ============================================

// 404 - Ruta no trobada
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no trobada'
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Error intern del servidor'
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('\n========================================');
  console.log(`🚀 Servidor T8 RBAC funcionant!`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`💚 Health: http://localhost:${PORT}/api/health`);
  console.log('========================================\n');
  console.log('📋 Pots començar les proves amb Postman!');
  console.log('   1. Login: POST /api/auth/login');
  console.log('   2. Crear permís: POST /api/admin/permissions');
  console.log('   3. Crear rol: POST /api/admin/roles');
  console.log('========================================\n');
});

// Gestió de tancament graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Tancant servidor...');
  await mongoose.connection.close();
  console.log('✅ Connexió a MongoDB tancada');
  process.exit(0);
});
