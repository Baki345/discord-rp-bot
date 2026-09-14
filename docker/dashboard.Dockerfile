FROM node:22-slim

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @discord-rp/database exec prisma generate
RUN pnpm --filter dashboard run build

EXPOSE 3000
CMD ["pnpm", "--filter", "dashboard", "run", "start"]
