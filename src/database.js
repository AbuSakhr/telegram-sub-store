const fs = require('fs').promises;
const path = require('path');

// مسار ملف قاعدة البيانات
const DB_FILE = path.join(__dirname, 'database.json');

// الهيكل الأساسي للبيانات (يمكنك تعديله حسب احتياجات مشروعك)
let data = {
    users: [],
    subscriptions: []
};

// دالة التهيئة (تحميل البيانات أو إنشاء الملف إذا لم يكن موجوداً)
async function init() {
    try {
        const fileContent = await fs.readFile(DB_FILE, 'utf-8');
        data = JSON.parse(fileContent);
        console.log('✅ تم تحميل قاعدة البيانات بنجاح.');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('⚠️ ملف قاعدة البيانات غير موجود، سيتم إنشاؤه الآن...');
            await save();
        } else {
            console.error('❌ خطأ في قراءة قاعدة البيانات:', error);
        }
    }
}

// دالة لحفظ التغييرات في الملف
async function save() {
    try {
        await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('❌ خطأ أثناء حفظ البيانات:', error);
    }
}

// --- دوال التعامل مع البيانات (أمثلة يمكنك تعديلها) ---

async function addUser(id, username) {
    const exists = data.users.find(u => u.id === id);
    if (!exists) {
        data.users.push({ id, username, date: new Date().toISOString() });
        await save(); // نحفظ التغيير فوراً
        return true;
    }
    return false;
}

function getUser(id) {
    return data.users.find(u => u.id === id);
}

// تصدير الدوال ليتم استخدامها في bot.js
module.exports = {
    init,
    addUser,
    getUser,
    // أضف أي دوال أخرى تحتاجها هنا
};
