const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nom del rol és obligatori'],
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'La descripció és obligatòria'],
    trim: true
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
    required: true
  }],
  isSystemRole: {
    type: Boolean,
    default: false
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
  timestamps: false
});

// Indexos per millorar rendiment
roleSchema.index({ name: 1 }, { unique: true });
roleSchema.index({ isSystemRole: 1 });
roleSchema.index({ permissions: 1 });

// Mètodes del model
roleSchema.methods.addPermission = async function(permissionId) {
  if (!this.permissions.includes(permissionId)) {
    this.permissions.push(permissionId);
    await this.save();
  }
  return this;
};

roleSchema.methods.removePermission = async function(permissionId) {
  const index = this.permissions.indexOf(permissionId);
  if (index > -1) {
    this.permissions.splice(index, 1);
    await this.save();
  }
  return this;
};

roleSchema.methods.hasPermission = async function(permissionName) {
  await this.populate('permissions');
  return this.permissions.some(perm => perm.name === permissionName);
};

roleSchema.methods.getPermissionNames = async function() {
  await this.populate('permissions');
  return this.permissions.map(perm => perm.name);
};

// Middleware per actualitzar updatedAt
roleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;
