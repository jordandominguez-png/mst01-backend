// index.js
require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

// ====== CONFIG BÁSICA ======
const PORT = process.env.PORT || 10000; // Render pondrá su propio puerto
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ Falta la variable de entorno MONGO_URI');
  process.exit(1);
}

// En Atlas tu DB es "telemetria" y la colección "mst01"
const DB_NAME = process.env.MONGO_DB_NAME || 'telemetria';
const COLLECTION_NAME = process.env.MONGO_COLLECTION || 'mst01';

// Middlewares
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

let telemetryCollection;

// ====== CONEXIÓN A MONGODB ATLAS ======
async function connectToMongo() {
  try {
    console.log('🔌 Conectando a MongoDB Atlas...');
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    telemetryCollection = db.collection(COLLECTION_NAME);
    console.log(
      `✅ Conectado a MongoDB Atlas. DB="${DB_NAME}", Collection="${COLLECTION_NAME}"`
    );
  } catch (err) {
    console.error('❌ Error conectando a Mongo:', err);
    process.exit(1);
  }
}

// ====== ENDPOINTS ======

// Health-check simple
app.get('/', (req, res) => {
  res.send('API MST01 OK ✔️');
});

// Otra ruta de prueba rápida (útil para probar desde el navegador)
app.get('/api/telemetry/ping', (req, res) => {
  res.json({ ok: true, message: 'PONG desde backend MST01' });
});

// 👉 Endpoint donde pega la app Android
app.post('/api/telemetry', async (req, res) => {
  try {
    if (!telemetryCollection) {
      return res
        .status(500)
        .json({ error: 'BD no inicializada todavía' });
    }

    const { deviceMac, temperature, humidity, timestamp } = req.body;

    if (!deviceMac || typeof temperature === 'undefined') {
      return res.status(400).json({
        error: 'Campos requeridos: deviceMac y temperature',
      });
    }

    const now = new Date();

    const doc = {
      deviceMac,
      temperature,
      humidity: typeof humidity === 'number' ? humidity : null,
      timestamp: timestamp ? new Date(timestamp) : now, // del dispositivo
      receivedAt: now, // cuándo lo recibió el backend
    };

    const result = await telemetryCollection.insertOne(doc);

    res.status(201).json({
      ok: true,
      id: result.insertedId,
    });
  } catch (err) {
    console.error('❌ Error en POST /api/telemetry:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para ver los últimos N registros (debug rápido)
app.get('/api/telemetry/last', async (req, res) => {
  try {
    if (!telemetryCollection) {
      return res
        .status(500)
        .json({ error: 'BD no inicializada todavía' });
    }

    const limit = parseInt(req.query.limit || '20', 10);

    const docs = await telemetryCollection
      .find({})
      .sort({ receivedAt: -1 })
      .limit(limit)
      .toArray();

    res.json(docs);
  } catch (err) {
    console.error('❌ Error en GET /api/telemetry/last:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ====== ARRANCAR SERVIDOR ======
connectToMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`🌡️ API MST01 escuchando en el puerto ${PORT}`);
  });
});
