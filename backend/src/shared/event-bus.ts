export type DomainEvent = {
  name: string;
  occurredAt: Date;
  payload: unknown;
};

type Handler = (event: DomainEvent) => void | Promise<void>;

const handlers = new Map<string, Handler[]>();

export function subscribe(eventName: string, handler: Handler): void {
  const existing = handlers.get(eventName) ?? [];
  handlers.set(eventName, [...existing, handler]);
}

export async function publish(event: DomainEvent): Promise<void> {
  const listeners = handlers.get(event.name) ?? [];
  await Promise.all(listeners.map((handler) => handler(event)));
}
