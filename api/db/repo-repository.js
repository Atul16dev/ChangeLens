import crypto from "node:crypto";
import mongoose from "mongoose";
import { isMongoConnected } from "./mongodb.js";
import { Repository } from "../models/Repository.js";

// In-memory store for isolated unit tests or offline mode
const memoryRepos = new Map();

async function ensureDbReady() {
  if (isMongoConnected()) return true;
  if (process.env.MONGODB_URI && mongoose.connection.readyState === 2) {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 150));
      if (isMongoConnected()) return true;
    }
  }
  return isMongoConnected();
}

function isValidObjectId(value) {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
}

function formatRepoDoc(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id || doc.id),
    userId: doc.user ? String(doc.user) : String(doc.userId),
    owner: doc.owner,
    repo: doc.repo,
    fullName: doc.fullName,
    repoUrl: doc.repoUrl,
    description: doc.description || "",
    defaultBranch: doc.defaultBranch || "main",
    language: doc.language || null,
    stars: Number(doc.stars) || 0,
    isPrivate: Boolean(doc.isPrivate),
    isPinned: Boolean(doc.isPinned),
    lastAnalyzedAt: doc.lastAnalyzedAt ? new Date(doc.lastAnalyzedAt).toISOString() : null,
    lastAnalysisId: doc.lastAnalysisId || null,
    lastRiskScore: typeof doc.lastRiskScore === "number" ? doc.lastRiskScore : null,
    lastRiskLevel: doc.lastRiskLevel || null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function sortRepos(list) {
  return list.sort((a, b) => {
    if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
      return a.isPinned ? -1 : 1;
    }
    const timeA = new Date(a.lastAnalyzedAt || a.updatedAt || a.createdAt).getTime();
    const timeB = new Date(b.lastAnalyzedAt || b.updatedAt || b.createdAt).getTime();
    return timeB - timeA;
  });
}

export const repoRepository = {
  /**
   * Add or update a tracked repository for a user.
   */
  async upsert({
    userId,
    owner,
    repo,
    fullName,
    repoUrl,
    description = "",
    defaultBranch = "main",
    language = null,
    stars = 0,
    isPrivate = false,
    isPinned = false,
  }) {
    if (!userId) throw new Error("userId is required to track a repository.");

    const normalizedFullName = fullName || `${owner}/${repo}`;
    const normalizedUrl = repoUrl || `https://github.com/${normalizedFullName}`;
    const dbReady = await ensureDbReady();

    if (dbReady && isValidObjectId(String(userId))) {
      const existing = await Repository.findOne({
        user: userId,
        fullName: { $regex: new RegExp(`^${normalizedFullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      });

      if (existing) {
        existing.owner = owner;
        existing.repo = repo;
        existing.fullName = normalizedFullName;
        existing.repoUrl = normalizedUrl;
        if (description !== undefined) existing.description = description;
        if (defaultBranch) existing.defaultBranch = defaultBranch;
        if (language !== undefined) existing.language = language;
        if (typeof stars === "number") existing.stars = stars;
        existing.isPrivate = Boolean(isPrivate);
        if (isPinned === true) existing.isPinned = true;
        await existing.save();
        return { record: formatRepoDoc(existing), created: false };
      }

      const doc = await Repository.create({
        user: userId,
        owner,
        repo,
        fullName: normalizedFullName,
        repoUrl: normalizedUrl,
        description,
        defaultBranch,
        language,
        stars,
        isPrivate: Boolean(isPrivate),
        isPinned: Boolean(isPinned),
      });
      return { record: formatRepoDoc(doc), created: true };
    }

    // In-memory store
    const uid = String(userId);
    for (const [key, item] of memoryRepos.entries()) {
      if (item.userId === uid && item.fullName.toLowerCase() === normalizedFullName.toLowerCase()) {
        const updated = {
          ...item,
          owner,
          repo,
          fullName: normalizedFullName,
          repoUrl: normalizedUrl,
          description: description !== undefined ? description : item.description,
          defaultBranch: defaultBranch || item.defaultBranch,
          language: language !== undefined ? language : item.language,
          stars: typeof stars === "number" ? stars : item.stars,
          isPrivate: Boolean(isPrivate),
          isPinned: isPinned === true ? true : item.isPinned,
          updatedAt: new Date().toISOString(),
        };
        memoryRepos.set(key, updated);
        return { record: formatRepoDoc(updated), created: false };
      }
    }

    const id = `repo_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const entry = {
      id,
      userId: uid,
      owner,
      repo,
      fullName: normalizedFullName,
      repoUrl: normalizedUrl,
      description,
      defaultBranch,
      language,
      stars: Number(stars) || 0,
      isPrivate: Boolean(isPrivate),
      isPinned: Boolean(isPinned),
      lastAnalyzedAt: null,
      lastAnalysisId: null,
      lastRiskScore: null,
      lastRiskLevel: null,
      createdAt: now,
      updatedAt: now,
    };
    memoryRepos.set(id, entry);
    return { record: formatRepoDoc(entry), created: true };
  },

  /**
   * List all tracked repositories for a user.
   */
  async listByUser(userId) {
    if (!userId) return [];
    const dbReady = await ensureDbReady();

    if (dbReady && isValidObjectId(String(userId))) {
      const docs = await Repository.find({ user: userId })
        .sort({ isPinned: -1, lastAnalyzedAt: -1, updatedAt: -1 })
        .lean();
      return docs.map(formatRepoDoc);
    }

    const uid = String(userId);
    const list = [];
    for (const item of memoryRepos.values()) {
      if (item.userId === uid) {
        list.push(formatRepoDoc(item));
      }
    }
    return sortRepos(list);
  },

  /**
   * Find a single tracked repository by ID (optionally enforcing ownership).
   */
  async findById(id, userId = null) {
    if (!id) return null;
    const dbReady = await ensureDbReady();

    if (dbReady && isValidObjectId(String(id))) {
      const query = { _id: id };
      if (userId && isValidObjectId(String(userId))) {
        query.user = userId;
      }
      const doc = await Repository.findOne(query).lean();
      return formatRepoDoc(doc);
    }

    const item = memoryRepos.get(String(id));
    if (!item) return null;
    if (userId && item.userId !== String(userId)) return null;
    return formatRepoDoc(item);
  },

  /**
   * Toggle pin status on a tracked repository.
   */
  async togglePin(id, userId) {
    if (!id || !userId) return null;
    const dbReady = await ensureDbReady();

    if (dbReady && isValidObjectId(String(id)) && isValidObjectId(String(userId))) {
      const doc = await Repository.findOne({ _id: id, user: userId });
      if (!doc) return null;
      doc.isPinned = !doc.isPinned;
      await doc.save();
      return formatRepoDoc(doc);
    }

    const item = memoryRepos.get(String(id));
    if (!item || item.userId !== String(userId)) return null;
    item.isPinned = !item.isPinned;
    item.updatedAt = new Date().toISOString();
    memoryRepos.set(String(id), item);
    return formatRepoDoc(item);
  },

  /**
   * Update last analysis telemetry for a tracked repository (if tracked by this user).
   */
  async updateLastAnalysis({ userId, fullName, analysisId, riskScore = null, riskLevel = null }) {
    if (!userId || !fullName) return null;
    const dbReady = await ensureDbReady();
    const now = new Date();

    if (dbReady && isValidObjectId(String(userId))) {
      const doc = await Repository.findOneAndUpdate(
        {
          user: userId,
          fullName: { $regex: new RegExp(`^${fullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        },
        {
          $set: {
            lastAnalyzedAt: now,
            lastAnalysisId: analysisId || null,
            lastRiskScore: typeof riskScore === "number" ? riskScore : null,
            lastRiskLevel: riskLevel || null,
          },
        },
        { new: true }
      ).lean();
      return formatRepoDoc(doc);
    }

    const uid = String(userId);
    for (const [key, item] of memoryRepos.entries()) {
      if (item.userId === uid && item.fullName.toLowerCase() === fullName.toLowerCase()) {
        const updated = {
          ...item,
          lastAnalyzedAt: now.toISOString(),
          lastAnalysisId: analysisId || null,
          lastRiskScore: typeof riskScore === "number" ? riskScore : null,
          lastRiskLevel: riskLevel || null,
          updatedAt: now.toISOString(),
        };
        memoryRepos.set(key, updated);
        return formatRepoDoc(updated);
      }
    }
    return null;
  },

  /**
   * Remove a tracked repository by ID (enforcing user ownership).
   */
  async remove(id, userId) {
    if (!id || !userId) return false;
    const dbReady = await ensureDbReady();

    if (dbReady && isValidObjectId(String(id)) && isValidObjectId(String(userId))) {
      const res = await Repository.deleteOne({ _id: id, user: userId });
      return res.deletedCount > 0;
    }

    const item = memoryRepos.get(String(id));
    if (!item || item.userId !== String(userId)) return false;
    return memoryRepos.delete(String(id));
  },

  clearMemory() {
    memoryRepos.clear();
  },
};
