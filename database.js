const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'coordinates.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS coordinates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    z INTEGER NOT NULL,
    dimension TEXT NOT NULL DEFAULT 'overworld',
    category TEXT NOT NULL DEFAULT 'その他',
    author TEXT NOT NULL,
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const getAll = (filters = {}) => {
  let query = 'SELECT * FROM coordinates';
  const params = [];
  const conditions = [];

  if (filters.dimension) {
    conditions.push('dimension = ?');
    params.push(filters.dimension);
  }
  if (filters.category) {
    conditions.push('category = ?');
    params.push(filters.category);
  }
  if (filters.search) {
    conditions.push('(name LIKE ? OR notes LIKE ? OR author LIKE ?)');
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC';

  return db.prepare(query).all(...params);
};

const getById = (id) => db.prepare('SELECT * FROM coordinates WHERE id = ?').get(id);

const create = ({ name, x, y, z, dimension, category, author, notes }) => {
  const result = db.prepare(
    'INSERT INTO coordinates (name, x, y, z, dimension, category, author, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(name, x, y, z, dimension, category, author, notes || '');
  return getById(result.lastInsertRowid);
};

const remove = (id) => {
  const result = db.prepare('DELETE FROM coordinates WHERE id = ?').run(id);
  return result.changes > 0;
};

const update = (id, { name, x, z, dimension, category, notes }) => {
  db.prepare(
    'UPDATE coordinates SET name=?, x=?, z=?, dimension=?, category=?, notes=? WHERE id=?'
  ).run(name, x, z, dimension, category, notes, id);
  return getById(id);
};

module.exports = { getAll, getById, create, update, remove };
