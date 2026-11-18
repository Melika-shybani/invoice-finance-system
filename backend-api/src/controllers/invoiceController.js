import { Invoice } from '../models/Invoice.js';
import { Item } from '../models/Item.js';
import { Party } from '../models/Party.js';
import { JournalEntry } from '../models/JournalEntry.js';
import { Settings } from '../models/Settings.js';
import { TaxLog } from '../models/TaxLog.js';
import { calculateInvoiceTotals, generateTaxId } from '../utils/calc.js';
import { validateInvoiceData } from '../utils/taxValidator.js';

/**
 * دریافت لیست فاکتورها با امکان فیلتر
 */
export async function listInvoices(req, res, next) {
  try {
    const { type, status, partyId, from, to, cancelled } = req.query;
    const query = {};

    if (type && ['sale', 'purchase'].includes(type)) query.type = type;
    if (status) query.status = status;
    if (partyId) query.partyId = partyId;
    if (cancelled !== undefined) query.cancelled = cancelled === 'true';

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }

    const invoices = await Invoice.find(query)
      .populate('partyId', 'name nationalId economicCode kind phone')
      .sort({ date: -1, number: -1 });

    res.json({
      success: true,
      data: invoices.map(i => i.toJSON()),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * دریافت جزئیات یک فاکتور
 */
export async function getInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('partyId', 'name nationalId economicCode kind phone address')
      .populate('refId', 'number date taxId total');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'صورتحساب یافت نشد.' });
    }

    res.json({ success: true, data: invoice.toJSON() });
  } catch (err) {
    next(err);
  }
}

/**
 * صدور فاکتور جدید (فروش یا خرید)
 */
export async function createInvoice(req, res, next) {
  try {
    const { type, date, partyId, lines, description, refId } = req.body;
    if (!type || !date || !partyId || !lines || lines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'نوع فاکتور، تاریخ، طرف حساب و ردیف‌های کالا الزامی هستند.',
      });
    }

    const party = await Party.findById(partyId);
    if (!party) {
      return res.status(404).json({ success: false, message: 'طرف حساب انتخاب‌شده معتبر نیست.' });
    }

    // بررسی کالاها و آماده‌سازی ردیف‌ها
    const itemIds = lines.map(l => l.itemId);
    const dbItems = await Item.find({ _id: { $in: itemIds } });
    const itemMap = new Map(dbItems.map(it => [it._id.toString(), it]));

    const processedLines = lines.map(line => {
      const dbItem = itemMap.get(line.itemId?.toString());
      return {
        itemId: line.itemId,
        title: line.title || dbItem?.title || 'کالا/خدمت',
        qty: Number(line.qty) || 1,
        unitPrice: Number(line.unitPrice) !== undefined ? Number(line.unitPrice) : (dbItem?.price || 0),
        discount: Number(line.discount) || 0,
        taxRate: Number(line.taxRate) !== undefined ? Number(line.taxRate) : (dbItem?.taxRate || 10),
      };
    });

    const totals = calculateInvoiceTotals(processedLines);

    // شماره فاکتور افزایشی بر اساس نوع
    const lastInvoice = await Invoice.findOne({ type }).sort({ number: -1 });
    const number = lastInvoice ? lastInvoice.number + 1 : 1;

    // شماره سریال کلی برای شناسه مالیاتی
    const totalCount = await Invoice.countDocuments();
    const serial = totalCount + 1;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }

    const taxId = generateTaxId(settings.memoryCode, date, serial);
    const isPurchase = type === 'purchase';
    const initialStatus = isPurchase ? 'confirmed' : 'draft';
    const userName = req.user?.fullName || 'کاربر سیستم';

    const invoice = new Invoice({
      number,
      type,
      date,
      partyId,
      lines: processedLines,
      ...totals,
      status: initialStatus,
      cancelled: false,
      taxId,
      refId: refId || null,
      description: description || '',
      history: [
        {
          at: new Date(),
          from: null,
          to: initialStatus,
          by: userName,
          note: isPurchase ? 'ثبت و تأیید قطعی فاکتور خرید' : 'ایجاد پیش‌نویس صورتحساب فروش',
        },
      ],
    });

    await invoice.save();

    // در فاکتور خرید: افزایش موجودی انبار و ثبت سند حسابداری خودکار
    if (isPurchase) {
      await finalizeInvoice(invoice);
    }

    const populated = await Invoice.findById(invoice._id).populate('partyId', 'name nationalId economicCode');
    res.status(201).json({
      success: true,
      message: `${isPurchase ? 'فاکتور خرید با موفقیت ثبت و تأیید شد.' : 'پیش‌نویس فاکتور فروش ایجاد گردید.'}`,
      data: populated.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * ویرایش صورتحساب (تنها در وضعیت پیش‌نویس یا ردشده)
 */
export async function updateInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'صورتحساب یافت نشد.' });
    }

    if (invoice.type === 'purchase') {
      return res.status(400).json({ success: false, message: 'فاکتور خرید نهایی شده و قابل ویرایش نیست.' });
    }

    if (!['draft', 'ready', 'rejected'].includes(invoice.status)) {
      return res.status(400).json({
        success: false,
        message: 'این صورتحساب در وضعیت ارسال‌شده یا تأییدشده قرار دارد و قابل ویرایش نیست. از گزینه اصلاحیه استفاده فرمایید.',
      });
    }

    const { date, partyId, lines, description } = req.body;
    if (date) invoice.date = date;
    if (partyId) invoice.partyId = partyId;
    if (description !== undefined) invoice.description = description;

    if (lines && lines.length > 0) {
      invoice.lines = lines;
      const totals = calculateInvoiceTotals(lines);
      invoice.gross = totals.gross;
      invoice.discount = totals.discount;
      invoice.net = totals.net;
      invoice.tax = totals.tax;
      invoice.total = totals.total;
    }

    const prevStatus = invoice.status;
    invoice.status = 'draft';
    invoice.rejectReasons = [];

    invoice.history.push({
      at: new Date(),
      from: prevStatus,
      to: 'draft',
      by: req.user?.fullName || 'کاربر سیستم',
      note: 'ویرایش اطلاعات و بازگشت به پیش‌نویس',
    });

    await invoice.save();
    const updated = await Invoice.findById(invoice._id).populate('partyId', 'name nationalId');
    res.json({
      success: true,
      message: 'صورتحساب با موفقیت به‌روزرسانی شد.',
      data: updated.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * حذف پیش‌نویس صورتحساب
 */
export async function deleteInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'صورتحساب یافت نشد.' });
    }

    if (invoice.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'فقط صورتحساب‌های در وضعیت پیش‌نویس قابل حذف هستند.',
      });
    }

    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'پیش‌نویس صورتحساب با موفقیت حذف شد.' });
  } catch (err) {
    next(err);
  }
}

/**
 * اعتبارسنجی صورتحساب
 */
export async function validateInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('partyId');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'صورتحساب یافت نشد.' });
    }

    const settings = (await Settings.findOne()) || new Settings();
    const issues = validateInvoiceData(invoice, settings, invoice.partyId);

    res.json({
      success: true,
      valid: issues.length === 0,
      issues,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * انتقال صورتحساب به وضعیت «آماده ارسال» پس از اعتبارسنجی
 */
export async function markReady(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('partyId');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'صورتحساب یافت نشد.' });
    }

    const settings = (await Settings.findOne()) || new Settings();
    const issues = validateInvoiceData(invoice, settings, invoice.partyId);

    if (issues.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'صورتحساب دارای خطاهای اعتبارسنجی است و نمی‌تواند آماده ارسال شود.',
        issues,
      });
    }

    const prevStatus = invoice.status;
    invoice.status = 'ready';
    invoice.rejectReasons = [];
    invoice.history.push({
      at: new Date(),
      from: prevStatus,
      to: 'ready',
      by: req.user?.fullName || 'کاربر سیستم',
      note: 'اعتبارسنجی موفق اطلاعات صورتحساب',
    });

    await invoice.save();
    res.json({
      success: true,
      message: 'صورتحساب با موفقیت اعتبارسنجی و به وضعیت «آماده ارسال» منتقل شد.',
      data: invoice.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * ارسال صورتحساب به شبیه‌ساز سامانه مالیاتی
 */
export async function sendInvoiceToTax(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('partyId');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'صورتحساب یافت نشد.' });
    }

    if (invoice.cancelled) {
      return res.status(400).json({ success: false, message: 'صورتحساب باطل شده است و امکان ارسال ندارد.' });
    }

    const settings = (await Settings.findOne()) || new Settings();
    const userName = req.user?.fullName || 'حسابدار سیستم';

    // وضعیت موقت ارسال‌شده
    invoice.status = 'sent';
    invoice.history.push({
      at: new Date(),
      from: invoice.status,
      to: 'sent',
      by: userName,
      note: 'ارسال به سامانه مودیان مالیاتی (POST /api/tax/invoices)',
    });
    await invoice.save();

    // ایجاد بدنه درخواست مالیاتی
    const startTime = Date.now();
    const taxRequest = {
      taxId: invoice.taxId,
      indati: invoice.date,
      inty: 1,
      inno: invoice.number,
      irtaxid: invoice.refId ? (await Invoice.findById(invoice.refId))?.taxId : null,
      seller: {
        name: settings.sellerName,
        economicCode: settings.sellerEconomicCode,
        memoryCode: settings.memoryCode,
      },
      buyer: {
        name: invoice.partyId?.name || '',
        nationalId: invoice.partyId?.nationalId || '',
        economicCode: invoice.partyId?.economicCode || '',
      },
      header: {
        tprdis: invoice.gross,
        tdis: invoice.discount,
        tadis: invoice.net,
        tvam: invoice.tax,
        tbill: invoice.total,
      },
      body: invoice.lines.map(l => {
        const net = (l.qty * l.unitPrice) - l.discount;
        const vam = Math.round((net * l.taxRate) / 100);
        return {
          title: l.title,
          am: l.qty,
          fee: l.unitPrice,
          dis: l.discount,
          vra: l.taxRate,
          vam,
          tsstam: net + vam,
        };
      }),
    };

    // شبیه‌سازی تاخیر و قوانین سرور مالیاتی
    const { latencyMs = 500, failRate = 0, forceReject = false } = settings.sim || {};
    if (latencyMs > 0) {
      await new Promise(r => setTimeout(r, Math.min(latencyMs, 2000)));
    }

    const errors = validateInvoiceData(invoice, settings, invoice.partyId);

    if (forceReject) {
      errors.push({ code: 'E900', message: 'رد اجباری توسط تنظیمات شبیه‌ساز مالیاتی.' });
    } else if (Math.random() < failRate) {
      errors.push({ code: 'E500', message: 'خطای موقت سرور سامانه مالیاتی؛ لطفاً مجدداً تلاش فرمایید.' });
    }

    const accepted = errors.length === 0;
    const duration = Date.now() - startTime;

    let responsePayload;
    if (accepted) {
      const refNumber = `TX-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 8999 + 1000)}`;
      responsePayload = {
        status: 'accepted',
        referenceNumber: refNumber,
      };

      invoice.status = 'confirmed';
      invoice.taxRef = refNumber;
      invoice.rejectReasons = [];
      invoice.history.push({
        at: new Date(),
        from: 'sent',
        to: 'confirmed',
        by: 'سامانه مالیاتی',
        note: `صورتحساب با موفقیت توسط سامانه مالیاتی تأیید شد. (کد پیگیری: ${refNumber})`,
      });

      await invoice.save();
      // ثبت سند حسابداری و کسر موجودی انبار
      await finalizeInvoice(invoice);
    } else {
      const reasons = errors.map(e => `${e.code}: ${e.message}`);
      responsePayload = {
        status: 'rejected',
        errors,
      };

      invoice.status = 'rejected';
      invoice.rejectReasons = reasons;
      invoice.history.push({
        at: new Date(),
        from: 'sent',
        to: 'rejected',
        by: 'سامانه مالیاتی',
        note: reasons.join(' | '),
      });

      await invoice.save();
    }

    // ثبت در لاگ مالیاتی
    const taxLog = new TaxLog({
      at: new Date(),
      method: 'POST',
      url: '/api/tax/invoices',
      request: taxRequest,
      status: accepted ? 200 : errors.some(e => e.code === 'E500') ? 503 : 422,
      response: responsePayload,
      ms: duration,
    });
    await taxLog.save();

    res.json({
      success: true,
      status: invoice.status,
      taxRef: invoice.taxRef,
      rejectReasons: invoice.rejectReasons,
      data: invoice.toJSON(),
      log: taxLog.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * ایجاد پیش‌نویس اصلاحیه بر مبنای صورتحساب تأییدشده
 */
export async function amendInvoice(req, res, next) {
  try {
    const orig = await Invoice.findById(req.params.id);
    if (!orig) {
      return res.status(404).json({ success: false, message: 'صورتحساب اصلی یافت نشد.' });
    }

    if (!['sent', 'confirmed'].includes(orig.status)) {
      return res.status(400).json({
        success: false,
        message: 'تنها از صورتحساب‌های ارسال‌شده یا تأییدشده می‌توان اصلاحیه تهیه کرد.',
      });
    }

    const lastInvoice = await Invoice.findOne({ type: orig.type }).sort({ number: -1 });
    const number = lastInvoice ? lastInvoice.number + 1 : 1;

    const totalCount = await Invoice.countDocuments();
    const serial = totalCount + 1;

    const settings = (await Settings.findOne()) || new Settings();
    const today = new Date().toISOString().slice(0, 10);
    const taxId = generateTaxId(settings.memoryCode, today, serial);

    const amendment = new Invoice({
      number,
      type: orig.type,
      date: today,
      partyId: orig.partyId,
      lines: orig.lines.map(l => ({ ...l.toObject() })),
      gross: orig.gross,
      discount: orig.discount,
      net: orig.net,
      tax: orig.tax,
      total: orig.total,
      status: 'draft',
      cancelled: false,
      taxId,
      refId: orig._id,
      description: `اصلاحیه صورتحساب شماره ${orig.number}`,
      history: [
        {
          at: new Date(),
          from: null,
          to: 'draft',
          by: req.user?.fullName || 'کاربر سیستم',
          note: `ایجاد پیش‌نویس اصلاحیه بر روی صورتحساب شماره ${orig.number}`,
        },
      ],
    });

    await amendment.save();
    const populated = await Invoice.findById(amendment._id).populate('partyId', 'name nationalId');
    res.status(201).json({
      success: true,
      message: `پیش‌نویس اصلاحیه صورتحساب شماره ${orig.number} با موفقیت ایجاد گردید.`,
      data: populated.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * ابطال صورتحساب و ایجاد سند معکوس و برگشت انبار
 */
export async function cancelInvoice(req, res, next) {
  try {
    const { reason } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'صورتحساب یافت نشد.' });
    }

    if (invoice.cancelled) {
      return res.status(400).json({ success: false, message: 'این صورتحساب قبلاً باطل شده است.' });
    }

    if (invoice.status === 'draft') {
      return res.status(400).json({
        success: false,
        message: 'صورتحساب پیش‌نویس نیازی به ابطال ندارد و می‌توانید آن را حذف فرمایید.',
      });
    }

    const wasPosted = invoice.status === 'confirmed';
    invoice.cancelled = true;
    invoice.history.push({
      at: new Date(),
      from: invoice.status,
      to: 'cancelled',
      by: req.user?.fullName || 'کاربر سیستم',
      note: reason || 'ابطال صورتحساب توسط کاربر',
    });
    await invoice.save();

    // در صورتی که صورتحساب قطعی شده بود، موجودی کالا برگشت داده شده و سند معکوس حسابداری صادر می‌شود
    if (wasPosted) {
      // برگشت موجودی انبار
      const sign = invoice.type === 'sale' ? 1 : -1;
      for (const line of invoice.lines) {
        const item = await Item.findById(line.itemId);
        if (item && item.kind === 'good') {
          item.stock += sign * line.qty;
          await item.save();
        }
      }

      // یافتن سند حسابداری خودکار صادرشده برای فاکتور
      const origJournal = await JournalEntry.findOne({ refId: invoice._id.toString(), auto: true });
      if (origJournal) {
        const lastJ = await JournalEntry.findOne().sort({ number: -1 });
        const jNumber = lastJ ? lastJ.number + 1 : 1;

        const reverseLines = origJournal.lines.map(l => ({
          account: l.account,
          debit: l.credit,
          credit: l.debit,
        }));

        const cancelJournal = new JournalEntry({
          number: jNumber,
          date: new Date().toISOString().slice(0, 10),
          description: `سند معکوس ابطال فاکتور ${invoice.type === 'sale' ? 'فروش' : 'خرید'} شماره ${invoice.number}`,
          lines: reverseLines,
          auto: true,
          refId: `${invoice._id}:cancel`,
        });
        await cancelJournal.save();
      }
    }

    res.json({
      success: true,
      message: 'صورتحساب با موفقیت باطل گردید و گردش مالی/انباری آن تعدیل شد.',
      data: invoice.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * عملیات نهایی پس از تأیید فاکتور:
 * ۱. تغییر موجودی انبار کالاها
 * ۲. صدور سند حسابداری خودکار و تراز
 */
async function finalizeInvoice(invoice) {
  const isSale = invoice.type === 'sale';

  // ۱. تغییر موجودی کالا
  for (const line of invoice.lines) {
    const item = await Item.findById(line.itemId);
    if (item && item.kind === 'good') {
      item.stock += (isSale ? -1 : 1) * line.qty;
      await item.save();
    }
  }

  // ۲. صدور سند حسابداری خودکار
  const lastJournal = await JournalEntry.findOne().sort({ number: -1 });
  const journalNumber = lastJournal ? lastJournal.number + 1 : 1;

  let journalLines = [];
  if (isSale) {
    // سند فروش:
    // بدهکار: حساب‌های دریافتنی (1201) مبلغ کل فاکتور
    // بستانکار: فروش (4101) مبلغ خالص
    // بستانکار: مالیات بر ارزش افزوده (2201) مبلغ مالیات
    journalLines = [
      { account: '1201', debit: invoice.total, credit: 0 },
      { account: '4101', debit: 0, credit: invoice.net },
      { account: '2201', debit: 0, credit: invoice.tax },
    ].filter(l => l.debit > 0 || l.credit > 0);
  } else {
    // سند خرید:
    // بدهکار: خرید و بهای تمام‌شده (5101) مبلغ خالص
    // بدهکار: مالیات بر ارزش افزوده (2201) مبلغ مالیات
    // بستانکار: حساب‌های پرداختنی (2101) مبلغ کل
    journalLines = [
      { account: '5101', debit: invoice.net, credit: 0 },
      { account: '2201', debit: invoice.tax, credit: 0 },
      { account: '2101', debit: 0, credit: invoice.total },
    ].filter(l => l.debit > 0 || l.credit > 0);
  }

  const journalEntry = new JournalEntry({
    number: journalNumber,
    date: invoice.date,
    description: `فاکتور ${isSale ? 'فروش' : 'خرید'} شماره ${invoice.number}`,
    lines: journalLines,
    auto: true,
    refId: invoice._id.toString(),
  });

  await journalEntry.save();
}
