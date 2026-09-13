import { PrismaClient } from "@prisma/client";

/**
 * Singleton across hot-reloads: apps/bot's tsx watch mode and apps/dashboard's
 * Next.js dev server both re-execute this module on file changes, which
 * would otherwise open a new Postgres connection pool every reload.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
