const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Obtenir token del header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Accés denegat. No hi ha token.'
      });
    }
    
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key-aqui');
    
    // Buscar usuari
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Accés denegat. Usuari no trobat.'
      });
    }
    
    // Verificar si l'usuari està actiu
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Accés denegat. Compte desactivat.'
      });
    }
    
    // Actualitzar últim login
    user.updateLastLogin().catch(console.error);
    
    // Afegir usuari a la petició
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Error d\'autenticació:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Accés denegat. Token invàlid.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Accés denegat. Token expirat.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

module.exports = auth;
