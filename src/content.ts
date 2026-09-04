import { connectMongo, Product, Topic } from './models';

export async function getTopics() {
  await connectMongo();
  const topics = await Topic.find().sort({ createdAt: 1 }).lean();
  return topics.map(topic => ({ ...topic, id: topic.slug }));
}

export async function getProducts() {
  await connectMongo();
  const products = await Product.find({ isActive: true }).sort({ createdAt: 1 }).lean();
  return products.map(product => ({ ...product, id: product.slug }));
}