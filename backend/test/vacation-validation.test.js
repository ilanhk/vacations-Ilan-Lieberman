import assert from "node:assert/strict";
import test from "node:test";
import { sendJson } from "../dist/shared/common-response.js";
import { HttpError } from "../dist/shared/http-error.js";
import {
  validateRejectionComment,
  validateVacationDates,
} from "../dist/shared/vacation-validation.js";

test("accepts a valid future date range", () => {
  assert.doesNotThrow(() => validateVacationDates("2026-10-20", "2026-10-22", "2026-10-17"));
});

test("requires a strictly later end date", () => {
  assert.throws(
    () => validateVacationDates("2026-10-20", "2026-10-20", "2026-10-17"),
    (error) => error instanceof HttpError && error.status === 400,
  );
});

test("rejects dates in the past and malformed dates", () => {
  assert.throws(() => validateVacationDates("2026-10-16", "2026-10-18", "2026-10-17"), HttpError);
  assert.throws(() => validateVacationDates("2026-02-30", "2026-03-03", "2026-01-01"), HttpError);
});

test("requires a non-empty rejection comment and trims it", () => {
  assert.equal(validateRejectionComment("  Coverage is needed  "), "Coverage is needed");
  assert.throws(() => validateRejectionComment("   "), HttpError);
});

test("uses the Common Event Framework response shape for HTTP JSON", () => {
  const result = { status: 0, contentType: "", body: "" };
  const response = {
    status(value) { result.status = value; return this; },
    type(value) { result.contentType = value; return this; },
    send(value) { result.body = value; return this; },
  };
  sendJson(response, 202, { accepted: true });
  assert.deepEqual(result, {
    status: 202,
    contentType: "application/json",
    body: '{"accepted":true}',
  });
});
