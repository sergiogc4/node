const mongoose = require('mongoose');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const User = require('../models/User');

async function seedRoles() {
  try {
    console.log('🌱 Iniciant seed de rols...');
    
    // Connectar a MongoDB (si no ho està)
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/task-manager', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
    
    // Obtenir tots els permisos del sistema
    const permissions = await Permission.find({ isSystemPermission: true });
    if (permissions.length === 0) {
      console.log('❌ No hi ha permisos. Executa primer seedPermissions.js');
      return;
    }
    
    // Crear mapa de permisos per nom
    const permissionMap = {};
    permissions.forEach(perm => {
      permissionMap[perm.name] = perm._id;
    });
    
    // Definir rols del sistema
    const systemRoles = [
      {
        name: 'admin',
        description: 'Administrador del sistema amb tots els permisos',
        isSystemRole: true,
        permissions: Object.values(permissionMap) // Tots els permisos
      },
      {
        name: 'user',
        description: 'Usuari bàsic del sistema',
        isSystemRole: true,
        permissions: [
          permissionMap['tasks:create'],
          permissionMap['tasks:read'],
          permissionMap['tasks:update'],
          permissionMap['tasks:delete']
        ]
      },
      {
        name: 'viewer',
        description: 'Usuari que només pot veure contingut',
        isSystemRole: false,
        permissions: [
          permissionMap['tasks:read']
        ]
      },
      {
        name: 'editor',
        description: 'Editor de contingut',
        isSystemRole: false,
        permissions: [
          permissionMap['tasks:create'],
          permissionMap['tasks:read'],
          permissionMap['tasks:update'],
          permissionMap['tasks:delete']
        ]
      },
      {
        name: 'moderator',
        description: 'Moderador de contingut',
        isSystemRole: false,
        permissions: [
          permissionMap['tasks:read'],
          permissionMap['tasks:update'],
          permissionMap['tasks:delete'],
          permissionMap['users:read']
        ]
      },
      {
        name: 'auditor',
        description: 'Auditor del sistema',
        isSystemRole: false,
        permissions: [
          permissionMap['audit:read'],
          permissionMap['reports:view']
        ]
      }
    ];
    
    // Eliminar rols no del sistema existents
    await Role.deleteMany({ isSystemRole: false });
    console.log('✅ Rols no del sistema eliminats');
    
    // Crear o actualitzar rols
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const roleData of systemRoles) {
      try {
        // Buscar rol existent
        const existingRole = await Role.findOne({ name: roleData.name });
        
        if (!existingRole) {
          // Crear nou rol
          await Role.create(roleData);
          createdCount++;
          console.log(`✅ Rol creat: ${roleData.name}`);
        } else {
          // Actualitzar rol existent
          // Per rols del sistema, només actualitzar permisos si és necessari
          if (existingRole.isSystemRole && roleData.isSystemRole) {
            // Verificar si els permisos són diferents
            const existingPerms = existingRole.permissions.map(p => p.toString());
            const newPerms = roleData.permissions.map(p => p.toString());
            
            const needsUpdate = existingPerms.length !== newPerms.length ||
              !existingPerms.every(perm => newPerms.includes(perm));
            
            if (needsUpdate) {
              existingRole.permissions = roleData.permissions;
              await existingRole.save();
              updatedCount++;
              console.log(`↪️ Rol actualitzat: ${roleData.name}`);
            } else {
              console.log(`⏭️  Rol ja existeix: ${roleData.name}`);
            }
          } else if (!existingRole.isSystemRole) {
            // Per rols no del sistema, actualitzar completament
            await Role.findByIdAndUpdate(
              existingRole._id,
              roleData,
              { new: true, runValidators: true }
            );
            updatedCount++;
            console.log(`↪️ Rol actualitzat: ${roleData.name}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error al crear rol ${roleData.name}:`, error.message);
      }
    }
    
    // Assignar rol "admin" al primer usuari si existeix
    try {
      const adminRole = await Role.findOne({ name: 'admin' });
      const userRole = await Role.findOne({ name: 'user' });
      
      if (adminRole && userRole) {
        // Trobar primer usuari
        const firstUser = await User.findOne().sort({ createdAt: 1 });
        
        if (firstUser && !firstUser.roles.includes(adminRole._id)) {
          // Assegurar-se que l'usuari té almenys un rol
          if (firstUser.roles.length === 0) {
            firstUser.roles = [userRole._id];
          }
          
          // Afegir rol admin si no el té
          if (!firstUser.roles.includes(adminRole._id)) {
            firstUser.roles.push(adminRole._id);
            await firstUser.save();
            console.log(`✅ Rol admin assignat a l'usuari: ${firstUser.email}`);
          }
        }
        
        // Verificar que tots els usuaris tinguin almenys un rol
        const usersWithoutRoles = await User.find({ roles: { $size: 0 } });
        
        if (usersWithoutRoles.length > 0) {
          console.log(`⚠️  Assignant rol "user" a ${usersWithoutRoles.length} usuari(s) sense rol...`);
          
          for (const user of usersWithoutRoles) {
            user.roles = [userRole._id];
            await user.save();
            console.log(`   ✅ Rol "user" assignat a: ${user.email}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error al assignar rols a usuaris:', error.message);
    }
    
    console.log(`\n📊 Resum de seed de rols:`);
    console.log(`   - Rols nous creats: ${createdCount}`);
    console.log(`   - Rols actualitzats: ${updatedCount}`);
    console.log(`   - Total rols: ${await Role.countDocuments()}`);
    
    // Mostrar informació dels rols
    const allRoles = await Role.find().populate('permissions');
    console.log('\n📋 Llistat de rols creats:');
    allRoles.forEach(role => {
      console.log(`\n   ${role.name} (${role.isSystemRole ? 'Sistema' : 'Personalitzat'}):`);
      console.log(`   Descripció: ${role.description}`);
      console.log(`   Permisos (${role.permissions.length}):`);
      role.permissions.forEach(perm => {
        console.log(`     - ${perm.name} (${perm.category})`);
      });
    });
    
    return allRoles;
    
  } catch (error) {
    console.error('❌ Error al executar seed de rols:', error);
    throw error;
  }
}

// Executar si es crida directament
if (require.main === module) {
  seedRoles()
    .then(() => {
      console.log('\n✅ Seed de rols completat!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error en seed de rols:', error);
      process.exit(1);
    });
}

module.exports = seedRoles;
