import nodemailer from "nodemailer";

const MAX_SENT_EMAILS_LOG = 25;
const sentEmails = [];

let transporter = null;

export function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  } else {
    // Development / Test in-memory transporter or stream transport
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });
  }

  return transporter;
}

export function resetTransporter() {
  transporter = null;
}

export function getSentEmails() {
  return [...sentEmails];
}

export function getLastEmail() {
  return sentEmails[sentEmails.length - 1] || null;
}

export function findLatestEmailFor(email) {
  const target = email.toLowerCase().trim();
  for (let i = sentEmails.length - 1; i >= 0; i--) {
    if (sentEmails[i].to.toLowerCase().includes(target)) {
      return sentEmails[i];
    }
  }
  return null;
}

export function clearSentEmails() {
  sentEmails.length = 0;
}

/**
 * Sends an email and records it in sentEmails history
 */
export async function sendEmail({ to, subject, html, text }) {
  const from = process.env.SMTP_FROM || '"ChangeLens Security" <no-reply@changelens.dev>';
  const mailOptions = {
    from,
    to,
    subject,
    text,
    html,
  };

  const currentTransporter = getTransporter();
  let info = null;
  try {
    info = await currentTransporter.sendMail(mailOptions);
    console.log(`✉️ [EmailService] Email sent successfully to ${to} (MessageId: ${info?.messageId || "ok"})`);
  } catch (err) {
    console.error(`❌ [EmailService] SMTP error sending to ${to}:`, err.message || err);
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      throw new Error(`Email delivery failed: ${err.message || "SMTP error"}`);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`🔑 [Dev Notification] Sent to ${to} -> Subject: "${subject}"`);
  }

  sentEmails.push({
    to,
    from,
    subject,
    text,
    html,
    timestamp: new Date().toISOString(),
    messageId: info?.messageId || `test_${Date.now()}`,
  });

  if (sentEmails.length > MAX_SENT_EMAILS_LOG) {
    sentEmails.shift();
  }

  return { success: true };
}

/**
 * Sends the Email Verification OTP
 */
export async function sendVerificationEmail({ to, name, otp }) {
  const subject = `Your ChangeLens Verification Code: ${otp}`;
  const text = `Hello ${name},\n\nYour ChangeLens email verification code is: ${otp}\n\nThis code will expire in 5 minutes.\nIf you did not request this code, please ignore this email.\n\n- ChangeLens Security Team`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verify your ChangeLens Account</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 40px 20px; }
        .container { max-width: 520px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
        .logo { font-size: 20px; font-weight: 700; color: #38bdf8; letter-spacing: -0.5px; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }
        h1 { font-size: 20px; color: #ffffff; margin-bottom: 12px; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
        .otp-box { background: #020617; border: 1px solid #38bdf8; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0; }
        .otp-code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #38bdf8; }
        .warning { font-size: 12px; color: #f43f5e; margin-top: 8px; }
        .footer { font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 32px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">⚡ ChangeLens Security</div>
        <h1>Verify your email address</h1>
        <p>Hi ${name || "there"},</p>
        <p>Thank you for signing up for ChangeLens. Please enter the following 6-digit verification code to complete your registration:</p>
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
          <div class="warning">Expires in 5 minutes</div>
        </div>
        <p>If you didn't create an account on ChangeLens, you can safely disregard this email.</p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ChangeLens Code Impact Intelligence. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html, text });
}

/**
 * Sends Password Reset OTP
 */
export async function sendPasswordResetEmail({ to, name, otp }) {
  const subject = `ChangeLens Password Reset Code: ${otp}`;
  const text = `Hello ${name || "there"},\n\nWe received a request to reset your ChangeLens account password.\n\nYour password reset code is: ${otp}\n\nThis code will expire in 5 minutes.\nIf you did not request a password reset, please secure your account immediately.\n\n- ChangeLens Security Team`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset your ChangeLens Password</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 40px 20px; }
        .container { max-width: 520px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
        .logo { font-size: 20px; font-weight: 700; color: #f43f5e; letter-spacing: -0.5px; margin-bottom: 24px; }
        h1 { font-size: 20px; color: #ffffff; margin-bottom: 12px; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
        .otp-box { background: #020617; border: 1px solid #f43f5e; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0; }
        .otp-code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #f43f5e; }
        .warning { font-size: 12px; color: #f59e0b; margin-top: 8px; }
        .footer { font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 32px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🔒 ChangeLens Security</div>
        <h1>Reset your password</h1>
        <p>Hi ${name || "there"},</p>
        <p>A password reset was requested for your ChangeLens account. Enter this 6-digit confirmation code on the password reset page:</p>
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
          <div class="warning">Expires in 5 minutes &bull; Single-use only</div>
        </div>
        <p>If you did not request this password reset, please ignore this message. Your account remains secure.</p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ChangeLens Code Impact Intelligence. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html, text });
}

/**
 * Sends Admin / Super Admin Invitation Email
 */
export async function sendAdminInvitationEmail({ to, inviterName, role, inviteUrl, expiresAt }) {
  const roleDisplay = role === "superadmin" ? "Super Admin (Co-Owner)" : "Admin";
  const subject = `You've been invited as a ChangeLens ${roleDisplay}`;
  const expiryFormatted = expiresAt ? new Date(expiresAt).toUTCString() : "in 72 hours";

  const text = `Hello,\n\n${inviterName || "A Super Admin"} has invited you to join the ChangeLens management team as a ${roleDisplay}.\n\nTo accept this invitation and activate your privileges, visit:\n${inviteUrl}\n\nThis invitation link expires on ${expiryFormatted}.\n\n- ChangeLens Team`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>ChangeLens Staff Invitation</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 40px 20px; }
        .container { max-width: 520px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
        .logo { font-size: 20px; font-weight: 700; color: #6366f1; letter-spacing: -0.5px; margin-bottom: 24px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: rgba(99, 102, 241, 0.2); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.4); margin-bottom: 12px; }
        h1 { font-size: 20px; color: #ffffff; margin-bottom: 12px; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
        .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none; margin: 16px 0; }
        .expiry-box { background: #020617; border: 1px solid #1e293b; border-radius: 6px; padding: 12px; font-size: 12px; color: #94a3b8; margin: 16px 0; }
        .footer { font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 32px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">⚡ ChangeLens Security</div>
        <div class="badge">${roleDisplay} Invitation</div>
        <h1>Join the ChangeLens Admin Team</h1>
        <p>Hi,</p>
        <p><strong>${inviterName || "A Super Admin"}</strong> has invited you to join ChangeLens with <strong>${roleDisplay}</strong> privileges.</p>
        <div style="text-align: center;">
          <a href="${inviteUrl}" class="btn">Accept Invitation & Activate Access</a>
        </div>
        <div class="expiry-box">
          <strong>Expiration:</strong> This invite link is valid until ${expiryFormatted}.
        </div>
        <p style="font-size: 12px; color: #64748b;">If you were not expecting this invitation, you can safely ignore this email.</p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ChangeLens Code Impact Intelligence. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html, text });
}
