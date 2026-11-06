import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TAF OIL PLC - Petroleum Calibration & Transhipment System',
  description: 'TAF Oil Ethiopia full-stack transhipment order, ASTM calibration, and debit note management platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(!t)t='dark';if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}}catch(_){document.documentElement.classList.add('dark');}})();`,
          }}
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          precedence="default"
        />
      </head>
      <body className="text-foreground bg-background antialiased min-h-screen transition-colors duration-150">
        {children}
      </body>
    </html>
  );
}
