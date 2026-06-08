import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "Jumlati - تطبيق جملتي",
  description: "منصة لبيع وشراء المنتجات بالجملة والمفرد",
};

import { FloatingContactButton } from "@/components/floating-contact-button";
import { TopAnnouncementBar } from "@/components/top-announcement-bar";
import { createClient } from "@/utils/supabase/server";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle()
  const topBanners: any[] = []

  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} font-sans antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TopAnnouncementBar initialBanners={topBanners} />
          {children}
          <FloatingContactButton settings={settings} />
        </ThemeProvider>
      </body>
    </html>
  );
}
