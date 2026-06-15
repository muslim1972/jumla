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
    ],
  },
  turbopack: {},
};

export default withSerwist(nextConfig);
