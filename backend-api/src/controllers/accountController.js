import { Account } from '../models/Account.js';
import { Payment } from '../models/Payment.js';

export async function listAccounts(req, res, next) {
  try {
    const accounts = await Account.find().sort({ kind: 1, title: 1 });

    // محاسبه مانده فعلی هر حساب بر مبنای دریافت‌ها و پرداخت‌ها
    const paymentAgg = await Payment.aggregate([
      {
        $group: {
          _id: { accountId: '$accountId', direction: '$direction' },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const balanceMap = {};
    paymentAgg.forEach(p => {
      const accId = p._id.accountId.toString();
      if (!balanceMap[accId]) balanceMap[accId] = { in: 0, out: 0 };
      if (p._id.direction === 'in') balanceMap[accId].in += p.total;
      if (p._id.direction === 'out') balanceMap[accId].out += p.total;
    });

    const data = accounts.map(acc => {
      const accObj = acc.toJSON();
      const inOut = balanceMap[accObj.id] || { in: 0, out: 0 };
      accObj.totalIn = inOut.in;
      accObj.totalOut = inOut.out;
      accObj.balance = (accObj.initial || 0) + inOut.in - inOut.out;
      return accObj;
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getAccount(req, res, next) {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'حساب صندوق/بانک یافت نشد.' });
    }

    const payments = await Payment.find({ accountId: account._id }).lean();
    let totalIn = 0;
    let totalOut = 0;
    payments.forEach(p => {
      if (p.direction === 'in') totalIn += p.amount;
      if (p.direction === 'out') totalOut += p.amount;
    });

    const accObj = account.toJSON();
    accObj.totalIn = totalIn;
    accObj.totalOut = totalOut;
    accObj.balance = (accObj.initial || 0) + totalIn - totalOut;

    res.json({ success: true, data: accObj, payments });
  } catch (err) {
    next(err);
  }
}

export async function createAccount(req, res, next) {
  try {
    const { kind, title, accountNo, initial } = req.body;
    if (!kind || !title) {
      return res.status(400).json({ success: false, message: 'نوع و عنوان حساب الزامی هستند.' });
    }

    const account = new Account({
      kind,
      title: title.trim(),
      accountNo: accountNo ? accountNo.trim() : '',
      initial: Number(initial) || 0,
    });

    await account.save();
    const accObj = account.toJSON();
    accObj.balance = accObj.initial;

    res.status(201).json({
      success: true,
      message: 'حساب صندوق یا بانک با موفقیت تعریف شد.',
      data: accObj,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAccount(req, res, next) {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'حساب یافت نشد.' });
    }

    const { kind, title, accountNo, initial } = req.body;
    if (kind) account.kind = kind;
    if (title) account.title = title.trim();
    if (accountNo !== undefined) account.accountNo = accountNo.trim();
    if (initial !== undefined) account.initial = Number(initial);

    await account.save();
    res.json({
      success: true,
      message: 'حساب با موفقیت به‌روزرسانی شد.',
      data: account.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req, res, next) {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'حساب یافت نشد.' });
    }

    const paymentCount = await Payment.countDocuments({ accountId: account._id });
    if (paymentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `این حساب دارای ${paymentCount} تراکنش ثبت شده است و امکان حذف آن وجود ندارد.`,
      });
    }

    await Account.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'حساب با موفقیت حذف شد.' });
  } catch (err) {
    next(err);
  }
}
