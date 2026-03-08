const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const COOKIE_NAME = 'mc_access';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30日
const TOKEN_FILE = path.join(__dirname, 'access.token');

// トークンの読み込み or 生成
let ACCESS_TOKEN = process.env.ACCESS_TOKEN;
if (!ACCESS_TOKEN) {
  if (fs.existsSync(TOKEN_FILE)) {
    ACCESS_TOKEN = fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
  } else {
    ACCESS_TOKEN = crypto.randomBytes(24).toString('hex');
    fs.writeFileSync(TOKEN_FILE, ACCESS_TOKEN);
    console.log('🔑 アクセストークンを生成しました (access.token)');
  }
}

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// ===== 認証ミドルウェア =====
function requireAuth(req, res, next) {
  // ?key=TOKEN でアクセス → Cookie にセットしてリダイレクト
  if (req.query.key) {
    if (req.query.key === ACCESS_TOKEN) {
      res.cookie(COOKIE_NAME, ACCESS_TOKEN, {
        maxAge: COOKIE_MAX_AGE,
        httpOnly: true,
        sameSite: 'lax',
      });
      // クエリパラメータを除いた URL にリダイレクト
      return res.redirect(req.path === '/' ? '/' : req.path);
    }
    return res.status(403).send('❌ アクセスキーが無効です');
  }

  // Cookie 確認
  if (req.cookies[COOKIE_NAME] === ACCESS_TOKEN) {
    return next();
  }

  return res.status(403).sendFile(path.join(__dirname, 'public', 'denied.html'));
}

// 静的ファイルより前に認証を挟む
app.use(requireAuth);
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
  console.log(`🔑 アクセスURL: http://localhost:${PORT}/?key=${ACCESS_TOKEN}`);
});
