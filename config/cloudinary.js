// ============================================
// CONFIGURACIÓ DE CLOUDINARY
// ============================================

const cloudinary = require('cloudinary').v2;

// Configurar Cloudinary amb les credencials del .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Verificar configuració
console.log('📦 Cloudinary configurat correctament');

// Exportar instància configurada
module.exports = cloudinary;
