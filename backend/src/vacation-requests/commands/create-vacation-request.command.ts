import { publish } from "../../shared/event-bus.js";
import { vacationRequestCreatedEvent } from "../events/vacation-request-created.event.js";

export type CreateVacationRequestInput = {
  userId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
};

export async function createVacationRequest(
  _input: CreateVacationRequestInput,
): Promise<{ id: string }> {
  // TODO: business rules (dates, overlap, past) then persist
  const id = "";
  await publish(vacationRequestCreatedEvent(id));
  return { id };
}
