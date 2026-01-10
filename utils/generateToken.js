// ============================================
// UTILITAT PER GENERAR TOKENS JWT
// ============================================

const jwt = require('jsonwebtoken');

/**
 * Genera un token JWT per a un usuari
 * @param {Object} user - Objecte d'usuari
 * @param {String} user._id - ID de l'usuari
 * @param {String} user.email - Email de l'usuari
 * @param {String} user.role - Rol de l'usuari
 * @returns {String} Token JWT
 */
const generateToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role
  };

  // Generar token amb les variables d'entorn
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

/**
 * Verifica un token JWT
 * @param {String} token - Token JWT a verificar
 * @returns {Object} Payload del token verificat
 * @throws {Error} Si el token és invàlid
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken
};