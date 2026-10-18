import { publish } from "../../shared/event-bus.js";
import { vacationRequestApprovedEvent } from "../events/vacation-request-approved.event.js";

export async function approveVacationRequest(id: string): Promise<void> {
  // TODO: validator only; pending only; persist Approved
  await publish(vacationRequestApprovedEvent(id));
}
