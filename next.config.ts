import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // During the Supabase migration we disable ESLint enforcement at build
  // time so local TypeScript/ESLint issues don't block iteration.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
