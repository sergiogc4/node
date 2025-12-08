// ============================================
// MODEL DE TASCA - IN-MEMORY DATABASE
// ============================================

// Base de dades en memòria (array de tasques)
let tasks = [];
let currentId = 1;

// Imatge per defecte
const DEFAULT_IMAGE = 'http://localhost:3000/images/default-task.jpg';

// ============================================
// CLASSE TASK
// ============================================

class Task {
  constructor(data) {
    this.id = currentId++;
    this.title = data.title;
    this.description = data.description || '';
    this.completed = data.completed || false;
    this.cost = data.cost || 0;
    this.hours_estimated = data.hours_estimated || 0;
    this.hours_real = data.hours_real || 0;
    this.image = data.image || DEFAULT_IMAGE;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}

// ============================================
// MÈTODES DEL MODEL
// ============================================

const TaskModel = {
  
  // Obtenir totes les tasques
  getAll: () => {
    return new Promise((resolve) => {
      resolve(tasks);
    });
  },

  // Obtenir tasca per ID
  getById: (id) => {
    return new Promise((resolve, reject) => {
      const task = tasks.find(t => t.id === parseInt(id));
      if (task) {
        resolve(task);
      } else {
        reject(new Error('Tasca no trobada'));
      }
    });
  },

  // Crear nova tasca
  create: (taskData) => {
    return new Promise((resolve) => {
      const newTask = new Task(taskData);
      tasks.push(newTask);
      resolve(newTask);
    });
  },

  // Actualitzar tasca
  update: (id, taskData) => {
    return new Promise((resolve, reject) => {
      const index = tasks.findIndex(t => t.id === parseInt(id));
      
      if (index === -1) {
        reject(new Error('Tasca no trobada'));
        return;
      }

      // Actualitzar només els camps proporcionats
      tasks[index] = {
        ...tasks[index],
        ...taskData,
        id: tasks[index].id, // Mantenir l'ID original
        createdAt: tasks[index].createdAt, // Mantenir data creació
        updatedAt: new Date()
      };

      resolve(tasks[index]);
    });
  },

  // Eliminar tasca
  delete: (id) => {
    return new Promise((resolve, reject) => {
      const index = tasks.findIndex(t => t.id === parseInt(id));
      
      if (index === -1) {
        reject(new Error('Tasca no trobada'));
        return;
      }

      const deletedTask = tasks[index];
      tasks.splice(index, 1);
      resolve(deletedTask);
    });
  },

  // Restablir imatge per defecte
  resetImageToDefault: (id) => {
    return new Promise((resolve, reject) => {
      const index = tasks.findIndex(t => t.id === parseInt(id));
      
      if (index === -1) {
        reject(new Error('Tasca no trobada'));
        return;
      }

      tasks[index].image = DEFAULT_IMAGE;
      tasks[index].updatedAt = new Date();
      
      resolve(tasks[index]);
    });
  },

  // Obtenir estadístiques
  getStats: () => {
    return new Promise((resolve) => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));

      // Estadístiques bàsiques
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.completed).length;
      const pendingTasks = totalTasks - completedTasks;
      const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0;

      // Estadístiques econòmiques
      const totalCost = tasks.reduce((sum, t) => sum + (t.cost || 0), 0);
      const completedTasksCost = tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.cost || 0), 0);
      const pendingTasksCost = totalCost - completedTasksCost;
      const averageCostPerTask = totalTasks > 0 ? (totalCost / totalTasks).toFixed(2) : 0;

      // Estadístiques temporals
      const totalHoursEstimated = tasks.reduce((sum, t) => sum + (t.hours_estimated || 0), 0);
      const totalHoursReal = tasks.reduce((sum, t) => sum + (t.hours_real || 0), 0);
      const timeEfficiency = totalHoursEstimated > 0 ? ((totalHoursReal / totalHoursEstimated) * 100).toFixed(2) : 0;
      const hoursDifference = totalHoursReal - totalHoursEstimated;
      const hoursSaved = hoursDifference < 0 ? Math.abs(hoursDifference) : 0;

      // Estadístiques d'imatges
      const tasksWithDescription = tasks.filter(t => t.description && t.description.trim() !== '').length;
      const defaultImages = tasks.filter(t => t.image === DEFAULT_IMAGE).length;
      const customImages = totalTasks - defaultImages;
      const cloudinaryImages = tasks.filter(t => t.image.includes('cloudinary')).length;
      const localImages = tasks.filter(t => t.image.includes('/uploads/')).length;

      // Estadístiques recents
      const tasksThisMonth = tasks.filter(t => new Date(t.createdAt) >= startOfMonth).length;
      const tasksThisWeek = tasks.filter(t => new Date(t.createdAt) >= startOfWeek).length;
      const tasksToday = tasks.filter(t => new Date(t.createdAt) >= startOfDay).length;
      const completedThisMonth = tasks.filter(t => t.completed && new Date(t.updatedAt) >= startOfMonth).length;

      resolve({
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
      });
    });
  }
};

module.exports = TaskModel;
