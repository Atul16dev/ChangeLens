process.env.NODE_ENV = "test";

import assert from "node:assert/strict";
import test from "node:test";
import { v2 as cloudinary } from "cloudinary";
import {
  isCloudinaryConfigured,
  uploadAvatar,
  deleteAvatar,
} from "../api/services/cloudinary.js";

test("Cloudinary Service Test Suite", async (t) => {
  const originalEnv = {
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    CLOUDINARY_URL: process.env.CLOUDINARY_URL,
  };

  t.afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  await t.test("isCloudinaryConfigured returns false when environment variables are missing", () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    delete process.env.CLOUDINARY_URL;

    // Reset internal state by clearing config
    cloudinary.config({ cloud_name: "", api_key: "", api_secret: "" });

    // Should return false when required credentials are not set
    const configured = isCloudinaryConfigured();
    assert.strictEqual(configured, false);
  });

  await t.test("uploadAvatar throws descriptive error when Cloudinary is not configured", async () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    delete process.env.CLOUDINARY_URL;

    await assert.rejects(
      async () => {
        await uploadAvatar("data:image/jpeg;base64,sample123", "user_1");
      },
      {
        message: /Cloudinary is not configured/,
      }
    );
  });

  await t.test("uploadAvatar validates input image string", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
    process.env.CLOUDINARY_API_KEY = "123456789";
    process.env.CLOUDINARY_API_SECRET = "abcdefghi";

    await assert.rejects(
      async () => {
        await uploadAvatar(null, "user_1");
      },
      {
        name: "TypeError",
        message: /Image payload must be a non-empty string/,
      }
    );
  });

  await t.test("uploadAvatar calls cloudinary uploader with face-gravity square crop & returns secure_url", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
    process.env.CLOUDINARY_API_KEY = "123456789";
    process.env.CLOUDINARY_API_SECRET = "abcdefghi";

    const originalUpload = cloudinary.uploader.upload;
    let capturedPayload = null;
    let capturedOptions = null;

    cloudinary.uploader.upload = async (payload, options) => {
      capturedPayload = payload;
      capturedOptions = options;
      return {
        secure_url: "https://res.cloudinary.com/demo-cloud/image/upload/v1700000000/changelens/avatars/user_test123.webp",
        public_id: "changelens/avatars/user_test123",
      };
    };

    try {
      const secureUrl = await uploadAvatar("data:image/jpeg;base64,mockValidBase64Data", "test123");

      assert.strictEqual(
        secureUrl,
        "https://res.cloudinary.com/demo-cloud/image/upload/v1700000000/changelens/avatars/user_test123.webp"
      );
      assert.strictEqual(capturedPayload, "data:image/jpeg;base64,mockValidBase64Data");
      assert.strictEqual(capturedOptions.folder, "changelens/avatars");
      assert.strictEqual(capturedOptions.public_id, "user_test123");
      assert.strictEqual(capturedOptions.overwrite, true);
      assert.ok(Array.isArray(capturedOptions.transformation));
      assert.strictEqual(capturedOptions.transformation[0].crop, "fill");
      assert.strictEqual(capturedOptions.transformation[0].gravity, "face");
    } finally {
      cloudinary.uploader.upload = originalUpload;
    }
  });

  await t.test("deleteAvatar extracts publicId from URL and calls destroy", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
    process.env.CLOUDINARY_API_KEY = "123456789";
    process.env.CLOUDINARY_API_SECRET = "abcdefghi";

    const originalDestroy = cloudinary.uploader.destroy;
    let capturedPublicId = null;

    cloudinary.uploader.destroy = async (publicId) => {
      capturedPublicId = publicId;
      return { result: "ok" };
    };

    try {
      const success = await deleteAvatar(
        "https://res.cloudinary.com/demo-cloud/image/upload/v1700000000/changelens/avatars/user_test123.webp"
      );
      assert.strictEqual(success, true);
      assert.strictEqual(capturedPublicId, "changelens/avatars/user_test123");
    } finally {
      cloudinary.uploader.destroy = originalDestroy;
    }
  });
});
