import { publish } from "../../shared/event-bus.js";
import { HttpError } from "../../shared/http-error.js";
import { AppDataSource } from "../../data-source.js";
import { VacationRequest } from "../vacation-request.entity.js";
import { vacationRequestCreatedEvent } from "../events/vacation-request-created.event.js";

export type CreateVacationRequestInput = {
  userId: string;
  startDate: string;
  endDate: string;
  reason?: string;
};

export async function createVacationRequest(
  input: CreateVacationRequestInput,
): Promise<{ id: string }> {
  validateDateRange(input.startDate, input.endDate);
  if (input.startDate < new Date().toISOString().slice(0, 10)) {
    throw new HttpError(400, "Vacation requests cannot start in the past");
  }
  if (input.reason !== undefined && input.reason.length > 2000) {
    throw new HttpError(400, "Reason cannot exceed 2000 characters");
  }

  try {
    // SERIALIZABLE so two simultaneous requests can't both pass the overlap check.
    // Rejected requests are ignored (those days are free again).
    const vacationRequest = await AppDataSource.transaction(
      "SERIALIZABLE",
      async (manager) => {
        const repository = manager.getRepository(VacationRequest);
        const overlap = await repository
          .createQueryBuilder("request")
          .where("request.userId = :userId", { userId: input.userId })
          .andWhere("request.status IN (:...statuses)", {
            statuses: ["Pending", "Approved"],
          })
          .andWhere("request.startDate <= :endDate", { endDate: input.endDate })
          .andWhere("request.endDate >= :startDate", { startDate: input.startDate })
          .getOne();

        if (overlap) {
          throw new HttpError(
            409,
            "This request overlaps an existing pending or approved vacation",
          );
        }

        return repository.save(
          repository.create({
            userId: input.userId,
            startDate: new Date(`${input.startDate}T00:00:00.000Z`),
            endDate: new Date(`${input.endDate}T00:00:00.000Z`),
            reason: input.reason?.trim() || null,
            status: "Pending",
            comments: null,
          }),
        );
      },
    );

    // Announce the fact that the vacation request was created, only after the transaction succeeded.
    // The call sits inside the transaction callback, so it runs before the commit, and a subscriber failure would roll back the insert.
    await publish(
      vacationRequestCreatedEvent(
        vacationRequest.id,
        vacationRequest.userId,
        input.startDate,
        input.endDate,
      ),
    );
    return { id: vacationRequest.id };
  } catch (error) {
    if (isSerializationFailure(error)) {
      throw new HttpError(
        409,
        "A concurrent request changed the vacation schedule. Please retry.",
      );
    }
    throw error;
  }
}

function validateDateRange(startDate: string, endDate: string): void {
  if (!isValidDateOnly(startDate) || !isValidDateOnly(endDate)) {
    throw new HttpError(400, "Start and end dates must use YYYY-MM-DD format");
  }
  if (endDate <= startDate) {
    throw new HttpError(400, "End date must be after the start date");
  }
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function isSerializationFailure(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "40001"
  );
}
