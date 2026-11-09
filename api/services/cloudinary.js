import { v2 as cloudinary } from "cloudinary";

/**
 * Configure Cloudinary instance from environment variables.
 * Supports individual variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)
 * or full connection string CLOUDINARY_URL.
 */
let isConfigured = false;

function initCloudinary() {
  if (isConfigured) return true;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudinaryUrl = process.env.CLOUDINARY_URL;

  if (cloudinaryUrl) {
    cloudinary.config({ url: cloudinaryUrl });
    isConfigured = true;
    return true;
  }

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName.trim(),
      api_key: apiKey.trim(),
      api_secret: apiSecret.trim(),
      secure: true,
    });
    isConfigured = true;
    return true;
  }

  return false;
}

/**
 * Checks whether Cloudinary credentials are configured in the environment.
 * @returns {boolean}
 */
export function isCloudinaryConfigured() {
  return initCloudinary();
}

/**
 * Uploads or updates a user profile avatar on Cloudinary.
 * Applies automated facial gravity cropping to 320x320 and serves in modern WebP/AVIF formats (f_auto, q_auto).
 * Uses predictable public_id "user_<userId>" so re-uploads overwrite without bloating storage.
 *
 * @param {string} imageBase64OrUrl - Base64 data URI (data:image/jpeg;base64,...) or remote image URL
 * @param {string|number} userId - ChangeLens user identifier
 * @returns {Promise<string>} Secure HTTPS Cloudinary CDN URL
 */
export async function uploadAvatar(imageBase64OrUrl, userId) {
  if (!initCloudinary()) {
    throw new Error("Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }

  if (!imageBase64OrUrl || typeof imageBase64OrUrl !== "string") {
    throw new TypeError("Image payload must be a non-empty string.");
  }

  const safeUserId = String(userId || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "_");

  try {
    const result = await cloudinary.uploader.upload(imageBase64OrUrl, {
      folder: "changelens/avatars",
      public_id: `user_${safeUserId}`,
      overwrite: true,
      invalidate: true,
      resource_type: "image",
      transformation: [
        { width: 320, height: 320, crop: "fill", gravity: "face" },
        { fetch_format: "auto", quality: "auto" },
      ],
    });

    return result.secure_url;
  } catch (err) {
    console.error("☁️ [Cloudinary Upload Error]:", err.message);
    throw new Error(`Failed to upload avatar to Cloudinary: ${err.message}`);
  }
}

/**
 * Extracts the Cloudinary public_id from a Cloudinary secure URL and deletes the asset.
 *
 * @param {string} urlOrPublicId - Cloudinary image URL or public_id
 * @returns {Promise<boolean>}
 */
export async function deleteAvatar(urlOrPublicId) {
  if (!initCloudinary() || !urlOrPublicId || typeof urlOrPublicId !== "string") {
    return false;
  }

  try {
    let publicId = urlOrPublicId;

    // If it's a URL like https://res.cloudinary.com/.../changelens/avatars/user_123.jpg
    if (urlOrPublicId.includes("cloudinary.com")) {
      const match = urlOrPublicId.match(/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
      if (match && match[1]) {
        publicId = match[1];
      }
    }

    await cloudinary.uploader.destroy(publicId, { invalidate: true });
    return true;
  } catch (err) {
    console.warn("☁️ [Cloudinary Delete Warning]:", err.message);
    return false;
  }
}
