// index.js - versión mínima para probar el endpoint

const express = require('express');
const app = express();

// Para que Express pueda leer JSON del body
app.use(express.json());

// Ruta simple para comprobar que el servidor está vivo
app.get('/', (req, res) => {
  res.send('MST01 backend SIMPLE OK');
});

// 🚨 ESTA ES LA RUTA QUE LLAMA TU APP: POST /api/telemetry
app.post('/api/telemetry', (req, res) => {
  console.log('📥 Payload recibido desde la app:', req.body);

  // Respondemos con 201 (creado) para que el worker lo considere éxito
  res.status(201).json({
    ok: true,
    message: 'Telemetría recibida (backend mínimo)',
    received: req.body,
  });
});

// Arrancar servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Backend MST01 escuchando en puerto ${PORT}`);
});
