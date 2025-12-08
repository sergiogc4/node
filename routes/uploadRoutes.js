// ============================================
// RUTES D'UPLOAD D'IMATGES
// ============================================

const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { uploadLocal, handleMulterError: handleLocalError } = require('../middleware/uploadLocal');
const { uploadCloud, handleMulterError: handleCloudError } = require('../middleware/uploadCloud');

// ============================================
// RUTES D'UPLOAD
// ============================================

// POST /api/upload/local - Pujar imatge localment
router.post('/local', 
  uploadLocal.single('image'), 
  handleLocalError,
  uploadController.uploadLocal
);

// POST /api/upload/cloud - Pujar imatge a Cloudinary
router.post('/cloud', 
  uploadCloud.single('image'), 
  handleCloudError,
  uploadController.uploadCloud
);

// ============================================
// EXPORTAR ROUTER
// ============================================

module.exports = router;
