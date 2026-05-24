import type { NextConfig } from "next";
import { getConfiguredSupabaseUrl } from "./src/lib/supabase/config";

const recommendationPhotoPathname = "/storage/v1/object/public/recommendation-photos/**";

export function getSupabaseImageRemotePatterns(supabaseUrl = getConfiguredSupabaseUrl()) {
  if (!supabaseUrl) {
    return [];
  }

  try {
    const url = new URL(supabaseUrl);

    if (url.protocol !== "https:") {
      return [];
    }

    return [
      {
        protocol: "https" as const,
        hostname: url.hostname,
        pathname: recommendationPhotoPathname,
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      ...getSupabaseImageRemotePatterns(),
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
