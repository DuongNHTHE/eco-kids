import AgentAssistant from '../components/AgentAssistant';
import { GoogleAnalytics } from '@next/third-parties/google';
import { LocaleProvider } from '../context/LocaleContext';
import Providers from './providers';
import './globals.css';

export const metadata = {
  title: 'ECO-KIDS | Chạm để học, chơi để lớn',
  description: 'Hệ sinh thái tiếng Anh đa giác quan cho trẻ 3-8 tuổi',
  icons: {
    icon: '/img/banner-logo.png',
    shortcut: '/img/banner-logo.png',
    apple: '/img/banner-logo.png'
  }
};

export default function RootLayout({ children }) {
  const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="vi">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1822119781682021"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Providers>
          <LocaleProvider>
            {children}
            <AgentAssistant />
          </LocaleProvider>
        </Providers>
        {googleAnalyticsId && <GoogleAnalytics gaId={googleAnalyticsId} />}
      </body>
    </html>
  );
}