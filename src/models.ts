import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema({
  childName: { type: String, required: true, trim: true, index: true },
  topicId: { type: String, required: true },
  wordId: { type: String, required: true },
  score: { type: Number, min: 0, max: 100, default: 0 },
  minutes: { type: Number, min: 0, default: 1 },
  practicedAt: { type: Date, default: Date.now }
}, { timestamps: true });

progressSchema.index({ childName: 1, topicId: 1, wordId: 1 }, { unique: true });

const orderSchema = new mongoose.Schema({
  customer: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true }
  },
  items: [{ productId: String, name: String, price: Number, quantity: Number }],
  total: { type: Number, required: true },
  status: { type: String, default: 'new' }
}, { timestamps: true });

const partnerSchema = new mongoose.Schema({
  organization: { type: String, required: true },
  contactName: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  studentCount: Number,
  note: String,
  status: { type: String, default: 'new' }
}, { timestamps: true });

export const Progress = mongoose.models.Progress || mongoose.model('Progress', progressSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export const Partner = mongoose.models.Partner || mongoose.model('Partner', partnerSchema);
