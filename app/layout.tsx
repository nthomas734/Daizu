import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'daizu · 大豆',
  description: "Bean's home cafe",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'daizu',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0A0A0A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400&family=Geist+Mono:wght@400;600;700&family=Manrope:wght@300;400;500;600&family=Noto+Serif+JP:wght@300;400&display=swap"
        />
        <link rel="apple-touch-icon" href="/icon-180.png" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: '#1B3A2F',
          fontFamily: "'Manrope', system-ui, sans-serif",
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  );
}
