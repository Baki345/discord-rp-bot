export type ServiceErrorCode =
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "VALIDATION_ERROR"
  | "QUOTA_EXCEEDED"
  | "INSUFFICIENT_CASH"
  | "INSUFFICIENT_FUNDS";

/**
 * Every service function throws this — never a bare Error — so both apps
 * can map one shared taxonomy to their own presentation (bot: an
 * ephemeral reply; dashboard: a toast), instead of parsing error message
 * strings.
 */
export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: ServiceErrorCode, details?: Record<string, unknown>, message?: string) {
    super(message ?? code);
    this.name = "ServiceError";
    this.code = code;
    this.details = details;
  }
}
