import { JournalEntry } from '../models/JournalEntry.js';
import { accountsChart, getAccountTitle } from '../config/accountsChart.js';

export async function listJournalEntries(req, res, next) {
  try {
    const { from, to, auto } = req.query;
    const query = {};

    if (auto !== undefined) query.auto = auto === 'true';

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }

    const entries = await JournalEntry.find(query).sort({ date: -1, number: -1 });

    const formatted = entries.map(j => {
      const obj = j.toJSON();
      obj.lines = obj.lines.map(l => ({
        ...l,
        accountTitle: getAccountTitle(l.account),
      }));
      obj.totalDebit = obj.lines.reduce((s, l) => s + (l.debit || 0), 0);
      obj.totalCredit = obj.lines.reduce((s, l) => s + (l.credit || 0), 0);
      return obj;
    });

    res.json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
}

export async function getJournalEntry(req, res, next) {
  try {
    const entry = await JournalEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'سند حسابداری یافت نشد.' });
    }

    const obj = entry.toJSON();
    obj.lines = obj.lines.map(l => ({
      ...l,
      accountTitle: getAccountTitle(l.account),
    }));

    res.json({ success: true, data: obj });
  } catch (err) {
    next(err);
  }
}

export async function createJournalEntry(req, res, next) {
  try {
    const { date, description, lines } = req.body;
    if (!date || !description || !lines || lines.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'تاریخ، شرح سند و حداقل ۲ ردیف بدهکار و بستانکار الزامی هستند.',
      });
    }

    const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);

    if (totalDebit !== totalCredit) {
      return res.status(400).json({
        success: false,
        message: `سند حسابداری تراز نیست: مجموع بدهکار (${totalDebit}) با مجموع بستانکار (${totalCredit}) برابر نیست.`,
      });
    }

    if (totalDebit <= 0) {
      return res.status(400).json({
        success: false,
        message: 'گردش سند حسابداری باید بزرگتر از صفر باشد.',
      });
    }

    const lastEntry = await JournalEntry.findOne().sort({ number: -1 });
    const number = lastEntry ? lastEntry.number + 1 : 1;

    const entry = new JournalEntry({
      number,
      date,
      description: description.trim(),
      lines: lines.map(l => ({
        account: l.account.trim(),
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      })),
      auto: false,
    });

    await entry.save();
    res.status(201).json({
      success: true,
      message: `سند حسابداری شماره ${number} با موفقیت ثبت شد.`,
      data: entry.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteJournalEntry(req, res, next) {
  try {
    const entry = await JournalEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'سند حسابداری یافت نشد.' });
    }

    if (entry.auto) {
      return res.status(400).json({
        success: false,
        message: 'اسناد حسابداری خودکار صادرشده توسط فاکتور یا دریافت/پرداخت به صورت مستقیم قابل حذف نیستند.',
      });
    }

    await JournalEntry.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'سند حسابداری با موفقیت حذف شد.' });
  } catch (err) {
    next(err);
  }
}
