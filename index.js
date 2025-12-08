// ============================================
// SERVIDOR PRINCIPAL - GESTOR DE TASQUES API
// ============================================

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables d'entorn
dotenv.config();

// Importar rutes
const taskRoutes = require('./routes/taskRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// Crear aplicació Express
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARES GLOBALS
// ============================================

// CORS - Permetre peticions des de qualsevol origen
app.use(cors());

// Morgan - Log de peticions HTTP
app.use(morgan('dev'));

// Body Parser - Parsejar JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// SERVIR IMATGES ESTÀTIQUES
// ============================================

// Servir imatges locals des de /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Servir imatges per defecte des de /images
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// ============================================
// RUTES DE L'API
// ============================================

// Ruta de benvinguda
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Gestor de Tasques - Funcionant correctament! 🚀',
    version: '1.0.0',
    endpoints: {
      tasks: '/api/tasks',
      upload: '/api/upload',
      images: '/uploads o /images'
    }
  });
});

// Rutes principals
app.use('/api/tasks', taskRoutes);
app.use('/api/upload', uploadRoutes);

// ============================================
// GESTIÓ D'ERRORS 404
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no trobada: ${req.method} ${req.url}`
  });
});

// ============================================
// GESTIÓ D'ERRORS GLOBALS
// ============================================

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error intern del servidor',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║   🚀 SERVIDOR INICIAT CORRECTAMENT    ║
  ╠════════════════════════════════════════╣
  ║  📍 Port: ${PORT}                        ║
  ║  🌐 URL: http://localhost:${PORT}       ║
  ║  📁 Imatges: http://localhost:${PORT}/uploads ║
  ╚════════════════════════════════════════╝
  `);
});

module.exports = app;
