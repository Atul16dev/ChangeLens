import argon2 from "@node-rs/argon2";

const ARGON2_OPTIONS = {
  algorithm: argon2.Algorithm.Argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,       // 3 iterations
  parallelism: 4,    // 4 threads
};

/**
 * Hashes a plaintext password using Argon2id
 */
export async function hashPassword(plainPassword) {
  if (typeof plainPassword !== "string" || !plainPassword) {
    throw new Error("Password must be a non-empty string");
  }
  return argon2.hash(plainPassword, ARGON2_OPTIONS);
}

/**
 * Verifies a plaintext password against an Argon2id hash
 */
export async function verifyPassword(hash, plainPassword) {
  if (!hash || !plainPassword) return false;
  try {
    return await argon2.verify(hash, plainPassword);
  } catch (err) {
    return false;
  }
}
