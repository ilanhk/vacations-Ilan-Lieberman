import "reflect-metadata";
import { hashPassword } from "./auth/utils/password-hashing.js";
import { initializeDataSource, AppDataSource } from "./data-source.js";
import { User } from "./users/user.entity.js";
import type { UserRole } from "./users/user.entity.js";
import { VacationRequest } from "./vacation-requests/vacation-request.entity.js";
import type { VacationRequestStatus } from "./vacation-requests/vacation-request.entity.js";


// Demo users to be seeded into the database for testing,
// 2 Requesters and 2 Validators
const demoUsers: Array<{ name: string; email: string; role: UserRole }> = [
  { name: "Requester One", email: "requester1@example.com", role: "Requester" },
  { name: "Requester Two", email: "requester2@example.com", role: "Requester" },
  { name: "Validator One", email: "validator1@example.com", role: "Validator" },
  { name: "Validator Two", email: "validator2@example.com", role: "Validator" },
];

// 3 non-overlapping requests per requester, one for each status.
// Offsets are in days from today, so the dates are always in the future.
const demoRequests: Array<{
  startOffset: number;
  lengthDays: number;
  reason: string;
  status: VacationRequestStatus;
  comments: string | null;
}> = [
  { startOffset: 14, lengthDays: 5, reason: "Family trip", status: "Pending", comments: null },
  { startOffset: 45, lengthDays: 7, reason: "Summer holiday", status: "Approved", comments: null },
  {
    startOffset: 90,
    lengthDays: 3,
    reason: "Long weekend",
    status: "Rejected",
    comments: "Team is short-staffed during this period",
  },
];

// Returns a Date at UTC midnight, `offsetDays` after today (matches the Postgres `date` column)
function futureDate(offsetDays: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays),
  );
}

// Skips users that already have requests so re-running the seeder doesn't create duplicates
async function seedDemoRequests(user: User): Promise<number> {
  const repository = AppDataSource.getRepository(VacationRequest);
  if ((await repository.count({ where: { userId: user.id } })) > 0) {
    console.log(`Skipped requests for ${user.email} (already has some)`);
    return 0;
  }

  for (const demo of demoRequests) {
    await repository.save(
      repository.create({
        userId: user.id,
        startDate: futureDate(demo.startOffset),
        endDate: futureDate(demo.startOffset + demo.lengthDays),
        reason: demo.reason,
        status: demo.status,
        comments: demo.comments,
      }),
    );
  }
  console.log(`Created ${demoRequests.length} vacation requests for ${user.email}`);
  return demoRequests.length;
}

async function seedDemoUsers(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to create demo users in production");
  }

  const password = process.env.SEED_DEMO_PASSWORD ?? "Vacation123!";
  if (
    password.length < 8 ||
    password.length > 128 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(
      "SEED_DEMO_PASSWORD must be 8-128 characters and include uppercase, lowercase, numeric, and symbol characters",
    );
  }

  await initializeDataSource();
  const repository = AppDataSource.getRepository(User);
  const passwordHash = await hashPassword(password);
  let createdCount = 0;
  let requestCount = 0;

  for (const demoUser of demoUsers) {
    const existingUser = await repository.findOne({
      where: { email: demoUser.email },
    });
    let user = existingUser;
    if (user) {
      console.log(`Skipped existing demo account: ${demoUser.email}`);
    } else {
      user = await repository.save(
        repository.create({
          ...demoUser,
          password: passwordHash,
        }),
      );
      console.log(`Created ${demoUser.role.toLowerCase()}: ${demoUser.email}`);
      createdCount++;
    }

    if (user.role === "Requester") {
      requestCount += await seedDemoRequests(user);
    }
  }

  console.log(
    `Demo seeding complete (${createdCount} account(s), ${requestCount} request(s) created).`,
  );
}

seedDemoUsers()
  .catch((error: unknown) => {
    console.error("Failed to seed demo users", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });
