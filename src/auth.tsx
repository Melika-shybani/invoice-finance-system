import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Role, User } from './types'

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

export interface LoginResult {
  success: boolean
  message?: string
}

interface AuthCtx {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<LoginResult>
  logout: () => void
  can: (page: string) => boolean
}

const Ctx = createContext<AuthCtx>(null!)
const TKEY = 'ifs-token'
const UKEY = 'ifs-user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TKEY)
    } catch {
      return null
    }
  })

  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(UKEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  // اعتبارسنجی توکن با اندپوینت /api/auth/me در صورت وجود توکن ذخیره‌شده
  useEffect(() => {
    if (!token) return
    let active = true

    fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return
        if (data?.success && data?.user) {
          setUser(data.user)
          localStorage.setItem(UKEY, JSON.stringify(data.user))
        } else {
          // در صورت منقضی بودن توکن در بک‌اند
          logout()
        }
      })
      .catch(() => {
        /* در حالت آفلاین، سشن محلی حفظ می‌شود */
      })

    return () => {
      active = false
    }
  }, [token])

  const login = async (username: string, password: string): Promise<LoginResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      const data = await res.json()

      if (res.ok && data.success && data.token) {
        localStorage.setItem(TKEY, data.token)
        localStorage.setItem(UKEY, JSON.stringify(data.user))
        setToken(data.token)
        setUser(data.user)
        return { success: true }
      }

      return {
        success: false,
        message: data.message || 'نام کاربری یا رمز عبور اشتباه است.',
      }
    } catch {
      return {
        success: false,
        message: 'خطا در برقراری ارتباط با سرور بک‌اند (پورت ۸۰۰۰).',
      }
    }
  }

  const logout = () => {
    try {
      localStorage.removeItem(TKEY)
      localStorage.removeItem(UKEY)
    } catch {
      /* ignore */
    }
    setToken(null)
    setUser(null)
  }

  const can = (page: string) => !!user && (access[page]?.includes(user.role) ?? false)

  return <Ctx.Provider value={{ user, token, login, logout, can }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
