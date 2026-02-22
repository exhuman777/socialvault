import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SocialVault',
  description: 'Local TikTok & Instagram downloader with dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
