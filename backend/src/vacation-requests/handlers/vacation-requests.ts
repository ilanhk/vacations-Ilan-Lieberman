import { Response } from "commoneventframework";
import type { CommonEvent } from "commoneventframework/dist/types/commonEvent.js";
import { AppDataSource } from "../../data-source.js";
import { HttpError } from "../../shared/http-error.js";
import type { FindOptionsWhere } from "typeorm";
import {
  authenticate,
  roleError,
} from "../../shared/handlers/authentication.js";
import { isRecord } from "../../shared/handlers/common.js";
import type { HandlerFn } from "../../shared/handlers/types.js";
import { approveVacationRequest } from "../commands/approve-vacation-request.command.js";
import { createVacationRequest } from "../commands/create-vacation-request.command.js";
import { rejectVacationRequest } from "../commands/reject-vacation-request.command.js";
import {
  VacationRequest,
  type VacationRequestStatus,
} from "../vacation-request.entity.js";

const REQUEST_STATUSES: readonly VacationRequestStatus[] = [
  "Pending",
  "Approved",
  "Rejected",
];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export const listVacationRequests: HandlerFn = async (_input, event) => {
  const authentication = await authenticate(event);
  if ("response" in authentication) {
    return authentication.response;
  }

  const isValidator = authentication.user.role === "Validator";
  if (!isValidator) {
    return roleError("Validator");
  }
  //the user must be logged in and have the Validator role can access this endpoint

  // 1. Read and validate page and limit
  const query = event.queryStringParameters ?? {};
  const page = parsePositiveInteger(query.page, DEFAULT_PAGE);
  const limit = parsePositiveInteger(query.limit, DEFAULT_LIMIT);
  if (page === null || limit === null || limit > MAX_LIMIT) {
    return new Response(400, {
      error: `page must be a positive integer and limit must be between 1 and ${MAX_LIMIT}`,
    });
  }

  try {
    // 2. Fetch one page plus the total number of rows
    const where: FindOptionsWhere<VacationRequest> = {};
    if (query.status !== undefined) {
      if (!REQUEST_STATUSES.includes(query.status as VacationRequestStatus)) {
        return new Response(400, { error: "Invalid status filter" });
      }
      where.status = query.status as VacationRequestStatus;
    }
    if (query.userId !== undefined) {
      where.userId = query.userId;
    }

    const [rows, total] = await AppDataSource.getRepository(VacationRequest).findAndCount({
      where,
      relations: { user: true },
      order: { createdAt: "DESC", id: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 3. Return the rows (with the requester's name, never the password) and the paging info
    const data = rows.map((request) => ({
      id: request.id,
      userId: request.userId,
      requesterName: request.user.name,
      startDate: toDateOnly(request.startDate),
      endDate: toDateOnly(request.endDate),
      reason: request.reason,
      status: request.status,
      comments: request.comments,
      createdAt: request.createdAt,
    }));
    return new Response(200, {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error("Failed to fetch vacation requests", error);
    return new Response(500, { error: "Failed to fetch vacation requests" });
  }
  
};

function parsePositiveInteger(value: string | undefined, fallback: number): number | null {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}


// Date columns come back as "YYYY-MM-DD" strings from Postgres; normalise defensively to that format.
function toDateOnly(value: Date | string): string {
  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

function toMyRequestDto(request: VacationRequest) {
  return {
    id: request.id,
    startDate: toDateOnly(request.startDate),
    endDate: toDateOnly(request.endDate),
    reason: request.reason,
    status: request.status,
    comments: request.comments,
    createdAt: request.createdAt,
  };
}

// Any logged-in user (Requester or Validator) can list their own requests: the query below is scoped to their id.
// Paginated, for the "My requests" table.
export const listMyVacationRequests: HandlerFn = async (_input, event) => {
  const authentication = await authenticate(event);
  if ("response" in authentication) {
    return authentication.response;
  }
  //any logged-in user (Requester or Validator) can access this endpoint; the query is scoped to their own id

  const query = event.queryStringParameters ?? {};
  const page = parsePositiveInteger(query.page, DEFAULT_PAGE);
  const limit = parsePositiveInteger(query.limit, DEFAULT_LIMIT);
  if (page === null || limit === null || limit > MAX_LIMIT) {
    return new Response(400, {
      error: `page must be a positive integer and limit must be between 1 and ${MAX_LIMIT}`,
    });
  }

  try {
    const [requests, total] = await AppDataSource.getRepository(VacationRequest).findAndCount({
      where: { userId: authentication.user.id },
      order: { startDate: "ASC", id: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return new Response(200, {
      data: requests.map(toMyRequestDto),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error("Failed to fetch my vacation requests", error);
    return new Response(500, { error: "Failed to fetch vacation requests" });
  }
};

// Every non-rejected request of the logged-in user, unpaginated: the booking calendar needs all booked days at once.
export const listMyBookedDays: HandlerFn = async (_input, event) => {
  const authentication = await authenticate(event);
  if ("response" in authentication) {
    return authentication.response;
  }

  try {
    const requests = await AppDataSource.getRepository(VacationRequest).find({
      where: [
        { userId: authentication.user.id, status: "Pending" },
        { userId: authentication.user.id, status: "Approved" },
      ],
      order: { startDate: "ASC" },
    });
    return new Response(200, requests.map(toMyRequestDto));
  } catch (error: unknown) {
    console.error("Failed to fetch booked days", error);
    return new Response(500, { error: "Failed to fetch booked days" });
  }
};

export const getVacationRequest: HandlerFn = async (_input, event) => {
  const authentication = await authenticate(event);
  if ("response" in authentication) {
    return authentication.response;
  }

  try {
    const id = event.pathParameters?.id;
    const vacationRequest = id
      ? await AppDataSource.getRepository(VacationRequest).findOneBy({ id })
      : null;
    if (
      !vacationRequest ||
      (authentication.user.role === "Requester" &&
        vacationRequest.userId !== authentication.user.id)
    ) {
      return new Response(404, { error: "Vacation request not found" });
    }
    return new Response(200, vacationRequest);
  } catch (error: unknown) {
    return new Response(500, { error: "Failed to fetch vacation request" });
  }
};

export const createVacationRequestHandler: HandlerFn = async (input, event) => {
  const authentication = await authenticate(event);
  if ("response" in authentication) {
    return authentication.response;
  }
  //only a logged in user with either roles can access this endpoint
  //quote: 4. Team vacation planning available for two roles
  
  if (
    !isRecord(input) ||
    typeof input.startDate !== "string" ||
    typeof input.endDate !== "string" ||
    (input.reason !== undefined && typeof input.reason !== "string")
  ) {
    return new Response(400, {
      error: "Provide valid startDate and endDate values",
    });
  }

  try {
    //the command checks for overlapping requests of the same user inside a transaction
    //also validates the date range
    const result = await createVacationRequest({
      userId: authentication.user.id,
      startDate: input.startDate,
      endDate: input.endDate,
      ...(typeof input.reason === "string" ? { reason: input.reason } : {}),
    });
    return new Response(201, result);
  } catch (error: unknown) {
    return commandError(error, "Failed to create vacation request");
  }
};

export const approveVacationRequestHandler: HandlerFn = async (
  _input,
  event,
) => {
  return runValidatorCommand(
    event,
    async (id) => {
      await approveVacationRequest(id);
    },
    "Failed to approve vacation request",
  );
};

export const rejectVacationRequestHandler: HandlerFn = async (
  input,
  event,
) => {
  const comment =
    isRecord(input) && typeof input.comment === "string" ? input.comment : "";
  return runValidatorCommand(
    event,
    async (id) => rejectVacationRequest(id, comment),
    "Failed to reject vacation request",
  );
};


// Helper function to run commands that require a "Validator" role
async function runValidatorCommand(
  event: CommonEvent,
  command: (id: string) => Promise<void>,
  fallback: string,
): Promise<Response> {
  const authentication = await authenticate(event);
  if ("response" in authentication) {
    return authentication.response;
  }
  if (authentication.user.role !== "Validator") {
    return roleError("Validator");
  }

  try {
    await command(event.pathParameters?.id ?? "");
    return new Response(200, { ok: true });
  } catch (error: unknown) {
    return commandError(error, fallback);
  }
}

// Helper function to handle command errors
function commandError(error: unknown, fallback: string): Response {
  if (error instanceof HttpError) {
    return new Response(error.status, { error: error.message });
  }
  console.error(fallback, error);
  return new Response(500, { error: fallback });
}
