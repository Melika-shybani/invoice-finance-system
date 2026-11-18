import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 8000;

async function bootstrap() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 سرور سامانه مالی و صورتحساب با موفقیت راه‌اندازی شد`);
    console.log(`📡 پورت: http://localhost:${PORT}`);
    console.log(`📚 مستندات Swagger: http://localhost:${PORT}/api-docs`);
    console.log(`🩺 تست سلامت: http://localhost:${PORT}/health`);
    console.log(`=======================================================`);
  });
}

bootstrap().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
