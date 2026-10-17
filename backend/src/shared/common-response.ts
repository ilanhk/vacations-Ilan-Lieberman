import commonEventFramework from "commoneventframework";
import type { Response } from "express";

const { Response: CommonEventResponse } = commonEventFramework;

export function sendJson(
  response: Response,
  status: number,
  body: Record<string, unknown>,
): void {
  const commonResponse = new CommonEventResponse(status, body);
  response
    .status(commonResponse.statusCode)
    .type("application/json")
    .send(commonResponse.body);
}
