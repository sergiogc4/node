// ============================================
// MIDDLEWARE MULTER - UPLOAD LOCAL
// ============================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================
// CONFIGURACIÓ D'EMMAGATZEMATGE LOCAL
// ============================================

const storage = multer.diskStorage({
  // Definir destinació dels arxius
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    
    // Crear carpeta si no existeix
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  
  // Definir nom dels arxius (únic)
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// ============================================
// FILTRE D'ARXIUS (només imatges)
// ============================================

const fileFilter = (req, file, cb) => {
  // Extensions permeses
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  
  // Tipus MIME permesos
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;
  
  // Validar extensió i tipus MIME
  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(mimeType)) {
    cb(null, true);
  } else {
    cb(new Error('Tipus d\'arxiu no permès. Només s\'accepten imatges (jpg, png, gif, webp, bmp)'), false);
  }
};

// ============================================
// CONFIGURACIÓ DE MULTER
// ============================================

const uploadLocal = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Màxim 5MB
  }
});

// ============================================
// GESTIÓ D'ERRORS DE MULTER
// ============================================

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Errors específics de Multer
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'L\'arxiu supera la mida màxima permesa de 5MB'
      });
    }
    
    return res.status(400).json({
      success: false,
      message: `Error de Multer: ${err.message}`
    });
  } else if (err) {
    // Altres errors (com el del fileFilter)
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next();
};

// ============================================
// EXPORTAR
// ============================================

module.exports = {
  uploadLocal,
  handleMulterError
};
