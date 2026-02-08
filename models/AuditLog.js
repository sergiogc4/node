const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    trim: true
  },
  action: {
    type: String,
    required: [true, 'L\'acció és obligatòria'],
    trim: true
  },
  resource: {
    type: String,
    trim: true
  },
  resourceType: {
    type: String,
    enum: ['task', 'user', 'role', 'permission', 'audit', 'report', 'system', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['success', 'error'],
    required: true
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  errorMessage: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Indexos per millorar rendiment
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ resource: 1 });
auditLogSchema.index({ status: 1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });

// Mètodes estàtics del model
auditLogSchema.statics.log = async function(data) {
  try {
    const auditLog = new this(data);
    return await auditLog.save();
  } catch (error) {
    console.error('Error al registrar auditoria:', error);
    return null;
  }
};

auditLogSchema.statics.getByUser = function(userId, limit = 50, skip = 0) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

auditLogSchema.statics.getByAction = function(action, limit = 50, skip = 0) {
  return this.find({ action })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

auditLogSchema.statics.getStats = async function() {
  const totalActions = await this.countDocuments();
  
  const successCount = await this.countDocuments({ status: 'success' });
  const successRate = totalActions > 0 ? (successCount / totalActions) * 100 : 0;
  
  const topActions = await this.aggregate([
    { $group: { _id: "$action", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  
  const topUsers = await this.aggregate([
    { 
      $group: { 
        _id: "$userId", 
        userName: { $first: "$userName" },
        count: { $sum: 1 } 
      } 
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  
  const recentErrors = await this.aggregate([
    { $match: { status: 'error' } },
    { $group: { 
        _id: { action: "$action", error: "$errorMessage" }, 
        count: { $sum: 1 } 
      } 
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  
  return {
    totalActions,
    successRate: parseFloat(successRate.toFixed(2)),
    topActions: topActions.map(item => ({ action: item._id, count: item.count })),
    topUsers: topUsers.map(item => ({ 
      userId: item._id, 
      userName: item.userName, 
      count: item.count 
    })),
    recentErrors: recentErrors.map(item => ({
      action: item._id.action,
      error: item._id.error,
      count: item.count
    }))
  };
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
