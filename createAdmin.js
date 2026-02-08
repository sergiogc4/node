const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Role = require('./models/Role');
require('dotenv').config();

async function createAdmin() {
  try {
    console.log('🔗 Connectant a MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    
    // Trobar rol admin
    const adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      console.log('❌ Rol admin no trobat. Executa els seeds primer.');
      console.log('   npm run seed:all');
      process.exit(1);
    }
    
    // Verificar si ja existeix
    let adminUser = await User.findOne({ email: 'admin@example.com' });
    
    if (adminUser) {
      console.log('✅ L\'usuari admin ja existeix:');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   ID: ${adminUser._id}`);
      
      // Assegurar que té rol admin
      if (!adminUser.roles.includes(adminRole._id)) {
        adminUser.roles.push(adminRole._id);
        await adminUser.save();
        console.log('   ✅ Rol admin afegit');
      }
    } else {
      // Crear nou admin
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin123!', salt);
      
      adminUser = await User.create({
        name: 'Administrador',
        email: 'admin@example.com',
        password: hashedPassword,
        roles: [adminRole._id]
      });
      
      console.log('✅ Admin creat correctament:');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Contrasenya: Admin123!`);
      console.log('⚠️ IMPORTANT: Canvia la contrasenya després del primer login!');
    }
    
    mongoose.connection.close();
    console.log('\n🎉 Procés completat!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
