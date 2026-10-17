import "reflect-metadata";
import "dotenv/config";
import express from "express";
import { authRouter } from "./auth/auth.routes.js";
import { initializeDataSource } from "./data-source.js";
import { requireAuth, requireRole } from "./auth/auth.middleware.js";
import { AppDataSource } from "./data-source.js";
import { HttpError } from "./shared/http-error.js";
import { sendJson } from "./shared/common-response.js";
import { User } from "./users/user.entity.js";
import { Router } from "express";
import { vacationRequestRouter } from "./vacation-requests/vacation-request.routes.js";

const app = express();
app.use(express.json({ limit: "32kb" }));
app.use((req, res, next) => {
  const origin = process.env.FRONTEND_URL ?? "http://localhost:5173";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get("/health", (_req, res) => {
  sendJson(res, 200, { ok: true });
});

app.use("/auth", authRouter);
const userRouter = Router();
userRouter.get("/", requireAuth, requireRole("Validator"), async (_req, res) => {
  const users = await AppDataSource.getRepository(User)
    .createQueryBuilder("user")
    .select(["user.id", "user.name", "user.email", "user.role"])
    .orderBy("user.name", "ASC")
    .getMany();
  sendJson(res, 200, { items: users });
});
app.use("/users", userRouter);
app.use("/vacation-requests", vacationRequestRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof HttpError) {
    sendJson(res, error.status, { message: error.message });
    return;
  }
  if (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400
  ) {
    sendJson(res, 400, { message: "Malformed JSON request body" });
    return;
  }
  console.error("Request failed:", error);
  sendJson(res, 500, { message: "Internal server error" });
});
app.use((_req, res) => {
  sendJson(res, 404, { message: "Route not found" });
});

async function start(): Promise<void> {
  await initializeDataSource();
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`API on http://localhost:${port}`);
  });
}

void start().catch((error: unknown) => {
  console.error("Failed to start API:", error);
  process.exitCode = 1;
});
