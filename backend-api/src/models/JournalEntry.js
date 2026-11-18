import mongoose from 'mongoose';

const journalLineSchema = new mongoose.Schema(
  {
    account: {
      type: String,
      required: [true, 'کد حساب الزامی است'],
      trim: true,
    },
    debit: {
      type: Number,
      default: 0,
      min: [0, 'مبلغ بدهکار نمی‌تواند منفی باشد'],
    },
    credit: {
      type: Number,
      default: 0,
      min: [0, 'مبلغ بستانکار نمی‌تواند منفی باشد'],
    },
  },
  { _id: false }
);

const journalEntrySchema = new mongoose.Schema(
  {
    number: {
      type: Number,
      required: true,
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'فرمت تاریخ باید YYYY-MM-DD باشد'],
    },
    description: {
      type: String,
      required: [true, 'شرح سند حسابداری الزامی است'],
      trim: true,
    },
    lines: {
      type: [journalLineSchema],
      validate: [val => val.length >= 2, 'سند حسابداری باید حداقل دارای ۲ ردیف (بدهکار و بستانکار) باشد'],
    },
    auto: {
      type: Boolean,
      default: false,
    },
    refId: {
      type: String,
      default: '',
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

// کنترل تراز بودن سند حسابداری
journalEntrySchema.pre('validate', function (next) {
  if (this.lines && this.lines.length > 0) {
    const totalDebit = this.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const totalCredit = this.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);

    if (totalDebit !== totalCredit) {
      return next(new Error(`سند حسابداری تراز نیست: جمع بدهکار (${totalDebit}) با جمع بستانکار (${totalCredit}) برابر نیست.`));
    }
    if (totalDebit <= 0) {
      return next(new Error('مجموع گردش سند حسابداری باید بزرگتر از صفر باشد.'));
    }
  }
  next();
});

journalEntrySchema.index({ date: 1, number: 1 });
journalEntrySchema.index({ refId: 1 });

export const JournalEntry = mongoose.model('JournalEntry', journalEntrySchema);
