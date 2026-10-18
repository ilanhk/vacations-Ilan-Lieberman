import { publish } from "../../shared/event-bus.js";
import { vacationRequestRejectedEvent } from "../events/vacation-request-rejected.event.js";

export async function rejectVacationRequest(
  id: string,
  _comment: string,
): Promise<void> {
  // TODO: validator only; require comment; persist Rejected
  await publish(vacationRequestRejectedEvent(id));
}
