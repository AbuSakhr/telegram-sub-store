const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

// إنشاء مجلد البيانات إذا لم يكن موجوداً
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'store.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema();
    logger.info('تم الاتصال بقاعدة البيانات بنجاح');
  }
  return db;
}

function initializeSchema() {
  const database = db;

  // جدول المستخدمين
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      telegram_id INTEGER UNIQUE NOT NULL,
      username TEXT,
      full_name TEXT,
      balance REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      is_banned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // جدول المنتجات
  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category TEXT DEFAULT 'عام',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // جدول المخزون (الحسابات)
  database.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      account_data TEXT NOT NULL,
      is_sold INTEGER DEFAULT 0,
      sold_to INTEGER,
      sold_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (sold_to) REFERENCES users(telegram_id),
      UNIQUE(account_data)
    )
  `);

  // جدول المشتريات
  database.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      inventory_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      account_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(telegram_id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (inventory_id) REFERENCES inventory(id)
    )
  `);

  // جدول المعاملات المالية
  database.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      reference_id INTEGER,
      balance_before REAL,
      balance_after REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(telegram_id)
    )
  `);

  // جدول طلبات الشحن
  database.exec(`
    CREATE TABLE IF NOT EXISTS recharge_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      proof_file_id TEXT,
      proof_message_id INTEGER,
      status TEXT DEFAULT 'pending',
      admin_note TEXT,
      processed_by INTEGER,
      processed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(telegram_id)
    )
  `);

  // جدول الإعدادات
  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // إضافة المنتجات الأولية إذا لم تكن موجودة
  const productCount = database.prepare('SELECT COUNT(*) as count FROM products').get();
  if (productCount.count === 0) {
    const insertProduct = database.prepare(`
      INSERT INTO products (name, description, price, category) VALUES (?, ?, ?, ?)
    `);
    insertProduct.run('ChatGPT Plus (شهر)', 'اشتراك ChatGPT Plus لمدة شهر كامل - وصول كامل لـ GPT-4', 5, 'ChatGPT');
    insertProduct.run('ChatGPT Business (شهر)', 'اشتراك ChatGPT Business لمدة شهر - للأعمال والشركات', 6, 'ChatGPT');
    insertProduct.run('Office365 (سنة)', 'اشتراك Microsoft Office 365 لمدة سنة كاملة', 8, 'Microsoft');
    logger.info('تم إضافة المنتجات الأولية');
  }

  logger.info('تم تهيئة قاعدة البيانات بنجاح');
}

// ===== وظائف المستخدمين =====

function getOrCreateUser(telegramId, username, fullName) {
  const database = getDb();
  let user = database.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
  
  if (!user) {
    database.prepare(`
      INSERT INTO users (telegram_id, username, full_name) VALUES (?, ?, ?)
    `).run(telegramId, username || null, fullName || null);
    user = database.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
    logger.info(`مستخدم جديد: ${telegramId} - ${fullName}`);
  } else {
    // تحديث المعلومات
    database.prepare(`
      UPDATE users SET username = ?, full_name = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?
    `).run(username || user.username, fullName || user.full_name, telegramId);
  }
  
  return user;
}

function getUserById(telegramId) {
  return getDb().prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
}

function getUserBalance(telegramId) {
  const user = getUserById(telegramId);
  return user ? user.balance : 0;
}

function updateUserBalance(telegramId, newBalance) {
  getDb().prepare(`
    UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?
  `).run(newBalance, telegramId);
}

function getAllUsers() {
  return getDb().prepare('SELECT * FROM users ORDER BY created_at DESC').all();
}

function banUser(telegramId) {
  getDb().prepare('UPDATE users SET is_banned = 1, status = ? WHERE telegram_id = ?').run('banned', telegramId);
}

function unbanUser(telegramId) {
  getDb().prepare('UPDATE users SET is_banned = 0, status = ? WHERE telegram_id = ?').run('active', telegramId);
}

// ===== وظائف المنتجات =====

function getAllProducts(activeOnly = true) {
  if (activeOnly) {
    return getDb().prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY category, name').all();
  }
  return getDb().prepare('SELECT * FROM products ORDER BY category, name').all();
}

function getProductById(productId) {
  return getDb().prepare('SELECT * FROM products WHERE id = ?').get(productId);
}

function addProduct(name, description, price, category) {
  const result = getDb().prepare(`
    INSERT INTO products (name, description, price, category) VALUES (?, ?, ?, ?)
  `).run(name, description, price, category || 'عام');
  return result.lastInsertRowid;
}

function updateProduct(productId, updates) {
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), productId];
  getDb().prepare(`UPDATE products SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
}

function toggleProduct(productId) {
  const product = getProductById(productId);
  if (product) {
    getDb().prepare('UPDATE products SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(product.is_active ? 0 : 1, productId);
    return !product.is_active;
  }
  return null;
}

function getProductStock(productId) {
  return getDb().prepare('SELECT COUNT(*) as count FROM inventory WHERE product_id = ? AND is_sold = 0').get(productId);
}

// ===== وظائف المخزون =====

function addAccountToInventory(productId, accountData) {
  try {
    const result = getDb().prepare(`
      INSERT INTO inventory (product_id, account_data) VALUES (?, ?)
    `).run(productId, accountData.trim());
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return { success: false, error: 'الحساب موجود مسبقاً' };
    }
    return { success: false, error: err.message };
  }
}

function addBulkAccounts(productId, accountsList) {
  const database = getDb();
  const insert = database.prepare(`
    INSERT OR IGNORE INTO inventory (product_id, account_data) VALUES (?, ?)
  `);
  
  let added = 0;
  let duplicates = 0;
  
  const insertMany = database.transaction((accounts) => {
    for (const account of accounts) {
      const trimmed = account.trim();
      if (!trimmed) continue;
      const info = insert.run(productId, trimmed);
      if (info.changes > 0) added++;
      else duplicates++;
    }
  });
  
  insertMany(accountsList);
  return { added, duplicates };
}

function getAvailableAccount(productId) {
  return getDb().prepare(`
    SELECT * FROM inventory WHERE product_id = ? AND is_sold = 0 LIMIT 1
  `).get(productId);
}

function markAccountAsSold(inventoryId, userId) {
  getDb().prepare(`
    UPDATE inventory SET is_sold = 1, sold_to = ?, sold_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(userId, inventoryId);
}

function getInventoryStats(productId) {
  return getDb().prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_sold = 0 THEN 1 ELSE 0 END) as available,
      SUM(CASE WHEN is_sold = 1 THEN 1 ELSE 0 END) as sold
    FROM inventory WHERE product_id = ?
  `).get(productId);
}

// ===== وظائف المشتريات =====

function createPurchase(userId, productId, inventoryId, amount, accountData) {
  const database = getDb();
  const user = getUserById(userId);
  const balanceBefore = user.balance;
  const balanceAfter = balanceBefore - amount;
  
  const purchase = database.transaction(() => {
    // إنشاء سجل الشراء
    const result = database.prepare(`
      INSERT INTO purchases (user_id, product_id, inventory_id, amount, account_data)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, productId, inventoryId, amount, accountData);
    
    // تحديث الرصيد
    database.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?')
      .run(balanceAfter, userId);
    
    // تسجيل المعاملة
    database.prepare(`
      INSERT INTO transactions (user_id, type, amount, description, reference_id, balance_before, balance_after)
      VALUES (?, 'purchase', ?, ?, ?, ?, ?)
    `).run(userId, amount, `شراء منتج #${productId}`, result.lastInsertRowid, balanceBefore, balanceAfter);
    
    // تحديث المخزون
    database.prepare('UPDATE inventory SET is_sold = 1, sold_to = ?, sold_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(userId, inventoryId);
    
    return result.lastInsertRowid;
  });
  
  return purchase();
}

function getUserPurchases(userId) {
  return getDb().prepare(`
    SELECT p.*, pr.name as product_name
    FROM purchases p
    JOIN products pr ON p.product_id = pr.id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
    LIMIT 10
  `).all(userId);
}

// ===== وظائف طلبات الشحن =====

function createRechargeRequest(userId, amount, proofFileId, proofMessageId) {
  const result = getDb().prepare(`
    INSERT INTO recharge_requests (user_id, amount, proof_file_id, proof_message_id)
    VALUES (?, ?, ?, ?)
  `).run(userId, amount, proofFileId, proofMessageId);
  return result.lastInsertRowid;
}

function getPendingRechargeRequests() {
  return getDb().prepare(`
    SELECT r.*, u.username, u.full_name, u.balance
    FROM recharge_requests r
    JOIN users u ON r.user_id = u.telegram_id
    WHERE r.status = 'pending'
    ORDER BY r.created_at ASC
  `).all();
}

function getRechargeRequestById(requestId) {
  return getDb().prepare(`
    SELECT r.*, u.username, u.full_name, u.balance
    FROM recharge_requests r
    JOIN users u ON r.user_id = u.telegram_id
    WHERE r.id = ?
  `).get(requestId);
}

function approveRechargeRequest(requestId, adminId) {
  const database = getDb();
  const request = getRechargeRequestById(requestId);
  if (!request || request.status !== 'pending') return false;
  
  const user = getUserById(request.user_id);
  const balanceBefore = user.balance;
  const balanceAfter = balanceBefore + request.amount;
  
  database.transaction(() => {
    // تحديث حالة الطلب
    database.prepare(`
      UPDATE recharge_requests 
      SET status = 'approved', processed_by = ?, processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(adminId, requestId);
    
    // تحديث الرصيد
    database.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?')
      .run(balanceAfter, request.user_id);
    
    // تسجيل المعاملة
    database.prepare(`
      INSERT INTO transactions (user_id, type, amount, description, reference_id, balance_before, balance_after)
      VALUES (?, 'recharge', ?, ?, ?, ?, ?)
    `).run(request.user_id, request.amount, `شحن رصيد - طلب #${requestId}`, requestId, balanceBefore, balanceAfter);
  })();
  
  return { user_id: request.user_id, amount: request.amount, new_balance: balanceAfter };
}

function rejectRechargeRequest(requestId, adminId, note) {
  const request = getRechargeRequestById(requestId);
  if (!request || request.status !== 'pending') return false;
  
  getDb().prepare(`
    UPDATE recharge_requests 
    SET status = 'rejected', admin_note = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(note || 'تم الرفض', adminId, requestId);
  
  return { user_id: request.user_id, amount: request.amount };
}

// ===== وظائف الإحصائيات =====

function getAdminStats() {
  const database = getDb();
  
  const totalUsers = database.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const activeUsers = database.prepare('SELECT COUNT(*) as count FROM users WHERE is_banned = 0').get().count;
  const totalRevenue = database.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM purchases').get().total;
  const totalPurchases = database.prepare('SELECT COUNT(*) as count FROM purchases').get().count;
  const pendingRequests = database.prepare("SELECT COUNT(*) as count FROM recharge_requests WHERE status = 'pending'").get().count;
  const totalProducts = database.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get().count;
  
  const inventoryStats = database.prepare(`
    SELECT 
      SUM(CASE WHEN is_sold = 0 THEN 1 ELSE 0 END) as available,
      SUM(CASE WHEN is_sold = 1 THEN 1 ELSE 0 END) as sold,
      COUNT(*) as total
    FROM inventory
  `).get();
  
  const todayRevenue = database.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM purchases 
    WHERE date(created_at) = date('now')
  `).get().total;
  
  return {
    totalUsers,
    activeUsers,
    totalRevenue,
    totalPurchases,
    pendingRequests,
    totalProducts,
    inventoryStats,
    todayRevenue
  };
}

function addManualBalance(userId, amount, adminId, note) {
  const database = getDb();
  const user = getUserById(userId);
  if (!user) return false;
  
  const balanceBefore = user.balance;
  const balanceAfter = balanceBefore + amount;
  
  database.transaction(() => {
    database.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?')
      .run(balanceAfter, userId);
    
    database.prepare(`
      INSERT INTO transactions (user_id, type, amount, description, balance_before, balance_after)
      VALUES (?, 'manual_add', ?, ?, ?, ?)
    `).run(userId, amount, note || `إضافة يدوية من الأدمن ${adminId}`, balanceBefore, balanceAfter);
  })();
  
  return { old_balance: balanceBefore, new_balance: balanceAfter };
}

function getUserTransactions(userId) {
  return getDb().prepare(`
    SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
  `).all(userId);
}

module.exports = {
  getDb,
  getOrCreateUser,
  getUserById,
  getUserBalance,
  updateUserBalance,
  getAllUsers,
  banUser,
  unbanUser,
  getAllProducts,
  getProductById,
  addProduct,
  updateProduct,
  toggleProduct,
  getProductStock,
  addAccountToInventory,
  addBulkAccounts,
  getAvailableAccount,
  markAccountAsSold,
  getInventoryStats,
  createPurchase,
  getUserPurchases,
  createRechargeRequest,
  getPendingRechargeRequests,
  getRechargeRequestById,
  approveRechargeRequest,
  rejectRechargeRequest,
  getAdminStats,
  addManualBalance,
  getUserTransactions
};
