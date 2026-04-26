require("dotenv").config();
const { getDb } = require("../src/database");
const logger = require("../src/utils/logger");
const path = require("path");
const fs = require("fs");

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "data", "store.db");
const backupDir = path.join(process.cwd(), "data", "backups");

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const backupDb = () => {
  try {
    const db = getDb();
    const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
    const backupPath = path.join(backupDir, `store_backup_${timestamp}.db`);
    
    db.backup(backupPath)
      .then(() => {
        logger.info(`تم إنشاء نسخة احتياطية لقاعدة البيانات بنجاح: ${backupPath}`);
      })
      .catch((err) => {
        logger.error("خطأ في إنشاء النسخة الاحتياطية:", err);
      });
  } catch (error) {
    logger.error("خطأ في الوصول إلى قاعدة البيانات لإنشاء نسخة احتياطية:", error);
  }
};

backupDb();
