const topics = [
  {
    id: 'animals',
    title: 'Amazing Animals',
    vietnamese: 'Động vật kỳ thú',
    icon: '🦊',
    color: '#ff7b54',
    lessonCount: 8,
    words: [
      { id: 'fox', english: 'Fox', vietnamese: 'Con cáo', phonetic: '/fɒks/', color: '#ef7d32', shape: 'fox', prompt: 'The fox is quick and clever.' },
      { id: 'whale', english: 'Whale', vietnamese: 'Cá voi', phonetic: '/weɪl/', color: '#3f9de8', shape: 'whale', prompt: 'A whale swims in the blue ocean.' },
      { id: 'turtle', english: 'Turtle', vietnamese: 'Con rùa', phonetic: '/ˈtɜː.təl/', color: '#68a84f', shape: 'turtle', prompt: 'The turtle has a strong shell.' }
    ]
  },
  {
    id: 'fruits',
    title: 'Happy Fruits',
    vietnamese: 'Trái cây vui vẻ',
    icon: '🍎',
    color: '#ee5d5d',
    lessonCount: 6,
    words: [
      { id: 'apple', english: 'Apple', vietnamese: 'Quả táo', phonetic: '/ˈæp.əl/', color: '#e94f4f', shape: 'apple', prompt: 'This is a crunchy red apple.' },
      { id: 'orange', english: 'Orange', vietnamese: 'Quả cam', phonetic: '/ˈɒr.ɪndʒ/', color: '#ff922e', shape: 'orange', prompt: 'The orange is round and juicy.' },
      { id: 'pear', english: 'Pear', vietnamese: 'Quả lê', phonetic: '/peər/', color: '#a7c84a', shape: 'pear', prompt: 'A green pear is sweet.' }
    ]
  },
  {
    id: 'vehicles',
    title: 'Let’s Go!',
    vietnamese: 'Phương tiện',
    icon: '🚗',
    color: '#397ad7',
    lessonCount: 7,
    words: [
      { id: 'car', english: 'Car', vietnamese: 'Ô tô', phonetic: '/kɑːr/', color: '#e84e4e', shape: 'car', prompt: 'The red car goes fast.' },
      { id: 'bus', english: 'Bus', vietnamese: 'Xe buýt', phonetic: '/bʌs/', color: '#f2b537', shape: 'bus', prompt: 'The yellow bus takes us to school.' },
      { id: 'rocket', english: 'Rocket', vietnamese: 'Tên lửa', phonetic: '/ˈrɒk.ɪt/', color: '#6d65d8', shape: 'rocket', prompt: 'The rocket flies into space.' }
    ]
  }
];

const products = [
  { id: 'starter', name: 'Starter Kit', subtitle: 'Khởi đầu đa giác quan', price: 399000, badge: 'Bán chạy', color: '#ff7b54', items: ['01 sách Animals', '03 mô hình PLA', 'Web 3D trọn đời', 'AI Voice 30 ngày'] },
  { id: 'explorer', name: 'Explorer Kit', subtitle: 'Học đủ 3 chủ đề', price: 899000, badge: 'Tiết kiệm 18%', color: '#397ad7', featured: true, items: ['03 sách tương tác', '09 mô hình PLA', 'Web 3D trọn đời', 'AI Premium 3 tháng'] },
  { id: 'premium', name: 'AI Premium', subtitle: 'Bạn đồng hành mỗi ngày', price: 59000, period: '/tháng', badge: 'Dùng thử 7 ngày', color: '#7566d9', items: ['Luyện nói không giới hạn', 'Câu chuyện cá nhân hóa', 'Dashboard chi tiết', 'Nội dung mới mỗi tháng'] }
];

module.exports = { topics, products };
export {};
