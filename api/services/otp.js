import crypto from "node:crypto";

const OTP_SECRET = process.env.OTP_SECRET || "changelens-secure-otp-secret-key-at-least-32-chars-long";

/**
 * Generates a cryptographically secure 6-digit OTP string
 */
export function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hashes an OTP with HMAC-SHA256 using server-side secret
 */
export function hashOtp(otp) {
  return crypto.createHmac("sha256", OTP_SECRET).update(String(otp)).digest("hex");
}

/**
 * Verifies an OTP using constant-time comparison
 */
export function verifyOtpHash(otp, storedHash) {
  if (!otp || !storedHash) return false;
  const computedHash = hashOtp(otp);
  if (computedHash.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computedHash, "utf-8"), Buffer.from(storedHash, "utf-8"));
}

/**
 * Generates a random reset token
 */
export function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hashes a reset token for safe storage
 */
export function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
