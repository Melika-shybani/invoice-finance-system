import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Role, User } from './types'
import { getDB } from './api/store'

/** صفحه‌ها و نقش‌های مجاز. بک‌اند هم باید همین سطح دسترسی را اعمال کند. */
export const access: Record<string, Role[]> = {
  dashboard: ['admin', 'accountant', 'sales'],
  einvoices: ['admin', 'accountant', 'sales'],
  salesInvoices: ['admin', 'accountant', 'sales'],
  purchaseInvoices: ['admin', 'accountant'],
  parties: ['admin', 'accountant', 'sales'],
  items: ['admin', 'accountant', 'sales'],
  payments: ['admin', 'accountant'],
  accounts: ['admin', 'accountant'],
  journal: ['admin', 'accountant'],
  reports: ['admin', 'accountant'],
  simulator: ['admin', 'accountant'],
  users: ['admin'],
}

interface AuthCtx {
  user: User | null
  login: (username: string, password: string) => boolean
  logout: () => void
  can: (page: string) => boolean
}

const Ctx = createContext<AuthCtx>(null!)
const SKEY = 'ifs-session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SKEY)
    } catch {
      return null
    }
  })
  const user = getDB().users.find((u) => u.id === userId && u.active) ?? null

  const login = (username: string, password: string) => {
    const u = getDB().users.find((x) => x.username === username.trim() && x.password === password && x.active)
    if (!u) return false
    try {
      localStorage.setItem(SKEY, u.id)
    } catch {
      /* ignore */
    }
    setUserId(u.id)
    return true
  }
  const logout = () => {
    try {
      localStorage.removeItem(SKEY)
    } catch {
      /* ignore */
    }
    setUserId(null)
  }
  const can = (page: string) => !!user && (access[page]?.includes(user.role) ?? false)

  return <Ctx.Provider value={{ user, login, logout, can }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
