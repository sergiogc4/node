// ============================================
// MODEL D'USUARI - MONGODB
// ============================================

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// ============================================
// ESQUEMA D'USUARI
// ============================================

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'L\'email és obligatori'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Si us plau, introdueix un email vàlid']
  },
  password: {
    type: String,
    required: [true, 'La contrasenya és obligatòria'],
    minlength: [6, 'La contrasenya ha de tenir mínim 6 caràcters'],
    select: false // No retornar la contrasenya per defecte
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// ============================================
// MIDDLEWARE (HOOKS) DE MONGOOSE
// ============================================

// Xifrar contrasenya abans de guardar (només si s'ha modificat)
userSchema.pre('save', async function(next) {
  // Si la contrasenya no s'ha modificat, continuar
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    // Generar salt
    const salt = await bcrypt.genSalt(10);
    // Xifrar contrasenya amb el salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Actualitzar updatedAt en cada actualització
userSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// ============================================
// MÈTODES DE L'ESQUEMA
// ============================================

// Mètode per comparar contrasenyes
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Mètode per eliminar la contrasenya al retornar l'objecte JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// ============================================
// CREAR I EXPORTAR MODEL
// ============================================

const User = mongoose.model('User', userSchema);

module.exports = User;