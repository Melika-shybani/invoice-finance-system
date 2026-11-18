import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';
import { User } from './models/User.js';
import { seedDatabase } from './seed/seed.js';

const PORT = process.env.PORT || 8000;

async function bootstrap() {
  const conn = await connectDB();

  // در صورتی که دیتابیس خالی باشد یا متغیر AUTO_SEED فعال باشد، داده‌های اولیه خودکار درج می‌شوند
  if (conn) {
    try {
      const userCount = await User.countDocuments();
      if (userCount === 0 || process.env.AUTO_SEED === 'true') {
        console.log('[Bootstrap] پایگاه داده در حال آماده‌سازی و درج داده‌های پیش‌فرض اولیه (Seed)...');
        await seedDatabase();
        console.log('[Bootstrap] داده‌های اولیه با موفقیت درج شدند.');
      }
    } catch (seedErr) {
      console.warn('[Bootstrap] اخطار در بررسی یا درج داده‌های اولیه:', seedErr.message);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 سرور سامانه مالی و صورتحساب (Dockerized) آماده است`);
    console.log(`📡 پورت: http://localhost:${PORT}`);
    console.log(`📚 مستندات Swagger UI: http://localhost:${PORT}/api-docs`);
    console.log(`🩺 تست سلامت سرور: http://localhost:${PORT}/health`);
    console.log(`=======================================================`);
  });
}

bootstrap().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
