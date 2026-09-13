import { PLAN_IDS } from "@discord-rp/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Feature flags gated behind a plan tier — checked via core's isFeatureEnabled(). */
const FREE_FEATURES = {
  stockMarket: false,
  robbery: false,
  drugs: false,
  racket: false,
  sessions: false,
};
const PREMIUM_FEATURES = {
  ...FREE_FEATURES,
  robbery: true,
  drugs: true,
  racket: true,
  sessions: true,
};
const PREMIUM_PLUS_FEATURES = {
  ...PREMIUM_FEATURES,
  stockMarket: true,
};

async function main() {
  await prisma.premiumPlan.upsert({
    where: { id: PLAN_IDS.FREE },
    update: {},
    create: {
      id: PLAN_IDS.FREE,
      name: "Gratuit",
      priceCents: 0,
      isDefault: true,
      maxCharactersPerGuild: 25,
      maxVehiclesPerGuild: 25,
      maxCompaniesPerGuild: 5,
      maxJobsPerGuild: 10,
      maxShopsPerGuild: 5,
      maxPlacesPerGuild: 10,
      featureFlags: FREE_FEATURES,
    },
  });

  await prisma.premiumPlan.upsert({
    where: { id: PLAN_IDS.PREMIUM },
    update: {},
    create: {
      id: PLAN_IDS.PREMIUM,
      name: "Premium",
      priceCents: 999,
      isDefault: false,
      maxCharactersPerGuild: 100,
      maxVehiclesPerGuild: 150,
      maxCompaniesPerGuild: 25,
      maxJobsPerGuild: 40,
      maxShopsPerGuild: 25,
      maxPlacesPerGuild: 50,
      featureFlags: PREMIUM_FEATURES,
    },
  });

  await prisma.premiumPlan.upsert({
    where: { id: PLAN_IDS.PREMIUM_PLUS },
    update: {},
    create: {
      id: PLAN_IDS.PREMIUM_PLUS,
      name: "Premium+",
      priceCents: 1999,
      isDefault: false,
      maxCharactersPerGuild: 500,
      maxVehiclesPerGuild: 750,
      maxCompaniesPerGuild: 100,
      maxJobsPerGuild: 150,
      maxShopsPerGuild: 100,
      maxPlacesPerGuild: 200,
      featureFlags: PREMIUM_PLUS_FEATURES,
    },
  });

  const devGuildId = process.env.DISCORD_DEV_GUILD_ID;
  if (devGuildId) {
    await prisma.guild.upsert({
      where: { id: devGuildId },
      update: {},
      create: {
        id: devGuildId,
        name: "Dev Guild",
        ownerDiscordId: "0",
        planId: PLAN_IDS.FREE,
        config: { create: {} },
      },
    });
    console.log(`Seeded dev guild ${devGuildId} on the FREE plan.`);
  } else {
    console.log("DISCORD_DEV_GUILD_ID not set — skipped dev guild seed (plans still seeded).");
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
