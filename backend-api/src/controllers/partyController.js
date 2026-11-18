import { Party } from '../models/Party.js';
import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';

export async function listParties(req, res, next) {
  try {
    const { kind, search } = req.query;
    const query = {};

    if (kind && ['customer', 'supplier', 'both'].includes(kind)) {
      query.kind = kind;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nationalId: { $regex: search, $options: 'i' } },
        { economicCode: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const parties = await Party.find(query).sort({ name: 1 });
    res.json({
      success: true,
      data: parties.map(p => p.toJSON()),
    });
  } catch (err) {
    next(err);
  }
}

export async function getParty(req, res, next) {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) {
      return res.status(404).json({ success: false, message: 'طرف حساب یافت نشد.' });
    }
    res.json({ success: true, data: party.toJSON() });
  } catch (err) {
    next(err);
  }
}

export async function createParty(req, res, next) {
  try {
    const { name, kind, nationalId, economicCode, phone, address } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'نام طرف حساب الزامی است.' });
    }

    const party = new Party({
      name: name.trim(),
      kind: kind || 'customer',
      nationalId: nationalId ? nationalId.trim() : '',
      economicCode: economicCode ? economicCode.trim() : '',
      phone: phone ? phone.trim() : '',
      address: address ? address.trim() : '',
    });

    await party.save();
    res.status(201).json({
      success: true,
      message: 'طرف حساب با موفقیت ایجاد شد.',
      data: party.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateParty(req, res, next) {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) {
      return res.status(404).json({ success: false, message: 'طرف حساب یافت نشد.' });
    }

    const { name, kind, nationalId, economicCode, phone, address } = req.body;
    if (name) party.name = name.trim();
    if (kind) party.kind = kind;
    if (nationalId !== undefined) party.nationalId = nationalId.trim();
    if (economicCode !== undefined) party.economicCode = economicCode.trim();
    if (phone !== undefined) party.phone = phone.trim();
    if (address !== undefined) party.address = address.trim();

    await party.save();
    res.json({
      success: true,
      message: 'اطلاعات طرف حساب با موفقیت به‌روزرسانی شد.',
      data: party.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteParty(req, res, next) {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) {
      return res.status(404).json({ success: false, message: 'طرف حساب یافت نشد.' });
    }

    // بررسی آیا تراکنشی به این طرف حساب متصل است
    const [invoiceCount, paymentCount] = await Promise.all([
      Invoice.countDocuments({ partyId: party._id }),
      Payment.countDocuments({ partyId: party._id }),
    ]);

    if (invoiceCount > 0 || paymentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `این طرف حساب دارای ${invoiceCount} فاکتور و ${paymentCount} سند دریافت/پرداخت است و قابل حذف نیست.`,
      });
    }

    await Party.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'طرف حساب با موفقیت حذف شد.' });
  } catch (err) {
    next(err);
  }
}

/**
 * دریافت گزارش گردش حساب تفصیلی طرف حساب (Account Statement)
 */
export async function getPartyStatement(req, res, next) {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) {
      return res.status(404).json({ success: false, message: 'طرف حساب یافت نشد.' });
    }

    const { from, to } = req.query;

    const invoiceQuery = { partyId: party._id, status: 'confirmed', cancelled: false };
    const paymentQuery = { partyId: party._id };

    if (from || to) {
      invoiceQuery.date = {};
      paymentQuery.date = {};
      if (from) {
        invoiceQuery.date.$gte = from;
        paymentQuery.date.$gte = from;
      }
      if (to) {
        invoiceQuery.date.$lte = to;
        paymentQuery.date.$lte = to;
      }
    }

    const [invoices, payments] = await Promise.all([
      Invoice.find(invoiceQuery).lean(),
      Payment.find(paymentQuery).populate('accountId', 'title kind').lean(),
    ]);

    // ترکیب همه تراکنش‌ها
    const transactions = [];

    invoices.forEach(inv => {
      if (inv.type === 'sale') {
        // فروش: بدهکار (افزایش طلب ما از مشتری)
        transactions.push({
          date: inv.date,
          type: 'فاکتور فروش',
          number: inv.number,
          description: `فاکتور فروش شماره ${inv.number}`,
          debit: inv.total,
          credit: 0,
        });
      } else {
        // خرید: بستانکار (افزایش بدهی ما به تأمین‌کننده)
        transactions.push({
          date: inv.date,
          type: 'فاکتور خرید',
          number: inv.number,
          description: `فاکتور خرید شماره ${inv.number}`,
          debit: 0,
          credit: inv.total,
        });
      }
    });

    payments.forEach(pay => {
      if (pay.direction === 'in') {
        // دریافت از طرف حساب: بستانکار (کاهش طلب ما از مشتری)
        transactions.push({
          date: pay.date,
          type: 'دریافت وجه',
          number: pay.number,
          description: `دریافت از طریق ${pay.method} به ${pay.accountId?.title || 'حساب'}`,
          debit: 0,
          credit: pay.amount,
        });
      } else {
        // پرداخت به طرف حساب: بدهکار (کاهش بدهی ما به تأمین‌کننده)
        transactions.push({
          date: pay.date,
          type: 'پرداخت وجه',
          number: pay.number,
          description: `پرداخت از طریق ${pay.method} از ${pay.accountId?.title || 'حساب'}`,
          debit: pay.amount,
          credit: 0,
        });
      }
    });

    // مرتب‌سازی بر اساس تاریخ
    transactions.sort((a, b) => a.date.localeCompare(b.date));

    // محاسبه مانده در لحظه (مانده مثبت = بدهکار / طلب ما، مانده منفی = بستانکار / بدهی ما)
    let runningBalance = 0;
    const items = transactions.map(t => {
      runningBalance += (t.debit - t.credit);
      return {
        ...t,
        balance: runningBalance,
      };
    });

    res.json({
      success: true,
      party: party.toJSON(),
      summary: {
        totalDebit: transactions.reduce((s, t) => s + t.debit, 0),
        totalCredit: transactions.reduce((s, t) => s + t.credit, 0),
        finalBalance: runningBalance,
        status: runningBalance > 0 ? 'بدهکار (طلب ما)' : runningBalance < 0 ? 'بستانکار (بدهی ما)' : 'تسویه شده',
      },
      transactions: items,
    });
  } catch (err) {
    next(err);
  }
}
