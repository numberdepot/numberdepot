/**
 * Base class for errors that carry an intended HTTP status and a message that
 * is safe to show the user. `apiHandler` renders these verbatim; anything else
 * becomes a generic 500 so internal details never leak.
 */
export class HttpError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
