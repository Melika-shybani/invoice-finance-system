import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'نام کاربری و کلمه عبور الزامی است.',
      });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'نام کاربری یا کلمه عبور اشتباه است.',
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'این حساب کاربری غیرفعال است.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'نام کاربری یا کلمه عبور اشتباه است.',
      });
    }

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_invoice_finance_system_2026';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      secret,
      { expiresIn }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        active: user.active,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id.toString(),
        username: req.user.username,
        fullName: req.user.fullName,
        role: req.user.role,
        active: req.user.active,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function register(req, res, next) {
  try {
    const { username, password, fullName, role } = req.body;
    if (!username || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'نام کاربری، کلمه عبور و نام و نام خانوادگی الزامی هستند.',
      });
    }

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'این نام کاربری قبلاً ثبت شده است.',
      });
    }

    const user = new User({
      username: username.toLowerCase().trim(),
      password,
      fullName: fullName.trim(),
      role: role || 'sales',
      active: true,
    });
    await user.save();

    res.status(201).json({
      success: true,
      message: 'کاربر با موفقیت ثبت شد.',
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}
