const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const checkPermission = require('../middleware/checkPermission');

// Totes les rutes requereixen autenticació i permisos d'admin
router.use(checkPermission('audit:read'));

// @route   GET /api/admin/audit-logs
// @desc    Obtenir tots els registres d'auditoria
// @access  Private/Admin (audit:read)
router.get('/', auditController.getAuditLogs);

// @route   GET /api/admin/audit-logs/:id
// @desc    Obtenir registre d'auditoria per ID
// @access  Private/Admin (audit:read)
router.get('/:id', auditController.getAuditLogById);

// @route   GET /api/admin/audit-logs/user/:userId
// @desc    Obtenir historial d'activitat d'un usuari
// @access  Private/Admin (audit:read)
router.get('/user/:userId', auditController.getUserAuditLogs);

// @route   GET /api/admin/audit-logs/stats
// @desc    Obtenir estadístiques d'auditoria
// @access  Private/Admin (audit:read)
router.get('/stats', auditController.getAuditStats);

// @route   GET /api/admin/audit-logs/top-actions
// @desc    Obtenir accions més comunes
// @access  Private/Admin (audit:read)
router.get('/top-actions', auditController.getTopActions);

// @route   GET /api/admin/audit-logs/top-users
// @desc    Obtenir usuaris més actius
// @access  Private/Admin (audit:read)
router.get('/top-users', auditController.getTopUsers);

module.exports = router;
