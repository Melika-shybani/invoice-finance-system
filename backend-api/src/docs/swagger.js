export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'سامانه مدیریت مالی، حسابداری و صورتحساب الکترونیکی کسب‌وکار',
    version: '1.0.0',
    description: `### مستندات کامل API سامانه مالی و صورتحساب الکترونیکی (ویژه اتصال فرانت‌اند)
توسعه‌یافته با Node.js, Express, MongoDB.

#### حساب‌های پیش‌فرض سامانه جهت تست سریع در Swagger:
- **مدیر سیستم:** \`username: admin\` | \`password: admin123\` (دسترسی کامل)
- **حسابدار:** \`username: acc\` | \`password: acc123\` (دسترسی مالی، اسناد، فاکتور و ارسال به مالیات)
- **کاربر فروش:** \`username: sales\` | \`password: sales123\` (تعریف مشتریان، کالاها و پیش‌نویس فاکتور)

**نحوه احراز هویت در Swagger:**
۱. ابتدا متد \`POST /api/auth/login\` را فراخوانی کرده و فیلد \`token\` را کپی کنید.
۲. روی دکمه سبز رنگ **Authorize** در بالای صفحه کلیک کنید.
۳. مقدار توکن را وارد کرده و دکمه **Authorize** را بزنید.`,
  },
  servers: [
    {
      url: 'http://localhost:8000',
      description: 'سرور محلی توسعه / داکر (http://localhost:8000)',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'توکن JWT دریافتی از لاگین را بدون کلمه Bearer وارد کنید.',
      },
    },
    schemas: {
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'admin' },
          password: { type: 'string', example: 'admin123' },
        },
      },
      UserCreateRequest: {
        type: 'object',
        required: ['username', 'password', 'fullName', 'role'],
        properties: {
          username: { type: 'string', example: 'user1' },
          password: { type: 'string', example: 'pass123' },
          fullName: { type: 'string', example: 'رضا حسینی' },
          role: { type: 'string', enum: ['admin', 'accountant', 'sales'], example: 'sales' },
          active: { type: 'boolean', example: true },
        },
      },
      PartyRequest: {
        type: 'object',
        required: ['name', 'kind'],
        properties: {
          name: { type: 'string', example: 'شرکت پترو صنعت پارس' },
          kind: { type: 'string', enum: ['customer', 'supplier', 'both'], example: 'customer' },
          nationalId: { type: 'string', example: '10109988776', description: 'شناسه ملی ۱۱ رقمی حقوقی یا کد ملی ۱۰ رقمی حقیقی' },
          economicCode: { type: 'string', example: '411998877665', description: 'کد اقتصادی ۱۲ تا ۱۴ رقم' },
          phone: { type: 'string', example: '02188990011' },
          address: { type: 'string', example: 'تهران، خیابان ولیعصر، برج سپهر' },
        },
      },
      ItemRequest: {
        type: 'object',
        required: ['code', 'title', 'price'],
        properties: {
          code: { type: 'string', example: '1004' },
          title: { type: 'string', example: 'کیبورد مکانیکی' },
          kind: { type: 'string', enum: ['good', 'service'], example: 'good' },
          price: { type: 'number', example: 15000000, description: 'قیمت واحد به ریال' },
          taxRate: { type: 'number', example: 10, description: 'درصد مالیات بر ارزش افزوده' },
          stock: { type: 'number', example: 50, description: 'موجودی انبار اولیه برای کالا' },
        },
      },
      AccountRequest: {
        type: 'object',
        required: ['kind', 'title'],
        properties: {
          kind: { type: 'string', enum: ['cash', 'bank'], example: 'bank' },
          title: { type: 'string', example: 'بانک پاسارگاد - جاری' },
          accountNo: { type: 'string', example: '201-8000-123456-1' },
          initial: { type: 'number', example: 500000000, description: 'موجودی افتتاحیه به ریال' },
        },
      },
      InvoiceLineInput: {
        type: 'object',
        required: ['itemId', 'qty', 'unitPrice'],
        properties: {
          itemId: { type: 'string', example: 'شناسه کالا از getItems' },
          title: { type: 'string', example: 'لپ‌تاپ ۱۵ اینچ' },
          qty: { type: 'number', example: 2 },
          unitPrice: { type: 'number', example: 450000000 },
          discount: { type: 'number', example: 10000000 },
          taxRate: { type: 'number', example: 10 },
        },
      },
      InvoiceCreateRequest: {
        type: 'object',
        required: ['type', 'date', 'partyId', 'lines'],
        properties: {
          type: { type: 'string', enum: ['sale', 'purchase'], example: 'sale' },
          date: { type: 'string', example: '2026-11-18', description: 'فرمت YYYY-MM-DD' },
          partyId: { type: 'string', example: 'شناسه مشتری یا تأمین‌کننده' },
          lines: {
            type: 'array',
            items: { $ref: '#/components/schemas/InvoiceLineInput' },
          },
          description: { type: 'string', example: 'فروش به شرکت آرین تجارت' },
        },
      },
      PaymentCreateRequest: {
        type: 'object',
        required: ['direction', 'date', 'partyId', 'accountId', 'amount'],
        properties: {
          direction: { type: 'string', enum: ['in', 'out'], example: 'in', description: 'in = دریافت وجه از مشتری | out = پرداخت وجه به تأمین‌کننده' },
          date: { type: 'string', example: '2026-11-18' },
          partyId: { type: 'string', example: 'شناسه طرف حساب' },
          accountId: { type: 'string', example: 'شناسه حساب صندوق یا بانک' },
          amount: { type: 'number', example: 500000000 },
          method: { type: 'string', enum: ['cash', 'card', 'transfer', 'cheque'], example: 'transfer' },
          invoiceId: { type: 'string', example: 'اختیاری: شناسه فاکتور مرتبط' },
          description: { type: 'string', example: 'تسویه فاکتور شماره ۱' },
        },
      },
      JournalEntryCreateRequest: {
        type: 'object',
        required: ['date', 'description', 'lines'],
        properties: {
          date: { type: 'string', example: '2026-11-18' },
          description: { type: 'string', example: 'هزینه شارژ و اینترنت دفتر' },
          lines: {
            type: 'array',
            description: 'حداقل ۲ ردیف بدهکار و بستانکار که جمع بدهکار دقیقاً مساوی با جمع بستانکار باشد',
            items: {
              type: 'object',
              required: ['account', 'debit', 'credit'],
              properties: {
                account: { type: 'string', example: '5201', description: 'کد حساب (1101=صندوق، 1102=بانک، 1201=بدهکاران، 2101=بستانکاران، 5201=هزینه‌ها)' },
                debit: { type: 'number', example: 25000000 },
                credit: { type: 'number', example: 0 },
              },
            },
          },
        },
      },
      SettingsUpdateRequest: {
        type: 'object',
        properties: {
          sellerName: { type: 'string', example: 'شرکت نمونه فناوری' },
          sellerEconomicCode: { type: 'string', example: '411000111222' },
          sellerNationalId: { type: 'string', example: '10100000001' },
          memoryCode: { type: 'string', example: 'A1B2C3', description: 'شناسه حافظه مالیاتی ۶ کاراکتری' },
          sim: {
            type: 'object',
            properties: {
              latencyMs: { type: 'number', example: 800 },
              failRate: { type: 'number', example: 0.05 },
              forceReject: { type: 'boolean', example: false },
            },
          },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        summary: 'تست سلامت سرور',
        tags: ['Health'],
        security: [],
        responses: {
          200: { description: 'وضعیت سرور پایدار است' },
        },
      },
    },
    // Authentication
    '/api/auth/login': {
      post: {
        summary: 'ورود به سامانه (Login) و دریافت توکن JWT',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          200: { description: 'ورود موفقیت‌آمیز و بازگشت توکن' },
          401: { description: 'نام کاربری یا کلمه عبور اشتباه است' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'دریافت مشخصات کاربر جاری لاگین شده',
        tags: ['Authentication'],
        responses: { 200: { description: 'مشخصات کاربر و نقش' } },
      },
    },
    '/api/auth/register': {
      post: {
        summary: 'ثبت کاربر جدید توسط مدیر سیستم (Admin Only)',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UserCreateRequest' } } },
        },
        responses: { 201: { description: 'کاربر ایجاد شد' } },
      },
    },
    // Users Management
    '/api/users': {
      get: {
        summary: 'لیست تمام کاربران سیستم (Admin Only)',
        tags: ['Users'],
        responses: { 200: { description: 'لیست کاربران' } },
      },
      post: {
        summary: 'ایجاد کاربر جدید (Admin Only)',
        tags: ['Users'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UserCreateRequest' } } },
        },
        responses: { 201: { description: 'کاربر با موفقیت ایجاد شد' } },
      },
    },
    '/api/users/{id}': {
      get: {
        summary: 'مشاهده مشخصات یک کاربر (Admin Only)',
        tags: ['Users'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'مشخصات کاربر' } },
      },
      put: {
        summary: 'ویرایش مشخصات یا نقش کاربر (Admin Only)',
        tags: ['Users'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fullName: { type: 'string' },
                  role: { type: 'string', enum: ['admin', 'accountant', 'sales'] },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'ویرایش با موفقیت انجام شد' } },
      },
      delete: {
        summary: 'حذف کاربر (Admin Only)',
        tags: ['Users'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'کاربر حذف شد' } },
      },
    },
    '/api/users/{id}/toggle-status': {
      patch: {
        summary: 'تغییر وضعیت فعال/غیرفعال کاربر (Admin Only)',
        tags: ['Users'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'وضعیت کاربر تغییر یافت' } },
      },
    },
    // Parties
    '/api/parties': {
      get: {
        summary: 'لیست مشتریان و تأمین‌کنندگان',
        tags: ['Parties'],
        parameters: [
          { name: 'kind', in: 'query', schema: { type: 'string', enum: ['customer', 'supplier', 'both'] } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'جستجو در نام، شناسه ملی یا تلفن' },
        ],
        responses: { 200: { description: 'لیست طرف‌های حساب' } },
      },
      post: {
        summary: 'تعریف مشتری یا تأمین‌کننده جدید',
        tags: ['Parties'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PartyRequest' } } },
        },
        responses: { 201: { description: 'طرف حساب با موفقیت ایجاد شد' } },
      },
    },
    '/api/parties/{id}': {
      get: {
        summary: 'مشاهده مشخصات یک طرف حساب',
        tags: ['Parties'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'مشخصات طرف حساب' } },
      },
      put: {
        summary: 'ویرایش اطلاعات طرف حساب',
        tags: ['Parties'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PartyRequest' } } },
        },
        responses: { 200: { description: 'طرف حساب به‌روزرسانی شد' } },
      },
      delete: {
        summary: 'حذف طرف حساب (در صورت عدم وجود تراکنش)',
        tags: ['Parties'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'طرف حساب حذف شد' } },
      },
    },
    '/api/parties/{id}/statement': {
      get: {
        summary: 'گردش حساب تفصیلی طرف حساب (Account Statement) با مانده لحظه‌ای',
        tags: ['Parties'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'string' }, description: 'از تاریخ YYYY-MM-DD' },
          { name: 'to', in: 'query', schema: { type: 'string' }, description: 'تا تاریخ YYYY-MM-DD' },
        ],
        responses: { 200: { description: 'لیست فاکتورها، دریافت‌ها، پرداخت‌ها و مانده خط به خط' } },
      },
    },
    // Items
    '/api/items': {
      get: {
        summary: 'لیست کالاها و خدمات',
        tags: ['Items'],
        parameters: [
          { name: 'kind', in: 'query', schema: { type: 'string', enum: ['good', 'service'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'لیست اقلام' } },
      },
      post: {
        summary: 'تعریف کالا یا خدمت جدید',
        tags: ['Items'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ItemRequest' } } },
        },
        responses: { 201: { description: 'کالا/خدمت ایجاد شد' } },
      },
    },
    '/api/items/{id}': {
      get: {
        summary: 'مشاهده مشخصات کالا یا خدمت',
        tags: ['Items'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'مشخصات آیتم' } },
      },
      put: {
        summary: 'ویرایش کالا یا خدمت',
        tags: ['Items'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ItemRequest' } } },
        },
        responses: { 200: { description: 'آیتم ویرایش شد' } },
      },
      delete: {
        summary: 'حذف کالا یا خدمت (در صورت عدم استفاده در فاکتورها)',
        tags: ['Items'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'آیتم حذف شد' } },
      },
    },
    // Accounts (صندوق و بانک)
    '/api/accounts': {
      get: {
        summary: 'لیست حساب‌های صندوق و بانک همراه با محاسبه مانده لحظه‌ای',
        tags: ['Accounts'],
        responses: { 200: { description: 'لیست حساب‌ها و مانده‌ها' } },
      },
      post: {
        summary: 'تعریف حساب صندوق یا بانک جدید',
        tags: ['Accounts'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AccountRequest' } } },
        },
        responses: { 201: { description: 'حساب ایجاد شد' } },
      },
    },
    '/api/accounts/{id}': {
      get: {
        summary: 'مشاهده جزئیات حساب صندوق یا بانک و تراکنش‌های آن',
        tags: ['Accounts'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'مشخصات حساب' } },
      },
      put: {
        summary: 'ویرایش حساب صندوق یا بانک',
        tags: ['Accounts'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AccountRequest' } } },
        },
        responses: { 200: { description: 'حساب ویرایش شد' } },
      },
      delete: {
        summary: 'حذف حساب (در صورت عدم وجود تراکنش مالی)',
        tags: ['Accounts'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'حساب حذف شد' } },
      },
    },
    // Invoices
    '/api/invoices': {
      get: {
        summary: 'لیست فاکتورها با قابلیت فیلتر نوع، وضعیت و تاریخ',
        tags: ['Invoices'],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['sale', 'purchase'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'ready', 'sent', 'confirmed', 'rejected'] } },
          { name: 'partyId', in: 'query', schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'string' } },
          { name: 'to', in: 'query', schema: { type: 'string' } },
          { name: 'cancelled', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { 200: { description: 'لیست فاکتورها' } },
      },
      post: {
        summary: 'صدور فاکتور جدید (فروش یا خرید)',
        description: 'در فاکتور خرید مستقیم تأیید شده و انبار و سند صادر می‌شود. در فاکتور فروش ابتدا در وضعیت پیش‌نویس قرار می‌گیرد.',
        tags: ['Invoices'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceCreateRequest' } } },
        },
        responses: { 201: { description: 'فاکتور صادر شد' } },
      },
    },
    '/api/invoices/{id}': {
      get: {
        summary: 'مشاهده جزئیات کامل فاکتور و تاریخچه وضعیت‌ها',
        tags: ['Invoices'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'مشخصات کامل فاکتور' } },
      },
      put: {
        summary: 'ویرایش فاکتور پیش‌نویس یا ردشده',
        tags: ['Invoices'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceCreateRequest' } } },
        },
        responses: { 200: { description: 'فاکتور ویرایش شد' } },
      },
      delete: {
        summary: 'حذف فاکتور پیش‌نویس (فقط پیش‌نویس‌ها قابل حذف هستند)',
        tags: ['Invoices'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'پیش‌نویس فاکتور حذف شد' } },
      },
    },
    '/api/invoices/{id}/validate': {
      post: {
        summary: 'اعتبارسنجی صورتحساب الکترونیکی قبل از ارسال',
        tags: ['Invoices'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'نتیجه اعتبارسنجی و لیست خطاها در صورت وجود' } },
      },
    },
    '/api/invoices/{id}/ready': {
      post: {
        summary: 'اعتبارسنجی و انتقال صورتحساب به وضعیت «آماده ارسال»',
        tags: ['Invoices'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'انتقال موفق به وضعیت آماده ارسال' },
          422: { description: 'وجود خطاهای اعتبارسنجی' },
        },
      },
    },
    '/api/invoices/{id}/send': {
      post: {
        summary: 'ارسال صورتحساب به درگاه مودیان سامانه مالیاتی',
        description: 'در صورت تأیید سامانه مالیاتی، فاکتور تأیید شده، موجودی انبار کسر گردیده و سند حسابداری خودکار صادر می‌شود.',
        tags: ['Invoices'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'نتیجه ارسال به سامانه مالیاتی (تأییدشده با taxRef یا ردشده با دلایل خطا)' } },
      },
    },
    '/api/invoices/{id}/amend': {
      post: {
        summary: 'ایجاد فاکتور اصلاحیه از روی فاکتور ارسال‌شده یا تأییدشده',
        tags: ['Invoices'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 201: { description: 'پیش‌نویس اصلاحیه با ارجاع به فاکتور اصلی صادر شد' } },
      },
    },
    '/api/invoices/{id}/cancel': {
      post: {
        summary: 'ابطال صورتحساب، بازگردانی موجودی انبار و ثبت سند معکوس در حسابداری',
        tags: ['Invoices'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: { type: 'string', example: 'انصراف خریدار از دریافت سفارش' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'صورتحساب باطل شد' } },
      },
    },
    // Payments
    '/api/payments': {
      get: {
        summary: 'لیست اسناد دریافت و پرداخت',
        tags: ['Payments'],
        parameters: [
          { name: 'direction', in: 'query', schema: { type: 'string', enum: ['in', 'out'] } },
          { name: 'partyId', in: 'query', schema: { type: 'string' } },
          { name: 'accountId', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'لیست دریافت‌ها و پرداخت‌ها' } },
      },
      post: {
        summary: 'ثبت دریافت یا پرداخت جدید و صدور خودکار سند حسابداری متناظر',
        tags: ['Payments'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentCreateRequest' } } },
        },
        responses: { 201: { description: 'دریافت/پرداخت ثبت شد و سند حسابداری خودکار صادر گردید' } },
      },
    },
    '/api/payments/{id}': {
      get: {
        summary: 'مشاهده جزئیات یک دریافت یا پرداخت',
        tags: ['Payments'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'مشخصات سند دریافت/پرداخت' } },
      },
      delete: {
        summary: 'حذف سند دریافت/پرداخت و سند حسابداری متناظر',
        tags: ['Payments'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'سند دریافت/پرداخت حذف شد' } },
      },
    },
    // Journal Entries
    '/api/journal': {
      get: {
        summary: 'لیست اسناد حسابداری دوبل',
        tags: ['Journal Entries'],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string' } },
          { name: 'to', in: 'query', schema: { type: 'string' } },
          { name: 'auto', in: 'query', schema: { type: 'boolean' }, description: 'فیلتر اسناد خودکار یا دستی' },
        ],
        responses: { 200: { description: 'اسناد حسابداری' } },
      },
      post: {
        summary: 'ثبت سند حسابداری دستی (با کنترل سخت‌گیرانه تراز بودن)',
        tags: ['Journal Entries'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/JournalEntryCreateRequest' } } },
        },
        responses: {
          201: { description: 'سند حسابداری ثبت شد' },
          400: { description: 'سند حسابداری تراز نیست' },
        },
      },
    },
    '/api/journal/{id}': {
      get: {
        summary: 'مشاهده جزئیات سند حسابداری و کدهای معین',
        tags: ['Journal Entries'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'مشخصات سند حسابداری' } },
      },
      delete: {
        summary: 'حذف سند حسابداری دستی (اسناد سیستمی خودکار قابل حذف نیستند)',
        tags: ['Journal Entries'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'سند حسابداری حذف شد' } },
      },
    },
    // Tax Authority Simulator
    '/api/tax/invoices': {
      post: {
        summary: 'شبیه‌ساز REST API ارسال مستقیم به سامانه مالیاتی',
        description: 'جهت ارسال فرمت استاندارد سامانه مودیان و تست پاسخ‌های سرور مالیاتی',
        tags: ['Tax Authority Simulator'],
        security: [],
        responses: {
          200: { description: 'پاسخ پذیرش صورتحساب (Accepted)' },
          422: { description: 'پاسخ رد صورتحساب با خطاهای مربوطه' },
        },
      },
    },
    '/api/tax/logs': {
      get: {
        summary: 'مشاهده لاگ‌های کلیه فراخوانی‌های درگاه مالیاتی (Audit Logs)',
        tags: ['Tax Authority Simulator'],
        responses: { 200: { description: 'لیست درخواست‌ها، پاسخ‌ها، زمان و وضعیت HTTP' } },
      },
    },
    // Reports
    '/api/reports/sales': {
      get: {
        summary: 'گزارش تجمیعی و تفصیلی فروش در بازه زمانی',
        tags: ['Reports'],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string' } },
          { name: 'to', in: 'query', schema: { type: 'string' } },
          { name: 'partyId', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'مجموع ناخالص، تخفیف، خالص، مالیات و فاکتورها' } },
      },
    },
    '/api/reports/purchases': {
      get: {
        summary: 'گزارش خرید و هزینه‌های عملیاتی در بازه زمانی',
        tags: ['Reports'],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string' } },
          { name: 'to', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'گزارش خریدها و هزینه‌ها' } },
      },
    },
    '/api/reports/balances': {
      get: {
        summary: 'گزارش بدهکاران و بستانکاران (مانده حساب مشتریان و تأمین‌کنندگان)',
        tags: ['Reports'],
        parameters: [{ name: 'to', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'مانده هر شخص، مجموع مطالبات و مجموع بدهی‌ها' } },
      },
    },
    '/api/reports/profit-loss': {
      get: {
        summary: 'صورت سود و زیان ساده دوره مالی',
        tags: ['Reports'],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string' } },
          { name: 'to', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'درآمد فروش، بهای تمام‌شده، هزینه‌های عمومی و سود خالص' } },
      },
    },
    '/api/reports/trial-balance': {
      get: {
        summary: 'تراز آزمایشی و دفتر کل حساب‌ها',
        tags: ['Reports'],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string' } },
          { name: 'to', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'گردش بدهکار، گردش بستانکار و مانده هر کد حساب' } },
      },
    },
    '/api/reports/journal': {
      get: {
        summary: 'دفتر روزنامه (Journal Book Report)',
        tags: ['Reports'],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string' } },
          { name: 'to', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'دفتر روزنامه خط به خط' } },
      },
    },
    '/api/reports/export/excel': {
      get: {
        summary: 'دریافت خروجی مستقیم فایل اکسل (.xlsx) از گزارش‌ها',
        tags: ['Reports'],
        parameters: [
          { name: 'reportType', in: 'query', required: true, schema: { type: 'string', enum: ['sales', 'purchases', 'balances', 'trial'] } },
          { name: 'from', in: 'query', schema: { type: 'string' } },
          { name: 'to', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'فایل اکسل دانلود شد',
            content: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {} },
          },
        },
      },
    },
    '/api/reports/export/csv': {
      get: {
        summary: 'دریافت خروجی CSV با انکودینگ UTF-8 BOM',
        tags: ['Reports'],
        parameters: [
          { name: 'reportType', in: 'query', schema: { type: 'string', enum: ['sales', 'purchases', 'balances', 'trial'] } },
        ],
        responses: {
          200: {
            description: 'فایل CSV با موفقیت دریافت شد',
            content: { 'text/csv': {} },
          },
        },
      },
    },
    // Dashboard
    '/api/dashboard': {
      get: {
        summary: 'داشبورد مدیریتی و شاخص‌های کلیدی (KPIs)',
        tags: ['Dashboard'],
        responses: {
          200: {
            description: 'مجموع فروش، هزینه، سود، مطالبات، تعداد فاکتورها به تفکیک وضعیت و روند ۶ ماهه',
          },
        },
      },
    },
    // Settings
    '/api/settings': {
      get: {
        summary: 'مشاهده تنظیمات شرکت و پارامترهای شبیه‌ساز مالیاتی',
        tags: ['Settings'],
        responses: { 200: { description: 'تنظیمات جاری مودی و سامانه' } },
      },
      put: {
        summary: 'به‌روزرسانی تنظیمات مودی یا شبیه‌ساز مالیاتی (Admin Only)',
        tags: ['Settings'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SettingsUpdateRequest' } } },
        },
        responses: { 200: { description: 'تنظیمات به‌روزرسانی شد' } },
      },
    },
  },
};
