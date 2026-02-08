const Permission = require('../models/Permission');

/**
 * Middleware per verificar si l'usuari té un permís específic
 * @param {string} requiredPermission - Nom del permís requerit
 * @returns {Function} Middleware function
 */
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // Verificar si hi ha usuari autenticat
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'No autenticat'
        });
      }

      // Verificar si el permís existeix a la base de dades
      const permissionExists = await Permission.findOne({ name: requiredPermission });
      if (!permissionExists) {
        return res.status(400).json({
          success: false,
          error: `El permís '${requiredPermission}' no existeix`
        });
      }

      // Verificar si l'usuari té el permís
      const hasPermission = await req.user.hasPermission(requiredPermission);
      
      if (!hasPermission) {
        // Registrar intent d'accés denegat a l'auditoria
        if (req.auditLog) {
          req.auditLog.status = 'error';
          req.auditLog.errorMessage = `Permís denegat: ${requiredPermission}`;
          await req.auditLog.save();
        }
        
        return res.status(403).json({
          success: false,
          error: `No tens permís per realitzar aquesta acció`,
          permission: requiredPermission
        });
      }

      // Afegir informació del permís a la petició
      req.permission = requiredPermission;
      
      next();
    } catch (error) {
      console.error('Error en checkPermission middleware:', error);
      res.status(500).json({
        success: false,
        error: 'Error intern del servidor'
      });
    }
  };
};

module.exports = checkPermission;
