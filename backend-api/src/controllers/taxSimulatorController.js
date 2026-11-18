import { TaxLog } from '../models/TaxLog.js';
import { Settings } from '../models/Settings.js';

/**
 * شبیه‌ساز REST API ارسال صورتحساب به سامانه مالیاتی (Tax Authority Simulator)
 * POST /api/tax/invoices
 */
export async function submitTaxInvoice(req, res, next) {
  const startTime = Date.now();
  try {
    const payload = req.body;
    const settings = (await Settings.findOne()) || new Settings();

    const { latencyMs = 800, failRate = 0, forceReject = false } = settings.sim || {};
    if (latencyMs > 0) {
      await new Promise(r => setTimeout(r, Math.min(latencyMs, 2000)));
    }

    const errors = [];

    // اعتبارسنجی سمت سرور مالیاتی
    if (!payload.taxId || !/^[0-9A-Z]{23}$/.test(payload.taxId)) {
      errors.push({ code: 'E101', message: 'ساختار شناسه یکتای مالیاتی نامعتبر است.' });
    }

    if (!payload.seller?.economicCode || !/^\d{12,14}$/.test(payload.seller.economicCode)) {
      errors.push({ code: 'E102', message: 'کد اقتصادی فروشنده نامعتبر است.' });
    }

    if (!payload.seller?.memoryCode || payload.seller.memoryCode.length !== 6) {
      errors.push({ code: 'E103', message: 'شناسه حافظه مالیاتی نامعتبر است.' });
    }

    if (!payload.buyer?.nationalId || !/^\d{10,11}$/.test(payload.buyer.nationalId)) {
      errors.push({ code: 'E104', message: 'شناسه یا کد ملی خریدار نامعتبر است.' });
    }

    if (payload.buyer?.nationalId?.length === 11 && (!payload.buyer.economicCode || !/^\d{12,14}$/.test(payload.buyer.economicCode))) {
      errors.push({ code: 'E105', message: 'کد اقتصادی خریدار حقوقی الزامی است.' });
    }

    if (!payload.body || !Array.isArray(payload.body) || payload.body.length === 0) {
      errors.push({ code: 'E106', message: 'صورتحساب فاقد ردیف است.' });
    } else {
      const sumItems = payload.body.reduce((s, b) => s + (b.tsstam || 0), 0);
      if (payload.header?.tbill !== undefined && Math.abs(sumItems - payload.header.tbill) > 1) {
        errors.push({ code: 'E107', message: 'جمع ردیف‌ها با مبلغ کل سرصفحه همخوانی ندارد.' });
      }
    }

    if (forceReject) {
      errors.push({ code: 'E900', message: 'رد اجباری توسط شبیه‌ساز (تنظیمات شبیه‌ساز سامانه مالیاتی).' });
    } else if (Math.random() < failRate) {
      errors.push({ code: 'E500', message: 'خطای موقت سرور سامانه مالیاتی؛ لطفاً بعداً تلاش فرمایید.' });
    }

    const accepted = errors.length === 0;
    const duration = Date.now() - startTime;

    let responseData;
    let statusCode = 200;

    if (accepted) {
      const refNo = `TX-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 8999 + 1000)}`;
      responseData = {
        status: 'accepted',
        referenceNumber: refNo,
        message: 'صورتحساب الکترونیکی با موفقیت در سامانه مالیاتی ثبت و تأیید شد.',
      };
    } else {
      statusCode = errors.some(e => e.code === 'E500') ? 503 : 422;
      responseData = {
        status: 'rejected',
        errors,
        message: 'صورتحساب به علت وجود خطا توسط سامانه مالیاتی رد شد.',
      };
    }

    // ثبت لاگ
    const log = new TaxLog({
      at: new Date(),
      method: 'POST',
      url: '/api/tax/invoices',
      request: payload,
      status: statusCode,
      response: responseData,
      ms: duration,
    });
    await log.save();

    res.status(statusCode).json(responseData);
  } catch (err) {
    next(err);
  }
}

export async function getTaxLogs(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const logs = await TaxLog.find().sort({ at: -1 }).limit(limit);
    res.json({
      success: true,
      data: logs.map(l => l.toJSON()),
    });
  } catch (err) {
    next(err);
  }
}
