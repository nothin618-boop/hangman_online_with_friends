import type { Metadata } from 'next';
import { Love_Ya_Like_A_Sister } from 'next/font/google';
import './globals.css';

const loveYaLikeASister = Love_Ya_Like_A_Sister({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pencil',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'WHISPER // Cryptographic Linguistic Disguise',
  description: 'Mutate words to evade automated filters, decode secret themes, and defend against saboteurs.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${loveYaLikeASister.variable}`}>
      <body className="min-h-screen bg-background text-slate-100 antialiased selection:bg-cyan-400 selection:text-black">
        <main className="relative z-10 flex min-h-screen flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
