import { publish } from "../../shared/event-bus.js";
import { HttpError } from "../../shared/http-error.js";
import { validateVacationDates } from "../../shared/vacation-validation.js";
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
  validateVacationDates(input.startDate, input.endDate);
  if (input.reason && input.reason.length > 2000) {
    throw new HttpError(400, "Reason cannot exceed 2000 characters");
  }

  let request: VacationRequest;
  try {
    request = await AppDataSource.transaction("SERIALIZABLE", async (manager) => {
      const repository = manager.getRepository(VacationRequest);
      const overlap = await repository
        .createQueryBuilder("request")
        .where("request.user_id = :userId", { userId: input.userId })
        .andWhere("request.status != :rejected", { rejected: "Rejected" })
        .andWhere("request.start_date <= :endDate", { endDate: input.endDate })
        .andWhere("request.end_date >= :startDate", { startDate: input.startDate })
        .getOne();
      if (overlap) {
        throw new HttpError(409, "This request overlaps an existing pending or approved vacation");
      }

      return repository.save(
        repository.create({
          userId: input.userId,
          startDate: input.startDate,
          endDate: input.endDate,
          reason: input.reason?.trim() || null,
          status: "Pending",
          comments: null,
        }),
      );
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "40001"
    ) {
      throw new HttpError(409, "A concurrent request changed this employee's vacation schedule. Please retry.");
    }
    throw error;
  }
  const id = request.id;
  await publish(vacationRequestCreatedEvent(id));
  return { id };
}
