require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const logger = require('./utils/logger');
const { userMiddleware, adminMiddleware } = require('./middleware/auth');
const { getDb } = require('./database');

// استيراد الـ Handlers
const commands = require('./handlers/commands');
const shop = require('./handlers/shop');
const recharge = require('./handlers/recharge');
const admin = require('./handlers/admin');
const keyboards = require('./keyboards');
const messages = require('./utils/messages');

const bot = new Telegraf(process.env.BOT_TOKEN);

// تهيئة قاعدة البيانات
getDb();

// Middleware
bot.use(session());
bot.use(userMiddleware);

// الأوامر الأساسية
bot.start(commands.startCommand);
bot.help(commands.helpCommand);
bot.command('admin', adminMiddleware, commands.adminCommand);
bot.command('balance', commands.balanceCommand);

// معالجة النصوص (الأزرار الرئيسية)
bot.hears('🛒 المتجر', shop.showShop);
bot.hears('💰 رصيدي', commands.balanceCommand);
bot.hears('💳 شحن الرصيد', recharge.showRechargeInfo);
bot.hears('📦 مشترياتي', shop.showPurchases);
bot.hears('📞 الدعم', (ctx) => ctx.reply(messages.support, { parse_mode: 'Markdown' }));
bot.hears('❓ مساعدة', commands.helpCommand);
bot.hears('🔧 لوحة التحكم', adminMiddleware, commands.adminCommand);

// معالجة الـ Callback Queries (Inline Buttons)
bot.on('callback_query', async (ctx, next) => {
  const data = ctx.callbackQuery.data;
  
  if (data === 'back_main') {
    const name = ctx.from.first_name;
    await ctx.editMessageText(messages.welcome(name), {
      parse_mode: 'Markdown',
      ...ctx.isAdmin ? keyboards.adminMenu() : keyboards.mainMenu()
    });
  }
  else if (data === 'back_shop') {
    await shop.showShop(ctx);
  }
  else if (data.startsWith('product_')) {
    const productId = parseInt(data.split('_')[1]);
    await shop.showProductDetails(ctx, productId);
  }
  else if (data.startsWith('buy_')) {
    const productId = parseInt(data.split('_')[1]);
    await shop.initiatePurchase(ctx, productId);
  }
  else if (data.startsWith('confirm_buy_')) {
    const productId = parseInt(data.split('_')[2]);
    await shop.confirmPurchase(ctx, productId);
  }
  else if (data === 'cancel_buy' || data === 'cancel') {
    if (ctx.session) ctx.session.state = null;
    await ctx.editMessageText('تم إلغاء العملية.');
  }
  
  // عمليات الأدمن
  else if (data === 'admin_stats') {
    await admin.showStats(ctx);
  }
  else if (data === 'admin_pending') {
    await admin.showPendingRequests(ctx);
  }
  else if (data === 'admin_manage_products') {
    await admin.showManageProducts(ctx);
  }
  else if (data === 'admin_add_product') {
    await admin.initiateAddProduct(ctx);
  }
  else if (data.startsWith('approve_recharge_')) {
    const reqId = parseInt(data.split('_')[2]);
    await admin.handleApproveRecharge(ctx, reqId);
  }
  else if (data.startsWith('reject_recharge_')) {
    const reqId = parseInt(data.split('_')[2]);
    await admin.handleRejectRecharge(ctx, reqId);
  }
  else if (data.startsWith('manage_product_')) {
    const productId = parseInt(data.split('_')[2]);
    const product = require('./database').getProductById(productId);
    await ctx.editMessageText(`📦 *إدارة المنتج: ${product.name}*`, {
      parse_mode: 'Markdown',
      ...keyboards.manageProduct(product)
    });
  }
  else if (data.startsWith('toggle_product_')) {
    const productId = parseInt(data.split('_')[2]);
    await admin.handleToggleProduct(ctx, productId);
  }
  else if (data.startsWith('add_accounts_')) {
    const productId = parseInt(data.split('_')[2]);
    await admin.initiateAddAccounts(ctx, productId);
  }
  else if (data === 'admin_back') {
    await commands.adminCommand(ctx);
  }

  return next();
});

// معالجة الرسائل النصية بناءً على الحالة (State)
bot.on('text', async (ctx, next) => {
  if (!ctx.session || !ctx.session.state) return next();

  const state = ctx.session.state;

  // حالات المستخدم
  if (state === 'AWAITING_RECHARGE_AMOUNT') {
    await recharge.handleRechargeAmount(ctx);
  }
  
  // حالات الأدمن
  else if (ctx.isAdmin) {
    if (state === 'AWAITING_REJECTION_REASON') {
      await admin.processRejection(ctx);
    }
    else if (state.startsWith('AWAITING_PRODUCT_')) {
      await admin.handleAddProductFlow(ctx);
    }
    else if (state === 'AWAITING_ACCOUNTS_DATA') {
      await admin.handleAddAccountsData(ctx);
    }
  }
  
  return next();
});

// معالجة الصور (إثبات الدفع)
bot.on('photo', async (ctx) => {
  if (ctx.session && ctx.session.state === 'AWAITING_RECHARGE_PROOF') {
    await recharge.handleRechargeProof(ctx);
  }
});

// معالجة الأخطاء
bot.catch((err, ctx) => {
  logger.error(`خطأ غير متوقع في البوت: ${err.message}`);
  ctx.reply('⚠️ حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.');
});

// تشغيل البوت
bot.launch().then(() => {
  logger.info('🚀 البوت يعمل الآن بنجاح!');
});

// إغلاق آمن
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
