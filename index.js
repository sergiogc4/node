// ============================================
// SERVIDOR PRINCIPAL - GESTOR DE TASQUES API
// ============================================

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Cargar variables d'entorn
dotenv.config();

// Importar rutes
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Crear aplicació Express
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CONNEXIÓ A MONGODB
// ============================================

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gestor-tasques', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connectat correctament'))
.catch(err => {
  console.error('❌ Error connectant a MongoDB:', err);
  process.exit(1);
});

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
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        profile: 'PUT /api/auth/profile',
        changePassword: 'PUT /api/auth/change-password'
      },
      tasks: '/api/tasks',
      upload: '/api/upload',
      admin: {
        users: 'GET /api/admin/users',
        tasks: 'GET /api/admin/tasks'
      },
      images: '/uploads o /images'
    },
    protectedEndpoints: 'Les rutes /api/tasks, /api/upload i /api/admin requereixen autenticació'
  });
});

// Rutes principals
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);

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
  
  // Error de MongoDB (duplicat)
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      error: 'Email ja registrat'
    });
  }

  // Error de validació de Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    
    return res.status(400).json({
      success: false,
      errors
    });
  }

  // Error de cast de MongoDB (ID invàlid)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'ID invàlid'
    });
  }

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
  ╔══════════════════════════════════════════════════════════════════╗
  ║   🚀 SERVIDOR INICIAT CORRECTAMENT                              ║
  ╠══════════════════════════════════════════════════════════════════╣
  ║  📍 Port: ${PORT}                                                ║
  ║  🌐 URL: http://localhost:${PORT}                                 ║
  ║  📁 MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/gestor-tasques'} ║
  ║  🔐 Sistema d'autenticació: ACTIU                                ║
  ╚══════════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;