import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// كتم تحذير Turbopack الخاص بـ Serwist لكي لا يزعجنا في الكونسول
process.env.SERWIST_SUPPRESS_TURBOPACK_WARNING = "1";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hslpavldgvlpkvqgogcc.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.openfoodfacts.org",
        pathname: "/images/products/**",
      },
      {
        protocol: "https",
        hostname: "images.openbeautyfacts.org",
        pathname: "/images/products/**",
      },
      {
        protocol: "https",
        hostname: "images.openpetfoodfacts.org",
        pathname: "/images/products/**",
      },
      {
        protocol: "https",
        hostname: "images.openproductsfacts.org",
        pathname: "/images/products/**",
      },
    ],
  },
  turbopack: {},
  experimental: {
    // كاش Turbopack بين البنود لتسريع عمليات next build المتتالية
    turbopackFileSystemCacheForBuild: true,
  },
};

export default withSerwist(nextConfig);
