import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Realtime Docs",
  description: "Collaborative document editor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100`}
      >
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />

            <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
              {children}
            </main>

            <footer className="border-t border-slate-900/60 py-4 text-center text-xs text-slate-300">
              Collaborative docs scaffold &mdash; realtime and auth coming soon.
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
