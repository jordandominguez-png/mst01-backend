require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

const app = express();
app.use(bodyParser.json());

let db;

// Conexión a MongoDB Atlas
MongoClient.connect(process.env.MONGODB_URI)
  .then(client => {
    db = client.db();
    console.log('✔ Conectado a MongoDB Atlas');
  })
  .catch(err => console.error('✖ Error conectando a Mongo', err));

// Endpoint para recibir lecturas del MST01
app.post('/mst01', async (req, res) => {
  try {
    const { deviceMac, temperature, humidity, timestamp } = req.body;

    const doc = {
      deviceMac,
      temperature,
      humidity,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      createdAt: new Date()
    };

    await db.collection('mst01').insertOne(doc);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// Endpoint para consultar lecturas (BI)
app.get('/mst01', async (req, res) => {
  const docs = await db.collection('mst01')
    .find()
    .sort({ createdAt: -1 })
    .limit(1000)
    .toArray();

  res.json(docs);
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌡️ API MST01 escuchando en el puerto ${PORT}`);
});