const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

/**
 * @desc    Obtenir tots els registres d'auditoria
 * @route   GET /api/admin/audit-logs
 * @access  Private/Admin (audit:read)
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const {
      userId,
      action,
      resource,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sort = '-timestamp'
    } = req.query;

    // Construir query
    const query = {};
    
    if (userId) {
      query.userId = userId;
    }
    
    if (action) {
      query.action = action;
    }
    
    if (resource) {
      query.resource = { $regex: resource, $options: 'i' };
    }
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    // Paginació
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Obtenir logs
    const logs = await AuditLog.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Comptar total
    const total = await AuditLog.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: logs
    });
  } catch (error) {
    console.error('Error al obtenir logs d\'auditoria:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Obtenir registre d'auditoria per ID
 * @route   GET /api/admin/audit-logs/:id
 * @access  Private/Admin (audit:read)
 */
exports.getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await AuditLog.findById(id);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Registre d\'auditoria no trobat'
      });
    }

    res.status(200).json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error al obtenir registre d\'auditoria:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Obtenir historial d'activitat d'un usuari
 * @route   GET /api/admin/audit-logs/user/:userId
 * @access  Private/Admin (audit:read)
 */
exports.getUserAuditLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verificar si l'usuari existeix
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuari no trobat'
      });
    }

    // Paginació
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Obtenir logs de l'usuari
    const logs = await AuditLog.find({ userId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Comptar total
    const total = await AuditLog.countDocuments({ userId });
    
    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      data: logs
    });
  } catch (error) {
    console.error('Error al obtenir logs d\'usuari:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Obtenir estadístiques d'auditoria
 * @route   GET /api/admin/audit-logs/stats
 * @access  Private/Admin (audit:read)
 */
exports.getAuditStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Construir query per dates si s'especifiquen
    const query = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    // Obtenir estadístiques
    const stats = await AuditLog.getStats(query);

    // Obtenir dades addicionals
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Accions d'avui
    const todayActions = await AuditLog.countDocuments({
      timestamp: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lte: new Date(today.setHours(23, 59, 59, 999))
      }
    });

    // Accions d'ahir
    const yesterdayActions = await AuditLog.countDocuments({
      timestamp: {
        $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
        $lte: new Date(yesterday.setHours(23, 59, 59, 999))
      }
    });

    // Percentatge de canvi
    const changePercent = yesterdayActions > 0 
      ? ((todayActions - yesterdayActions) / yesterdayActions) * 100 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        todayActions,
        yesterdayActions,
        changePercent: parseFloat(changePercent.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Error al obtenir estadístiques d\'auditoria:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Obtenir accions més comunes
 * @route   GET /api/admin/audit-logs/top-actions
 * @access  Private/Admin (audit:read)
 */
exports.getTopActions = async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;

    // Construir query
    const matchQuery = {};
    if (startDate || endDate) {
      matchQuery.timestamp = {};
      if (startDate) {
        matchQuery.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        matchQuery.timestamp.$lte = new Date(endDate);
      }
    }

    const topActions = await AuditLog.aggregate([
      { $match: matchQuery },
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.status(200).json({
      success: true,
      data: topActions.map(item => ({
        action: item._id,
        count: item.count
      }))
    });
  } catch (error) {
    console.error('Error al obtenir accions més comunes:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Obtenir usuaris més actius
 * @route   GET /api/admin/audit-logs/top-users
 * @access  Private/Admin (audit:read)
 */
exports.getTopUsers = async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;

    // Construir query
    const matchQuery = {};
    if (startDate || endDate) {
      matchQuery.timestamp = {};
      if (startDate) {
        matchQuery.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        matchQuery.timestamp.$lte = new Date(endDate);
      }
    }

    const topUsers = await AuditLog.aggregate([
      { $match: matchQuery },
      { 
        $group: { 
          _id: "$userId", 
          userName: { $first: "$userName" },
          count: { $sum: 1 } 
        } 
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Poblar informació d'usuari
    const usersWithInfo = await Promise.all(
      topUsers.map(async (item) => {
        const user = await User.findById(item._id).select('name email');
        return {
          userId: item._id,
          userName: item.userName || (user ? user.name : 'Unknown'),
          email: user ? user.email : null,
          count: item.count
        };
      })
    );

    res.status(200).json({
      success: true,
      data: usersWithInfo
    });
  } catch (error) {
    console.error('Error al obtenir usuaris més actius:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};
