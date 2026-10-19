import { publish } from "../../shared/event-bus.js";
import { HttpError } from "../../shared/http-error.js";
import { AppDataSource } from "../../data-source.js";
import { VacationRequest } from "../vacation-request.entity.js";
import { vacationRequestRejectedEvent } from "../events/vacation-request-rejected.event.js";

export async function rejectVacationRequest(
  id: string,
  comment: string,
): Promise<void> {
  if (!isUuid(id)) {
    throw new HttpError(400, "Vacation request ID must be a UUID");
  }
  const normalizedComment = comment.trim();
  if (!normalizedComment) {
    throw new HttpError(400, "A rejection comment is required");
  }
  if (normalizedComment.length > 2000) {
    throw new HttpError(400, "Rejection comment cannot exceed 2000 characters");
  }

  const repository = AppDataSource.getRepository(VacationRequest);
  const result = await repository.update( // Same atomic conditional update as approve: only a Pending request can be rejected.
    { id, status: "Pending" },
    { status: "Rejected", comments: normalizedComment },
  );
  if (result.affected !== 1) {
    const exists = await repository.exists({ where: { id } });
    throw new HttpError(
      exists ? 409 : 404,
      exists
        ? "Only pending requests can be rejected"
        : "Vacation request not found",
    );
  }
  // The command's last step: announce the fact that a request was rejected.
  // The event is published only after the database update succeeded.
  await publish(vacationRequestRejectedEvent(id, normalizedComment));
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
