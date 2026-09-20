import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/global/theme-provider";

const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "Jumlati - تطبيق جملتي",
  description: "منصة لبيع وشراء المنتجات بالجملة والمفرد",
};

import { FloatingContactButton } from "@/components/global/floating-contact-button";
import { TopAnnouncementBar } from "@/components/global/top-announcement-bar";
import { PromoBanners } from "@/components/global/promo-banners";
import { FloatingTopRight } from "@/components/global/floating-top-right";
import { FloatingAppMenu } from "@/components/global/floating-app-menu"
import { FloatingMenuProvider } from "@/components/global/floating-menu-provider";
import {
  getCurrentProfile,
  getCartCount,
  getAppSettings,
  getPromoBanners,
  getTopBanners,
} from "@/lib/app-context";
import { ScrollToTop } from "@/components/global/scroll-to-top";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // استعلامات مغلّفة بـ React.cache — تُنفَّذ مرة واحدة لكل طلب وتُعاد استخدامها في (app)/layout
  // جلب المستخدم يجري داخلياً عبر getCurrentUser المخزّنة
  const [{ role, fullName }, cartCount, settings, promoBanners, topBanners] = await Promise.all([
    getCurrentProfile(),
    getCartCount(),
    getAppSettings(),
    getPromoBanners(),
    getTopBanners(),
  ]);

  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} font-sans antialiased overflow-x-hidden`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden w-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ScrollToTop />
          <FloatingMenuProvider>
            <FloatingTopRight 
              userRole={role} 
              fullName={fullName} 
              settings={settings}
              cartCount={cartCount}
            />
          </FloatingMenuProvider>
          <TopAnnouncementBar initialBanners={topBanners} />
          <main className="flex-1 pb-28 sm:pb-36">
            {children}
          </main>
          
          <PromoBanners initialBanners={promoBanners} />
        </ThemeProvider>
      </body>
    </html>
  );
}
