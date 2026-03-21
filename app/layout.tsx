import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { KnowledgeProvider } from "@/components/providers/knowledge-provider";
import { uiCopy } from "@/lib/copy/zh-cn";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: uiCopy.metadata.title,
  description: uiCopy.metadata.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f6f5f2] text-foreground">
        <KnowledgeProvider>{children}</KnowledgeProvider>
      </body>
    </html>
  );
}
