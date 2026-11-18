import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Party } from '../models/Party.js';
import { Item } from '../models/Item.js';
import { Account } from '../models/Account.js';
import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { JournalEntry } from '../models/JournalEntry.js';
import { TaxLog } from '../models/TaxLog.js';
import { Settings } from '../models/Settings.js';
import { calculateInvoiceTotals, generateTaxId } from '../utils/calc.js';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function seedDatabase() {
  console.log('[Seed] پاک‌سازی داده‌های قبلی...');
  await Promise.all([
    User.deleteMany({}),
    Party.deleteMany({}),
    Item.deleteMany({}),
    Account.deleteMany({}),
    Invoice.deleteMany({}),
    Payment.deleteMany({}),
    JournalEntry.deleteMany({}),
    TaxLog.deleteMany({}),
    Settings.deleteMany({}),
  ]);

  console.log('[Seed] ایجاد کاربران پیش‌فرض...');
  const users = await User.create([
    {
      username: 'admin',
      password: 'admin123',
      fullName: 'مدیر ارشد سیستم',
      role: 'admin',
      active: true,
    },
    {
      username: 'acc',
      password: 'acc123',
      fullName: 'سارا حسابدار',
      role: 'accountant',
      active: true,
    },
    {
      username: 'sales',
      password: 'sales123',
      fullName: 'علی فروش',
      role: 'sales',
      active: true,
    },
  ]);

  console.log('[Seed] ایجاد طرف‌های حساب (مشتریان و تأمین‌کنندگان)...');
  const parties = await Party.create([
    {
      name: 'شرکت آرین تجارت',
      kind: 'customer',
      nationalId: '10101234567',
      economicCode: '411234567890',
      phone: '02188776655',
      address: 'تهران، خیابان ولیعصر، پلاک ۱۲',
    },
    {
      name: 'فروشگاه نیک‌آفرین',
      kind: 'customer',
      nationalId: '10209876543',
      economicCode: '411987654321',
      phone: '03132223344',
      address: 'اصفهان، چهارباغ بالا',
    },
    {
      name: 'مریم احمدی',
      kind: 'customer',
      nationalId: '0012345678',
      economicCode: '',
      phone: '09121234567',
      address: 'کرج، گوهردشت',
    },
    {
      name: 'تأمین‌کالای پارس',
      kind: 'supplier',
      nationalId: '10301112223',
      economicCode: '411112223334',
      phone: '02155443322',
      address: 'تهران، شهرک صنعتی عباس‌آباد',
    },
    {
      name: 'صنایع پیشرو',
      kind: 'both',
      nationalId: '10405556667',
      economicCode: '411555666778',
      phone: '05138887766',
      address: 'مشهد، بلوار وکیل‌آباد',
    },
  ]);

  console.log('[Seed] ایجاد کالاها و خدمات...');
  const items = await Item.create([
    { code: '1001', title: 'لپ‌تاپ ۱۵ اینچ', kind: 'good', price: 450000000, taxRate: 10, stock: 25 },
    { code: '1002', title: 'ماوس بی‌سیم', kind: 'good', price: 8500000, taxRate: 10, stock: 120 },
    { code: '1003', title: 'مانیتور ۲۴ اینچ', kind: 'good', price: 120000000, taxRate: 10, stock: 40 },
    { code: '2001', title: 'خدمات نصب و راه‌اندازی', kind: 'service', price: 25000000, taxRate: 10, stock: 0 },
    { code: '2002', title: 'قرارداد پشتیبانی ماهانه', kind: 'service', price: 60000000, taxRate: 10, stock: 0 },
  ]);

  console.log('[Seed] ایجاد حساب‌های صندوق و بانک...');
  const accounts = await Account.create([
    { kind: 'cash', title: 'صندوق مرکزی', accountNo: '', initial: 50000000 },
    { kind: 'bank', title: 'بانک ملی - جاری', accountNo: '0108 7654 3210', initial: 2000000000 },
    { kind: 'bank', title: 'بانک ملت - پس‌انداز', accountNo: '4455 1122 3300', initial: 500000000 },
  ]);

  console.log('[Seed] ایجاد تنظیمات شرکت و سامانه مالیاتی...');
  const settings = await Settings.create({
    sellerName: 'شرکت نمونه فناوری',
    sellerEconomicCode: '411000111222',
    sellerNationalId: '10100000001',
    memoryCode: 'A1B2C3',
    sim: { latencyMs: 1000, failRate: 0.1, forceReject: false },
  });

  console.log('[Seed] ثبت سند افتتاحیه حسابداری...');
  await JournalEntry.create({
    number: 1,
    date: daysAgo(150),
    description: 'سند افتتاحیه دوره مالی',
    lines: [
      { account: '1101', debit: 50000000, credit: 0 },
      { account: '1102', debit: 2500000000, credit: 0 },
      { account: '3101', debit: 0, credit: 2550000000 },
    ],
    auto: true,
  });

  // فاکتورهای نمونه
  console.log('[Seed] ایجاد صورتحساب‌های نمونه...');
  let invoiceCounter = 1;
  let journalCounter = 2;

  async function createSeedInvoice({ type, days, party, linesInput, status, taxRef, rejectReasons }) {
    const date = daysAgo(days);
    const lines = linesInput.map(l => {
      const it = items.find(x => x.code === l.code);
      return {
        itemId: it._id,
        title: it.title,
        qty: l.qty,
        unitPrice: it.price,
        discount: l.discount || 0,
        taxRate: it.taxRate,
      };
    });

    const totals = calculateInvoiceTotals(lines);
    const taxId = generateTaxId(settings.memoryCode, date, invoiceCounter);

    const inv = await Invoice.create({
      number: invoiceCounter++,
      type,
      date,
      partyId: party._id,
      lines,
      ...totals,
      status,
      cancelled: false,
      taxId,
      taxRef: taxRef || '',
      rejectReasons: rejectReasons || [],
      history: [
        {
          at: new Date(new Date(date).getTime() + 3600000),
          from: null,
          to: status,
          by: type === 'sale' ? 'علی فروش' : 'سارا حسابدار',
          note: status === 'confirmed' ? 'تأیید شده' : status === 'rejected' ? 'رد شده توسط مالیات' : 'ثبت اولیه',
        },
      ],
    });

    // در صورتی که تأیید شده است، سند حسابداری خودکار صادر شود
    if (status === 'confirmed') {
      const isSale = type === 'sale';
      const jLines = isSale
        ? [
            { account: '1201', debit: inv.total, credit: 0 },
            { account: '4101', debit: 0, credit: inv.net },
            { account: '2201', debit: 0, credit: inv.tax },
          ].filter(l => l.debit > 0 || l.credit > 0)
        : [
            { account: '5101', debit: inv.net, credit: 0 },
            { account: '2201', debit: inv.tax, credit: 0 },
            { account: '2101', debit: 0, credit: inv.total },
          ].filter(l => l.debit > 0 || l.credit > 0);

      await JournalEntry.create({
        number: journalCounter++,
        date: inv.date,
        description: `فاکتور ${isSale ? 'فروش' : 'خرید'} شماره ${inv.number}`,
        lines: jLines,
        auto: true,
        refId: inv._id.toString(),
      });
    }

    return inv;
  }

  // ۱. فاکتورهای فروش تأیید شده
  await createSeedInvoice({
    type: 'sale',
    days: 110,
    party: parties[0],
    linesInput: [{ code: '1001', qty: 3 }, { code: '2001', qty: 2 }],
    status: 'confirmed',
    taxRef: 'TX-101K9',
  });

  await createSeedInvoice({
    type: 'sale',
    days: 85,
    party: parties[1],
    linesInput: [{ code: '1003', qty: 5, discount: 10000000 }],
    status: 'confirmed',
    taxRef: 'TX-102K9',
  });

  await createSeedInvoice({
    type: 'sale',
    days: 60,
    party: parties[0],
    linesInput: [{ code: '1002', qty: 20 }, { code: '2002', qty: 1 }],
    status: 'confirmed',
    taxRef: 'TX-103K9',
  });

  await createSeedInvoice({
    type: 'sale',
    days: 40,
    party: parties[2],
    linesInput: [{ code: '1002', qty: 2 }],
    status: 'confirmed',
    taxRef: 'TX-104K9',
  });

  await createSeedInvoice({
    type: 'sale',
    days: 25,
    party: parties[1],
    linesInput: [{ code: '1001', qty: 1 }, { code: '2002', qty: 2 }],
    status: 'confirmed',
    taxRef: 'TX-105K9',
  });

  // ۲. فاکتورهای فروش در سایر وضعیت‌ها
  await createSeedInvoice({
    type: 'sale',
    days: 12,
    party: parties[4],
    linesInput: [{ code: '1003', qty: 2 }],
    status: 'sent',
  });

  await createSeedInvoice({
    type: 'sale',
    days: 6,
    party: parties[0],
    linesInput: [{ code: '2001', qty: 4 }],
    status: 'rejected',
    rejectReasons: ['E107: جمع ردیف‌ها با مبلغ کل همخوانی ندارد.'],
  });

  await createSeedInvoice({
    type: 'sale',
    days: 3,
    party: parties[1],
    linesInput: [{ code: '1002', qty: 5 }],
    status: 'ready',
  });

  await createSeedInvoice({
    type: 'sale',
    days: 1,
    party: parties[2],
    linesInput: [{ code: '2002', qty: 1 }],
    status: 'draft',
  });

  // ۳. فاکتورهای خرید (تأییدشده قطعی)
  await createSeedInvoice({
    type: 'purchase',
    days: 120,
    party: parties[3],
    linesInput: [{ code: '1001', qty: 2 }, { code: '1003', qty: 3 }],
    status: 'confirmed',
  });

  await createSeedInvoice({
    type: 'purchase',
    days: 70,
    party: parties[4],
    linesInput: [{ code: '1002', qty: 50 }],
    status: 'confirmed',
  });

  await createSeedInvoice({
    type: 'purchase',
    days: 30,
    party: parties[3],
    linesInput: [{ code: '1003', qty: 2 }],
    status: 'confirmed',
  });

  // ۴. دریافت‌ها و پرداخت‌ها
  console.log('[Seed] ایجاد تراکنش‌های دریافت و پرداخت...');
  let paymentCounter = 1;

  async function createSeedPayment({ direction, days, party, account, amount, method }) {
    const date = daysAgo(days);
    const p = await Payment.create({
      number: paymentCounter++,
      direction,
      date,
      partyId: party._id,
      accountId: account._id,
      amount,
      method: method || 'transfer',
      description: `${direction === 'in' ? 'دریافت از' : 'پرداخت به'} ${party.name}`,
    });

    const isIn = direction === 'in';
    const cashCode = account.kind === 'bank' ? '1102' : '1101';
    const jLines = isIn
      ? [
          { account: cashCode, debit: amount, credit: 0 },
          { account: '1201', debit: 0, credit: amount },
        ]
      : [
          { account: '2101', debit: amount, credit: 0 },
          { account: cashCode, debit: 0, credit: amount },
        ];

    await JournalEntry.create({
      number: journalCounter++,
      date,
      description: `${isIn ? 'دریافت از' : 'پرداخت به'} ${party.name} (${p.number})`,
      lines: jLines,
      auto: true,
      refId: p._id.toString(),
    });

    return p;
  }

  await createSeedPayment({ direction: 'in', days: 100, party: parties[0], account: accounts[1], amount: 1000000000 });
  await createSeedPayment({ direction: 'in', days: 80, party: parties[1], account: accounts[1], amount: 300000000 });
  await createSeedPayment({ direction: 'out', days: 50, party: parties[3], account: accounts[1], amount: 1000000000 });
  await createSeedPayment({ direction: 'in', days: 20, party: parties[2], account: accounts[0], amount: 10000000 });

  // ۵. سند هزینه عملیاتی (اجاره دفتر)
  await JournalEntry.create({
    number: journalCounter++,
    date: daysAgo(15),
    description: 'هزینه اجاره دفتر مرکزی',
    lines: [
      { account: '5201', debit: 120000000, credit: 0 },
      { account: '1102', debit: 0, credit: 120000000 },
    ],
    auto: false,
  });

  console.log('[Seed] داده‌های اولیه با موفقیت در پایگاه داده ایجاد شدند.');
}

// اجرای مستقیم اسکریپت
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase();
      console.log('✅ عملیات سید پایگاه داده به پایان رسید.');
      process.exit(0);
    } catch (err) {
      console.error('❌ خطا در سید پایگاه داده:', err);
      process.exit(1);
    }
  })();
}
