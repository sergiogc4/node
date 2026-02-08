const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Si us plau, afegeix un títol'],
    trim: true,
    maxlength: [100, 'El títol no pot tenir més de 100 caràcters']
  },
  description: {
    type: String,
    required: [true, 'Si us plau, afegeix una descripció'],
    maxlength: [500, 'La descripció no pot tenir més de 500 caràcters']
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  dueDate: {
    type: Date
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  completedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexos per millorar rendiment
TaskSchema.index({ status: 1 });
TaskSchema.index({ priority: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ createdAt: -1 });

// Virtual per calcular si està endarrerida
TaskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate) return false;
  return this.status !== 'completed' && new Date() > this.dueDate;
});

// Middleware per actualizar completedAt
TaskSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  if (this.isModified('status') && this.status !== 'completed' && this.completedAt) {
    this.completedAt = null;
  }
  next();
});

// Mètode per verificar permisos
TaskSchema.methods.canView = async function(userId) {
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  
  // Admin pot veure tot
  if (await user.hasPermission('tasks:read')) {
    return true;
  }
  
  // Usuaris normals només poden veure les seves tasques
  return this.createdBy.toString() === userId.toString() || 
         this.assignedTo?.toString() === userId.toString();
};

TaskSchema.methods.canEdit = async function(userId) {
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  
  // Admin pot editar tot
  if (await user.hasPermission('tasks:update')) {
    return true;
  }
  
  // Usuaris normals només poden editar les seves tasques
  return this.createdBy.toString() === userId.toString();
};

TaskSchema.methods.canDelete = async function(userId) {
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  
  // Admin pot eliminar tot
  if (await user.hasPermission('tasks:delete')) {
    return true;
  }
  
  // Usuaris normals només poden eliminar les seves tasques
  return this.createdBy.toString() === userId.toString();
};

module.exports = mongoose.model('Task', TaskSchema);
