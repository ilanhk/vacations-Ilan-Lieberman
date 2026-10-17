import axios from "axios";
import type { Session, User, VacationRequest, VacationStatus } from "./types";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("vacation-session");
  if (stored) {
    try {
      const session = JSON.parse(stored) as Session;
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    } catch {
      localStorage.removeItem("vacation-session");
    }
  }
  return config;
});

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

export type VacationListResponse = {
  items: VacationRequest[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

export async function login(email: string, password: string): Promise<Session> {
  const { data } = await api.post<Session>("/auth/login", { email, password });
  return data;
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<Session> {
  const { data } = await api.post<Session>("/auth/register", { name, email, password });
  return data;
}

export async function fetchVacationRequests(params: {
  page?: number;
  limit?: number;
  status?: VacationStatus | "";
  userId?: string;
} = {}): Promise<VacationListResponse> {
  const { data } = await api.get<VacationListResponse>("/vacation-requests", { params });
  return data;
}

export async function fetchTeamPlan(): Promise<VacationRequest[]> {
  const { data } = await api.get<{ items: VacationRequest[] }>("/vacation-requests/team");
  return data.items;
}

export async function fetchUsers(): Promise<User[]> {
  const { data } = await api.get<{ items: User[] }>("/users");
  return data.items;
}
