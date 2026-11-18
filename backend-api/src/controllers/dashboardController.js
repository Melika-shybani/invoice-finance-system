import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { Party } from '../models/Party.js';
import { JournalEntry } from '../models/JournalEntry.js';

export async function getDashboard(req, res, next) {
  try {
    const [
      allInvoices,
      allPayments,
      allParties,
      journalEntries,
    ] = await Promise.all([
      Invoice.find().populate('partyId', 'name').sort({ date: -1, createdAt: -1 }).lean(),
      Payment.find().populate('partyId', 'name').sort({ date: -1, createdAt: -1 }).lean(),
      Party.find().lean(),
      JournalEntry.find().lean(),
    ]);

    // ۱. شاخص‌های اصلی (KPIs)
    const confirmedSales = allInvoices.filter(i => i.type === 'sale' && i.status === 'confirmed' && !i.cancelled);
    const totalSales = confirmedSales.reduce((s, i) => s + i.total, 0);

    const confirmedPurchases = allInvoices.filter(i => i.type === 'purchase' && i.status === 'confirmed' && !i.cancelled);
    const totalPurchases = confirmedPurchases.reduce((s, i) => s + i.total, 0);

    let totalOpex = 0;
    journalEntries.forEach(j => {
      j.lines.forEach(l => {
        if (l.account === '5201') totalOpex += ((l.debit || 0) - (l.credit || 0));
      });
    });

    const totalExpenses = totalPurchases + totalOpex;
    const netProfit = totalSales - totalExpenses;

    // ۲. مطالبات کل (Receivables)
    let totalReceivables = 0;
    allParties.forEach(p => {
      const pId = p._id.toString();
      const pSales = confirmedSales.filter(i => i.partyId && (i.partyId._id ? i.partyId._id.toString() : i.partyId.toString()) === pId).reduce((s, i) => s + i.total, 0);
      const pReceived = allPayments.filter(x => x.direction === 'in' && x.partyId && (x.partyId._id ? x.partyId._id.toString() : x.partyId.toString()) === pId).reduce((s, x) => s + x.amount, 0);
      const diff = pSales - pReceived;
      if (diff > 0) totalReceivables += diff;
    });

    // ۳. تعداد صورتحساب‌ها به تفکیک وضعیت
    const invoiceStatusCounts = {
      total: allInvoices.length,
      draft: allInvoices.filter(i => i.status === 'draft').length,
      ready: allInvoices.filter(i => i.status === 'ready').length,
      sent: allInvoices.filter(i => i.status === 'sent').length,
      confirmed: allInvoices.filter(i => i.status === 'confirmed').length,
      rejected: allInvoices.filter(i => i.status === 'rejected').length,
      cancelled: allInvoices.filter(i => i.cancelled).length,
    };

    // ۴. سری‌های زمانی ۶ ماهه
    const monthMap = {};
    const getMonthKey = dateStr => dateStr ? dateStr.slice(0, 7) : 'سایر';

    allInvoices.filter(i => i.status === 'confirmed' && !i.cancelled).forEach(i => {
      const m = getMonthKey(i.date);
      if (!monthMap[m]) monthMap[m] = { month: m, sales: 0, expense: 0 };
      if (i.type === 'sale') monthMap[m].sales += i.total;
      else monthMap[m].expense += i.total;
    });

    journalEntries.forEach(j => {
      if (!j.auto) {
        const m = getMonthKey(j.date);
        if (!monthMap[m]) monthMap[m] = { month: m, sales: 0, expense: 0 };
        j.lines.forEach(l => {
          if (l.account === '5201') monthMap[m].expense += ((l.debit || 0) - (l.credit || 0));
        });
      }
    });

    const monthlyTrends = Object.values(monthMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
      .map(m => ({
        ...m,
        profit: m.sales - m.expense,
      }));

    res.json({
      success: true,
      kpis: {
        totalSales,
        totalExpenses,
        netProfit,
        totalReceivables,
      },
      invoiceCounts: invoiceStatusCounts,
      monthlyTrends,
      recentInvoices: allInvoices.slice(0, 5),
      recentPayments: allPayments.slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
}
