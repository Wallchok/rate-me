import type { NextConfig } from "next";
import { version } from "./package.json";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.112"],
  // Shown in settings; one number per release, including technical ones
  env: { NEXT_PUBLIC_APP_VERSION: version },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          // Camera only for the barcode scanner on our own pages
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
