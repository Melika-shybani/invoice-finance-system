import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'کد کالا یا خدمت الزامی است'],
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'عنوان کالا یا خدمت الزامی است'],
      trim: true,
    },
    kind: {
      type: String,
      enum: {
        values: ['good', 'service'],
        message: 'نوع باید good یا service باشد',
      },
      required: [true, 'نوع کالا یا خدمت الزامی است'],
      default: 'good',
    },
    price: {
      type: Number,
      required: [true, 'قیمت پایه الزامی است'],
      min: [0, 'قیمت نمی‌تواند منفی باشد'],
      default: 0,
    },
    taxRate: {
      type: Number,
      min: [0, 'نرخ مالیات نمی‌تواند منفی باشد'],
      max: [100, 'نرخ مالیات حداکثر ۱۰۰ درصد است'],
      default: 10,
    },
    stock: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

itemSchema.index({ code: 1, title: 'text' });

export const Item = mongoose.model('Item', itemSchema);
