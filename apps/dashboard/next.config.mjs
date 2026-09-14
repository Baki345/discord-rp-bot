/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prisma's client is shared from packages/database — transpile the workspace
  // packages instead of asking every consumer to pre-build them.
  transpilePackages: ["@discord-rp/config", "@discord-rp/core", "@discord-rp/database"],
};

export default nextConfig;
