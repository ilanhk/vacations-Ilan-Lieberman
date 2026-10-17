import "reflect-metadata";
import "dotenv/config";
import bcrypt from "bcryptjs";
import { AppDataSource, initializeDataSource } from "./data-source.js";
import { User } from "./users/user.entity.js";

async function seed(): Promise<void> {
  await initializeDataSource();
  const repository = AppDataSource.getRepository(User);
  const demoUsers = [
    {
      name: "Alex Requester",
      email: "requester@vacation.local",
      role: "Requester" as const,
    },
    {
      name: "Morgan Validator",
      email: "validator@vacation.local",
      role: "Validator" as const,
    },
  ];

  for (const demoUser of demoUsers) {
    const existing = await repository.findOneBy({ email: demoUser.email });
    if (!existing) {
      await repository.save(
        repository.create({
          ...demoUser,
          password: await bcrypt.hash("Vacation123!", 12),
        }),
      );
      console.log(`Seeded ${demoUser.role}: ${demoUser.email}`);
    } else {
      console.log(`Skipped existing user: ${demoUser.email}`);
    }
  }
  await AppDataSource.destroy();
}

void seed().catch(async (error: unknown) => {
  console.error("Failed to seed database:", error);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exitCode = 1;
});
