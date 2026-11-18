import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

// میان‌افزارها
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// اندپوینت بررسی سلامت سرور
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Invoice and Finance Management System',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// مستندات تعاملی Swagger API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'مستندات API سامانه مالی و صورتحساب الکترونیکی',
}));

// مسیرهای اصلی برنامه
app.use('/api', routes);

// مدیریت خطای ۴۰۴
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `مسیر مورد نظر یافت نشد: ${req.method} ${req.originalUrl}`,
  });
});

// میان‌افزار عمومی مدیریت خطا
app.use(errorHandler);

export default app;
