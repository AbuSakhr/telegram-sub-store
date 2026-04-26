const messages = require('../utils/messages');
const keyboards = require('../keyboards');
const { createRechargeRequest } = require('../database');
const logger = require('../utils/logger');

const ADMIN_ID = parseInt(process.env.ADMIN_ID);
const PAYMENT_INFO = process.env.PAYMENT_INFO || 'يرجى التواصل مع الأدمن للشحن';

// عرض معلومات الشحن
async function showRechargeInfo(ctx) {
  try {
    await ctx.reply(messages.rechargeInfo(PAYMENT_INFO), {
      parse_mode: 'Markdown'
    });
    await ctx.reply(messages.rechargeAmountPrompt, {
      parse_mode: 'Markdown',
      ...keyboards.cancelButton()
    });
    
    // حفظ الحالة في الجلسة
    ctx.session = ctx.session || {};
    ctx.session.state = 'AWAITING_RECHARGE_AMOUNT';
  } catch (err) {
    logger.error(`خطأ في معلومات الشحن: ${err.message}`);
    await ctx.reply(messages.error);
  }
}

// معالجة إدخال المبلغ
async function handleRechargeAmount(ctx) {
  try {
    const amount = parseFloat(ctx.message.text);
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply('❌ يرجى إدخال مبلغ صحيح (رقم أكبر من صفر)');
    }

    ctx.session.rechargeAmount = amount;
    ctx.session.state = 'AWAITING_RECHARGE_PROOF';

    await ctx.reply(messages.rechargeProofPrompt(amount), {
      parse_mode: 'Markdown',
      ...keyboards.cancelButton()
    });
  } catch (err) {
    logger.error(`خطأ في معالجة مبلغ الشحن: ${err.message}`);
    await ctx.reply(messages.error);
  }
}

// معالجة إثبات الدفع (الصورة)
async function handleRechargeProof(ctx) {
  try {
    if (!ctx.message.photo) {
      return ctx.reply('❌ يرجى إرسال صورة إثبات الدفع');
    }

    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const amount = ctx.session.rechargeAmount;
    
    // إنشاء الطلب في قاعدة البيانات
    const requestId = createRechargeRequest(
      ctx.from.id,
      amount,
      photo.file_id,
      ctx.message.message_id
    );

    // إرسال تأكيد للمستخدم
    await ctx.reply(messages.rechargeRequestSent(requestId, amount), {
      parse_mode: 'Markdown'
    });

    // إشعار الأدمن
    const adminMsg = `🔔 *طلب شحن جديد* (#${requestId})\n👤 من: ${ctx.from.first_name}\n💰 المبلغ: $${amount}`;
    await ctx.telegram.sendPhoto(ADMIN_ID, photo.file_id, {
      caption: adminMsg,
      parse_mode: 'Markdown',
      ...keyboards.rechargeApproval(requestId)
    });

    // تنظيف الجلسة
    delete ctx.session.state;
    delete ctx.session.rechargeAmount;
    
    logger.info(`طلب شحن جديد من ${ctx.from.id} بمبلغ ${amount}`);
  } catch (err) {
    logger.error(`خطأ في معالجة إثبات الشحن: ${err.message}`);
    await ctx.reply(messages.error);
  }
}

module.exports = { showRechargeInfo, handleRechargeAmount, handleRechargeProof };
