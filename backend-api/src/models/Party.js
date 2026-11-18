import mongoose from 'mongoose';

const partySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'نام طرف حساب الزامی است'],
      trim: true,
    },
    kind: {
      type: String,
      enum: {
        values: ['customer', 'supplier', 'both'],
        message: 'نوع طرف حساب باید customer، supplier یا both باشد',
      },
      required: [true, 'تعیین نوع طرف حساب الزامی است'],
      default: 'customer',
    },
    nationalId: {
      type: String,
      trim: true,
      default: '',
    },
    economicCode: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
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

partySchema.index({ name: 'text', nationalId: 1, phone: 1 });

export const Party = mongoose.model('Party', partySchema);
