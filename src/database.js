const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../data.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database error:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// 🔹 Helper functions لتحويل callbacks إلى Promises
function run(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// 🔹 إنشاء الجداول
async function init() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      telegram_id INTEGER UNIQUE,
      balance REAL DEFAULT 0,
      is_admin INTEGER DEFAULT 0
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      price REAL,
      description TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      product_id INTEGER,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// 🔹 الدوال المستخدمة في المشروع

async function getUser(telegram_id) {
  return await get(`SELECT * FROM users WHERE telegram_id = ?`, [telegram_id]);
}

async function createUser(telegram_id) {
  return await run(
    `INSERT OR IGNORE INTO users (telegram_id) VALUES (?)`,
    [telegram_id]
  );
}

async function updateBalance(telegram_id, amount) {
  return await run(
    `UPDATE users SET balance = balance + ? WHERE telegram_id = ?`,
    [amount, telegram_id]
  );
}

async function getProducts() {
  return await all(`SELECT * FROM products`);
}

async function createOrder(user_id, product_id) {
  return await run(
    `INSERT INTO orders (user_id, product_id) VALUES (?, ?)`,
    [user_id, product_id]
  );
}

module.exports = {
  db,
  init,
  run,
  get,
  all,
  getUser,
  createUser,
  updateBalance,
  getProducts,
  createOrder,
};
