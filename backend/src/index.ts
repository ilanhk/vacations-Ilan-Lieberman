import "reflect-metadata";
import "dotenv/config";
import express from "express";
import { authRouter } from "./auth/auth.routes.js";
import { initializeDataSource } from "./data-source.js";
import { vacationRequestRouter } from "./vacation-requests/vacation-request.routes.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/vacation-requests", vacationRequestRouter);

async function start(): Promise<void> {
  await initializeDataSource();
  app.listen(process.env.PORT, () => {
    console.log(`API on http://localhost:${process.env.PORT}`);
});
}

void start();
