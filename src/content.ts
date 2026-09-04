import { connectMongo, Product, Topic, Vocabulary } from './models';

export async function getTopics() {
  await connectMongo();
  const topics = await Topic.find().sort({ createdAt: 1 }).lean();
  const vocabularies = await Vocabulary.find().sort({ createdAt: 1 }).lean();
  return topics.map(topic => {
    const words = vocabularies.filter(word => word.topicId === topic.slug).map(({ _id, topicId, ...word }) => word);
    return { ...topic, id: topic.slug, words: words.length ? words : (topic.words || []) };
  });
}

export async function getProducts() {
  await connectMongo();
  const products = await Product.find({ isActive: true }).sort({ createdAt: 1 }).lean();
  return products.map(product => ({ ...product, id: product.slug }));
}