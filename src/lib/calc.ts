import type { Invoice, InvoiceLine } from '../types'

export interface LineTotals {
  gross: number
  discount: number
  net: number
  tax: number
  total: number
}

export function lineTotals(l: InvoiceLine): LineTotals {
  const gross = l.qty * l.unitPrice
  const net = Math.max(gross - l.discount, 0)
  const tax = Math.round((net * l.taxRate) / 100)
  return { gross, discount: l.discount, net, tax, total: net + tax }
}

export function invoiceTotals(lines: InvoiceLine[]): LineTotals {
  return lines.reduce<LineTotals>(
    (a, l) => {
      const t = lineTotals(l)
      return {
        gross: a.gross + t.gross,
        discount: a.discount + t.discount,
        net: a.net + t.net,
        tax: a.tax + t.tax,
        total: a.total + t.total,
      }
    },
    { gross: 0, discount: 0, net: 0, tax: 0, total: 0 },
  )
}

export const totalOf = (inv: Invoice) => invoiceTotals(inv.lines).total

/** شناسه یکتای صورتحساب: ۶ کاراکتر حافظه مالیاتی + تاریخ(هگز) + سریال(هگز) + رقم کنترل */
export function generateTaxId(memoryCode: string, dateIso: string, serial: number): string {
  const days = Math.floor(new Date(dateIso + 'T00:00:00Z').getTime() / 86400000)
  const body = memoryCode.toUpperCase().padEnd(6, 'X').slice(0, 6) + days.toString(16).toUpperCase().padStart(5, '0') + serial.toString(16).toUpperCase().padStart(10, '0')
  let sum = 0
  for (let i = 0; i < body.length; i++) sum = (sum * 31 + body.charCodeAt(i)) % 251
  return body + sum.toString(16).toUpperCase().padStart(2, '0')
}
