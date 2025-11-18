import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import MobileLayout from "@/components/MobileLayout";

export const metadata: Metadata = {
  title: "Basic Finance",
  description: "A minimal financial dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased font-light" style={{ backgroundColor: '#fafafa', color: '#000000' }}>
        <div className="flex min-h-screen">
          {/* Mobile Layout (only visible on mobile) */}
          <div className="md:hidden">
            <MobileLayout />
          </div>
          {/* Desktop Navigation (only visible on desktop) */}
          <div className="hidden md:block">
            <Navigation />
          </div>
          <main className="flex-1 md:ml-[var(--sidebar-width,280px)] md:transition-all md:duration-300 pt-16 md:pt-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
