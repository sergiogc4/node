const express = require('express');
const app = express();
const PORT = 3001;

app.use(express.json());

// Ruta de prueba sin MongoDB
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando (modo de prueba)',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Faltan campos requeridos'
    });
  }
  
  res.status(201).json({
    success: true,
    message: 'Usuario registrado (modo de prueba)',
    data: {
      user: {
        id: 'test-id',
        name,
        email,
        roles: ['user', 'admin']
      },
      token: 'test-jwt-token-123456'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de prueba funcionando en http://localhost:${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});
