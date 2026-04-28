require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const db = require('./database');

const bot = new Telegraf(process.env.BOT_TOKEN);

// الإعدادات من ملف .env
const ADMIN_ID = process.env.ADMIN_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const CHANNEL_LINK = process.env.CHANNEL_LINK;
const SUPPORT_USER = process.env.SUPPORT_USER;
const STORE_NAME = process.env.STORE_NAME;
const PAYMENT_INFO = process.env.PAYMENT_INFO;

// دالة للتحقق من الاشتراك في القناة
async function checkSubscription(ctx) {
    try {
        const member = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
        return ['member', 'administrator', 'creator'].includes(member.status);
    } catch (e) {
        return false;
    }
}

async function startBot() {
    await db.init();

    // قائمة الأزرار الرئيسية
    const mainMenu = Markup.inlineKeyboard([
        [Markup.button.callback('📦 قائمة الاشتراكات', 'view_prices')],
        [Markup.button.callback('💳 كيف أدفع؟', 'how_to_pay')],
        [Markup.button.callback('👨‍💻 الدعم الفني', 'support')],
        [Markup.button.url('📢 القناة الرسمية', CHANNEL_LINK)]
    ]);

    bot.start(async (ctx) => {
        const isSubscribed = await checkSubscription(ctx);
        
        if (!isSubscribed) {
            return ctx.reply(`⚠️ عذراً! يجب عليك الاشتراك في القناة أولاً لاستخدام البوت.\n\nاشترك هنا: ${CHANNEL_LINK}`, Markup.inlineKeyboard([
                [Markup.button.url('إضغط هنا للاشتراك', CHANNEL_LINK)],
                [Markup.button.callback('✅ تم الاشتراك', 'verify_sub')]
            ]));
        }

        const username = ctx.from.username || ctx.from.first_name;
        await db.addUser(ctx.from.id, username);

        ctx.reply(`مرحباً بك في ${STORE_NAME} 🌟\n\nيسعدنا خدمتك، اختر من القائمة أدناه:`, mainMenu);
    });

    // التعامل مع ضغطات الأزرار
    bot.action('verify_sub', async (ctx) => {
        const isSubscribed = await checkSubscription(ctx);
        if (isSubscribed) {
            ctx.deleteMessage();
            ctx.reply('✅ شكراً لثقتك! تم تفعيل البوت الآن.', mainMenu);
        } else {
            ctx.answerCbQuery('❌ لم تشترك في القناة بعد!', { show_alert: true });
        }
    });

    bot.action('view_prices', (ctx) => {
        ctx.editMessageText('📜 **قائمة الأسعار المتاحة حالياً:**\n\n1- نتفليكس (شهر): 5$\n2- يوتيوب بريميوم: 3$\n\nلطلب اشتراك، تواصل مع الدعم.', 
            Markup.inlineKeyboard([[Markup.button.callback('🔙 عودة', 'back_to_main')]]));
    });

    bot.action('how_to_pay', (ctx) => {
        ctx.editMessageText(`ℹ️ **معلومات الدفع:**\n\n${PAYMENT_INFO}\n\nبعد الدفع، أرسل صورة التحويل إلى الدعم الفني.`, 
            Markup.inlineKeyboard([[Markup.button.callback('🔙 عودة', 'back_to_main')]]));
    });

    bot.action('support', (ctx) => {
        ctx.editMessageText(`👨‍💻 للتواصل مع الدعم الفني والاستفسارات:\n\n${SUPPORT_USER}`, 
            Markup.inlineKeyboard([[Markup.button.callback('🔙 عودة', 'back_to_main')]]));
    });

    bot.action('back_to_main', (ctx) => {
        ctx.editMessageText(`مرحباً بك في ${STORE_NAME} 🌟\nاختر من القائمة أدناه:`, mainMenu);
    });

    // أمر خاص للأدمن لمعرفة عدد المستخدمين
    bot.command('stats', (ctx) => {
        if (ctx.from.id.toString() === ADMIN_ID.toString()) {
            // هنا يمكنك إضافة منطق لجلب العدد من ملف الـ JSON
            ctx.reply('📊 سيتم تطوير نظام الإحصائيات قريباً.');
        }
    });

    bot.launch();
    console.log('🚀 البوت الاحترافي يعمل الآن...');
}

startBot();
