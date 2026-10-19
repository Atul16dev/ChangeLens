/**
 * Analysis Store for ChangeLens API
 * 
 * Supports high-speed in-memory caching and persistent MongoDB Atlas storage.
 */
import { isMongoConnected } from "./db/mongodb.js";
import { Analysis } from "./models/Analysis.js";

const analyses = new Map();

export const analysesStore = {
  async save(analysisId, analysisData, userId = null) {
    const record = {
      id: analysisId,
      analysisId,
      createdAt: new Date().toISOString(),
      ...analysisData,
    };
    analyses.set(analysisId, record);

    if (isMongoConnected()) {
      try {
        await Analysis.findOneAndUpdate(
          { analysisId },
          {
            analysisId,
            user: userId,
            targetDir: analysisData.targetDir,
            changedFiles: analysisData.changedFiles || [],
            summary: analysisData.summary || {},
            graph: analysisData.graph || {},
            impactAnalysis: analysisData.impactAnalysis || {},
            explanation: analysisData.explanation || null,
            status: analysisData.status || "completed",
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
            createdAt: doc.createdAt.toISOString(),
            targetDir: doc.targetDir,
            changedFiles: doc.changedFiles,
            summary: doc.summary,
            graph: doc.graph,
            impactAnalysis: doc.impactAnalysis,
            explanation: doc.explanation,
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

  async list() {
    if (isMongoConnected()) {
      try {
        const docs = await Analysis.find().sort({ createdAt: -1 }).limit(50);
        if (docs && docs.length > 0) {
          return docs.map((a) => ({
            id: a.analysisId,
            targetDir: a.targetDir,
            createdAt: a.createdAt.toISOString(),
            status: a.status,
            summary: a.summary,
          }));
        }
      } catch {}
    }

    return Array.from(analyses.values()).map((a) => ({
      id: a.id,
      targetDir: a.targetDir,
      createdAt: a.createdAt,
      status: a.status,
      summary: a.summary,
    }));
  },

  async delete(analysisId) {
    analyses.delete(analysisId);
    if (isMongoConnected()) {
      try {
        await Analysis.deleteOne({ analysisId });
      } catch {}
    }
    return true;
  },

  clear() {
    analyses.clear();
  },
};
