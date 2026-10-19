import crypto from "node:crypto";
import { isMongoConnected } from "./mongodb.js";
import { OtpChallenge } from "../models/OtpChallenge.js";
import { normalizeEmail } from "./user-repository.js";

// In-memory store for isolated unit tests
const memoryOtps = new Map();

function formatChallengeDoc(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    email: doc.email,
    purpose: doc.purpose,
    otp_hash: doc.otpHash,
    reset_token_hash: doc.resetTokenHash,
    expires_at: doc.expiresAt.getTime(),
    attempts_count: doc.attemptsCount,
    resend_available_at: doc.resendAvailableAt.getTime(),
    is_consumed: doc.isConsumed ? 1 : 0,
    created_at: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
  };
}

export const otpRepository = {
  async createChallenge({ email, purpose, otpHash, ttlMs = 5 * 60 * 1000, cooldownMs = 60 * 1000 }) {
    const cleanEmail = normalizeEmail(email);
    const now = Date.now();
    const expiresAt = new Date(now + ttlMs);
    const resendAvailableAt = new Date(now + cooldownMs);

    if (isMongoConnected()) {
      // Invalidate existing active challenges for this email and purpose
      await OtpChallenge.updateMany(
        { email: cleanEmail, purpose, isConsumed: false },
        { isConsumed: true }
      );

      const doc = await OtpChallenge.create({
        email: cleanEmail,
        purpose,
        otpHash,
        expiresAt,
        resendAvailableAt,
        isConsumed: false,
        attemptsCount: 0,
      });

      return formatChallengeDoc(doc);
    }

    // In-memory fallback (used in automated tests)
    for (const challenge of memoryOtps.values()) {
      if (challenge.email === cleanEmail && challenge.purpose === purpose && !challenge.is_consumed) {
        challenge.is_consumed = 1;
      }
    }

    const id = `otp_${crypto.randomUUID()}`;
    const newChallenge = {
      id,
      email: cleanEmail,
      purpose,
      otp_hash: otpHash,
      reset_token_hash: null,
      expires_at: expiresAt.getTime(),
      attempts_count: 0,
      resend_available_at: resendAvailableAt.getTime(),
      is_consumed: 0,
      created_at: new Date(now).toISOString(),
    };

    memoryOtps.set(id, newChallenge);
    return newChallenge;
  },

  async findById(id) {
    if (isMongoConnected()) {
      try {
        const doc = await OtpChallenge.findById(id);
        return formatChallengeDoc(doc);
      } catch {
        return null;
      }
    }

    return memoryOtps.get(id) || null;
  },

  async findLatestActive(email, purpose) {
    const cleanEmail = normalizeEmail(email);

    if (isMongoConnected()) {
      const doc = await OtpChallenge.findOne({
        email: cleanEmail,
        purpose,
        isConsumed: false,
      }).sort({ createdAt: -1 });

      return formatChallengeDoc(doc);
    }

    let latest = null;
    for (const challenge of memoryOtps.values()) {
      if (challenge.email === cleanEmail && challenge.purpose === purpose && !challenge.is_consumed) {
        if (!latest || challenge.expires_at > latest.expires_at) {
          latest = challenge;
        }
      }
    }
    return latest;
  },

  async incrementAttempts(id) {
    if (isMongoConnected()) {
      const doc = await OtpChallenge.findByIdAndUpdate(
        id,
        { $inc: { attemptsCount: 1 } },
        { new: true }
      );
      return formatChallengeDoc(doc);
    }

    const challenge = memoryOtps.get(id);
    if (challenge) {
      challenge.attempts_count += 1;
    }
    return challenge || null;
  },

  async consume(id) {
    if (isMongoConnected()) {
      await OtpChallenge.findByIdAndUpdate(id, { isConsumed: true });
      return;
    }

    const challenge = memoryOtps.get(id);
    if (challenge) {
      challenge.is_consumed = 1;
    }
  },

  async setResetToken(id, resetTokenHash) {
    if (isMongoConnected()) {
      const doc = await OtpChallenge.findByIdAndUpdate(
        id,
        { resetTokenHash },
        { new: true }
      );
      return formatChallengeDoc(doc);
    }

    const challenge = memoryOtps.get(id);
    if (challenge) {
      challenge.reset_token_hash = resetTokenHash;
    }
    return challenge || null;
  },

  async findByResetTokenHash(resetTokenHash) {
    if (isMongoConnected()) {
      const doc = await OtpChallenge.findOne({
        resetTokenHash,
        isConsumed: false,
        expiresAt: { $gt: new Date() },
      });
      return formatChallengeDoc(doc);
    }

    const now = Date.now();
    for (const challenge of memoryOtps.values()) {
      if (challenge.reset_token_hash === resetTokenHash && !challenge.is_consumed && challenge.expires_at > now) {
        return challenge;
      }
    }
    return null;
  },

  clearMemory() {
    memoryOtps.clear();
  },
};
