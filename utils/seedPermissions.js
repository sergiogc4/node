const mongoose = require('mongoose');
const Permission = require('../models/Permission');

const systemPermissions = [
  // Permisos de tasques
  {
    name: 'tasks:create',
    description: 'Crear tasques',
    category: 'tasks',
    isSystemPermission: true
  },
  {
    name: 'tasks:read',
    description: 'Veure tasques',
    category: 'tasks',
    isSystemPermission: true
  },
  {
    name: 'tasks:update',
    description: 'Actualitzar tasques',
    category: 'tasks',
    isSystemPermission: true
  },
  {
    name: 'tasks:delete',
    description: 'Eliminar tasques',
    category: 'tasks',
    isSystemPermission: true
  },
  
  // Permisos d'usuaris
  {
    name: 'users:create',
    description: 'Crear usuaris',
    category: 'users',
    isSystemPermission: true
  },
  {
    name: 'users:read',
    description: 'Veure usuaris',
    category: 'users',
    isSystemPermission: true
  },
  {
    name: 'users:update',
    description: 'Actualitzar usuaris',
    category: 'users',
    isSystemPermission: true
  },
  {
    name: 'users:delete',
    description: 'Eliminar usuaris',
    category: 'users',
    isSystemPermission: true
  },
  {
    name: 'users:manage',
    description: 'Gestionar usuaris (assignar rols, etc.)',
    category: 'users',
    isSystemPermission: true
  },
  
  // Permisos de rols
  {
    name: 'roles:create',
    description: 'Crear rols',
    category: 'roles',
    isSystemPermission: true
  },
  {
    name: 'roles:read',
    description: 'Veure rols',
    category: 'roles',
    isSystemPermission: true
  },
  {
    name: 'roles:update',
    description: 'Actualitzar rols',
    category: 'roles',
    isSystemPermission: true
  },
  {
    name: 'roles:delete',
    description: 'Eliminar rols',
    category: 'roles',
    isSystemPermission: true
  },
  {
    name: 'roles:manage',
    description: 'Gestionar rols',
    category: 'roles',
    isSystemPermission: true
  },
  
  // Permisos de permisos
  {
    name: 'permissions:create',
    description: 'Crear permisos',
    category: 'permissions',
    isSystemPermission: true
  },
  {
    name: 'permissions:read',
    description: 'Veure permisos',
    category: 'permissions',
    isSystemPermission: true
  },
  {
    name: 'permissions:update',
    description: 'Actualitzar permisos',
    category: 'permissions',
    isSystemPermission: true
  },
  {
    name: 'permissions:delete',
    description: 'Eliminar permisos',
    category: 'permissions',
    isSystemPermission: true
  },
  {
    name: 'permissions:manage',
    description: 'Gestionar permisos',
    category: 'permissions',
    isSystemPermission: true
  },
  
  // Permisos d'auditoria
  {
    name: 'audit:read',
    description: 'Veure logs d\'auditoria',
    category: 'audit',
    isSystemPermission: true
  },
  {
    name: 'audit:export',
    description: 'Exportar logs d\'auditoria',
    category: 'audit',
    isSystemPermission: true
  },
  
  // Permisos d'informes
  {
    name: 'reports:view',
    description: 'Veure informes',
    category: 'reports',
    isSystemPermission: true
  },
  {
    name: 'reports:export',
    description: 'Exportar informes',
    category: 'reports',
    isSystemPermission: true
  },
  {
    name: 'reports:generate',
    description: 'Generar informes',
    category: 'reports',
    isSystemPermission: true
  },
  
  // Permisos del sistema
  {
    name: 'system:settings',
    description: 'Configurar paràmetres del sistema',
    category: 'system',
    isSystemPermission: true
  },
  {
    name: 'system:monitor',
    description: 'Monitorar estat del sistema',
    category: 'system',
    isSystemPermission: true
  }
];

async function seedPermissions() {
  try {
    console.log('🌱 Iniciant seed de permisos...');
    
    // Connectar a MongoDB (si no ho està)
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/task-manager', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
    
    // Eliminar permisos existents (excepte els del sistema)
    await Permission.deleteMany({ isSystemPermission: false });
    console.log('✅ Permisos no del sistema eliminats');
    
    // Comptar permisos existents
    const existingPermissions = await Permission.countDocuments({ isSystemPermission: true });
    
    if (existingPermissions === systemPermissions.length) {
      console.log('✅ Tots els permisos del sistema ja existeixen');
      return;
    }
    
    // Inserir permisos del sistema
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (const permissionData of systemPermissions) {
      try {
        // Verificar si ja existeix
        const existingPermission = await Permission.findOne({ 
          name: permissionData.name,
          isSystemPermission: true 
        });
        
        if (!existingPermission) {
          await Permission.create(permissionData);
          insertedCount++;
          console.log(`✅ Permís creat: ${permissionData.name}`);
        } else {
          // Actualitzar si ja existeix (per si hi ha canvis en la descripció)
          await Permission.findByIdAndUpdate(
            existingPermission._id,
            permissionData,
            { new: true, runValidators: true }
          );
          skippedCount++;
          console.log(`↪️ Permís actualitzat: ${permissionData.name}`);
        }
      } catch (error) {
        console.error(`❌ Error al crear permís ${permissionData.name}:`, error.message);
      }
    }
    
    console.log(`\n📊 Resum de seed de permisos:`);
    console.log(`   - Permisos nous creats: ${insertedCount}`);
    console.log(`   - Permisos actualitzats: ${skippedCount}`);
    console.log(`   - Total permisos del sistema: ${await Permission.countDocuments({ isSystemPermission: true })}`);
    
    // Obtenir IDs dels permisos per usar-los en els rols
    const allPermissions = await Permission.find({ isSystemPermission: true });
    const permissionMap = {};
    allPermissions.forEach(perm => {
      permissionMap[perm.name] = perm._id;
    });
    
    console.log('\n📋 Llistat de permisos creats:');
    allPermissions.forEach(perm => {
      console.log(`   - ${perm.name} (${perm.category})`);
    });
    
    return permissionMap;
    
  } catch (error) {
    console.error('❌ Error al executar seed de permisos:', error);
    throw error;
  }
}

// Executar si es crida directament
if (require.main === module) {
  seedPermissions()
    .then(() => {
      console.log('✅ Seed de permisos completat!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error en seed de permisos:', error);
      process.exit(1);
    });
}

module.exports = seedPermissions;
