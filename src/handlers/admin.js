const { 
  getAdminStats, 
  getPendingRechargeRequests, 
  getRechargeRequestById,
  approveRechargeRequest,
  rejectRechargeRequest,
  getAllProducts,
  getProductById,
  toggleProduct,
  addProduct,
  addBulkAccounts,
  getInventoryStats,
  getUserById,
  addManualBalance
} = require('../database');
const messages = require('../utils/messages');
const keyboards = require('../keyboards');
const logger = require('../utils/logger');

// عرض الإحصائيات
async function showStats(ctx) {
  try {
    const stats = getAdminStats();
    const pending = getPendingRechargeRequests();
    await ctx.editMessageText(messages.adminPanel(stats), {
      parse_mode: 'Markdown',
      ...keyboards.adminPanel(pending.length)
    });
  } catch (err) {
    logger.error(`خطأ في عرض الإحصائيات: ${err.message}`);
  }
}

// عرض طلبات الشحن المعلقة
async function showPendingRequests(ctx) {
  try {
    const pending = getPendingRechargeRequests();
    if (pending.length === 0) {
      return ctx.answerCbQuery('لا توجد طلبات معلقة حالياً');
    }

    for (const req of pending) {
      await ctx.replyWithPhoto(req.proof_file_id, {
        caption: messages.adminRechargeRequest(req),
        parse_mode: 'Markdown',
        ...keyboards.rechargeApproval(req.id)
      });
    }
  } catch (err) {
    logger.error(`خطأ في عرض الطلبات المعلقة: ${err.message}`);
  }
}

// الموافقة على طلب شحن
async function handleApproveRecharge(ctx, requestId) {
  try {
    const result = approveRechargeRequest(requestId, ctx.from.id);
    if (!result) return ctx.answerCbQuery('الطلب غير موجود أو تمت معالجته مسبقاً');

    await ctx.editMessageCaption(`✅ تمت الموافقة على الطلب #${requestId}\n💰 المبلغ: $${result.amount}`, {
      parse_mode: 'Markdown'
    });

    // إشعار المستخدم
    await ctx.telegram.sendMessage(result.user_id, messages.rechargeApproved(result.amount, result.new_balance), {
      parse_mode: 'Markdown'
    });
    
    logger.info(`الأدمن وافق على طلب الشحن #${requestId}`);
  } catch (err) {
    logger.error(`خطأ في الموافقة على الشحن: ${err.message}`);
  }
}

// رفض طلب شحن
async function handleRejectRecharge(ctx, requestId) {
  try {
    ctx.session = ctx.session || {};
    ctx.session.state = 'AWAITING_REJECTION_REASON';
    ctx.session.rejectRequestId = requestId;
    ctx.session.rejectMessageId = ctx.callbackQuery.message.message_id;

    await ctx.reply('يرجى كتابة سبب الرفض:', keyboards.cancelButton());
  } catch (err) {
    logger.error(`خطأ في بدء رفض الشحن: ${err.message}`);
  }
}

// معالجة سبب الرفض
async function processRejection(ctx) {
  try {
    const reason = ctx.message.text;
    const requestId = ctx.session.rejectRequestId;
    
    const result = rejectRechargeRequest(requestId, ctx.from.id, reason);
    if (result) {
      await ctx.reply(`❌ تم رفض الطلب #${requestId} بنجاح.`);
      
      // إشعار المستخدم
      await ctx.telegram.sendMessage(result.user_id, messages.rechargeRejected(result.amount, reason), {
        parse_mode: 'Markdown'
      });
    }

    delete ctx.session.state;
    delete ctx.session.rejectRequestId;
  } catch (err) {
    logger.error(`خطأ في معالجة رفض الشحن: ${err.message}`);
  }
}

// إدارة المنتجات
async function showManageProducts(ctx) {
  try {
    const products = getAllProducts(false);
    await ctx.editMessageText('📦 *إدارة المنتجات*\n\nاختر منتجاً لتعديله أو تفعيله/تعطيله:', {
      parse_mode: 'Markdown',
      ...keyboards.manageProducts(products)
    });
  } catch (err) {
    logger.error(`خطأ في إدارة المنتجات: ${err.message}`);
  }
}

// تفعيل/تعطيل منتج
async function handleToggleProduct(ctx, productId) {
  try {
    const newState = toggleProduct(productId);
    ctx.answerCbQuery(newState ? 'تم تفعيل المنتج' : 'تم تعطيل المنتج');
    
    const product = getProductById(productId);
    await ctx.editMessageText(`📦 *إدارة المنتج: ${product.name}*\nالحالة الحالية: ${product.is_active ? '✅ مفعل' : '❌ معطل'}`, {
      parse_mode: 'Markdown',
      ...keyboards.manageProduct(product)
    });
  } catch (err) {
    logger.error(`خطأ في تبديل حالة المنتج: ${err.message}`);
  }
}

// إضافة منتج جديد - الخطوة الأولى
async function initiateAddProduct(ctx) {
  ctx.session = ctx.session || {};
  ctx.session.state = 'AWAITING_PRODUCT_NAME';
  await ctx.reply('أدخل اسم المنتج الجديد:', keyboards.cancelButton());
}

// معالجة بيانات المنتج الجديد
async function handleAddProductFlow(ctx) {
  const state = ctx.session.state;
  const text = ctx.message.text;

  if (state === 'AWAITING_PRODUCT_NAME') {
    ctx.session.newProduct = { name: text };
    ctx.session.state = 'AWAITING_PRODUCT_PRICE';
    await ctx.reply('أدخل سعر المنتج (رقم فقط):');
  } else if (state === 'AWAITING_PRODUCT_PRICE') {
    const price = parseFloat(text);
    if (isNaN(price)) return ctx.reply('يرجى إدخال رقم صحيح للسعر:');
    ctx.session.newProduct.price = price;
    ctx.session.state = 'AWAITING_PRODUCT_DESC';
    await ctx.reply('أدخل وصف المنتج:');
  } else if (state === 'AWAITING_PRODUCT_DESC') {
    ctx.session.newProduct.description = text;
    const p = ctx.session.newProduct;
    const id = addProduct(p.name, p.description, p.price, 'عام');
    await ctx.reply(`✅ تم إضافة المنتج بنجاح! معرف المنتج: ${id}`);
    delete ctx.session.state;
    delete ctx.session.newProduct;
  }
}

// إضافة حسابات للمخزون
async function initiateAddAccounts(ctx, productId) {
  const product = getProductById(productId);
  ctx.session = ctx.session || {};
  ctx.session.state = 'AWAITING_ACCOUNTS_DATA';
  ctx.session.targetProductId = productId;
  
  await ctx.reply(`📦 أرسل الحسابات لمنتج *${product.name}*\n\nتنسيق الإرسال:\n\`email:password\`\nأو سطر واحد لكل حساب.`, {
    parse_mode: 'Markdown',
    ...keyboards.cancelButton()
  });
}

async function handleAddAccountsData(ctx) {
  try {
    const data = ctx.message.text;
    const productId = ctx.session.targetProductId;
    const accounts = data.split('\n').filter(line => line.trim() !== '');
    
    const result = addBulkAccounts(productId, accounts);
    await ctx.reply(`✅ تمت العملية:\n- المضافة: ${result.added}\n- المكررة: ${result.duplicates}`);
    
    delete ctx.session.state;
    delete ctx.session.targetProductId;
  } catch (err) {
    logger.error(`خطأ في إضافة الحسابات: ${err.message}`);
  }
}

module.exports = {
  showStats,
  showPendingRequests,
  handleApproveRecharge,
  handleRejectRecharge,
  processRejection,
  showManageProducts,
  handleToggleProduct,
  initiateAddProduct,
  handleAddProductFlow,
  initiateAddAccounts,
  handleAddAccountsData
};
