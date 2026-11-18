import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    sellerName: {
      type: String,
      default: 'شرکت نمونه فناوری',
      trim: true,
    },
    sellerEconomicCode: {
      type: String,
      default: '411000111222',
      trim: true,
    },
    sellerNationalId: {
      type: String,
      default: '10100000001',
      trim: true,
    },
    memoryCode: {
      type: String,
      default: 'A1B2C3',
      trim: true,
      maxlength: 6,
    },
    sim: {
      latencyMs: {
        type: Number,
        default: 1200,
      },
      failRate: {
        type: Number,
        default: 0.1,
      },
      forceReject: {
        type: Boolean,
        default: false,
      },
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

export const Settings = mongoose.model('Settings', settingsSchema);
