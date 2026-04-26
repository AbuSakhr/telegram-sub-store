const { getOrCreateUser, getUserById } = require('../database');
const messages = require('../utils/messages');
const logger = require('../utils/logger');

const ADMIN_ID = parseInt(process.env.ADMIN_ID);

// Middleware لتسجيل المستخدم وفحص الحظر
async function userMiddleware(ctx, next) {
  try {
    const telegramId = ctx.from?.id;
    if (!telegramId) return next();

    const username = ctx.from.username;
    const fullName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');

    // تسجيل أو تحديث المستخدم
    const user = getOrCreateUser(telegramId, username, fullName);

    // فحص الحظر
    if (user.is_banned) {
      await ctx.reply(messages.userBanned);
      return;
    }

    // إضافة معلومات المستخدم للسياق
    ctx.dbUser = user;
    ctx.isAdmin = telegramId === ADMIN_ID;

    return next();
  } catch (err) {
    logger.error(`خطأ في middleware المستخدم: ${err.message}`);
    return next();
  }
}

// Middleware للتحقق من صلاحيات الأدمن
async function adminMiddleware(ctx, next) {
  const telegramId = ctx.from?.id;
  if (telegramId !== ADMIN_ID) {
    await ctx.reply(messages.unauthorized);
    return;
  }
  return next();
}

module.exports = { userMiddleware, adminMiddleware };
