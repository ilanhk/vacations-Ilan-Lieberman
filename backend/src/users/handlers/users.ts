import { Response } from "commoneventframework";
import { AppDataSource } from "../../data-source.js";
import { authenticate, roleError } from "../../shared/handlers/authentication.js";
import { isRecord } from "../../shared/handlers/common.js";
import type { HandlerFn } from "../../shared/handlers/types.js";
import { User } from "../user.entity.js";

// CEF handlers receive (input, event); the user id comes from the path (/users/:id), not an argument.
// Validator-only list of all users (id and name), used by the dashboard's user filter.
export const listRequesters: HandlerFn = async (_input, event) => {
  const authentication = await authenticate(event);
  if ("response" in authentication) {
    return authentication.response;
  }
  if (authentication.user.role !== "Validator") {
    return roleError("Validator");
  }

  try {
    const users = await AppDataSource.getRepository(User).find({
      select: { id: true, name: true },
      order: { name: "ASC" },
    });
    return new Response(200, users);
  } catch (error: unknown) {
    console.error("Failed to fetch requesters", error);
    return new Response(500, { error: "Failed to fetch requesters" });
  }
};

// A user may only access their own record, unless they are a Validator.
export const findUserById: HandlerFn = async (_input, event) => {
  const authentication = await authenticate(event);
  if ("response" in authentication) {
    return authentication.response;
  }

  const id = event.pathParameters?.id ?? "";
  if (authentication.user.id !== id && authentication.user.role !== "Validator") {
    return new Response(403, { error: "You can only view your own account" });
  }

  try {
    const user = await AppDataSource.getRepository(User).findOne({
      where: { id },
      select: { id: true, name: true, email: true, role: true, createdAt: true }, // never return the password hash
    });
    if (!user) {
      return new Response(404, { error: "User not found" });
    }
    return new Response(200, user);
  } catch (error: unknown) {
    console.error("Failed to fetch user", error);
    return new Response(500, { error: "Failed to fetch user" });
  }
};

// Only the name can be changed: letting clients set role/password/email here would be a privilege-escalation risk.
export const updateUser: HandlerFn = async (input, event) => {
  const authentication = await authenticate(event);
  if ("response" in authentication) {
    return authentication.response;
  }

  const id = event.pathParameters?.id ?? "";
  if (authentication.user.id !== id) {
    return new Response(403, { error: "You can only update your own account" });
  }

  const name = isRecord(input) && typeof input.name === "string" ? input.name.trim() : "";
  if (name.length === 0 || name.length > 100) {
    return new Response(400, { error: "Name must be 1-100 characters" });
  }

  try {
    await AppDataSource.getRepository(User).update({ id }, { name });
    return new Response(200, { message: "User updated successfully" });
  } catch (error: unknown) {
    console.error("Failed to update user", error);
    return new Response(500, { error: "Failed to update user" });
  }
};
