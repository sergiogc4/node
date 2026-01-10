// ============================================
// MIDDLEWARE D'AUTENTICACIÓ JWT
// ============================================

const { verifyToken } = require('../utils/generateToken');
const User = require('../models/User');

/**
 * Middleware per autenticar usuaris mitjançant JWT
 */
const authenticate = async (req, res, next) => {
  try {
    // 1. Obtenir token dels headers
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No autoritzat. Token no proporcionat'
      });
    }

    // 2. Extreure token (eliminar 'Bearer ')
    const token = authHeader.split(' ')[1];

    // 3. Verificar token
    const decoded = verifyToken(token);

    // 4. Buscar usuari a la base de dades (sense la contrasenya)
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuari no trobat o token invàlid'
      });
    }

    // 5. Afegir usuari a la request
    req.user = user;

    // 6. Continuar
    next();
  } catch (error) {
    // Errors específics de JWT
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token invàlid'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirat'
      });
    }

    // Altres errors
    console.error('❌ Error de autenticació:', error);
    res.status(500).json({
      success: false,
      error: 'Error del servidor en autenticació'
    });
  }
};

module.exports = authenticate;