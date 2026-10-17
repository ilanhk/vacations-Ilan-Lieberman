import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { sendJson } from "../shared/common-response.js";
import type { UserRole } from "../users/user.entity.js";

export type AuthUser = {
  id: string;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authorization = req.header("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : undefined;
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    next(new Error("JWT_SECRET is not configured"));
    return;
  }

  if (!token) {
    sendJson(res, 401, { message: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, secret);
    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      (payload.role !== "Requester" && payload.role !== "Validator")
    ) {
      sendJson(res, 401, { message: "Invalid access token" });
      return;
    }
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    sendJson(res, 401, { message: "Invalid or expired access token" });
  }
}

export function requireRole(role: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.role !== role) {
      sendJson(res, 403, { message: `Only ${role.toLowerCase()}s can perform this action` });
      return;
    }
    next();
  };
}
