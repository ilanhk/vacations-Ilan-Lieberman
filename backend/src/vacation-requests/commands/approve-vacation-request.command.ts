import { publish } from "../../shared/event-bus.js";
import { HttpError } from "../../shared/http-error.js";
import { AppDataSource } from "../../data-source.js";
import { VacationRequest } from "../vacation-request.entity.js";
import { vacationRequestApprovedEvent } from "../events/vacation-request-approved.event.js";

export async function approveVacationRequest(id: string): Promise<void> {
  if (!isUuid(id)) {
    throw new HttpError(400, "Vacation request ID must be a UUID");
  }//checks if id is valid

  const repository = AppDataSource.getRepository(VacationRequest);
  const result = await repository.update(
    { id, status: "Pending" },
    { status: "Approved" },
  ); // attempts to update the vacation request status to "Approved" if it is currently "Pending"

  // Single conditional UPDATE (WHERE status = 'Pending') instead of read-then-write.
  // The status check and the change happen atomically in the database, so two
  // validators acting at once can't both succeed, and an Approved or Rejected
  // request can never be modified. affected !== 1 means it wasn't Pending.
  if (result.affected !== 1) {
    const exists = await repository.exists({ where: { id } });
    throw new HttpError(
      exists ? 409 : 404,
      exists
        ? "Only pending requests can be approved"
        : "Vacation request not found",
    );
  }

  // Announce the fact that the request was approved, only after the update succeeded.
  await publish(vacationRequestApprovedEvent(id));
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
