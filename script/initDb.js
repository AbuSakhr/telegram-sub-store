require("dotenv").config();
const { getDb } = require("../src/database");
const logger = require("../src/utils/logger");

logger.info("بدء تهيئة قاعدة البيانات...");
try {
  getDb(); // هذا سيقوم بإنشاء الجداول والمنتجات الأولية
  logger.info("تمت تهيئة قاعدة البيانات بنجاح.");
  process.exit(0);
} catch (error) {
  logger.error("خطأ في تهيئة قاعدة البيانات:", error);
  process.exit(1);
}
