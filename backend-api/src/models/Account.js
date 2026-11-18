import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: {
        values: ['cash', 'bank'],
        message: 'نوع حساب باید cash یا bank باشد',
      },
      required: [true, 'نوع حساب الزامی است'],
    },
    title: {
      type: String,
      required: [true, 'عنوان حساب الزامی است'],
      trim: true,
    },
    accountNo: {
      type: String,
      trim: true,
      default: '',
    },
    initial: {
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

export const Account = mongoose.model('Account', accountSchema);
