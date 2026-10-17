import { Router } from "express";
import { AppDataSource } from "../data-source.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { HttpError } from "../shared/http-error.js";
import { sendJson } from "../shared/common-response.js";
import { User } from "../users/user.entity.js";
import { approveVacationRequest } from "./commands/approve-vacation-request.command.js";
import { createVacationRequest } from "./commands/create-vacation-request.command.js";
import { rejectVacationRequest } from "./commands/reject-vacation-request.command.js";
import { VacationRequest, type VacationRequestStatus } from "./vacation-request.entity.js";

export const vacationRequestRouter = Router();
vacationRequestRouter.use(requireAuth);

vacationRequestRouter.post("/", requireRole("Requester"), async (req, res) => {
  if (typeof req.body !== "object" || req.body === null) {
    throw new HttpError(400, "A JSON request body is required");
  }
  const { startDate, endDate, reason } = req.body as Record<string, unknown>;
  if (
    typeof startDate !== "string" ||
    typeof endDate !== "string" ||
    (reason !== undefined && typeof reason !== "string")
  ) {
    throw new HttpError(400, "Provide valid startDate and endDate values");
  }
  const result = await createVacationRequest({
    userId: req.user!.id,
    startDate,
    endDate,
    ...(typeof reason === "string" ? { reason } : {}),
  });
  sendJson(res, 201, result);
});

vacationRequestRouter.get("/", async (req, res) => {
  const user = req.user!;
  const page = parsePositiveInteger(req.query.page, 1, "page");
  const limit = parsePositiveInteger(req.query.limit, 10, "limit");
  if (limit > 100) {
    throw new HttpError(400, "limit cannot exceed 100");
  }
  const status = req.query.status;
  const userId = req.query.userId;
  if (
    status !== undefined &&
    status !== "Pending" &&
    status !== "Approved" &&
    status !== "Rejected"
  ) {
    throw new HttpError(400, "status must be Pending, Approved, or Rejected");
  }

  const query = AppDataSource.getRepository(VacationRequest)
    .createQueryBuilder("request")
    .leftJoin("request.user", "user")
    .addSelect(["user.id", "user.name", "user.email"])
    .orderBy("request.created_at", "DESC")
    .skip((page - 1) * limit)
    .take(limit);

  if (user.role === "Requester") {
    query.andWhere("request.user_id = :userId", { userId: user.id });
  } else if (userId !== undefined) {
    if (
      typeof userId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) ||
      !(await AppDataSource.getRepository(User).exists({ where: { id: userId } }))
    ) {
      throw new HttpError(400, "userId must identify an existing user");
    }
    query.andWhere("request.user_id = :userId", { userId });
  }
  if (status) {
    query.andWhere("request.status = :status", { status: status as VacationRequestStatus });
  }

  const [items, total] = await query.getManyAndCount();
  sendJson(res, 200, {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

vacationRequestRouter.get("/team", async (_req, res) => {
  const requests = await AppDataSource.getRepository(VacationRequest)
    .createQueryBuilder("request")
    .innerJoin("request.user", "user")
    .select([
      "request.id",
      "request.startDate",
      "request.endDate",
      "user.id",
      "user.name",
    ])
    .where("request.status = :status", { status: "Approved" })
    .orderBy("request.start_date", "ASC")
    .getMany();
  sendJson(res, 200, { items: requests });
});

vacationRequestRouter.post(
  "/:id/approve",
  requireRole("Validator"),
  async (req, res) => {
    await approveVacationRequest(String(req.params.id));
    sendJson(res, 200, { ok: true });
  },
);

vacationRequestRouter.post(
  "/:id/reject",
  requireRole("Validator"),
  async (req, res) => {
    const comment =
      typeof req.body?.comment === "string" ? req.body.comment : "";
    await rejectVacationRequest(String(req.params.id), comment);
    sendJson(res, 200, { ok: true });
  },
);

function parsePositiveInteger(
  value: unknown,
  defaultValue: number,
  label: string,
): number {
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    throw new HttpError(400, `${label} must be a positive integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new HttpError(400, `${label} is outside the supported range`);
  }
  return parsed;
}
