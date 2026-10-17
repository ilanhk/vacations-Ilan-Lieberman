import { publish } from "../../shared/event-bus.js";
import { AppDataSource } from "../../data-source.js";
import { HttpError } from "../../shared/http-error.js";
import { VacationRequest } from "../vacation-request.entity.js";
import { vacationRequestApprovedEvent } from "../events/vacation-request-approved.event.js";

export async function approveVacationRequest(id: string): Promise<void> {
  const repository = AppDataSource.getRepository(VacationRequest);
  const result = await repository.update(
    { id, status: "Pending" },
    { status: "Approved" },
  );
  if (result.affected !== 1) {
    const requestExists = await repository.exists({ where: { id } });
    throw new HttpError(
      requestExists ? 409 : 404,
      requestExists ? "Only pending requests can be approved" : "Vacation request not found",
    );
  }
  await publish(vacationRequestApprovedEvent(id));
}
