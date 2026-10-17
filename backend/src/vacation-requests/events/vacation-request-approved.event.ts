import type { DomainEvent } from "../../shared/event-bus.js";

export function vacationRequestApprovedEvent(vacationRequestId: string): DomainEvent {
  return {
    name: "VacationRequestApproved",
    occurredAt: new Date(),
    payload: { vacationRequestId },
  };
}
