/**
 * جدول کدینگ حساب‌های پیش‌فرض سامانه حسابداری
 */
export const accountsChart = {
  '1101': { title: 'صندوق', type: 'asset', nature: 'debit' },
  '1102': { title: 'بانک', type: 'asset', nature: 'debit' },
  '1201': { title: 'حساب‌های دریافتنی (مشتریان / بدهکاران)', type: 'asset', nature: 'debit' },
  '2101': { title: 'حساب‌های پرداختنی (تأمین‌کنندگان / بستانکاران)', type: 'liability', nature: 'credit' },
  '2201': { title: 'مالیات بر ارزش افزوده پرداختنی', type: 'liability', nature: 'credit' },
  '3101': { title: 'سرمایه اولیه', type: 'equity', nature: 'credit' },
  '4101': { title: 'درآمد فروش', type: 'revenue', nature: 'credit' },
  '5101': { title: 'خرید و بهای تمام‌شده', type: 'expense', nature: 'debit' },
  '5201': { title: 'هزینه‌های عمومی و اداری', type: 'expense', nature: 'debit' },
};

export function getAccountTitle(code) {
  return accountsChart[code] ? `${code} - ${accountsChart[code].title}` : code;
}
