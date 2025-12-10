// index.js - Backend MST01 con MongoDB Atlas

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();

// ===== Middlewares =====
app.use(cors());
app.use(express.json());

// ===== Configuración MongoDB =====
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME || 'telemetria';  // puedes cambiarlo
const COLLECTION_NAME = process.env.MONGO_COLLECTION || 'mst01';

if (!MONGO_URI) {
  console.error('❌ Falta la variable de entorno MONGO_URI');
  process.exit(1);
}

let telemetryCollection;

// Conexión a MongoDB Atlas
async function connectMongo() {
  try {
    console.log('🔌 Conectando a MongoDB Atlas...');
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    telemetryCollection = db.collection(COLLECTION_NAME);
    console.log(`✅ Conectado a MongoDB. DB="${DB_NAME}", Collection="${COLLECTION_NAME}"`);
  } catch (err) {
    console.error('❌ Error conectando a Mongo:', err);
    process.exit(1);
  }
}

// ===== RUTAS =====

// Health-check
app.get('/', (req, res) => {
  res.send('MST01 backend con MongoDB OK');
});

// Ruta de prueba rápida
app.get('/api/telemetry/ping', (req, res) => {
  res.json({ ok: true, message: 'PONG desde backend MST01' });
});

// 🚨 Ruta donde pega tu app Android
app.post('/api/telemetry', async (req, res) => {
  try {
    if (!telemetryCollection) {
      return res.status(500).json({ ok: false, error: 'BD no inicializada' });
    }

    const payload = req.body;
    console.log('📥 Telemetría recibida desde app:', payload);

    const { deviceMac, temperature, humidity, timestamp } = payload;

    if (typeof deviceMac !== 'string' || typeof temperature !== 'number') {
      return res.status(400).json({
        ok: false,
        error: 'deviceMac (string) y temperature (number) son obligatorios',
      });
    }

    const now = new Date();

    const doc = {
      deviceMac,
      temperature,
      humidity: typeof humidity === 'number' ? humidity : null,
      timestamp: timestamp ? new Date(timestamp) : now, // tiempo enviado por el teléfono
      receivedAt: now,                                  // tiempo en que llegó al backend
      raw: payload,                                     // payload completo para referencia
    };

    const result = await telemetryCollection.insertOne(doc);

    console.log('💾 Telemetría guardada con _id:', result.insertedId);

    res.status(201).json({
      ok: true,
      id: result.insertedId,
    });
  } catch (err) {
    console.error('❌ Error en POST /api/telemetry:', err);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
});

// Endpoint para ver los últimos N registros
app.get('/api/telemetry/last', async (req, res) => {
  try {
    if (!telemetryCollection) {
      return res.status(500).json({ ok: false, error: 'BD no inicializada' });
    }

    const limit = parseInt(req.query.limit || '20', 10);

    const docs = await telemetryCollection
      .find({})
      .sort({ receivedAt: -1 })
      .limit(limit)
      .toArray();

    res.json({ ok: true, count: docs.length, data: docs });
  } catch (err) {
    console.error('❌ Error en GET /api/telemetry/last:', err);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
});

// ===== ARRANCAR SERVIDOR =====
const PORT = process.env.PORT || 10000;

connectMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`🌡️ API MST01 escuchando en el puerto ${PORT}`);
  });
});
