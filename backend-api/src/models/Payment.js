import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    number: {
      type: Number,
      required: true,
    },
    direction: {
      type: String,
      enum: {
        values: ['in', 'out'],
        message: 'جهت پرداخت باید in (دریافت) یا out (پرداخت) باشد',
      },
      required: true,
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'فرمت تاریخ باید YYYY-MM-DD باشد'],
    },
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      required: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'مبلغ باید بزرگتر از صفر باشد'],
    },
    method: {
      type: String,
      enum: ['cash', 'card', 'transfer', 'cheque'],
      default: 'transfer',
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        if (ret.partyId && typeof ret.partyId === 'object' && ret.partyId._id) {
          ret.party = ret.partyId;
          ret.partyId = ret.partyId._id.toString();
        } else if (ret.partyId) {
          ret.partyId = ret.partyId.toString();
        }
        if (ret.accountId && typeof ret.accountId === 'object' && ret.accountId._id) {
          ret.account = ret.accountId;
          ret.accountId = ret.accountId._id.toString();
        } else if (ret.accountId) {
          ret.accountId = ret.accountId.toString();
        }
        if (ret.invoiceId && typeof ret.invoiceId === 'object' && ret.invoiceId._id) {
          ret.invoiceId = ret.invoiceId._id.toString();
        } else if (ret.invoiceId) {
          ret.invoiceId = ret.invoiceId.toString();
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

paymentSchema.index({ date: 1, direction: 1 });
paymentSchema.index({ partyId: 1 });
paymentSchema.index({ accountId: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);
