import { LocaleProvider } from '../context/LocaleContext';
import './globals.css';

export const metadata = {
  title: 'ECO-KIDS | Chạm để học, chơi để lớn',
  description: 'Hệ sinh thái tiếng Anh đa giác quan cho trẻ 3-8 tuổi'
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <LocaleProvider>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}