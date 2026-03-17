import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import ShellWrapper from "@/components/ShellWrapper";

export const dynamic = 'force-dynamic';

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Live Stat — Local Engine",
  description: "Esports tournament overlay & telemetry engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistMono.variable} antialiased`}>
        <ShellWrapper>{children}</ShellWrapper>
      </body>
    </html>
  );
}
