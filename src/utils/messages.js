const storeName = process.env.STORE_NAME || 'متجر الاشتراكات الرقمية';

const messages = {
  // ===== رسائل الترحيب =====
  welcome: (name) => `
🛍️ *أهلاً وسهلاً ${name}!*

مرحباً بك في *${storeName}*

هنا يمكنك شراء اشتراكات رقمية بأسعار مميزة وتسليم فوري! 🚀

استخدم الأزرار أدناه للتنقل:
  `,

  help: `
📖 *دليل الاستخدام*

🛒 *المتجر* - تصفح المنتجات المتاحة
💰 *رصيدي* - عرض رصيدك الحالي
💳 *شحن الرصيد* - إضافة رصيد لحسابك
📦 *مشترياتي* - عرض سجل مشترياتك
📞 *الدعم* - التواصل مع الدعم الفني

*كيفية الشراء:*
1️⃣ اذهب إلى المتجر
2️⃣ اختر المنتج المطلوب
3️⃣ اضغط "شراء الآن"
4️⃣ سيتم خصم المبلغ وتسليم الحساب فوراً

*كيفية شحن الرصيد:*
1️⃣ اضغط "شحن الرصيد"
2️⃣ أدخل المبلغ المطلوب
3️⃣ أرسل إثبات الدفع (صورة)
4️⃣ انتظر موافقة الأدمن
  `,

  // ===== رسائل الرصيد =====
  balance: (balance) => `
💰 *رصيدك الحالي*

💵 الرصيد: *$${balance.toFixed(2)}*

يمكنك شحن رصيدك في أي وقت!
  `,

  // ===== رسائل المتجر =====
  shopMenu: `🛒 *المتجر*\n\nاختر المنتج الذي تريد شراءه:`,

  productDetails: (product, stock) => `
🏷️ *${product.name}*

📝 ${product.description || 'لا يوجد وصف'}
💰 السعر: *$${product.price.toFixed(2)}*
📦 المتوفر: *${stock}* وحدة
🏷️ الفئة: ${product.category}

هل تريد الشراء؟
  `,

  outOfStock: (productName) => `
❌ *عذراً، المنتج غير متوفر*

المنتج "*${productName}*" نفد من المخزون حالياً.
سيتم إشعارك عند توفره مجدداً.
  `,

  insufficientBalance: (required, current) => `
❌ *رصيد غير كافٍ*

💰 رصيدك الحالي: *$${current.toFixed(2)}*
💳 المبلغ المطلوب: *$${required.toFixed(2)}*
📊 المبلغ الناقص: *$${(required - current).toFixed(2)}*

يمكنك شحن رصيدك الآن!
  `,

  purchaseSuccess: (product, accountData) => `
✅ *تم الشراء بنجاح!*

🎉 شكراً لشرائك من ${storeName}

📦 *المنتج:* ${product.name}
💰 *المبلغ المدفوع:* $${product.price.toFixed(2)}

🔑 *بيانات حسابك:*
\`\`\`
${accountData}
\`\`\`

⚠️ احتفظ بهذه البيانات في مكان آمن!
  `,

  // ===== رسائل شحن الرصيد =====
  rechargeInfo: (paymentInfo) => `
💳 *شحن الرصيد*

لشحن رصيدك، يرجى اتباع الخطوات التالية:

${paymentInfo}

📸 بعد إتمام الدفع، أرسل:
1️⃣ المبلغ الذي دفعته
2️⃣ صورة إثبات الدفع

⏱️ سيتم مراجعة طلبك خلال 24 ساعة
  `,

  rechargeAmountPrompt: `
💰 *أدخل المبلغ*

كم تريد شحن رصيدك؟
أدخل المبلغ بالدولار (مثال: 10)
  `,

  rechargeProofPrompt: (amount) => `
📸 *أرسل إثبات الدفع*

المبلغ: *$${amount}*

يرجى إرسال صورة إثبات الدفع الآن
  `,

  rechargeRequestSent: (requestId, amount) => `
✅ *تم إرسال طلب الشحن*

📋 رقم الطلب: *#${requestId}*
💰 المبلغ: *$${amount}*
⏱️ الحالة: قيد المراجعة

سيتم إشعارك فور مراجعة طلبك!
  `,

  rechargeApproved: (amount, newBalance) => `
✅ *تمت الموافقة على طلب الشحن!*

💰 المبلغ المضاف: *$${amount.toFixed(2)}*
💵 رصيدك الجديد: *$${newBalance.toFixed(2)}*

شكراً لثقتك بنا! 🎉
  `,

  rechargeRejected: (amount, note) => `
❌ *تم رفض طلب الشحن*

💰 المبلغ: *$${amount.toFixed(2)}*
📝 السبب: ${note || 'لم يتم تحديد السبب'}

يرجى التواصل مع الدعم لمزيد من المعلومات.
  `,

  // ===== رسائل المشتريات =====
  purchaseHistory: (purchases) => {
    if (!purchases || purchases.length === 0) {
      return '📦 *لا توجد مشتريات*\n\nلم تقم بأي عملية شراء بعد.';
    }
    
    let msg = '📦 *سجل مشترياتك*\n\n';
    purchases.forEach((p, i) => {
      const date = new Date(p.created_at).toLocaleDateString('ar-SA');
      msg += `${i + 1}. *${p.product_name}*\n`;
      msg += `   💰 $${p.amount.toFixed(2)} | 📅 ${date}\n\n`;
    });
    return msg;
  },

  // ===== رسائل الأدمن =====
  adminPanel: (stats) => `
🔧 *لوحة التحكم*

📊 *الإحصائيات:*
👥 المستخدمون: *${stats.totalUsers}* (نشط: ${stats.activeUsers})
💰 إجمالي الإيرادات: *$${stats.totalRevenue.toFixed(2)}*
💵 إيرادات اليوم: *$${stats.todayRevenue.toFixed(2)}*
🛒 إجمالي المبيعات: *${stats.totalPurchases}*
📦 المنتجات النشطة: *${stats.totalProducts}*
🗄️ المخزون: متاح ${stats.inventoryStats?.available || 0} / مباع ${stats.inventoryStats?.sold || 0}
⏳ طلبات معلقة: *${stats.pendingRequests}*
  `,

  adminRechargeRequest: (request) => `
💳 *طلب شحن رصيد جديد*

👤 المستخدم: ${request.full_name || 'غير معروف'} (@${request.username || 'N/A'})
🆔 المعرف: \`${request.user_id}\`
💰 المبلغ: *$${request.amount}*
💵 رصيده الحالي: $${request.balance.toFixed(2)}
📋 رقم الطلب: #${request.id}
📅 التاريخ: ${new Date(request.created_at).toLocaleString('ar-SA')}
  `,

  // ===== رسائل عامة =====
  invalidInput: '❌ مدخل غير صحيح، يرجى المحاولة مرة أخرى.',
  cancelled: '❌ تم إلغاء العملية.',
  error: '⚠️ حدث خطأ، يرجى المحاولة لاحقاً.',
  unauthorized: '🚫 ليس لديك صلاحية للوصول لهذا الأمر.',
  userBanned: '🚫 تم حظر حسابك. تواصل مع الدعم.',
  
  support: `
📞 *الدعم الفني*

للتواصل مع فريق الدعم:
📧 أرسل رسالتك وسيتم الرد عليك في أقرب وقت

⏱️ أوقات العمل: 24/7
  `
};

module.exports = messages;
