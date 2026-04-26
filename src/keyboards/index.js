const { Markup } = require('telegraf');

const keyboards = {
  // القائمة الرئيسية
  mainMenu: () => Markup.keyboard([
    ['🛒 المتجر', '💰 رصيدي'],
    ['💳 شحن الرصيد', '📦 مشترياتي'],
    ['📞 الدعم', '❓ مساعدة']
  ]).resize(),

  // قائمة الأدمن الرئيسية
  adminMenu: () => Markup.keyboard([
    ['🛒 المتجر', '💰 رصيدي'],
    ['💳 شحن الرصيد', '📦 مشترياتي'],
    ['🔧 لوحة التحكم', '❓ مساعدة']
  ]).resize(),

  // لوحة تحكم الأدمن (Inline)
  adminPanel: (pendingCount) => Markup.inlineKeyboard([
    [
      Markup.button.callback('📊 الإحصائيات', 'admin_stats'),
      Markup.button.callback(`⏳ الطلبات المعلقة (${pendingCount})`, 'admin_pending')
    ],
    [
      Markup.button.callback('➕ إضافة منتج', 'admin_add_product'),
      Markup.button.callback('📦 إدارة المنتجات', 'admin_manage_products')
    ],
    [
      Markup.button.callback('🗄️ إضافة حسابات', 'admin_add_accounts'),
      Markup.button.callback('👥 إدارة المستخدمين', 'admin_manage_users')
    ],
    [
      Markup.button.callback('💰 إدارة الأرصدة', 'admin_manage_balance')
    ]
  ]),

  // قائمة المنتجات
  productsList: (products) => {
    const buttons = products.map(p => {
      const stockInfo = p.stock > 0 ? `✅ ${p.stock}` : '❌';
      return [Markup.button.callback(`${p.name} - $${p.price} ${stockInfo}`, `product_${p.id}`)];
    });
    buttons.push([Markup.button.callback('🔙 رجوع', 'back_main')]);
    return Markup.inlineKeyboard(buttons);
  },

  // تفاصيل المنتج
  productDetail: (productId, hasStock) => {
    const buttons = [];
    if (hasStock) {
      buttons.push([Markup.button.callback('🛒 شراء الآن', `buy_${productId}`)]);
    }
    buttons.push([Markup.button.callback('🔙 رجوع للمتجر', 'back_shop')]);
    return Markup.inlineKeyboard(buttons);
  },

  // تأكيد الشراء
  confirmPurchase: (productId) => Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ تأكيد الشراء', `confirm_buy_${productId}`),
      Markup.button.callback('❌ إلغاء', 'cancel_buy')
    ]
  ]),

  // إلغاء
  cancelButton: () => Markup.inlineKeyboard([
    [Markup.button.callback('❌ إلغاء', 'cancel')]
  ]),

  // موافقة/رفض طلب الشحن
  rechargeApproval: (requestId) => Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ موافقة', `approve_recharge_${requestId}`),
      Markup.button.callback('❌ رفض', `reject_recharge_${requestId}`)
    ]
  ]),

  // إدارة المنتجات
  manageProducts: (products) => {
    const buttons = products.map(p => {
      const status = p.is_active ? '✅' : '❌';
      return [Markup.button.callback(`${status} ${p.name}`, `manage_product_${p.id}`)];
    });
    buttons.push([Markup.button.callback('🔙 رجوع', 'admin_back')]);
    return Markup.inlineKeyboard(buttons);
  },

  // إدارة منتج واحد
  manageProduct: (product) => Markup.inlineKeyboard([
    [
      Markup.button.callback(
        product.is_active ? '🔴 تعطيل المنتج' : '🟢 تفعيل المنتج',
        `toggle_product_${product.id}`
      )
    ],
    [Markup.button.callback('📦 إضافة حسابات', `add_accounts_${product.id}`)],
    [Markup.button.callback('📊 إحصائيات المخزون', `inventory_stats_${product.id}`)],
    [Markup.button.callback('🔙 رجوع', 'admin_manage_products')]
  ]),

  // اختيار منتج لإضافة حسابات
  selectProductForAccounts: (products) => {
    const buttons = products.map(p => [
      Markup.button.callback(p.name, `select_product_accounts_${p.id}`)
    ]);
    buttons.push([Markup.button.callback('🔙 رجوع', 'admin_back')]);
    return Markup.inlineKeyboard(buttons);
  },

  // رجوع للوحة الأدمن
  backToAdmin: () => Markup.inlineKeyboard([
    [Markup.button.callback('🔙 رجوع للوحة التحكم', 'admin_back')]
  ]),

  // رجوع للمتجر
  backToShop: () => Markup.inlineKeyboard([
    [Markup.button.callback('🔙 رجوع للمتجر', 'back_shop')]
  ]),

  // إدارة المستخدمين
  userActions: (userId, isBanned) => Markup.inlineKeyboard([
    [
      isBanned
        ? Markup.button.callback('✅ رفع الحظر', `unban_user_${userId}`)
        : Markup.button.callback('🚫 حظر المستخدم', `ban_user_${userId}`)
    ],
    [Markup.button.callback('💰 إضافة رصيد', `add_balance_${userId}`)],
    [Markup.button.callback('📊 عرض المعاملات', `user_transactions_${userId}`)],
    [Markup.button.callback('🔙 رجوع', 'admin_manage_users')]
  ])
};

module.exports = keyboards;
