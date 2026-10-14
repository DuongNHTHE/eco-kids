type TopicSelectablePackage = {
  name?: string;
  slug?: string;
};

export function requiresLearningTopic(pack: TopicSelectablePackage) {
  const name = String(pack.name || '').toLocaleLowerCase('vi');
  const slug = String(pack.slug || '').toLocaleLowerCase('vi');
  return slug === 'starter'
    || slug === 'explorer'
    || name.includes('sách bán lẻ')
    || name.includes('combo started kit')
    || slug.includes('sach-ban-le')
    || slug.includes('combo-started-kit');
}
