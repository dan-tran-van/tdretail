import type { Metadata } from 'next';
import './globals.css';
import { ShellLayout } from '@/components/ShellLayout';
import { IBM_Plex_Sans, Source_Sans_3 } from "next/font/google";
import { cn } from "@/lib/utils";

const sourceSans3Heading = Source_Sans_3({subsets:['latin'],variable:'--font-heading'});

const ibmPlexSans = IBM_Plex_Sans({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="en" className={cn("h-full antialiased", "font-sans", ibmPlexSans.variable, sourceSans3Heading.variable)}>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased selection:bg-primary/20">
        <ShellLayout>{children}</ShellLayout>
      </body>
    </html>
  );
}
