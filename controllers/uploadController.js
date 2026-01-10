// ============================================
// CONTROLADOR D'UPLOAD D'IMATGES
// ============================================

const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

// PUJAR IMATGE LOCALMENT
const uploadLocal = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No s\'ha enviat cap arxiu'
    });
  }

  const fileInfo = {
    filename: req.file.filename,
    path: `/uploads/${req.file.filename}`,
    url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
    size: req.file.size,
    mimetype: req.file.mimetype
  };

  res.status(200).json({
    success: true,
    message: 'Imatge pujada localment',
    image: fileInfo
  });
};

// PUJAR IMATGE A CLOUDINARY
const uploadCloud = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No s\'ha enviat cap arxiu'
    });
  }

  const filePath = req.file.path;

  cloudinary.uploader.upload(filePath, {
    folder: 'task-manager/images',
    resource_type: 'image'
  })
    .then(result => {
      fs.unlinkSync(filePath);

      const imageInfo = {
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes
      };

      res.status(200).json({
        success: true,
        message: 'Imatge pujada a Cloudinary',
        image: imageInfo
      });
    })
    .catch(error => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      res.status(500).json({
        success: false,
        message: 'Error al pujar la imatge a Cloudinary',
        error: error.message
      });
    });
};

module.exports = {
  uploadLocal,
  uploadCloud
};
