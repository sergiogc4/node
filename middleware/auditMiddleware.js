const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

/**
 * Middleware per registrar automàticament accions a l'auditoria
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const auditMiddleware = async (req, res, next) => {
  // Obtenir IP de l'usuari
  const getClientIp = (req) => {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
  };

  // Obtenir ruta com a nom de recurs
  const getResourceFromRoute = (req) => {
    const baseUrl = req.baseUrl || '';
    const path = req.route?.path || '';
    return `${baseUrl}${path}`.replace(/\/\//g, '/');
  };

  // Determinar tipus de recurs basat en la ruta
  const getResourceType = (req) => {
    const path = req.path.toLowerCase();
    if (path.includes('/tasks')) return 'task';
    if (path.includes('/users')) return 'user';
    if (path.includes('/roles')) return 'role';
    if (path.includes('/permissions')) return 'permission';
    if (path.includes('/audit')) return 'audit';
    if (path.includes('/reports')) return 'report';
    return 'other';
  };

  // Determinar acció basada en mètode HTTP
  const getActionFromMethod = (req) => {
    const method = req.method.toLowerCase();
    const resource = getResourceType(req);
    
    switch (method) {
      case 'get':
        return `${resource}:read`;
      case 'post':
        return `${resource}:create`;
      case 'put':
      case 'patch':
        return `${resource}:update`;
      case 'delete':
        return `${resource}:delete`;
      default:
        return `${resource}:${method}`;
    }
  };

  // Capturar dades originals per a operacions PUT/DELETE
  let originalData = null;
  if (['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (req.params.id && req.body) {
      originalData = { ...req.body };
    }
  }

  // Crear objecte d'auditoria bàsic
  const auditData = {
    userId: req.user?._id || null,
    userName: req.user?.name || 'Anonymous',
    action: getActionFromMethod(req),
    resource: getResourceFromRoute(req),
    resourceType: getResourceType(req),
    status: 'pending',
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'Unknown',
    timestamp: new Date()
  };

  // Guardar referència a l'objecte d'auditoria per ús posterior
  req.auditLog = auditData;

  // Guardar funció original de res.json per interceptar resposta
  const originalJson = res.json;
  
  res.json = function(data) {
    // Actualitzar estat d'auditoria basat en resposta
    if (req.auditLog && typeof req.auditLog === 'object') {
      req.auditLog.status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'error';
      
      // Capturar missatge d'error si n'hi ha
      if (req.auditLog.status === 'error' && data && data.error) {
        req.auditLog.errorMessage = data.error;
      }
      
      // Capturar canvis per a operacions PUT/PATCH
      if (['PUT', 'PATCH'].includes(req.method) && originalData && req.body) {
        const changes = {};
        for (const key in req.body) {
          if (originalData[key] !== undefined && originalData[key] !== req.body[key]) {
            changes[key] = `${originalData[key]} → ${req.body[key]}`;
          }
        }
        if (Object.keys(changes).length > 0) {
          req.auditLog.changes = changes;
        }
      }
      
      // Guardar registre d'auditoria (de forma asíncrona per no bloquear resposta)
      AuditLog.log(req.auditLog).catch(err => {
        console.error('Error al guardar registre d\'auditoria:', err);
      });
    }
    
    // Cridar funció original
    return originalJson.call(this, data);
  };

  next();
};

/**
 * Middleware per registrar accions específiques
 * @param {string} action - Acció personalitzada
 * @returns {Function} Middleware function
 */
const auditAction = (action) => {
  return async (req, res, next) => {
    // Sobreescriure acció amb valor personalitzat
    if (req.auditLog) {
      req.auditLog.action = action;
    }
    next();
  };
};

module.exports = { auditMiddleware, auditAction };
