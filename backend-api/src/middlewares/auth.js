import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export async function authenticate(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'توکن احراز هویت ارسال نشده است. لطفاً وارد سیستم شوید.',
      });
    }

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_invoice_finance_system_2026';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'کاربر مرتبط با این توکن یافت نشد.',
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'حساب کاربری شما غیرفعال شده است.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'اعتبار توکن منقضی شده است. لطفاً مجدداً وارد شوید.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'توکن احراز هویت نامعتبر است.',
    });
  }
}

/**
 * تعیین سطح دسترسی بر اساس نقش کاربر
 * @param  {...string} roles نقش‌های مجاز: 'admin', 'accountant', 'sales'
 */
export function requireRole(...roles) {
  const allowed = roles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'ابتدا باید وارد سیستم شوید.',
      });
    }

    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `شما دسترسی لازم برای این عملیات را ندارید. (نقش شما: ${req.user.role}، نقش‌های مجاز: ${allowed.join(', ')})`,
      });
    }

    next();
  };
}
