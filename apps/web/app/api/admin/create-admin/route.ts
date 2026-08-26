import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import { getDb } from '@/lib/db';

/**
 * POST /api/admin/create-admin
 *
 * Allows an existing authenticated admin to create another admin account.
 * The new admin is created with status 'active' and role 'admin' — no
 * OTP verification is required because the request comes from a trusted admin.
 */
export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    requireAdmin(req);

    const body = await req.json().catch(() => ({}));
    const { email, password, firstName, lastName } = body || {};

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'All fields are required (email, password, firstName, lastName)' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const emailNorm = String(email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const db = await getDb();
    const users = db.collection('users');

    const existing = await users.findOne({ email: emailNorm });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date();

    await users.insertOne({
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: emailNorm,
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      phone: '',
      companyName: '',
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      data: { message: `Admin account created for ${emailNorm}` },
    });
  });
}
