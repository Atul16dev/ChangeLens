/**
 * Analysis Store for ChangeLens API
 * 
 * Provides hybrid in-memory caching and persistent MongoDB Atlas storage
 * with full user-scoped history tracking, search, and deletion.
 */
import { isMongoConnected } from "./db/mongodb.js";
import { Analysis } from "./models/Analysis.js";

const analyses = new Map();

function extractChangedFiles(analysisData) {
  if (Array.isArray(analysisData.changedFiles) && analysisData.changedFiles.length > 0) {
    return analysisData.changedFiles;
  }
  if (Array.isArray(analysisData.changes) && analysisData.changes.length > 0) {
    return analysisData.changes.map((c) => (typeof c === "string" ? c : c.path));
  }
  return [];
}

function deriveTitle(analysisData, changedFiles) {
  if (analysisData.title) return analysisData.title;
  if (changedFiles.length === 1) {
    return `${changedFiles[0]} change impact`;
  }
  if (changedFiles.length > 1) {
    return `${changedFiles[0]} +${changedFiles.length - 1} files`;
  }
  if (analysisData.targetDir) {
    const parts = analysisData.targetDir.split(/[\\/]/).filter(Boolean);
    return `${parts[parts.length - 1] || "Repository"} scan`;
  }
  return "Blast Radius Analysis";
}

export const analysesStore = {
  async save(analysisId, analysisData, userId = null) {
    const changedFiles = extractChangedFiles(analysisData);
    const title = deriveTitle(analysisData, changedFiles);
    const now = new Date();
    const isPinned = Boolean(analysisData.isPinned);
    // 30 days retention policy for unpinned analyses
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const expireAt = isPinned ? null : new Date(now.getTime() + thirtyDays);

    const record = {
      id: analysisId,
      analysisId,
      user: userId,
      title,
      isPinned,
      expireAt: expireAt ? expireAt.toISOString() : null,
      createdAt: now.toISOString(),
      changedFiles,
      ...analysisData,
    };
    analyses.set(analysisId, record);

    if (isMongoConnected()) {
      try {
        await Analysis.findOneAndUpdate(
          { analysisId },
          {
            analysisId,
            user: userId || null,
            title,
            targetDir: analysisData.targetDir || null,
            changedFiles,
            changes: analysisData.changes || [],
            summary: analysisData.summary || {},
            graph: analysisData.graph || {},
            impactAnalysis: analysisData.impactAnalysis || {},
            explanation: analysisData.explanation || null,
            status: analysisData.status || "completed",
            isPinned,
            expireAt,
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.warn("[MongoDB] Failed to persist analysis record:", err.message);
      }
    }

    return record;
  },

  async get(analysisId) {
    if (analyses.has(analysisId)) {
      return analyses.get(analysisId);
    }

    if (isMongoConnected()) {
      try {
        const doc = await Analysis.findOne({ analysisId });
        if (doc) {
          const formatted = {
            id: doc.analysisId,
            analysisId: doc.analysisId,
            user: doc.user ? doc.user.toString() : null,
            title: doc.title,
            isPinned: Boolean(doc.isPinned),
            expireAt: doc.expireAt ? doc.expireAt.toISOString() : null,
            createdAt: doc.createdAt.toISOString(),
            targetDir: doc.targetDir,
            changedFiles: doc.changedFiles || [],
            changes: doc.changes || (doc.changedFiles || []).map((p) => ({ path: p, status: "modified" })),
            summary: doc.summary || {},
            graph: doc.graph || {},
            impactAnalysis: doc.impactAnalysis || {},
            explanation: doc.explanation || null,
            status: doc.status,
          };
          analyses.set(analysisId, formatted);
          return formatted;
        }
      } catch (err) {
        console.warn("[MongoDB] Failed to retrieve analysis record:", err.message);
      }
    }

    return null;
  },

  getLatest() {
    const all = Array.from(analyses.values());
    return all.length > 0 ? all[all.length - 1] : null;
  },

  size() {
    return analyses.size;
  },

  async listByUser(userId, { search = "", limit = 20, page = 1 } = {}) {
    const cleanLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
    const cleanPage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (cleanPage - 1) * cleanLimit;

    if (isMongoConnected()) {
      try {
        const filter = {};
        if (userId) {
          filter.user = userId;
        }

        if (search && typeof search === "string" && search.trim()) {
          const s = search.trim();
          filter.$or = [
            { title: { $regex: s, $options: "i" } },
            { targetDir: { $regex: s, $options: "i" } },
            { changedFiles: { $regex: s, $options: "i" } },
          ];
        }

        const [total, docs] = await Promise.all([
          Analysis.countDocuments(filter),
          Analysis.find(filter)
            .sort({ isPinned: -1, createdAt: -1 })
            .skip(skip)
            .limit(cleanLimit)
            .lean(),
        ]);

        const formatted = docs.map((doc) => ({
          analysisId: doc.analysisId,
          title: doc.title || deriveTitle(doc, doc.changedFiles || []),
          targetDir: doc.targetDir,
          changedFiles: doc.changedFiles || [],
          status: doc.status,
          summary: doc.summary || {},
          isPinned: Boolean(doc.isPinned),
          expireAt: doc.expireAt ? new Date(doc.expireAt).toISOString() : null,
          createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
        }));

        return {
          analyses: formatted,
          total,
          page: cleanPage,
          totalPages: Math.ceil(total / cleanLimit) || 1,
        };
      } catch (err) {
        console.warn("[MongoDB] Failed to fetch user analysis history:", err.message);
      }
    }

    // In-memory fallback: purge expired unpinned analyses
    const now = new Date();
    for (const [key, a] of analyses.entries()) {
      if (!a.isPinned && a.expireAt && new Date(a.expireAt) < now) {
        analyses.delete(key);
      }
    }

    let all = Array.from(analyses.values());
    if (userId) {
      all = all.filter((a) => !a.user || a.user === userId);
    }

    if (search && typeof search === "string" && search.trim()) {
      const q = search.toLowerCase().trim();
      all = all.filter((a) => {
        const titleMatch = (a.title || "").toLowerCase().includes(q);
        const targetMatch = (a.targetDir || "").toLowerCase().includes(q);
        const filesMatch = (a.changedFiles || []).some((f) => f.toLowerCase().includes(q));
        return titleMatch || targetMatch || filesMatch;
      });
    }

    // Pinned first, then newest
    all.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = all.length;
    const sliced = all.slice(skip, skip + cleanLimit).map((a) => ({
      analysisId: a.analysisId,
      title: a.title || deriveTitle(a, a.changedFiles || []),
      targetDir: a.targetDir,
      changedFiles: a.changedFiles || [],
      status: a.status,
      summary: a.summary || {},
      isPinned: Boolean(a.isPinned),
      expireAt: a.expireAt || null,
      createdAt: a.createdAt,
    }));

    return {
      analyses: sliced,
      total,
      page: cleanPage,
      totalPages: Math.ceil(total / cleanLimit) || 1,
    };
  },

  async togglePin(analysisId, isPinnedExplicit = undefined, userId = null) {
    let target = analyses.get(analysisId);

    if (isMongoConnected()) {
      try {
        const doc = await Analysis.findOne({ analysisId });
        if (!doc) return null;
        if (userId && doc.user && doc.user.toString() !== userId.toString()) {
          return null; // Forbidden: not owner
        }

        const newPinned = isPinnedExplicit !== undefined ? Boolean(isPinnedExplicit) : !doc.isPinned;
        let newExpireAt = null;

        if (!newPinned) {
          // Unpinned: expires 30 days from creation
          const baseDate = doc.createdAt ? new Date(doc.createdAt) : new Date();
          newExpireAt = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        }

        doc.isPinned = newPinned;
        doc.expireAt = newExpireAt;
        await doc.save();

        const formatted = {
          analysisId: doc.analysisId,
          isPinned: doc.isPinned,
          expireAt: doc.expireAt ? doc.expireAt.toISOString() : null,
        };

        if (target) {
          target.isPinned = newPinned;
          target.expireAt = formatted.expireAt;
        }

        return formatted;
      } catch (err) {
        console.warn("[MongoDB] Failed to toggle pin:", err.message);
      }
    }

    if (!target) return null;
    if (userId && target.user && target.user !== userId) {
      return null; // Forbidden: not owner
    }

    const newPinned = isPinnedExplicit !== undefined ? Boolean(isPinnedExplicit) : !target.isPinned;
    const baseDate = target.createdAt ? new Date(target.createdAt) : new Date();
    const newExpireAt = newPinned ? null : new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    target.isPinned = newPinned;
    target.expireAt = newExpireAt;

    return {
      analysisId: target.analysisId,
      isPinned: target.isPinned,
      expireAt: target.expireAt,
    };
  },

  async list() {
    return (await this.listByUser(null, { limit: 50 })).analyses;
  },

  async delete(analysisId, userId = null) {
    const memRecord = analyses.get(analysisId);
    if (memRecord && userId && memRecord.user && memRecord.user !== userId) {
      return false; // Forbidden: not owner
    }

    if (isMongoConnected()) {
      try {
        const query = { analysisId };
        if (userId) {
          // If userId provided, only allow deleting if owned by this user or unowned
          const doc = await Analysis.findOne(query);
          if (doc && doc.user && doc.user.toString() !== userId.toString()) {
            return false; // Forbidden: not owner
          }
        }
        await Analysis.deleteOne(query);
      } catch (err) {
        console.warn("[MongoDB] Failed to delete analysis record:", err.message);
      }
    }

    analyses.delete(analysisId);
    return true;
  },

  clear() {
    analyses.clear();
  },
};
