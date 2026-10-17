import { HttpError } from "./http-error.js";

export function validateVacationDates(
  startDate: string,
  endDate: string,
  today = new Date().toISOString().slice(0, 10),
): void {
  if (!isDateOnly(startDate) || !isDateOnly(endDate)) {
    throw new HttpError(400, "Start and end dates must use YYYY-MM-DD format");
  }
  if (endDate <= startDate) {
    throw new HttpError(400, "End date must be after start date");
  }
  if (startDate < today) {
    throw new HttpError(400, "Vacation requests cannot start in the past");
  }
}

export function validateRejectionComment(comment: string): string {
  const normalizedComment = comment.trim();
  if (!normalizedComment) {
    throw new HttpError(400, "A rejection comment is required");
  }
  if (normalizedComment.length > 2000) {
    throw new HttpError(400, "Rejection comment cannot exceed 2000 characters");
  }
  return normalizedComment;
}

function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
