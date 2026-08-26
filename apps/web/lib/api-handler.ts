import { NextResponse } from 'next/server';
import { HttpError } from './http-error';
import { ensureIndexes } from './ensure-indexes';

type HandlerFn = () => Promise<NextResponse>;

export async function apiHandler(fn: HandlerFn): Promise<NextResponse> {
  try {
    await ensureIndexes();
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
