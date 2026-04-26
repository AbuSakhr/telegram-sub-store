const messages = require('../utils/messages');
const keyboards = require('../keyboards');
const { getAdminStats, getPendingRechargeRequests } = require('../database');
const logger = require('../utils/logger');

const ADMIN_ID = parseInt(process.env.ADMIN_ID);

// أمر /start
async function startCommand(ctx) {
  try {
    const name = ctx.from.first_name || 'عزيزي المستخدم';
    const isAdmin = ctx.from.id === ADMIN_ID;
    
    await ctx.reply(messages.welcome(name), {
      parse_mode: 'Markdown',
      ...isAdmin ? keyboards.adminMenu() : keyboards.mainMenu()
    });
    
    logger.info(`/start من المستخدم: ${ctx.from.id}`);
  } catch (err) {
    logger.error(`خطأ في /start: ${err.message}`);
    await ctx.reply(messages.error);
  }
}

// أمر /help
async function helpCommand(ctx) {
  try {
    await ctx.reply(messages.help, {
      parse_mode: 'Markdown',
      ...keyboards.mainMenu()
    });
  } catch (err) {
    logger.error(`خطأ في /help: ${err.message}`);
    await ctx.reply(messages.error);
  }
}

// أمر /admin
async function adminCommand(ctx) {
  try {
    if (ctx.from.id !== ADMIN_ID) {
      await ctx.reply(messages.unauthorized);
      return;
    }
    
    const stats = getAdminStats();
    const pending = getPendingRechargeRequests();
    
    await ctx.reply(messages.adminPanel(stats), {
      parse_mode: 'Markdown',
      ...keyboards.adminPanel(pending.length)
    });
    
    logger.info(`الأدمن فتح لوحة التحكم`);
  } catch (err) {
    logger.error(`خطأ في /admin: ${err.message}`);
    await ctx.reply(messages.error);
  }
}

// أمر /balance
async function balanceCommand(ctx) {
  try {
    const balance = ctx.dbUser?.balance || 0;
    await ctx.reply(messages.balance(balance), { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error(`خطأ في /balance: ${err.message}`);
    await ctx.reply(messages.error);
  }
}

module.exports = { startCommand, helpCommand, adminCommand, balanceCommand };
