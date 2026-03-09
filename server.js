const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
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
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());

// ?key= によるトークン認証試行にのみ適用するレート制限（ブルートフォース対策）
const keyAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.query.key, // ?key= がないリクエストはスキップ
  message: '❌ リクエストが多すぎます。しばらく待ってから再試行してください。',
});

// タイミング攻撃に強い定数時間比較
function safeTokenEqual(a, b) {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// ===== 認証ミドルウェア =====
function requireAuth(req, res, next) {
  // ?key=TOKEN でアクセス → Cookie にセットしてリダイレクト
  if (req.query.key) {
    if (safeTokenEqual(req.query.key, ACCESS_TOKEN)) {
      const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
      res.cookie(COOKIE_NAME, ACCESS_TOKEN, {
        maxAge: COOKIE_MAX_AGE,
        httpOnly: true,
        sameSite: 'lax',
        secure: isSecure,
      });
      // クエリパラメータを除いた URL にリダイレクト（トークンをURLから消す）
      return res.redirect(req.path === '/' ? '/' : req.path);
    }
    return res.status(403).send('❌ アクセスキーが無効です');
  }

  // Cookie 確認
  const cookie = req.cookies[COOKIE_NAME];
  if (cookie && safeTokenEqual(cookie, ACCESS_TOKEN)) {
    return next();
  }

  return res.status(403).sendFile(path.join(__dirname, 'public', 'denied.html'));
}

// ?key= 認証試行にのみレート制限を適用し、通常リクエストには制限なし
app.use(keyAuthLimiter);
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
  if (typeof name !== 'string' || name.trim().length > 100) {
    return res.status(400).json({ error: '名前は100文字以内で入力してください' });
  }
  if (notes && (typeof notes !== 'string' || notes.length > 1000)) {
    return res.status(400).json({ error: 'メモは1000文字以内で入力してください' });
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
  if (typeof name !== 'string' || name.trim().length > 100) {
    return res.status(400).json({ error: '名前は100文字以内で入力してください' });
  }
  if (notes && (typeof notes !== 'string' || notes.length > 1000)) {
    return res.status(400).json({ error: 'メモは1000文字以内で入力してください' });
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
