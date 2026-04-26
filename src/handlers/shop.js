const { 
  getAllProducts, 
  getProductById, 
  getProductStock, 
  getAvailableAccount, 
  createPurchase,
  getUserPurchases
} = require('../database');
const messages = require('../utils/messages');
const keyboards = require('../keyboards');
const logger = require('../utils/logger');

// عرض قائمة المنتجات
async function showShop(ctx) {
  try {
    const products = getAllProducts(true);
    
    // إضافة معلومات المخزون لكل منتج
    const productsWithStock = products.map(p => {
      const stock = getProductStock(p.id);
      return { ...p, stock: stock.count };
    });

    await ctx.reply(messages.shopMenu, {
      parse_mode: 'Markdown',
      ...keyboards.productsList(productsWithStock)
    });
  } catch (err) {
    logger.error(`خطأ في عرض المتجر: ${err.message}`);
    await ctx.reply(messages.error);
  }
}

// عرض تفاصيل المنتج
async function showProductDetails(ctx, productId) {
  try {
    const product = getProductById(productId);
    if (!product) return ctx.answerCbQuery('المنتج غير موجود');

    const stock = getProductStock(productId);
    
    await ctx.editMessageText(messages.productDetails(product, stock.count), {
      parse_mode: 'Markdown',
      ...keyboards.productDetail(productId, stock.count > 0)
    });
  } catch (err) {
    logger.error(`خطأ في تفاصيل المنتج: ${err.message}`);
    await ctx.reply(messages.error);
  }
}

// بدء عملية الشراء
async function initiatePurchase(ctx, productId) {
  try {
    const product = getProductById(productId);
    const userBalance = ctx.dbUser.balance;

    if (userBalance < product.price) {
      return ctx.reply(messages.insufficientBalance(product.price, userBalance), {
        parse_mode: 'Markdown',
        ...keyboards.backToShop()
      });
    }

    const stock = getProductStock(productId);
    if (stock.count <= 0) {
      return ctx.reply(messages.outOfStock(product.name), {
        parse_mode: 'Markdown'
      });
    }

    await ctx.reply(`هل أنت متأكد من شراء *${product.name}* بسعر *$${product.price}*؟`, {
      parse_mode: 'Markdown',
      ...keyboards.confirmPurchase(productId)
    });
  } catch (err) {
    logger.error(`خطأ في بدء الشراء: ${err.message}`);
    await ctx.reply(messages.error);
  }
}

// تأكيد الشراء النهائي
async function confirmPurchase(ctx, productId) {
  try {
    const product = getProductById(productId);
    const userBalance = ctx.dbUser.balance;

    if (userBalance < product.price) {
      return ctx.answerCbQuery('رصيدك غير كافٍ');
    }

    const account = getAvailableAccount(productId);
    if (!account) {
      return ctx.editMessageText(messages.outOfStock(product.name), { parse_mode: 'Markdown' });
    }

    // تنفيذ عملية الشراء في قاعدة البيانات
    const purchaseId = createPurchase(
      ctx.from.id,
      productId,
      account.id,
      product.price,
      account.account_data
    );

    await ctx.editMessageText(messages.purchaseSuccess(product, account.account_data), {
      parse_mode: 'Markdown'
    });
    
    logger.info(`عملية شراء ناجحة: مستخدم ${ctx.from.id} اشترى ${product.name} (#${purchaseId})`);
  } catch (err) {
    logger.error(`خطأ في تأكيد الشراء: ${err.message}`);
    await ctx.reply(messages.error);
  }
}

// عرض سجل المشتريات
async function showPurchases(ctx) {
  try {
    const purchases = getUserPurchases(ctx.from.id);
    await ctx.reply(messages.purchaseHistory(purchases), {
      parse_mode: 'Markdown'
    });
  } catch (err) {
    logger.error(`خطأ في عرض المشتريات: ${err.message}`);
    await ctx.reply(messages.error);
  }
}

module.exports = { 
  showShop, 
  showProductDetails, 
  initiatePurchase, 
  confirmPurchase,
  showPurchases
};
