import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // During the Supabase migration we disable ESLint enforcement at build
  // time so local TypeScript/ESLint issues don't block iteration.
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: "/profile/Marcusw999",
        destination: "/profile/AstonMartin",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
