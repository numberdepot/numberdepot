import { NextResponse } from 'next/server';
import { HttpError } from './http-error';
import { ensureIndexes } from './ensure-indexes';
import { startScheduler } from './jobs/scheduler';

type HandlerFn = () => Promise<NextResponse>;

export async function apiHandler(fn: HandlerFn): Promise<NextResponse> {
  try {
    await ensureIndexes();
    // Both of these are idempotent and no-op after the first call. Starting the
    // background schedule here keeps it out of Next's instrumentation hook,
    // which is also compiled for the edge runtime where the Mongo driver
    // cannot load.
    startScheduler();
    return await fn();
  } catch (error) {
    // HttpError (and its subclasses AuthError / PricingError) carry a status and
    // a message that is safe to show the user.
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[API Error]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
