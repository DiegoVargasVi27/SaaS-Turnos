import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin12345", 10);

  const business = await prisma.business.upsert({
    where: { slug: "demo-barberia" },
    update: {},
    create: {
      name: "Demo Barberia",
      slug: "demo-barberia",
      timezone: "America/Bogota",
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@demo.com" },
    update: {},
    create: {
      email: "owner@demo.com",
      fullName: "Owner Demo",
      passwordHash,
    },
  });

  await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: owner.id,
      },
    },
    update: {},
    create: {
      businessId: business.id,
      userId: owner.id,
      role: Role.OWNER,
    },
  });

  await prisma.service.upsert({
    where: { id: "c8f4f40f-b1ff-4f11-9a0f-9e85d73f3da1" },
    update: {},
    create: {
      id: "c8f4f40f-b1ff-4f11-9a0f-9e85d73f3da1",
      businessId: business.id,
      name: "Corte clasico",
      durationMin: 30,
      priceCents: 1200,
      currency: "USD",
    },
  });

  await prisma.availabilityRule.deleteMany({ where: { businessId: business.id } });

  await prisma.availabilityRule.createMany({
    data: [
      { businessId: business.id, weekday: 1, startTime: "09:00", endTime: "18:00", slotIntervalMin: 30 },
      { businessId: business.id, weekday: 2, startTime: "09:00", endTime: "18:00", slotIntervalMin: 30 },
      { businessId: business.id, weekday: 3, startTime: "09:00", endTime: "18:00", slotIntervalMin: 30 },
      { businessId: business.id, weekday: 4, startTime: "09:00", endTime: "18:00", slotIntervalMin: 30 },
      { businessId: business.id, weekday: 5, startTime: "09:00", endTime: "18:00", slotIntervalMin: 30 },
    ],
  });

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
