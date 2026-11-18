/**
 * اعتبارسنجی صورتحساب الکترونیکی قبل از ارسال به سامانه مالیاتی
 * مطابق با قوانین و استانداردهای سازمان امور مالیاتی کشور
 */
export function validateInvoiceData(invoice, sellerSettings, party) {
  const issues = [];

  // بررسی اطلاعات فروشنده
  if (!sellerSettings?.sellerEconomicCode || !/^\d{12,14}$/.test(sellerSettings.sellerEconomicCode)) {
    issues.push({ code: 'E102', message: 'کد اقتصادی فروشنده نامعتبر است (باید ۱۲ تا ۱۴ رقم باشد).' });
  }

  if (!sellerSettings?.memoryCode || sellerSettings.memoryCode.length !== 6) {
    issues.push({ code: 'E103', message: 'شناسه حافظه مالیاتی فروشنده باید ۶ کاراکتر باشد.' });
  }

  // بررسی ساختار شناسه یکتا
  if (!invoice.taxId || !/^[0-9A-Z]{23}$/.test(invoice.taxId)) {
    issues.push({ code: 'E101', message: 'ساختار شناسه یکتای صورتحساب نامعتبر است (باید ۲۳ کاراکتر هگزادسیمال باشد).' });
  }

  // بررسی اطلاعات خریدار
  if (!party) {
    issues.push({ code: 'E104', message: 'اطلاعات طرف حساب (خریدار) یافت نشد.' });
  } else {
    const nationalId = party.nationalId?.trim() || '';
    if (!/^\d{10,11}$/.test(nationalId)) {
      issues.push({ code: 'E104', message: 'شناسه ملی / کد ملی خریدار نامعتبر است (۱۰ رقم حقیقی یا ۱۱ رقم حقوقی).' });
    }

    // خریدار حقوقی (شناسه ۱۱ رقمی) الزاماً باید کد اقتصادی ۱۲ تا ۱۴ رقمی داشته باشد
    if (nationalId.length === 11) {
      const economicCode = party.economicCode?.trim() || '';
      if (!/^\d{12,14}$/.test(economicCode)) {
        issues.push({ code: 'E105', message: 'کد اقتصادی خریدار حقوقی الزامی و باید ۱۲ تا ۱۴ رقم باشد.' });
      }
    }
  }

  // بررسی ردیف‌های صورتحساب
  if (!invoice.lines || invoice.lines.length === 0) {
    issues.push({ code: 'E106', message: 'صورتحساب فاقد ردیف کالا یا خدمت است.' });
  } else {
    let sumLines = 0;
    invoice.lines.forEach((l, index) => {
      const net = (l.qty * l.unitPrice) - (l.discount || 0);
      const tax = Math.round((net * (l.taxRate || 0)) / 100);
      const rowTotal = net + tax;
      sumLines += rowTotal;

      if (!l.qty || l.qty <= 0) {
        issues.push({ code: `E106-L${index + 1}`, message: `تعداد در ردیف ${index + 1} باید بزرگتر از صفر باشد.` });
      }
      if (l.unitPrice < 0) {
        issues.push({ code: `E106-L${index + 1}`, message: `قیمت واحد در ردیف ${index + 1} نمی‌تواند منفی باشد.` });
      }
    });

    if (Math.abs(sumLines - invoice.total) > 1) {
      issues.push({ code: 'E107', message: `جمع مبالغ ردیف‌ها (${sumLines}) با مبلغ کل صورتحساب (${invoice.total}) همخوانی ندارد.` });
    }
  }

  return issues;
}
