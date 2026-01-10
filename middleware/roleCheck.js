// ============================================
// MIDDLEWARE DE VERIFICACIÓ DE ROL
// ============================================

/**
 * Middleware per verificar si l'usuari té el rol adequat
 * @param {Array} roles - Array de rols permesos
 */
const roleCheck = (roles) => {
  return (req, res, next) => {
    // 1. Verificar que l'usuari està autenticat
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'No autoritzat. Usuari no autenticat'
      });
    }

    // 2. Verificar que l'usuari té un dels rols permesos
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'No tens permisos per accedir a aquest recurs'
      });
    }

    // 3. Continuar
    next();
  };
};

module.exports = roleCheck;