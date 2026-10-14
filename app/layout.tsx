import AgentAssistant from '../components/AgentAssistant';
import { GoogleAnalytics } from '@next/third-parties/google';
import { LocaleProvider } from '../context/LocaleContext';
import Providers from './providers';
import './globals.css';
import { Baloo_2, Nunito } from "next/font/google";

export const metadata = {
  title: 'ECO-KIDS | Chạm để học, chơi để lớn',
  description: 'Hệ sinh thái tiếng Anh đa giác quan cho trẻ 3-8 tuổi',
  icons: {
    icon: '/img/banner-logo.png',
    shortcut: '/img/banner-logo.png',
    apple: '/img/banner-logo.png'
  }
};

const baloo = Baloo_2({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-baloo",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

export default function RootLayout({ children }) {
  const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="vi">
      <head>
        <link
          rel="preload"
          as="image"
          href="/img/banner-logo.png"
          fetchPriority="high"
        />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1822119781682021"
          crossOrigin="anonymous"
          fetchPriority="high"
        />
      </head>
      <body className={`${baloo.variable} ${nunito.variable}`}>
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