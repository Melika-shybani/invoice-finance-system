import { Payment } from '../models/Payment.js';
import { Account } from '../models/Account.js';
import { Party } from '../models/Party.js';
import { JournalEntry } from '../models/JournalEntry.js';

export async function listPayments(req, res, next) {
  try {
    const { direction, partyId, accountId, from, to } = req.query;
    const query = {};

    if (direction && ['in', 'out'].includes(direction)) query.direction = direction;
    if (partyId) query.partyId = partyId;
    if (accountId) query.accountId = accountId;

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }

    const payments = await Payment.find(query)
      .populate('partyId', 'name nationalId economicCode')
      .populate('accountId', 'title kind accountNo')
      .sort({ date: -1, number: -1 });

    res.json({
      success: true,
      data: payments.map(p => p.toJSON()),
    });
  } catch (err) {
    next(err);
  }
}

export async function getPayment(req, res, next) {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('partyId', 'name nationalId economicCode')
      .populate('accountId', 'title kind accountNo')
      .populate('invoiceId', 'number date type total');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'سند دریافت یا پرداخت یافت نشد.' });
    }

    res.json({ success: true, data: payment.toJSON() });
  } catch (err) {
    next(err);
  }
}

export async function createPayment(req, res, next) {
  try {
    const { direction, date, partyId, accountId, amount, method, invoiceId, description } = req.body;
    if (!direction || !date || !partyId || !accountId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'جهت (دریافت/پرداخت)، تاریخ، طرف حساب، حساب صندوق/بانک و مبلغ الزامی هستند.',
      });
    }

    const [party, account] = await Promise.all([
      Party.findById(partyId),
      Account.findById(accountId),
    ]);

    if (!party) {
      return res.status(404).json({ success: false, message: 'طرف حساب انتخاب‌شده یافت نشد.' });
    }
    if (!account) {
      return res.status(404).json({ success: false, message: 'حساب صندوق یا بانک انتخاب‌شده یافت نشد.' });
    }

    const lastPayment = await Payment.findOne().sort({ number: -1 });
    const number = lastPayment ? lastPayment.number + 1 : 1;

    const payment = new Payment({
      number,
      direction,
      date,
      partyId,
      accountId,
      amount: Number(amount),
      method: method || 'transfer',
      invoiceId: invoiceId || null,
      description: description || '',
    });

    await payment.save();

    // صدور سند حسابداری خودکار متناظر
    const isIn = direction === 'in';
    const cashAccountCode = account.kind === 'bank' ? '1102' : '1101';

    const lastJournal = await JournalEntry.findOne().sort({ number: -1 });
    const journalNumber = lastJournal ? lastJournal.number + 1 : 1;

    const journalLines = isIn
      ? [
          { account: cashAccountCode, debit: Number(amount), credit: 0 },
          { account: '1201', debit: 0, credit: Number(amount) }, // بستانکار کردن حساب‌های دریافتنی
        ]
      : [
          { account: '2101', debit: Number(amount), credit: 0 }, // بدهکار کردن حساب‌های پرداختنی
          { account: cashAccountCode, debit: 0, credit: Number(amount) },
        ];

    const journalEntry = new JournalEntry({
      number: journalNumber,
      date,
      description: `${isIn ? 'دریافت از' : 'پرداخت به'} ${party.name} (${payment.number})`,
      lines: journalLines,
      auto: true,
      refId: payment._id.toString(),
    });

    await journalEntry.save();

    const populated = await Payment.findById(payment._id)
      .populate('partyId', 'name')
      .populate('accountId', 'title kind');

    res.status(201).json({
      success: true,
      message: `${isIn ? 'سند دریافت' : 'سند پرداخت'} با شماره ${number} با موفقیت ثبت شد و سند حسابداری خودکار صادر گردید.`,
      data: populated.toJSON(),
      journalId: journalEntry._id.toString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function deletePayment(req, res, next) {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'سند دریافت یا پرداخت یافت نشد.' });
    }

    // حذف سند حسابداری خودکار مرتبط
    await JournalEntry.deleteMany({ refId: payment._id.toString(), auto: true });

    await Payment.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'سند دریافت/پرداخت و سند حسابداری متناظر با موفقیت حذف شدند.',
    });
  } catch (err) {
    next(err);
  }
}
