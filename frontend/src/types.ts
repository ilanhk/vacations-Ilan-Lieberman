export type UserRole = "Requester" | "Validator";
export type VacationStatus = "Pending" | "Approved" | "Rejected";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type VacationRequest = {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: VacationStatus;
  comments: string | null;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, "id" | "name" | "email">;
};

export type Session = {
  accessToken: string;
  user: User;
};

export function getSession(): Session | null {
  const stored = localStorage.getItem("vacation-session");
  if (!stored) return null;
  try {
    const session = JSON.parse(stored) as Session;
    if (!session.accessToken || !session.user?.id) return null;
    return session;
  } catch {
    localStorage.removeItem("vacation-session");
    return null;
  }
}

export function saveSession(session: Session | null): void {
  if (session) localStorage.setItem("vacation-session", JSON.stringify(session));
  else localStorage.removeItem("vacation-session");
}
