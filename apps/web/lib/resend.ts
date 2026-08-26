import { Resend } from 'resend';

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(apiKey);
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'NumberDepot <noreply@devsoumyajit.in>';

export async function sendOTP(email: string, otp: string) {
  await getResendClient().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Your NumberDepot Verification Code',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #002664;">Verify Your Email</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #002664; background: #f5f7fa; padding: 16px 24px; border-radius: 8px; text-align: center; margin: 24px 0;">
          ${otp}
        </div>
        <p style="color: #666;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">NumberDepot — The premier phone number marketplace</p>
      </div>
    `,
  });
}

export async function sendOrderConfirmation(
  email: string,
  orderNumber: string,
  items: { number: string; price: number; monthlyPrice: number }[],
  totalAmount: number
) {
  const itemRows = items
    .map(
      (i) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-family:monospace;">${i.number}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">$${(i.price / 100).toFixed(2)}</td></tr>`
    )
    .join('');

  await getResendClient().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `NumberDepot Order Confirmation — ${orderNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #002664;">Order Confirmed!</h2>
        <p>Your order <strong>${orderNumber}</strong> has been processed successfully.</p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0;">
          <thead><tr><th style="text-align:left;padding:8px 12px;border-bottom:2px solid #002664;">Number</th><th style="text-align:right;padding:8px 12px;border-bottom:2px solid #002664;">Price</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <p style="font-size:18px;font-weight:700;color:#002664;">Total: $${totalAmount.toFixed(2)}</p>
        <p style="color: #666;">Your numbers are now being activated. You can manage them from your dashboard.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">NumberDepot — The premier phone number marketplace</p>
      </div>
    `,
  });
}

export async function sendOfferNotification(
  email: string,
  type: 'new_offer' | 'counter' | 'accepted' | 'declined',
  data: { number: string; offerAmount: number; counterAmount?: number; buyerName?: string; sellerName?: string }
) {
  const subjects: Record<string, string> = {
    new_offer: `New Offer on ${data.number}`,
    counter: `Counter Offer on ${data.number}`,
    accepted: `Offer Accepted — ${data.number}`,
    declined: `Offer Declined — ${data.number}`,
  };

  const bodies: Record<string, string> = {
    new_offer: `<p>${data.buyerName || 'A buyer'} has made an offer of <strong>$${(data.offerAmount / 100).toFixed(2)}</strong> on number <strong>${data.number}</strong>.</p><p>Log in to your dashboard to review and respond.</p>`,
    counter: `<p>A counter offer of <strong>$${((data.counterAmount || 0) / 100).toFixed(2)}</strong> has been made on number <strong>${data.number}</strong>.</p><p>Log in to your dashboard to review.</p>`,
    accepted: `<p>Your offer of <strong>$${(data.offerAmount / 100).toFixed(2)}</strong> on <strong>${data.number}</strong> has been accepted!</p><p>Log in to complete your purchase.</p>`,
    declined: `<p>Your offer of <strong>$${(data.offerAmount / 100).toFixed(2)}</strong> on <strong>${data.number}</strong> has been declined.</p><p>You can make a new offer or browse other numbers.</p>`,
  };

  try {
    await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `NumberDepot — ${subjects[type]}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #002664;">${subjects[type]}</h2>
          ${bodies[type]}
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">NumberDepot — The premier phone number marketplace</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[Resend] Failed to send offer notification:', err);
  }
}

export async function sendPasswordReset(email: string, resetUrl: string) {
  await getResendClient().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Reset Your NumberDepot Password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #002664;">Reset Your Password</h2>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: #002664; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666;">This link expires in 1 hour. If you didn't request a password reset, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">NumberDepot — The premier phone number marketplace</p>
      </div>
    `,
  });
}
