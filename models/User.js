const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nom és obligatori'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'L\'email és obligatori'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'La contrasenya és obligatòria'],
    minlength: [6, 'La contrasenya ha de tenir com a mínim 6 caràcters'],
    select: false
  },
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// Indexos per millorar rendiment
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ roles: 1 });
userSchema.index({ isActive: 1 });

// Encriptar contrasenya abans de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Comparar contrasenya
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generar token JWT
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      roles: this.roles 
    },
    process.env.JWT_SECRET || 'secret-key-aqui',
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

// Mètodes per gestionar rols i permisos
userSchema.methods.addRole = async function(roleId) {
  if (!this.roles.includes(roleId)) {
    this.roles.push(roleId);
    await this.save();
  }
  return this;
};

userSchema.methods.removeRole = async function(roleId) {
  const index = this.roles.indexOf(roleId);
  if (index > -1) {
    this.roles.splice(index, 1);
    await this.save();
  }
  return this;
};

userSchema.methods.hasRole = function(roleId) {
  return this.roles.includes(roleId);
};

userSchema.methods.getRoles = async function() {
  return await this.populate('roles');
};

userSchema.methods.hasPermission = async function(permissionName) {
  await this.populate({
    path: 'roles',
    populate: {
      path: 'permissions',
      model: 'Permission'
    }
  });
  
  for (const role of this.roles) {
    const hasPerm = await role.hasPermission(permissionName);
    if (hasPerm) return true;
  }
  
  return false;
};

userSchema.methods.getEffectivePermissions = async function() {
  await this.populate({
    path: 'roles',
    populate: {
      path: 'permissions',
      model: 'Permission'
    }
  });
  
  const permissions = new Set();
  for (const role of this.roles) {
    const rolePerms = await role.getPermissionNames();
    rolePerms.forEach(perm => permissions.add(perm));
  }
  
  return Array.from(permissions);
};

userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = Date.now();
  await this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;
