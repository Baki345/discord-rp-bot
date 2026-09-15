# The bot runs straight off TypeScript source via tsx rather than a tsc
# build: packages/core, packages/database and packages/config ship only
# .ts source (no dist/) since Next.js's webpack transpiles them directly
# for the dashboard — a plain `node dist/index.js` for the bot would try to
# `import` those same .ts files and fail, so tsx is what actually resolves
# the whole workspace correctly at runtime.
FROM node:22-slim

# fonts-dejavu-core: node:22-slim ships no fonts at all, and @napi-rs/canvas
# (rank card rendering, M41) needs at least one installed to draw any text.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @discord-rp/database exec prisma generate

# Drop root before running — the bot never needs elevated privileges at
# runtime. node:22-slim ships a non-root `node` user (uid/gid 1000) for
# exactly this.
RUN chown -R node:node /app
USER node

CMD ["pnpm", "--filter", "bot", "run", "start"]
