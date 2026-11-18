import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLineTotals, calculateInvoiceTotals, generateTaxId } from '../src/utils/calc.js';
import { validateInvoiceData } from '../src/utils/taxValidator.js';
import { generateExcelBuffer, generateCSV } from '../src/utils/exportHelper.js';

test('calculateLineTotals calculates gross, net, tax and total correctly', () => {
  const line = {
    qty: 3,
    unitPrice: 100000,
    discount: 20000,
    taxRate: 10,
  };
  const res = calculateLineTotals(line);
  assert.equal(res.gross, 300000);
  assert.equal(res.discount, 20000);
  assert.equal(res.net, 280000);
  assert.equal(res.tax, 28000);
  assert.equal(res.total, 308000);
});

test('calculateInvoiceTotals sums up multiple lines correctly', () => {
  const lines = [
    { qty: 2, unitPrice: 50000, discount: 0, taxRate: 10 },
    { qty: 1, unitPrice: 200000, discount: 20000, taxRate: 10 },
  ];
  const totals = calculateInvoiceTotals(lines);
  assert.equal(totals.gross, 300000);
  assert.equal(totals.discount, 20000);
  assert.equal(totals.net, 280000);
  assert.equal(totals.tax, 28000);
  assert.equal(totals.total, 308000);
});

test('generateTaxId produces valid 23-character tax identifier', () => {
  const taxId = generateTaxId('A1B2C3', '2026-11-18', 1);
  assert.equal(typeof taxId, 'string');
  assert.equal(taxId.length, 23);
  assert.ok(taxId.startsWith('A1B2C3'));
});

test('validateInvoiceData detects missing or invalid fields', () => {
  const invalidInvoice = {
    taxId: 'INVALID',
    total: 100000,
    lines: [],
  };
  const settings = {
    sellerEconomicCode: '123', // invalid length
    memoryCode: 'ABC',        // invalid length
  };
  const party = {
    nationalId: '123',
  };

  const issues = validateInvoiceData(invalidInvoice, settings, party);
  assert.ok(issues.length > 0);
  assert.ok(issues.some(i => i.code === 'E101'));
  assert.ok(issues.some(i => i.code === 'E102'));
  assert.ok(issues.some(i => i.code === 'E103'));
  assert.ok(issues.some(i => i.code === 'E106'));
});

test('generateExcelBuffer returns non-empty buffer', () => {
  const rows = [{ code: '1001', name: 'Item 1', price: 1000 }];
  const buffer = generateExcelBuffer(rows);
  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 0);
});

test('generateCSV returns UTF-8 BOM CSV text', () => {
  const rows = [{ col1: 'تست', col2: 123 }];
  const csv = generateCSV(rows);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('تست'));
});
