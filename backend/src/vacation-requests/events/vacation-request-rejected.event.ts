import type { DomainEvent } from "../../shared/event-bus.js";

export function vacationRequestRejectedEvent(vacationRequestId: string): DomainEvent {
  return {
    name: "VacationRequestRejected",
    occurredAt: new Date(),
    payload: { vacationRequestId },
  };
}
