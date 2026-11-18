import { Item } from '../models/Item.js';
import { Invoice } from '../models/Invoice.js';

export async function listItems(req, res, next) {
  try {
    const { kind, search } = req.query;
    const query = {};

    if (kind && ['good', 'service'].includes(kind)) {
      query.kind = kind;
    }

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
      ];
    }

    const items = await Item.find(query).sort({ code: 1 });
    res.json({
      success: true,
      data: items.map(it => it.toJSON()),
    });
  } catch (err) {
    next(err);
  }
}

export async function getItem(req, res, next) {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'کالا یا خدمت یافت نشد.' });
    }
    res.json({ success: true, data: item.toJSON() });
  } catch (err) {
    next(err);
  }
}

export async function createItem(req, res, next) {
  try {
    const { code, title, kind, price, taxRate, stock } = req.body;
    if (!code || !title || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'کد، عنوان و قیمت کالا یا خدمت الزامی هستند.',
      });
    }

    const existing = await Item.findOne({ code: code.trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'این کد کالا/خدمت قبلاً ثبت شده است.' });
    }

    const item = new Item({
      code: code.trim(),
      title: title.trim(),
      kind: kind || 'good',
      price: Number(price) || 0,
      taxRate: taxRate !== undefined ? Number(taxRate) : 10,
      stock: kind === 'service' ? 0 : (Number(stock) || 0),
    });

    await item.save();
    res.status(201).json({
      success: true,
      message: 'کالا یا خدمت با موفقیت ثبت شد.',
      data: item.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateItem(req, res, next) {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'کالا یا خدمت یافت نشد.' });
    }

    const { title, kind, price, taxRate, stock } = req.body;
    if (title) item.title = title.trim();
    if (kind) item.kind = kind;
    if (price !== undefined) item.price = Number(price);
    if (taxRate !== undefined) item.taxRate = Number(taxRate);
    if (stock !== undefined && item.kind === 'good') item.stock = Number(stock);

    await item.save();
    res.json({
      success: true,
      message: 'اطلاعات کالا یا خدمت با موفقیت به‌روزرسانی شد.',
      data: item.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteItem(req, res, next) {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'کالا یا خدمت یافت نشد.' });
    }

    // بررسی آیا در فاکتوری استفاده شده است
    const invoiceCount = await Invoice.countDocuments({ 'lines.itemId': item._id });
    if (invoiceCount > 0) {
      return res.status(400).json({
        success: false,
        message: `این کالا در ${invoiceCount} فاکتور ثبت شده و قابل حذف نیست.`,
      });
    }

    await Item.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'کالا یا خدمت با موفقیت حذف شد.' });
  } catch (err) {
    next(err);
  }
}
