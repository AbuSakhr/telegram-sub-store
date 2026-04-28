const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

const file = path.join(__dirname, '../db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

async function init() {
  await db.read();
  db.data ||= {
    users: [],
    products: [],
    orders: []
  };
  await db.write();
}

async function getUser(telegram_id) {
  return db.data.users.find(u => u.telegram_id === telegram_id);
}

async function createUser(telegram_id) {
  db.data.users.push({ telegram_id, balance: 0 });
  await db.write();
}

async function updateBalance(telegram_id, amount) {
  const user = await getUser(telegram_id);
  if (user) {
    user.balance += amount;
    await db.write();
  }
}

async function getProducts() {
  return db.data.products;
}

async function getProductById(id) {
  return db.data.products.find(p => p.id === id);
}

async function createOrder(user_id, product_id) {
  db.data.orders.push({
    id: Date.now(),
    user_id,
    product_id,
    status: 'pending'
  });
  await db.write();
}

module.exports = {
  init,
  getUser,
  createUser,
  updateBalance,
  getProducts,
  getProductById,
  createOrder
};
