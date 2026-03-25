import type { Metadata } from "next";
import "./globals.css";
import ShellWrapper from "@/components/ShellWrapper";

export const dynamic = 'force-dynamic';

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Montserrat:wght@500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <ShellWrapper>{children}</ShellWrapper>
      </body>
    </html>
  );
}
