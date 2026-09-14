# The bot runs straight off TypeScript source via tsx rather than a tsc
# build: packages/core, packages/database and packages/config ship only
# .ts source (no dist/) since Next.js's webpack transpiles them directly
# for the dashboard — a plain `node dist/index.js` for the bot would try to
# `import` those same .ts files and fail, so tsx is what actually resolves
# the whole workspace correctly at runtime.
FROM node:22-slim

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @discord-rp/database exec prisma generate

CMD ["pnpm", "--filter", "bot", "run", "start"]
