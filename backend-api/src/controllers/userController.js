import { User } from '../models/User.js';

export async function listUsers(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: users.map(u => u.toJSON()),
    });
  } catch (err) {
    next(err);
  }
}

export async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'کاربر یافت نشد.' });
    }
    res.json({ success: true, data: user.toJSON() });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const { username, password, fullName, role, active } = req.body;
    if (!username || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'نام کاربری، کلمه عبور و نام و نام خانوادگی الزامی هستند.',
      });
    }

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'این نام کاربری قبلاً ثبت شده است.' });
    }

    const user = new User({
      username: username.toLowerCase().trim(),
      password,
      fullName: fullName.trim(),
      role: role || 'sales',
      active: active !== undefined ? active : true,
    });
    await user.save();

    res.status(201).json({
      success: true,
      message: 'کاربر با موفقیت ایجاد شد.',
      data: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'کاربر یافت نشد.' });
    }

    const { fullName, role, active, password } = req.body;
    if (fullName) user.fullName = fullName.trim();
    if (role) user.role = role;
    if (active !== undefined) user.active = active;
    if (password) user.password = password; // triggers pre-save hash

    await user.save();
    res.json({
      success: true,
      message: 'اطلاعات کاربر با موفقیت به‌روزرسانی شد.',
      data: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleUserStatus(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'کاربر یافت نشد.' });
    }

    user.active = !user.active;
    await user.save();

    res.json({
      success: true,
      message: `حساب کاربری با موفقیت ${user.active ? 'فعال' : 'غیرفعال'} شد.`,
      data: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'کاربر یافت نشد.' });
    }

    if (user.username === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'امکان حذف کاربر اصلی سیستم (admin) وجود ندارد.',
      });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'کاربر با موفقیت حذف شد.' });
  } catch (err) {
    next(err);
  }
}
