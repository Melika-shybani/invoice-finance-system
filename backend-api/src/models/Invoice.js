import mongoose from 'mongoose';

const invoiceLineSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    qty: {
      type: Number,
      required: true,
      min: [1, 'تعداد باید حداقل ۱ باشد'],
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'قیمت واحد نمی‌تواند منفی باشد'],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'تخفیف نمی‌تواند منفی باشد'],
    },
    taxRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const statusChangeSchema = new mongoose.Schema(
  {
    at: {
      type: Date,
      default: Date.now,
    },
    from: {
      type: String,
      default: null,
    },
    to: {
      type: String,
      required: true,
    },
    by: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    number: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['sale', 'purchase'],
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
    lines: {
      type: [invoiceLineSchema],
      validate: [val => val.length > 0, 'فاکتور باید حداقل یک ردیف کالا یا خدمت داشته باشد'],
    },
    gross: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    net: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'ready', 'sent', 'confirmed', 'rejected'],
      default: 'draft',
    },
    cancelled: {
      type: Boolean,
      default: false,
    },
    taxId: {
      type: String,
      default: '',
      trim: true,
    },
    taxRef: {
      type: String,
      default: '',
      trim: true,
    },
    rejectReasons: {
      type: [String],
      default: [],
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
    },
    history: {
      type: [statusChangeSchema],
      default: [],
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
        if (ret.refId && typeof ret.refId === 'object' && ret.refId._id) {
          ret.refId = ret.refId._id.toString();
        } else if (ret.refId) {
          ret.refId = ret.refId.toString();
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

invoiceSchema.index({ type: 1, number: 1 });
invoiceSchema.index({ date: 1, status: 1 });
invoiceSchema.index({ partyId: 1 });
invoiceSchema.index({ taxId: 1 });

export const Invoice = mongoose.model('Invoice', invoiceSchema);
