import 'dotenv/config';
import { connectMongo, Product, Topic, User, Vocabulary } from '../src/models';

const topics = [
    { slug: 'animals', title: 'Amazing Animals', vietnamese: 'Động vật kỳ thú', icon: '🦊', color: '#ff7b54', words: [['fox', 'Fox', 'Con cáo', '/fɒks/', 'fox', 'The fox is quick and clever.'], ['whale', 'Whale', 'Cá voi', '/weɪl/', 'whale', 'A whale swims in the blue ocean.'], ['turtle', 'Turtle', 'Con rùa', '/ˈtɜː.təl/', 'turtle', 'The turtle has a strong shell.']] },
    { slug: 'fruits', title: 'Happy Fruits', vietnamese: 'Trái cây vui vẻ', icon: '🍎', color: '#ee5d5d', words: [['apple', 'Apple', 'Quả táo', '/ˈæp.əl/', 'apple', 'This is a crunchy red apple.'], ['orange', 'Orange', 'Quả cam', '/ˈɒr.ɪndʒ/', 'orange', 'The orange is round and juicy.'], ['pear', 'Pear', 'Quả lê', '/peər/', 'pear', 'A green pear is sweet.']] },
    { slug: 'vehicles', title: "Let's Go!", vietnamese: 'Phương tiện', icon: '🚗', color: '#397ad7', words: [['car', 'Car', 'Ô tô', '/kɑːr/', 'car', 'The red car goes fast.'], ['bus', 'Bus', 'Xe buýt', '/bʌs/', 'bus', 'The yellow bus takes us to school.'], ['rocket', 'Rocket', 'Tên lửa', '/ˈrɒk.ɪt/', 'rocket', 'The rocket flies into space.']] },
];

const products = [
    { slug: 'starter', name: 'Starter Kit', subtitle: 'Khởi đầu đa giác quan', price: 399000, badge: 'Bán chạy', color: '#ff7b54', items: ['01 sách Animals', '03 mô hình PLA', 'Web 3D trọn đời', 'AI Voice 30 ngày'] },
    { slug: 'explorer', name: 'Explorer Kit', subtitle: 'Học đủ 3 chủ đề', price: 899000, badge: 'Tiết kiệm 18%', color: '#397ad7', featured: true, items: ['03 sách tương tác', '09 mô hình PLA', 'Web 3D trọn đời', 'AI Premium 3 tháng'] },
    { slug: 'premium', name: 'AI Premium', subtitle: 'Bạn đồng hành mỗi ngày', price: 59000, period: '/tháng', badge: 'Dùng thử 7 ngày', color: '#7566d9', items: ['Luyện nói không giới hạn', 'Câu chuyện cá nhân hóa', 'Dashboard chi tiết', 'Nội dung mới mỗi tháng'] },
];

const demoUsers = [
    { email: 'admin@example.com', password: '123456789', name: 'Admin ECO', role: 'ADMIN' },
    { email: 'parent@example.com', password: '123456789', name: 'Parent ECO', role: 'PARENT' },
];

async function main() {
    await connectMongo();
    for (const topic of topics) {
        const { words, ...topicData } = topic;
        await Topic.findOneAndUpdate(
            { slug: topic.slug },
            { $set: { ...topicData, lessonCount: words.length }, $unset: { words: 1 } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        await Vocabulary.deleteMany({ topicId: topic.slug });
        await Vocabulary.insertMany(words.map(([id, english, vietnamese, phonetic, shape, prompt]) => ({
            topicId: topic.slug,
            id,
            english,
            vietnamese,
            phonetic,
            shape,
            prompt,
            color: topic.color,
        })));
    }
    for (const product of products) await Product.findOneAndUpdate({ slug: product.slug }, product, { upsert: true, new: true, setDefaultsOnInsert: true });

    for (const user of demoUsers) {
        await User.findOneAndUpdate(
            { email: user.email },
            { $set: { ...user, updatedAt: new Date() } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    }

    console.log('Seed completed');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
