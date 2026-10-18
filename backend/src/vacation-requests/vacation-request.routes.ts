import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { approveVacationRequest } from "./commands/approve-vacation-request.command.js";
import { createVacationRequest } from "./commands/create-vacation-request.command.js";
import { rejectVacationRequest } from "./commands/reject-vacation-request.command.js";

export const vacationRequestRouter = Router();

vacationRequestRouter.use(requireAuth);

vacationRequestRouter.post("/", async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const result = await createVacationRequest({
    userId,
    startDate: new Date(String(req.body.startDate)),
    endDate: new Date(String(req.body.endDate)),
    ...(typeof req.body.reason === "string" ? { reason: req.body.reason } : {}),
  });

  res.status(201).json(result);
});

vacationRequestRouter.get("/", (_req, res) => {
  // TODO: requester = own requests; validator = all, filters, pagination
  res.status(501).json({ error: "Not implemented" });
});

vacationRequestRouter.post(
  "/:id/approve",
  requireRole("Validator"),
  async (req, res) => {
    await approveVacationRequest(String(req.params.id ?? ""));
    res.status(200).json({ ok: true });
  },
);

vacationRequestRouter.post(
  "/:id/reject",
  requireRole("Validator"),
  async (req, res) => {
    await rejectVacationRequest(
      String(req.params.id ?? ""),
      String(req.body.comment ?? ""),
    );
    res.status(200).json({ ok: true });
  },
);
