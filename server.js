const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET all coordinates (with optional filters)
app.get('/api/coordinates', (req, res) => {
  const { dimension, category, search } = req.query;
  const results = db.getAll({ dimension, category, search });
  res.json(results);
});

// GET single coordinate
app.get('/api/coordinates/:id', (req, res) => {
  const coord = db.getById(req.params.id);
  if (!coord) return res.status(404).json({ error: '見つかりませんでした' });
  res.json(coord);
});

// POST new coordinate
app.post('/api/coordinates', (req, res) => {
  const { name, x, y, z, dimension, category, author, notes } = req.body;

  if (!name || x === undefined || z === undefined) {
    return res.status(400).json({ error: '名前と座標(X/Z)は必須です' });
  }

  const parsedX = parseInt(x);
  const parsedY = parseInt(y ?? 64);
  const parsedZ = parseInt(z);

  if (isNaN(parsedX) || isNaN(parsedZ)) {
    return res.status(400).json({ error: '座標は整数で入力してください' });
  }

  const validDimensions = ['overworld', 'nether', 'end'];
  const validDim = validDimensions.includes(dimension) ? dimension : 'overworld';

  const coord = db.create({
    name: name.trim(),
    x: parsedX,
    y: parsedY,
    z: parsedZ,
    dimension: validDim,
    category: category || 'その他',
    author: author ? author.trim() : 'anonymous',
    notes: notes ? notes.trim() : '',
  });

  res.status(201).json(coord);
});

// PUT (edit) coordinate
app.put('/api/coordinates/:id', (req, res) => {
  const { name, x, z, dimension, category, notes } = req.body;

  if (!name || x === undefined || z === undefined) {
    return res.status(400).json({ error: '名前と座標(X/Z)は必須です' });
  }

  const parsedX = parseInt(x);
  const parsedZ = parseInt(z);
  if (isNaN(parsedX) || isNaN(parsedZ)) {
    return res.status(400).json({ error: '座標は整数で入力してください' });
  }

  const validDimensions = ['overworld', 'nether', 'end'];
  const validDim = validDimensions.includes(dimension) ? dimension : 'overworld';

  const existing = db.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: '見つかりませんでした' });

  const updated = db.update(req.params.id, {
    name: name.trim(),
    x: parsedX,
    z: parsedZ,
    dimension: validDim,
    category: category || 'その他',
    notes: notes ? notes.trim() : '',
  });

  res.json(updated);
});


app.delete('/api/coordinates/:id', (req, res) => {
  const deleted = db.remove(req.params.id);
  if (!deleted) return res.status(404).json({ error: '見つかりませんでした' });
  res.json({ success: true });
});

// Fallback to index.html
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🟢 Minecraft座標マネージャー起動中: http://localhost:${PORT}`);
});
