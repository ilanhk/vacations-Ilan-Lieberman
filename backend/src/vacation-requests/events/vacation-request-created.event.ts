import type { DomainEvent } from "../../shared/event-bus.js";

export function vacationRequestCreatedEvent(vacationRequestId: string): DomainEvent {
  return {
    name: "VacationRequestCreated",
    occurredAt: new Date(),
    payload: { vacationRequestId },
  };
}
