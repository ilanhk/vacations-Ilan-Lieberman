import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../data-source.js";
import { sendJson } from "../shared/common-response.js";
import { HttpError } from "../shared/http-error.js";
import { User } from "../users/user.entity.js";

type Credentials = {
  email: string;
  password: string;
};

function readCredentials(body: unknown): Credentials & { name?: string } {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(400, "A JSON request body is required");
  }
  const input = body as Record<string, unknown>;
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    throw new HttpError(400, "Enter a valid email and a password of at least 8 characters");
  }
  return {
    email,
    password,
    ...(typeof input.name === "string" ? { name: input.name.trim() } : {}),
  };
}

function createToken(user: User): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign({ role: user.role }, secret, {
    subject: user.id,
    expiresIn: "12h",
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = readCredentials(req.body);
  if (!name || name.length > 120) {
    throw new HttpError(400, "Name is required and must be at most 120 characters");
  }
  const repository = AppDataSource.getRepository(User);
  if (await repository.findOneBy({ email })) {
    throw new HttpError(409, "An account with this email already exists");
  }

  const user = repository.create({
    name,
    email,
    password: await bcrypt.hash(password, 12),
    role: "Requester",
  });
  await repository.save(user);
  sendJson(res, 201, {
    accessToken: createToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = readCredentials(req.body);
  const user = await AppDataSource.getRepository(User)
    .createQueryBuilder("user")
    .addSelect("user.password")
    .where("user.email = :email", { email })
    .getOne();
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new HttpError(401, "Invalid email or password");
  }
  sendJson(res, 200, {
    accessToken: createToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export function logout(_req: Request, res: Response): void {
  res.status(204).end();
}
