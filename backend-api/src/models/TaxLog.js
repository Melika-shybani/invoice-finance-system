import mongoose from 'mongoose';

const taxLogSchema = new mongoose.Schema(
  {
    at: {
      type: Date,
      default: Date.now,
    },
    method: {
      type: String,
      default: 'POST',
    },
    url: {
      type: String,
      default: '/api/tax/invoices',
    },
    request: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: Number,
      required: true,
    },
    response: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    ms: {
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

taxLogSchema.index({ at: -1 });

export const TaxLog = mongoose.model('TaxLog', taxLogSchema);
