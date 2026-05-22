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
          backgroundImage:
            'radial-gradient(circle at 20% 10%, rgba(200, 169, 126, 0.04), transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 111, 71, 0.05), transparent 50%)',
          backgroundAttachment: 'fixed',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.025,
            zIndex: 9999,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        {children}
      </body>
    </html>
  );
}
