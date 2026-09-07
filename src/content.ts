import { connectMongo, Model3D, Package, Product, Topic, Vocabulary } from './models';

export async function getTopics() {
  await connectMongo();
  const topics = await Topic.find().sort({ createdAt: 1 }).lean();
  const vocabularies = await Vocabulary.find().sort({ createdAt: 1 }).lean();
  const modelRecords = await Model3D.find({ isActive: true }).sort({ createdAt: 1 }).lean();
  const modelByVocabularyId = new Map(
    modelRecords
      .filter((item: any) => item?.vocabularyId)
      .map((item: any) => [String(item.vocabularyId), item.modelUrl || ''])
  );

  return topics.map(topic => {
    const words = vocabularies
      .filter(word => word.topicId === topic.slug)
      .map(({ _id, topicId, ...word }) => ({
        ...word,
        modelUrl: modelByVocabularyId.get(String(word.id)) || word.modelUrl || '',
      }));

    const legacyWords = (topic.words || []).map((word: any) => ({
      ...word,
      modelUrl: modelByVocabularyId.get(String(word.id)) || word.modelUrl || '',
    }));

    return { ...topic, id: topic.slug, words: words.length ? words : legacyWords };
  });
}

export async function getProducts() {
  await connectMongo();
  const products = await Product.find({ isActive: true }).sort({ createdAt: 1 }).lean();
  return products.map(product => ({ ...product, id: product.slug }));
}

export async function getPackages() {
  await connectMongo();
  const [packages, products] = await Promise.all([
    Package.find({ isActive: true }).sort({ createdAt: 1 }).lean(),
    Product.find({ isActive: true }).lean(),
  ]);
  const productsBySlug = new Map(products.map(product => [product.slug, product]));

  return packages.map(pack => ({
    ...pack,
    id: pack.slug,
    items: (pack.items || []).map((item: any) => ({
      ...item,
      product: productsBySlug.get(item.productId) || null,
    })),
  }));
}