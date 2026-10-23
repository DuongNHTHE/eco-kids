export const LISTEN_AND_MATCH_ID = 'listen-and-match';
export const SAY_IT_WITH_AI_ID = 'say-it-with-ai';

export const DEFAULT_LISTEN_AND_MATCH_CONFIG = {
  gameId: LISTEN_AND_MATCH_ID,
  title: 'Listen and Match',
  description: 'Lắng nghe tên tiếng Anh và tìm đúng hình ảnh.',
  icon: '🎧',
  isActive: true,
  themes: [
    {
      id: 'animals',
      title: 'Động vật',
      items: [
        { id: 'dog', name: 'dog', translation: 'chó', emoji: '🐶', imageUrl: '' },
        { id: 'cat', name: 'cat', translation: 'mèo', emoji: '🐱', imageUrl: '' },
        { id: 'lion', name: 'lion', translation: 'sư tử', emoji: '🦁', imageUrl: '' },
        { id: 'elephant', name: 'elephant', translation: 'voi', emoji: '🐘', imageUrl: '' },
      ],
    },
    {
      id: 'objects',
      title: 'Đồ vật',
      items: [
        { id: 'book', name: 'book', translation: 'sách', emoji: '📚', imageUrl: '' },
        { id: 'ball', name: 'ball', translation: 'bóng', emoji: '⚽', imageUrl: '' },
        { id: 'car', name: 'car', translation: 'ô tô', emoji: '🚗', imageUrl: '' },
        { id: 'apple', name: 'apple', translation: 'quả táo', emoji: '🍎', imageUrl: '' },
      ],
    },
  ],
};
