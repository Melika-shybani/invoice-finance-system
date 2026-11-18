import * as XLSX from 'xlsx';

/**
 * ایجاد بافر اکسل از داده‌های جدول
 * @param {Array<Object>} rows داده‌های سطرها
 * @param {string} sheetName نام شیت
 * @returns {Buffer} بافر فایل xlsx
 */
export function generateExcelBuffer(rows, sheetName = 'گزارش') {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

/**
 * ایجاد متن CSV با انکودینگ UTF-8 BOM مناسب برای اکسل
 * @param {Array<Object>} rows داده‌های سطرها
 * @returns {string} محتوای CSV
 */
export function generateCSV(rows) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  // اضافه کردن UTF-8 BOM تا در اکسل فارسی به درستی نمایش داده شود
  return '\uFEFF' + csv;
}
