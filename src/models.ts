import mongoose from 'mongoose';

let connectionPromise: Promise<typeof mongoose> | undefined;

export function connectMongo() {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);
  if (!connectionPromise) {
    const uri = process.env.MONGODB_URI ?? process.env.DATABASE_URL;
    if (!uri) throw new Error('MONGODB_URI is not configured.');
    connectionPromise = mongoose.connect(uri);
  }
  return connectionPromise;
}

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String },
  name: { type: String, required: true, trim: true },
  avatar: String,
  role: { type: String, enum: ['ADMIN', 'PARENT', 'TEACHER', 'SCHOOL_ADMIN'], default: 'PARENT' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'users' });

const progressSchema = new mongoose.Schema({
  childName: { type: String, required: true, trim: true, index: true },
  topicId: { type: String, required: true },
  wordId: { type: String, required: true },
  score: { type: Number, min: 0, max: 100, default: 0 },
  minutes: { type: Number, min: 0, default: 1 },
  practicedAt: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'learning_progress' });

const childSchema = new mongoose.Schema({
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 50 },
  nickname: { type: String, trim: true, maxlength: 50 },
  avatar: { type: String, default: '🧒' },
  birthDate: Date,
  gender: { type: String, enum: ['girl', 'boy', 'other'] },
  level: { type: Number, default: 1 },
}, { timestamps: true, collection: 'children' });

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

export const User = (mongoose.models.User || mongoose.model('User', userSchema)) as mongoose.Model<any>;
export const Child = (mongoose.models.Child || mongoose.model('Child', childSchema)) as mongoose.Model<any>;
export const Progress = (mongoose.models.Progress || mongoose.model('Progress', progressSchema)) as mongoose.Model<any>;
export const Order = (mongoose.models.Order || mongoose.model('Order', orderSchema)) as mongoose.Model<any>;
export const Partner = (mongoose.models.Partner || mongoose.model('Partner', partnerSchema)) as mongoose.Model<any>;

const vocabularySchema = new mongoose.Schema({
  id: String,
  english: { type: String, required: true },
  vietnamese: String,
  phonetic: String,
  color: String,
  shape: String,
  modelUrl: String,
  prompt: String,
}, { _id: false });

const vocabularyCollectionSchema = new mongoose.Schema({
  topicId: { type: String, required: true, index: true },
  id: { type: String, required: true },
  english: { type: String, required: true },
  vietnamese: String,
  phonetic: String,
  color: String,
  shape: String,
  modelUrl: String,
  prompt: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'vocabularies' });

const model3DSchema = new mongoose.Schema({
  vocabularyId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  modelUrl: { type: String, required: true },
  previewUrl: String,
  animation: mongoose.Schema.Types.Mixed,
  scale: Number,
  rotation: mongoose.Schema.Types.Mixed,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'model_3ds' });

const topicSchema = new mongoose.Schema({
  slug: { type: String, unique: true, required: true },
  title: { type: String, required: true },
  vietnamese: String,
  icon: String,
  color: String,
  description: String,
  lessonCount: Number,
  words: [vocabularySchema],
}, { timestamps: true, collection: 'topics' });

const productSchema = new mongoose.Schema({
  slug: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  subtitle: String,
  price: { type: Number, required: true },
  period: String,
  badge: String,
  color: String,
  featured: Boolean,
  items: [String],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Topic = (mongoose.models.Topic || mongoose.model('Topic', topicSchema)) as mongoose.Model<any>;
export const Vocabulary = (mongoose.models.Vocabulary || mongoose.model('Vocabulary', vocabularyCollectionSchema)) as mongoose.Model<any>;
export const Model3D = (mongoose.models.Model3D || mongoose.model('Model3D', model3DSchema)) as mongoose.Model<any>;
export const Product = (mongoose.models.Product || mongoose.model('Product', productSchema)) as mongoose.Model<any>;
