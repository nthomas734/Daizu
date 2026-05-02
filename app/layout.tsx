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
  themeColor: '#1B3A2F',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:..."
        />
        <link rel="apple-touch-icon" href="/icon-180.png" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: '#0A0A0A',
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
