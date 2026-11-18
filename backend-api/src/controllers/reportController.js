import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { Party } from '../models/Party.js';
import { JournalEntry } from '../models/JournalEntry.js';
import { accountsChart } from '../config/accountsChart.js';
import { generateExcelBuffer, generateCSV } from '../utils/exportHelper.js';

/**
 * گزارش فروش در بازه زمانی
 */
export async function getSalesReport(req, res, next) {
  try {
    const { from, to, partyId } = req.query;
    const query = { type: 'sale', status: 'confirmed', cancelled: false };

    if (partyId) query.partyId = partyId;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }

    const invoices = await Invoice.find(query)
      .populate('partyId', 'name nationalId economicCode')
      .sort({ date: -1, number: -1 });

    const summary = invoices.reduce(
      (acc, inv) => {
        acc.gross += inv.gross;
        acc.discount += inv.discount;
        acc.net += inv.net;
        acc.tax += inv.tax;
        acc.total += inv.total;
        return acc;
      },
      { gross: 0, discount: 0, net: 0, tax: 0, total: 0 }
    );

    res.json({
      success: true,
      from: from || null,
      to: to || null,
      count: invoices.length,
      summary,
      data: invoices.map(i => i.toJSON()),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * گزارش خرید و هزینه‌ها در بازه زمانی
 */
export async function getPurchasesReport(req, res, next) {
  try {
    const { from, to, partyId } = req.query;
    const query = { type: 'purchase', status: 'confirmed', cancelled: false };

    if (partyId) query.partyId = partyId;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }

    const [purchases, journalEntries] = await Promise.all([
      Invoice.find(query).populate('partyId', 'name nationalId').sort({ date: -1 }),
      JournalEntry.find(from || to ? { date: query.date } : {}).lean(),
    ]);

    const purchaseSummary = purchases.reduce(
      (acc, inv) => {
        acc.gross += inv.gross;
        acc.discount += inv.discount;
        acc.net += inv.net;
        acc.tax += inv.tax;
        acc.total += inv.total;
        return acc;
      },
      { gross: 0, discount: 0, net: 0, tax: 0, total: 0 }
    );

    // محاسبه هزینه‌های عملیاتی از حساب ۵۲۰۱ در اسناد حسابداری
    let totalOperatingExpenses = 0;
    const expenseEntries = [];

    journalEntries.forEach(j => {
      j.lines.forEach(l => {
        if (l.account === '5201') {
          const amount = (l.debit || 0) - (l.credit || 0);
          if (amount !== 0) {
            totalOperatingExpenses += amount;
            expenseEntries.push({
              date: j.date,
              description: j.description,
              amount,
            });
          }
        }
      });
    });

    res.json({
      success: true,
      from: from || null,
      to: to || null,
      purchases: {
        count: purchases.length,
        summary: purchaseSummary,
        data: purchases.map(p => p.toJSON()),
      },
      operatingExpenses: {
        total: totalOperatingExpenses,
        entries: expenseEntries,
      },
      grandTotal: purchaseSummary.total + totalOperatingExpenses,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * گزارش بدهکاران و بستانکاران (مانده حساب مشتریان و تأمین‌کنندگان)
 */
export async function getPartyBalances(req, res, next) {
  try {
    const { to } = req.query;
    const parties = await Party.find().sort({ name: 1 });

    const invoiceQuery = { status: 'confirmed', cancelled: false };
    const paymentQuery = {};
    if (to) {
      invoiceQuery.date = { $lte: to };
      paymentQuery.date = { $lte: to };
    }

    const [invoices, payments] = await Promise.all([
      Invoice.find(invoiceQuery).lean(),
      Payment.find(paymentQuery).lean(),
    ]);

    const balances = parties.map(p => {
      const pId = p._id.toString();

      const sales = invoices
        .filter(i => i.type === 'sale' && i.partyId.toString() === pId)
        .reduce((sum, i) => sum + i.total, 0);

      const purchases = invoices
        .filter(i => i.type === 'purchase' && i.partyId.toString() === pId)
        .reduce((sum, i) => sum + i.total, 0);

      const received = payments
        .filter(x => x.direction === 'in' && x.partyId.toString() === pId)
        .reduce((sum, x) => sum + x.amount, 0);

      const paid = payments
        .filter(x => x.direction === 'out' && x.partyId.toString() === pId)
        .reduce((sum, x) => sum + x.amount, 0);

      // طلب خالص ما: مانده بدهکار مثبت است؛ اگر منفی باشد بستانکار (بدهی ما به طرف حساب)
      const balance = sales - received - (purchases - paid);

      return {
        id: pId,
        name: p.name,
        kind: p.kind,
        nationalId: p.nationalId,
        phone: p.phone,
        sales,
        purchases,
        received,
        paid,
        balance,
        status: balance > 0 ? 'بدهکار (طلب ما)' : balance < 0 ? 'بستانکار (بدهی ما)' : 'بی‌حساب',
      };
    });

    const debtors = balances.filter(b => b.balance > 0);
    const creditors = balances.filter(b => b.balance < 0);

    const totalDebtors = debtors.reduce((s, b) => s + b.balance, 0);
    const totalCreditors = creditors.reduce((s, b) => s + Math.abs(b.balance), 0);

    res.json({
      success: true,
      summary: {
        totalReceivable: totalDebtors, // کل مطالبات ما
        totalPayable: totalCreditors,  // کل بدهی‌های ما
        netReceivable: totalDebtors - totalCreditors,
      },
      data: balances,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * گزارش تراز آزمایشی (Trial Balance) و دفتر کل
 */
export async function getTrialBalance(req, res, next) {
  try {
    const { from, to } = req.query;
    const query = {};
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }

    const journalEntries = await JournalEntry.find(query).lean();

    const accountBalances = {};
    Object.keys(accountsChart).forEach(code => {
      accountBalances[code] = {
        code,
        title: accountsChart[code].title,
        type: accountsChart[code].type,
        nature: accountsChart[code].nature,
        debit: 0,
        credit: 0,
        balance: 0,
      };
    });

    journalEntries.forEach(j => {
      j.lines.forEach(l => {
        if (!accountBalances[l.account]) {
          accountBalances[l.account] = {
            code: l.account,
            title: accountsChart[l.account]?.title || l.account,
            type: accountsChart[l.account]?.type || 'other',
            nature: accountsChart[l.account]?.nature || 'debit',
            debit: 0,
            credit: 0,
            balance: 0,
          };
        }
        accountBalances[l.account].debit += (l.debit || 0);
        accountBalances[l.account].credit += (l.credit || 0);
      });
    });

    const rows = Object.values(accountBalances)
      .filter(r => r.debit > 0 || r.credit > 0)
      .map(r => ({
        ...r,
        balance: r.debit - r.credit,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));

    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

    res.json({
      success: true,
      from: from || null,
      to: to || null,
      balanced: totalDebit === totalCredit,
      totals: {
        debit: totalDebit,
        credit: totalCredit,
      },
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * صورت سود و زیان ساده (Profit and Loss Statement)
 */
export async function getProfitLoss(req, res, next) {
  try {
    const { from, to } = req.query;
    const query = {};
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }

    const entries = await JournalEntry.find(query).lean();

    let revenue = 0;   // 4101 درآمد فروش
    let cogs = 0;      // 5101 بهای تمام شده / خرید
    let opex = 0;      // 5201 هزینه‌های اداری و عمومی

    entries.forEach(j => {
      j.lines.forEach(l => {
        if (l.account === '4101') revenue += ((l.credit || 0) - (l.debit || 0));
        if (l.account === '5101') cogs += ((l.debit || 0) - (l.credit || 0));
        if (l.account === '5201') opex += ((l.debit || 0) - (l.credit || 0));
      });
    });

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - opex;

    res.json({
      success: true,
      from: from || null,
      to: to || null,
      revenue,
      cogs,
      grossProfit,
      operatingExpenses: opex,
      netProfit,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * دفتر روزنامه (Journal Book Report)
 */
export async function getJournalReport(req, res, next) {
  try {
    const { from, to } = req.query;
    const query = {};
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }

    const entries = await JournalEntry.find(query).sort({ date: 1, number: 1 }).lean();

    const flatRows = [];
    entries.forEach(j => {
      j.lines.forEach((l, idx) => {
        flatRows.push({
          journalNumber: j.number,
          date: j.date,
          description: idx === 0 ? j.description : '',
          accountCode: l.account,
          accountTitle: accountsChart[l.account]?.title || l.account,
          debit: l.debit || 0,
          credit: l.credit || 0,
        });
      });
    });

    res.json({
      success: true,
      from: from || null,
      to: to || null,
      count: entries.length,
      data: flatRows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * خروجی اکسل از گزارش‌ها (Excel Export)
 * GET /api/reports/export/excel?type=sales|purchases|balances|trial
 */
export async function exportExcelReport(req, res, next) {
  try {
    const { reportType, from, to } = req.query;

    let rows = [];
    let filename = `report_${reportType || 'data'}_${Date.now()}.xlsx`;

    if (reportType === 'sales') {
      const query = { type: 'sale', status: 'confirmed', cancelled: false };
      if (from || to) {
        query.date = {};
        if (from) query.date.$gte = from;
        if (to) query.date.$lte = to;
      }
      const invoices = await Invoice.find(query).populate('partyId', 'name').lean();
      rows = invoices.map(i => ({
        'شماره فاکتور': i.number,
        'تاریخ': i.date,
        'خریدار': i.partyId?.name || '-',
        'مبلغ ناخالص': i.gross,
        'تخفیف': i.discount,
        'مبلغ خالص': i.net,
        'مالیات': i.tax,
        'مبلغ کل (ریال)': i.total,
        'شناسه مالیاتی': i.taxId,
        'کد رهگیری مالیاتی': i.taxRef || '-',
      }));
      filename = `sales_report_${Date.now()}.xlsx`;
    } else if (reportType === 'balances') {
      const parties = await Party.find().lean();
      const [invoices, payments] = await Promise.all([
        Invoice.find({ status: 'confirmed', cancelled: false }).lean(),
        Payment.find().lean(),
      ]);

      rows = parties.map(p => {
        const pId = p._id.toString();
        const sales = invoices.filter(i => i.type === 'sale' && i.partyId.toString() === pId).reduce((s, i) => s + i.total, 0);
        const purchases = invoices.filter(i => i.type === 'purchase' && i.partyId.toString() === pId).reduce((s, i) => s + i.total, 0);
        const received = payments.filter(x => x.direction === 'in' && x.partyId.toString() === pId).reduce((s, x) => s + x.amount, 0);
        const paid = payments.filter(x => x.direction === 'out' && x.partyId.toString() === pId).reduce((s, x) => s + x.amount, 0);
        const balance = sales - received - (purchases - paid);

        return {
          'نام طرف حساب': p.name,
          'نوع': p.kind,
          'شناسه/کد ملی': p.nationalId,
          'شماره تماس': p.phone,
          'مجموع خرید از ما': sales,
          'مجموع فروش به ما': purchases,
          'مجموع دریافتی': received,
          'مجموع پرداختی': paid,
          'مانده حساب': balance,
          'وضعیت': balance > 0 ? 'بدهکار (طلب ما)' : balance < 0 ? 'بستانکار (بدهی ما)' : 'تسویه',
        };
      });
      filename = `party_balances_${Date.now()}.xlsx`;
    } else {
      // پیش‌فرض: تراز آزمایشی
      const entries = await JournalEntry.find().lean();
      const map = {};
      entries.forEach(j => {
        j.lines.forEach(l => {
          if (!map[l.account]) map[l.account] = { code: l.account, title: accountsChart[l.account]?.title || l.account, debit: 0, credit: 0 };
          map[l.account].debit += (l.debit || 0);
          map[l.account].credit += (l.credit || 0);
        });
      });
      rows = Object.values(map).map(r => ({
        'کد حساب': r.code,
        'نام حساب': r.title,
        'گردش بدهکار': r.debit,
        'گردش بستانکار': r.credit,
        'مانده': r.debit - r.credit,
      }));
      filename = `trial_balance_${Date.now()}.xlsx`;
    }

    const buffer = generateExcelBuffer(rows, 'گزارش مالی');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

/**
 * خروجی CSV از گزارش‌ها
 */
export async function exportCSVReport(req, res, next) {
  try {
    const { reportType } = req.query;
    // استفاده از منطق اکسل برای تولید سطرها
    const invoices = await Invoice.find({ type: 'sale', status: 'confirmed' }).populate('partyId', 'name').lean();
    const rows = invoices.map(i => ({
      invoiceNumber: i.number,
      date: i.date,
      buyer: i.partyId?.name || '',
      total: i.total,
      tax: i.tax,
      taxId: i.taxId,
    }));

    const csvData = generateCSV(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="report_${Date.now()}.csv"`);
    res.send(csvData);
  } catch (err) {
    next(err);
  }
}
