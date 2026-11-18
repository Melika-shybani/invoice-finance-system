export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'سامانه مدیریت مالی، حسابداری و صورتحساب الکترونیکی کسب‌وکار',
    version: '1.0.0',
    description: `API کامل سامانه مدیریت مالی و صورتحساب الکترونیکی توسعه داده شده با Node.js, Express و MongoDB
شامل مدیریت کاربران و سطوح دسترسی (RBAC)، مشتریان و تأمین‌کنندگان، کالاها و خدمات، فاکتورهای خرید و فروش، اسناد حسابداری دوبل تراز، صندوق و بانک، دریافت و پرداخت، شبیه‌ساز مالیاتی سامانه مودیان، گزارش‌های مالی و داشبورد مدیریتی.`,
  },
  servers: [
    {
      url: 'http://localhost:8000',
      description: 'سرور محلی توسعه (Development Server)',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'توکن JWT را به فرمت "Bearer {token}" ارسال فرمایید.',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string', example: 'admin' },
          fullName: { type: 'string', example: 'مدیر سیستم' },
          role: { type: 'string', enum: ['admin', 'accountant', 'sales'] },
          active: { type: 'boolean', example: true },
        },
      },
      Party: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'شرکت آرین تجارت' },
          kind: { type: 'string', enum: ['customer', 'supplier', 'both'] },
          nationalId: { type: 'string', example: '10101234567' },
          economicCode: { type: 'string', example: '411234567890' },
          phone: { type: 'string', example: '02188776655' },
          address: { type: 'string', example: 'تهران، خیابان ولیعصر، پلاک ۱۲' },
        },
      },
      Item: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          code: { type: 'string', example: '1001' },
          title: { type: 'string', example: 'لپ‌تاپ ۱۵ اینچ' },
          kind: { type: 'string', enum: ['good', 'service'] },
          price: { type: 'number', example: 450000000 },
          taxRate: { type: 'number', example: 10 },
          stock: { type: 'number', example: 25 },
        },
      },
      Invoice: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          number: { type: 'number', example: 1 },
          type: { type: 'string', enum: ['sale', 'purchase'] },
          date: { type: 'string', example: '2026-11-18' },
          partyId: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'ready', 'sent', 'confirmed', 'rejected'] },
          gross: { type: 'number', example: 450000000 },
          discount: { type: 'number', example: 0 },
          net: { type: 'number', example: 450000000 },
          tax: { type: 'number', example: 45000000 },
          total: { type: 'number', example: 495000000 },
          taxId: { type: 'string', example: 'A1B2C30006300000000018D' },
          taxRef: { type: 'string', example: 'TX-1234K9' },
          cancelled: { type: 'boolean', example: false },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          number: { type: 'number', example: 1 },
          direction: { type: 'string', enum: ['in', 'out'] },
          date: { type: 'string', example: '2026-11-18' },
          partyId: { type: 'string' },
          accountId: { type: 'string' },
          amount: { type: 'number', example: 100000000 },
          method: { type: 'string', enum: ['cash', 'card', 'transfer', 'cheque'] },
        },
      },
      JournalEntry: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          number: { type: 'number', example: 1 },
          date: { type: 'string', example: '2026-11-18' },
          description: { type: 'string', example: 'سند فروش شماره ۱' },
          auto: { type: 'boolean', example: true },
          lines: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                account: { type: 'string', example: '1201' },
                debit: { type: 'number', example: 495000000 },
                credit: { type: 'number', example: 0 },
              },
            },
          },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'بررسی سلامت سرور',
        tags: ['Health'],
        security: [],
        responses: {
          200: {
            description: 'وضعیت فعال بودن سرور',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string' },
                    uptime: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'ورود به سامانه و دریافت توکن JWT',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: 'admin123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'ورود موفقیت‌آمیز و بازگشت توکن' },
          401: { description: 'نام کاربری یا کلمه عبور نادرست' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'دریافت مشخصات کاربر جاری',
        tags: ['Authentication'],
        responses: {
          200: { description: 'مشخصات کاربر' },
          401: { description: 'عدم احراز هویت' },
        },
      },
    },
    '/api/dashboard': {
      get: {
        summary: 'دریافت اطلاعات داشبورد مدیریتی و KPIها',
        tags: ['Dashboard'],
        responses: {
          200: { description: 'شاخص‌های کلیدی، نمودارها و آمار فاکتورها' },
        },
      },
    },
    '/api/invoices': {
      get: {
        summary: 'لیست فاکتورها',
        tags: ['Invoices'],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['sale', 'purchase'] } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'لیست فاکتورها' } },
      },
      post: {
        summary: 'صدور فاکتور جدید',
        tags: ['Invoices'],
        responses: { 201: { description: 'فاکتور ایجاد شد' } },
      },
    },
    '/api/tax/invoices': {
      post: {
        summary: 'شبیه‌ساز درگاه ارسال صورتحساب مالیاتی',
        tags: ['Tax Authority Simulator'],
        security: [],
        responses: {
          200: { description: 'تأیید صورتحساب' },
          422: { description: 'رد صورتحساب همراه با کدهای خطا' },
        },
      },
    },
    '/api/reports/sales': {
      get: {
        summary: 'گزارش فروش در بازه زمانی',
        tags: ['Reports'],
        responses: { 200: { description: 'گزارش فروش' } },
      },
    },
    '/api/reports/balances': {
      get: {
        summary: 'گزارش بدهکاران و بستانکاران',
        tags: ['Reports'],
        responses: { 200: { description: 'مانده حساب طرف‌های حساب' } },
      },
    },
    '/api/reports/trial-balance': {
      get: {
        summary: 'تراز آزمایشی و دفتر کل',
        tags: ['Reports'],
        responses: { 200: { description: 'تراز حساب‌ها' } },
      },
    },
    '/api/reports/profit-loss': {
      get: {
        summary: 'گزارش سود و زیان',
        tags: ['Reports'],
        responses: { 200: { description: 'صورت سود و زیان ساده' } },
      },
    },
    '/api/reports/export/excel': {
      get: {
        summary: 'دریافت خروجی اکسل از گزارش‌ها',
        tags: ['Reports'],
        parameters: [
          { name: 'reportType', in: 'query', schema: { type: 'string', enum: ['sales', 'purchases', 'balances', 'trial'] } },
        ],
        responses: { 200: { description: 'فایل اکسل دانلود شد' } },
      },
    },
  },
};
