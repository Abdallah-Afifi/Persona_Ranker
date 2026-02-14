import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow longer API route execution for the ranking process
  serverExternalPackages: ["groq-sdk"],
};

export default nextConfig;
