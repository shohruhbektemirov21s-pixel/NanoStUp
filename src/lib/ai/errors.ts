export type AiEngineErrorCode =
  | "MISSING_API_KEY"
  | "MISSING_PROVIDER"
  | "HTTP_ERROR"
  | "INVALID_JSON"
  | "VALIDATION_FAILED"
  | "EMPTY_CONTENT"
  | "TRANSCRIPTION_FAILED";

export class AiEngineError extends Error {
  public readonly code: AiEngineErrorCode;

  public readonly causeDetail: unknown;

  /** HTTP status from provider (retry / observability), agar mavjud bo‘lsa */
  public readonly httpStatus?: number;

  constructor(message: string, code: AiEngineErrorCode, causeDetail?: unknown, httpStatus?: number) {
    super(message);
    this.name = "AiEngineError";
    this.code = code;
    this.causeDetail = causeDetail;
    this.httpStatus = httpStatus;
  }
}
