export const chart: Record<string, { title: string; type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' }> = {
  '1101': { title: 'صندوق', type: 'asset' },
  '1102': { title: 'بانک', type: 'asset' },
  '1201': { title: 'حساب‌های دریافتنی (بدهکاران)', type: 'asset' },
  '2101': { title: 'حساب‌های پرداختنی (بستانکاران)', type: 'liability' },
  '2201': { title: 'مالیات بر ارزش افزوده', type: 'liability' },
  '3101': { title: 'سرمایه', type: 'equity' },
  '4101': { title: 'فروش', type: 'revenue' },
  '5101': { title: 'خرید', type: 'expense' },
  '5201': { title: 'هزینه‌های عملیاتی', type: 'expense' },
}

export const accountTitle = (code: string) => (chart[code] ? `${code} - ${chart[code].title}` : code)
