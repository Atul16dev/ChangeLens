/**
 * In-memory analysis store for ChangeLens API
 * 
 * Stores active and historical analysis runs in memory.
 * Designed behind an interface so it can be swapped with MongoDB/Mongoose later.
 */

const analyses = new Map();

export const analysesStore = {
  save(analysisId, analysisData) {
    analyses.set(analysisId, {
      id: analysisId,
      createdAt: new Date().toISOString(),
      ...analysisData,
    });
    return analyses.get(analysisId);
  },

  get(analysisId) {
    return analyses.get(analysisId) || null;
  },

  list() {
    return Array.from(analyses.values()).map((a) => ({
      id: a.id,
      targetDir: a.targetDir,
      createdAt: a.createdAt,
      status: a.status,
      summary: a.summary,
    }));
  },

  delete(analysisId) {
    return analyses.delete(analysisId);
  },

  clear() {
    analyses.clear();
  },
};
