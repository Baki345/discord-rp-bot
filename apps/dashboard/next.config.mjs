/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prisma's client is shared from packages/database — transpile the workspace
  // packages instead of asking every consumer to pre-build them.
  transpilePackages: ["@discord-rp/config", "@discord-rp/core", "@discord-rp/database"],
  // A strict Content-Security-Policy is deliberately not set here: every
  // page in this app renders with inline `style={{}}` (style-src would need
  // 'unsafe-inline' or a per-file refactor) and Next's own hydration
  // bootstrap uses inline <script> tags (script-src would need per-request
  // nonces wired through middleware) — either is a real project on its own,
  // not a safe thing to bolt on in this pass. These headers are the ones
  // that carry no such risk.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
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
