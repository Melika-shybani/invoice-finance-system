/**
 * محاسبه مقادیر ردیف فاکتور: ناخالص، تخفیف، خالص، مالیات و کل
 */
export function calculateLineTotals(line) {
  const qty = Number(line.qty) || 0;
  const unitPrice = Number(line.unitPrice) || 0;
  const discount = Math.max(0, Number(line.discount) || 0);
  const taxRate = Number(line.taxRate) || 0;

  const gross = qty * unitPrice;
  const net = Math.max(0, gross - discount);
  const tax = Math.round((net * taxRate) / 100);
  const total = net + tax;

  return {
    gross,
    discount,
    net,
    tax,
    total,
  };
}

/**
 * جمع کل فاکتور از مجموع ردیف‌ها
 */
export function calculateInvoiceTotals(lines = []) {
  return lines.reduce(
    (acc, line) => {
      const lineTotal = calculateLineTotals(line);
      return {
        gross: acc.gross + lineTotal.gross,
        discount: acc.discount + lineTotal.discount,
        net: acc.net + lineTotal.net,
        tax: acc.tax + lineTotal.tax,
        total: acc.total + lineTotal.total,
      };
    },
    { gross: 0, discount: 0, net: 0, tax: 0, total: 0 }
  );
}

/**
 * تولید شناسه یکتای صورتحساب مالیاتی (Tax ID)
 * ساختار استاندارد: ۶ کاراکتر حافظه مالیاتی + ۵ کاراکتر روز هگز + ۱۰ کاراکتر سریال هگز + ۲ کاراکتر رقم کنترل
 * @param {string} memoryCode شناسه حافظه مالیاتی ۶ کاراکتری
 * @param {string} dateIso تاریخ فاکتور به فرمت YYYY-MM-DD
 * @param {number} serial شماره ترتیبی فاکتور
 */
export function generateTaxId(memoryCode = 'A1B2C3', dateIso, serial = 1) {
  const days = Math.floor(new Date(dateIso + 'T00:00:00Z').getTime() / 86400000);
  const cleanMemory = (memoryCode || 'A1B2C3')
    .toUpperCase()
    .padEnd(6, 'X')
    .slice(0, 6);

  const hexDays = Math.max(0, days).toString(16).toUpperCase().padStart(5, '0');
  const hexSerial = Math.max(1, serial).toString(16).toUpperCase().padStart(10, '0');

  const body = cleanMemory + hexDays + hexSerial;

  // محاسبه رقم کنترل بر پایه الگوریتم وزن‌دار
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    sum = (sum * 31 + body.charCodeAt(i)) % 251;
  }
  const checkDigit = sum.toString(16).toUpperCase().padStart(2, '0');

  return body + checkDigit;
}
