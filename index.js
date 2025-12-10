// index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ===== Middlewares =====
app.use(cors());
app.use(express.json());

// ===== Configuración de Mongo =====
// Usa la base ColdChainFleetUp y la colección telemetria.mst01
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI, {
    // estas opciones son seguras en Mongoose 7+
  })
  .then(() => {
    console.log('✔ Conectado a MongoDB Atlas');
  })
  .catch((err) => {
    console.error('✖ Error conectando a Mongo', err);
  });

// Definimos el esquema para los documentos de telemetría
const telemetrySchema = new mongoose.Schema(
  {
    deviceMac: { type: String, required: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: false },
    timestamp: { type: Date, required: true },
    raw: { type: Object }, // por si quieres guardar el json completo
  },
  {
    collection: 'mst01', // 👈 colección dentro de la base "telemetria"
  }
);

// Nota: en Atlas tu proyecto es "ColdChainFleetUp" y dentro tienes la DB "telemetria".
// Para forzar esa DB:
const TelemetryModel = mongoose.model('Telemetry', telemetrySchema, 'mst01');

// ===== Rutas =====

// Ruta simple para probar que el backend está vivo
app.get('/', (req, res) => {
  res.send('MST01 backend OK');
});

// 👇 ESTA es la ruta que llama tu app Android:
app.post('/api/telemetry', async (req, res) => {
  try {
    const payload = req.body;

    console.log('📥 Telemetría recibida:', payload);

    // Normalizamos campos
    const doc = {
      deviceMac: payload.deviceMac || 'UNKNOWN',
      temperature: payload.temperature,
      humidity:
        typeof payload.humidity === 'number'
          ? payload.humidity
          : undefined,
      timestamp: payload.timestamp
        ? new Date(payload.timestamp)
        : new Date(),
      raw: payload,
    };

    const saved = await TelemetryModel.create(doc);

    console.log('💾 Telemetría almacenada con _id:', saved._id);

    res.status(201).json({
      ok: true,
      id: saved._id,
    });
  } catch (err) {
    console.error('❌ Error guardando telemetría', err);
    res.status(500).json({
      ok: false,
      error: 'Error guardando telemetría',
    });
  }
});

// ===== Arranque del servidor =====
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🌡️ API MST01 escuchando en el puerto ${PORT}`);
});
