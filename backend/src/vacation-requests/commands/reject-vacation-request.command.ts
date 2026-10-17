import { publish } from "../../shared/event-bus.js";
import { AppDataSource } from "../../data-source.js";
import { HttpError } from "../../shared/http-error.js";
import { validateRejectionComment } from "../../shared/vacation-validation.js";
import { VacationRequest } from "../vacation-request.entity.js";
import { vacationRequestRejectedEvent } from "../events/vacation-request-rejected.event.js";

export async function rejectVacationRequest(
  id: string,
  comment: string,
): Promise<void> {
  const normalizedComment = validateRejectionComment(comment);
  const repository = AppDataSource.getRepository(VacationRequest);
  const result = await repository.update(
    { id, status: "Pending" },
    { status: "Rejected", comments: normalizedComment },
  );
  if (result.affected !== 1) {
    const requestExists = await repository.exists({ where: { id } });
    throw new HttpError(
      requestExists ? 409 : 404,
      requestExists ? "Only pending requests can be rejected" : "Vacation request not found",
    );
  }
  await publish(vacationRequestRejectedEvent(id, normalizedComment));
}
