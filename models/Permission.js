const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nom del permís és obligatori'],
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'La descripció és obligatòria'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'La categoria és obligatòria'],
    enum: ['tasks', 'users', 'roles', 'permissions', 'audit', 'reports', 'system'],
    trim: true,
    lowercase: true
  },
  isSystemPermission: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// Indexos per millorar rendiment
permissionSchema.index({ name: 1 }, { unique: true });
permissionSchema.index({ category: 1 });
permissionSchema.index({ isSystemPermission: 1 });

// Mètodes del model
permissionSchema.statics.findByName = function(name) {
  return this.findOne({ name: name.toLowerCase() });
};

permissionSchema.statics.findByCategory = function(category) {
  return this.find({ category: category.toLowerCase() });
};

permissionSchema.statics.getCategories = function() {
  return this.distinct('category');
};

const Permission = mongoose.model('Permission', permissionSchema);

module.exports = Permission;
