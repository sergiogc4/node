const Permission = require('../models/Permission');
const { validationResult } = require('express-validator');

/**
 * @desc    Crear nou permís
 * @route   POST /api/admin/permissions
 * @access  Private/Admin (permissions:manage)
 */
exports.createPermission = async (req, res) => {
  try {
    // Validar errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, description, category } = req.body;

    // Crear permís
    const permission = await Permission.create({
      name: name.toLowerCase(),
      description,
      category: category.toLowerCase()
    });

    res.status(201).json({
      success: true,
      message: 'Permís creat correctament',
      data: permission
    });
  } catch (error) {
    console.error('Error al crear permís:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Obtenir tots els permisos
 * @route   GET /api/admin/permissions
 * @access  Private/Admin (permissions:read)
 */
exports.getAllPermissions = async (req, res) => {
  try {
    const { category, page = 1, limit = 20, sort = 'name' } = req.query;
    
    // Construir query
    const query = {};
    if (category) {
      query.category = category.toLowerCase();
    }
    
    // Paginació
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Obtenir permisos
    const permissions = await Permission.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Comptar total
    const total = await Permission.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: permissions.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: permissions
    });
  } catch (error) {
    console.error('Error al obtenir permisos:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Obtenir categories de permisos
 * @route   GET /api/admin/permissions/categories
 * @access  Private/Admin (permissions:read)
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = await Permission.getCategories();
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Error al obtenir categories:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Actualitzar permís
 * @route   PUT /api/admin/permissions/:id
 * @access  Private/Admin (permissions:manage)
 */
exports.updatePermission = async (req, res) => {
  try {
    // Validar errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { description, category } = req.body;

    // Verificar si el permís existeix i no és del sistema
    const permission = await Permission.findById(id);
    if (!permission) {
      return res.status(404).json({
        success: false,
        error: 'Permís no trobat'
      });
    }

    // No permetre actualitzar permisos del sistema
    if (permission.isSystemPermission) {
      return res.status(403).json({
        success: false,
        error: 'No es pot actualitzar un permís del sistema'
      });
    }

    // Actualitzar camps
    const updateData = {};
    if (description) updateData.description = description;
    if (category) updateData.category = category.toLowerCase();

    const updatedPermission = await Permission.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Permís actualitzat correctament',
      data: updatedPermission
    });
  } catch (error) {
    console.error('Error al actualitzar permís:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Eliminar permís
 * @route   DELETE /api/admin/permissions/:id
 * @access  Private/Admin (permissions:manage)
 */
exports.deletePermission = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el permís existeix i no és del sistema
    const permission = await Permission.findById(id);
    if (!permission) {
      return res.status(404).json({
        success: false,
        error: 'Permís no trobat'
      });
    }

    // No permetre eliminar permisos del sistema
    if (permission.isSystemPermission) {
      return res.status(403).json({
        success: false,
        error: 'No es pot eliminar un permís del sistema'
      });
    }

    // Eliminar permís
    await Permission.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Permís eliminat correctament'
    });
  } catch (error) {
    console.error('Error al eliminar permís:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};

/**
 * @desc    Verificar si un permís existeix
 * @route   GET /api/admin/permissions/check/:name
 * @access  Private/Admin (permissions:read)
 */
exports.checkPermissionExists = async (req, res) => {
  try {
    const { name } = req.params;
    
    const permission = await Permission.findOne({ name: name.toLowerCase() });
    
    res.status(200).json({
      success: true,
      exists: !!permission,
      data: permission || null
    });
  } catch (error) {
    console.error('Error al verificar permís:', error);
    res.status(500).json({
      success: false,
      error: 'Error intern del servidor'
    });
  }
};
