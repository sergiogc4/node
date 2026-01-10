// ============================================
// MODEL DE TASCA - MONGODB
// ============================================

const mongoose = require('mongoose');

// ============================================
// ESQUEMA DE TASCA
// ============================================

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'El títol és obligatori'],
    trim: true,
    maxlength: [100, 'El títol no pot tenir més de 100 caràcters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripció no pot tenir més de 500 caràcters'],
    default: ''
  },
  completed: {
    type: Boolean,
    default: false
  },
  cost: {
    type: Number,
    min: [0, 'El cost no pot ser negatiu'],
    default: 0
  },
  hours_estimated: {
    type: Number,
    min: [0, 'Les hores estimades no poden ser negatives'],
    default: 0
  },
  hours_real: {
    type: Number,
    min: [0, 'Les hores reals no poden ser negatives'],
    default: 0
  },
  image: {
    type: String,
    default: 'http://localhost:3000/images/default-task.jpg'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'La tasca ha de tenir un usuari assignat'],
    index: true
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
// ÍNDEXS PER MILLORAR RENDIMENT
// ============================================

taskSchema.index({ user: 1, createdAt: -1 }); // Cerca per usuari i data
taskSchema.index({ user: 1, completed: 1 }); // Cerca per usuari i estat

// ============================================
// MÈTODES DE L'ESQUEMA
// ============================================

// Mètode per calcular estadístiques
taskSchema.statics.getStats = async function(userId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  // Filtrar per usuari
  const query = { user: userId };

  // Estadístiques bàsiques
  const totalTasks = await this.countDocuments(query);
  const completedTasks = await this.countDocuments({ ...query, completed: true });
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0;

  // Estadístiques econòmiques
  const financialAggregation = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalCost: { $sum: '$cost' },
        completedCost: {
          $sum: {
            $cond: [{ $eq: ['$completed', true] }, '$cost', 0]
          }
        }
      }
    }
  ]);

  const totalCost = financialAggregation[0]?.totalCost || 0;
  const completedTasksCost = financialAggregation[0]?.completedCost || 0;
  const pendingTasksCost = totalCost - completedTasksCost;
  const averageCostPerTask = totalTasks > 0 ? (totalCost / totalTasks).toFixed(2) : 0;

  // Estadístiques temporals
  const timeAggregation = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalHoursEstimated: { $sum: '$hours_estimated' },
        totalHoursReal: { $sum: '$hours_real' }
      }
    }
  ]);

  const totalHoursEstimated = timeAggregation[0]?.totalHoursEstimated || 0;
  const totalHoursReal = timeAggregation[0]?.totalHoursReal || 0;
  const timeEfficiency = totalHoursEstimated > 0 ? ((totalHoursReal / totalHoursEstimated) * 100).toFixed(2) : 0;
  const hoursDifference = totalHoursReal - totalHoursEstimated;
  const hoursSaved = hoursDifference < 0 ? Math.abs(hoursDifference) : 0;

  // Estadístiques d'imatges
  const imageStats = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$image', 'http://localhost:3000/images/default-task.jpg'] },
            'default',
            {
              $cond: [
                { $regexMatch: { input: '$image', regex: /cloudinary/ } },
                'cloudinary',
                'local'
              ]
            }
          ]
        },
        count: { $sum: 1 }
      }
    }
  ]);

  const defaultImages = imageStats.find(s => s._id === 'default')?.count || 0;
  const cloudinaryImages = imageStats.find(s => s._id === 'cloudinary')?.count || 0;
  const localImages = imageStats.find(s => s._id === 'local')?.count || 0;
  const customImages = cloudinaryImages + localImages;

  // Tasques amb descripció
  const tasksWithDescription = await this.countDocuments({
    ...query,
    description: { $exists: true, $ne: '' }
  });

  // Estadístiques recents
  const tasksThisMonth = await this.countDocuments({
    ...query,
    createdAt: { $gte: startOfMonth }
  });

  const tasksThisWeek = await this.countDocuments({
    ...query,
    createdAt: { $gte: startOfWeek }
  });

  const tasksToday = await this.countDocuments({
    ...query,
    createdAt: { $gte: startOfDay }
  });

  const completedThisMonth = await this.countDocuments({
    ...query,
    completed: true,
    updatedAt: { $gte: startOfMonth }
  });

  return {
    overview: {
      totalTasks,
      completedTasks,
      pendingTasks,
      completionRate: parseFloat(completionRate)
    },
    financial: {
      totalCost,
      completedTasksCost,
      pendingTasksCost,
      averageCostPerTask: parseFloat(averageCostPerTask)
    },
    time: {
      totalHoursEstimated,
      totalHoursReal,
      timeEfficiency: parseFloat(timeEfficiency),
      hoursSaved
    },
    recent: {
      tasksThisMonth,
      completedThisMonth,
      tasksThisWeek,
      tasksToday
    },
    misc: {
      tasksWithDescription,
      customImages,
      defaultImages,
      imageStats: {
        cloudinaryImages,
        localImages,
        defaultImages
      }
    }
  };
};

// ============================================
// CREAR I EXPORTAR MODEL
// ============================================

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;