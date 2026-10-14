import type { Metadata } from 'next';
import './globals.css';
import { ShellLayout } from '@/components/ShellLayout';

export const metadata: Metadata = {
  title: 'TD Retail | Shared Customer Support Platform & Gemini Agent',
  description:
    'Consolidated multi-merchant customer support inbox powered by Google Gemini, server-grounded order tools, and SendGrid email reply routing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased selection:bg-primary/20">
        <ShellLayout>{children}</ShellLayout>
      </body>
    </html>
  );
}
