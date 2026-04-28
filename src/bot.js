require('dotenv').config();
const { Telegraf } = require('telegraf');
const db = require('./database'); // استدعاء ملف قاعدة البيانات الجديد

// تأكد من وضع التوكن في ملف .env أو استبدال process.env.BOT_TOKEN بالتوكن مباشرة
const bot = new Telegraf(process.env.BOT_TOKEN);

async function startBot() {
    try {
        // 1. تهيئة قاعدة البيانات أولاً قبل تشغيل البوت
        await db.init();

        // 2. أوامر البوت
        bot.start(async (ctx) => {
            const userId = ctx.from.id;
            const username = ctx.from.username || ctx.from.first_name;
            
            await db.addUser(userId, username);
            ctx.reply('أهلاً بك في البوت! تم تسجيلك في قاعدة البيانات بنجاح.');
        });

        // 3. تشغيل البوت
        await bot.launch();
        console.log('🤖 البوت يعمل الآن...');

    } catch (error) {
        console.error('❌ حدث خطأ أثناء تشغيل البوت:', error);
    }
}

// إيقاف البوت بشكل آمن عند إغلاق السيرفر
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// تشغيل الدالة الرئيسية
startBot();
