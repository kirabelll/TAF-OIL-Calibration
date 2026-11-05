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
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t!=='dark'&&t!=='light')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t}catch(_){}})()` }} />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          precedence="default"
        />
      </head>
      <body className="text-slate-800 antialiased min-h-screen dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
