/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prisma's client is shared from packages/database — transpile the workspace
  // packages instead of asking every consumer to pre-build them.
  transpilePackages: ["@discord-rp/config", "@discord-rp/core", "@discord-rp/database"],
  webpack: (config) => {
    // packages/core (etc.) are written with NodeNext-style explicit ".js"
    // relative imports (required so apps/bot's own `node dist/index.js`
    // production run resolves correctly) — but those packages ship only
    // .ts source here, no dist/. Webpack needs to know a ".js" specifier
    // may really be the sibling ".ts" file.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
