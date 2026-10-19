/**
 * ChangeLens - Context-Aware & Evidence-Grounded Chat Assistant Service
 * 
 * Provides an intelligent conversational AI interface for developers inspecting
 * code change blast radiuses, dependency graphs, and potential regression risks.
 * 
 * Core Principles:
 * 1. "EVIDENCE BEFORE AI"
 *    - Never invent files, dependencies, broken imports, test results, or severity metrics.
 *    - Direction Convention: Importer (Consumer) -> Imports -> Imported (Dependency)
 * 2. "ZERO SECRET DISCLOSURE"
 *    - Never reveal, serialize, or send API keys, credentials, or environment secrets to LLMs.
 *    - Safe boolean configuration-status checks only where verified by backend probes.
 */

import { callGeminiAPI, isGeminiAvailable } from "./gemini.js";

/**
 * Standardized intent taxonomy for analysis queries.
 */
export const INTENTS = {
  SECRET_DISCLOSURE_REQUEST: "SECRET_DISCLOSURE_REQUEST",
  ALL_IMPORT_RELATIONSHIPS: "ALL_IMPORT_RELATIONSHIPS",
  DIRECT_CONSUMERS_OF_FILE: "DIRECT_CONSUMERS_OF_FILE",
  IMPORTS_OF_FILE: "IMPORTS_OF_FILE",
  TRANSITIVE_DEPENDENCIES: "TRANSITIVE_DEPENDENCIES",
  BROKEN_IMPORTS: "BROKEN_IMPORTS",
  BLAST_RADIUS_EXPLANATION: "BLAST_RADIUS_EXPLANATION",
  POTENTIAL_REGRESSION_RISKS: "POTENTIAL_REGRESSION_RISKS",
  TEST_RECOMMENDATIONS: "TEST_RECOMMENDATIONS",
  GENERAL_REPORT_EXPLANATION: "GENERAL_REPORT_EXPLANATION",
  FILE_OR_SYMBOL_LOOKUP: "FILE_OR_SYMBOL_LOOKUP",
  ANALYSIS_SUMMARY: "ANALYSIS_SUMMARY",
  CLARIFICATION_REQUIRED: "CLARIFICATION_REQUIRED",
  OUT_OF_SCOPE: "OUT_OF_SCOPE",
  UNSUPPORTED_ACTION: "UNSUPPORTED_ACTION",
  INSUFFICIENT_ANALYSIS_EVIDENCE: "INSUFFICIENT_ANALYSIS_EVIDENCE",
  UNKNOWN_FILE: "UNKNOWN_FILE",
  ABUSE_ONLY: "ABUSE_ONLY",
  UNRECOGNIZED_QUERY: "UNRECOGNIZED_QUERY",
  WHAT_IF_SIMULATION: "WHAT_IF_SIMULATION",
};

/**
 * Extracts normalized, de-duplicated AST dependency edges from an analysis record.
 * Supports both rich ELK ReactFlow graph edges and blast radius path derivation.
 * 
 * Direction Convention:
 * - Importer (Consumer): The file containing the import statement (source of dependency)
 * - Imported (Dependency): The file being imported (target of dependency)
 * 
 * @param {object} analysisRecord
 * @returns {Array<{ importer: string, imported: string, specifier: string, isDirectImpact: boolean, isImpacted: boolean, relationshipType: string }>}
 */
export function getAnalysisEdges(analysisRecord) {
  if (!analysisRecord || typeof analysisRecord !== "object") return [];

  const changes = analysisRecord.changes || [];
  const changedPaths = new Set(changes.map((c) => c?.path).filter(Boolean));
  const blastRadius = analysisRecord.impactAnalysis?.blastRadius || [];
  const impactedPaths = new Set(blastRadius.map((b) => b?.affectedFile || b?.file).filter(Boolean));

  const edgeMap = new Map();

  // 1. Direct graph edges if available
  const rawEdges = analysisRecord.graph?.edges;
  if (Array.isArray(rawEdges) && rawEdges.length > 0) {
    for (const e of rawEdges) {
      if (!e) continue;
      // data.importer / data.imported preserve semantic AST direction regardless of layout inversion
      const importer = e.data?.importer || e.source;
      const imported = e.data?.imported || e.target;
      const specifier = e.data?.specifier || e.label || "";

      if (!importer || !imported) continue;

      const key = `${importer}->${imported}`;
      if (!edgeMap.has(key)) {
        const isDirectImpact = changedPaths.has(imported);
        const isImpacted = isDirectImpact || impactedPaths.has(importer) || impactedPaths.has(imported);

        let relationshipType = "Direct Import (Clean / Unaffected)";
        if (isDirectImpact) {
          relationshipType = "Direct Import (Direct Impact - Depth 1)";
        } else if (isImpacted) {
          relationshipType = "Direct Import (Transitive Impact - Depth 2+)";
        }

        edgeMap.set(key, {
          importer,
          imported,
          specifier,
          isDirectImpact,
          isImpacted,
          relationshipType,
        });
      }
    }
  }

  // 2. Supplement or derive from blast radius propagation paths if edges were empty
  if (edgeMap.size === 0 && blastRadius.length > 0) {
    for (const item of blastRadius) {
      if (Array.isArray(item?.path) && item.path.length > 1) {
        for (let i = 0; i < item.path.length - 1; i++) {
          const dependency = item.path[i];
          const consumer = item.path[i + 1];
          if (!dependency || !consumer) continue;

          const key = `${consumer}->${dependency}`;

          if (!edgeMap.has(key)) {
            const isDirectImpact = i === 0 || changedPaths.has(dependency);
            edgeMap.set(key, {
              importer: consumer,
              imported: dependency,
              specifier: dependency.split("/").pop(),
              isDirectImpact,
              isImpacted: true,
              relationshipType: isDirectImpact
                ? "Direct Import (Direct Impact - Depth 1)"
                : "Direct Import (Transitive Impact - Depth 2+)",
            });
          }
        }
      }
    }
  }

  return Array.from(edgeMap.values());
}

/**
 * Extracts all known unique filenames from an analysis record.
 * 
 * @param {object} analysisRecord
 * @returns {Array<string>}
 */
function getAllKnownFiles(analysisRecord) {
  if (!analysisRecord || typeof analysisRecord !== "object") return [];

  const files = new Set();
  const changes = analysisRecord.changes || [];
  for (const c of changes) {
    if (c?.path) files.add(c.path);
  }

  const blastRadius = analysisRecord.impactAnalysis?.blastRadius || [];
  for (const b of blastRadius) {
    if (b?.file) files.add(b.file);
    if (b?.affectedFile) files.add(b.affectedFile);
    if (Array.isArray(b?.path)) {
      b.path.forEach((p) => p && files.add(p));
    }
  }

  const rawNodes = analysisRecord.graph?.nodes;
  if (Array.isArray(rawNodes)) {
    for (const n of rawNodes) {
      if (n?.id) files.add(n.id);
    }
  }

  const edges = getAnalysisEdges(analysisRecord);
  for (const e of edges) {
    if (e.importer) files.add(e.importer);
    if (e.imported) files.add(e.imported);
  }

  const brokenImports = analysisRecord.impactAnalysis?.brokenImports || [];
  for (const b of brokenImports) {
    if (b?.affectedFile) files.add(b.affectedFile);
    if (b?.deletedFile) files.add(b.deletedFile);
  }

  return Array.from(files);
}

/**
 * Checks if a string contains Hindi or Hinglish phrasing.
 * 
 * @param {string} text
 * @returns {boolean}
 */
export function isHindiOrHinglish(text) {
  return /\b(kon|kaun|kisko|kise|kis|kya|kyun|kyu|kaise|karta|karti|karte|raha|rahi|rahe|hai|hain|samjhao|batao|bataiye|yeh|ye|aasan|shabdon|mein|par|ko|farak|farq|khatra|dikhao|chahiye|chalega|batao|do)\b/i.test(
    text || ""
  );
}

/**
 * Classifies the intent of a user question using keyword heuristics, security rules, and entity resolution.
 * 
 * @param {string} userMessage
 * @param {object} context
 * @param {object} context.analysisRecord
 * @param {string|null} [context.selectedNodeId=null]
 * @param {Array<object>} [context.history=[]]
 * @returns {{
 *   intent: string,
 *   isHindi: boolean,
 *   isAbusive: boolean,
 *   isRepeatedAbuse: boolean,
 *   isStatusCheckOnly?: boolean,
 *   targetSecretVar?: string|null,
 *   mentionedFile: string|null,
 *   unknownFile: string|null
 * }}
 */
export function classifyQuestionIntent(userMessage, { analysisRecord = null, selectedNodeId = null, history = [] } = {}) {
  const rawQuery = (userMessage || "").trim();
  const query = rawQuery.toLowerCase();
  const isHindi = isHindiOrHinglish(query);

  // 1. Abuse & rudeness detection
  const abuseRegex = /\b(stupid|idiot|dumb|useless|fool|bakwas|chutiya|pagal|ganda|trash|garbage|hate you|shut up)\b/i;
  const isAbusive = abuseRegex.test(query);
  const isRepeatedAbuse = isAbusive && Array.isArray(history) && history.some(
    (h) => h?.role === "user" && abuseRegex.test(String(h.content || ""))
  );

  // 2. SECURITY INTENT: Secret & Sensitive Information Request Detection
  // Must be evaluated BEFORE generic deterministic fallbacks, testing strategies, or file lookups.
  const secretKeywordsRegex =
    /(?:^|\W)\.env\b|\b(gemini_api_key|gemini key|gemini api key|api_key|api keys?|secret keys?|private keys?|process\.env|environment variables?|env vars?|mongodb|mongo password|mongo uri|mongo_uri|mongo credentials?|database passwords?|db passwords?|db credentials?|database credentials?|connection strings?|jwt|jwt[_\s]secrets?|jwt[_\s]tokens?|session[_\s]secrets?|auth[_\s]tokens?|authentication tokens?|access tokens?|bearer tokens?|passwords?|credentials?)\b/i;

  if (secretKeywordsRegex.test(query)) {
    // Check if user is asking ONLY whether a variable is configured (boolean status check)
    const isStatusCheckOnly =
      /\b(is (the )?.*(configured|set|present|available|enabled)|check if .* (configured|set|present|available|enabled)|kya .* configured hai|status of (the )?.*)\b/i.test(query) &&
      !/\b(value|values|show|give|print|what is|what are|kya hai|reveal|display|read|cat|cat \.env)\b/i.test(query);

    let targetSecretVar = null;
    if (/\b(gemini|gemini_api_key)\b/i.test(query)) {
      targetSecretVar = "GEMINI_API_KEY";
    } else if (/\b(mongo|mongodb|mongo_uri)\b/i.test(query)) {
      targetSecretVar = "MONGO_URI";
    } else if (/\b(jwt|jwt_secret)\b/i.test(query)) {
      targetSecretVar = "JWT_SECRET";
    } else {
      const matchEnv = rawQuery.match(/\b([A-Z0-9_]{3,})\b/);
      if (matchEnv) {
        targetSecretVar = matchEnv[1];
      }
    }

    return {
      intent: INTENTS.SECRET_DISCLOSURE_REQUEST,
      isHindi,
      isAbusive,
      isRepeatedAbuse,
      isStatusCheckOnly,
      targetSecretVar,
      mentionedFile: null,
      unknownFile: null,
    };
  }

  // 3. Collect known files from analysis
  const knownFiles = getAllKnownFiles(analysisRecord);

  // 4. Resolve mentioned file or candidate unknown file
  let mentionedFile = null;
  let unknownFile = null;

  // A. Check for explicit "selected node" / "this file" reference
  if (selectedNodeId && /\b(this file|selected|selected node|ye file|is file|current file)\b/i.test(query)) {
    mentionedFile = selectedNodeId;
  }

  // B. Check exact match or basename match against known files
  if (!mentionedFile) {
    for (const f of knownFiles) {
      const lowerF = f.toLowerCase();
      const base = f.split("/").pop().toLowerCase();
      if (query.includes(lowerF) || (base.length > 3 && query.includes(base))) {
        mentionedFile = f;
        break;
      }
    }
  }

  // C. Check if query references an unknown file path or extension (e.g. "foo.xyz", "unknown.js", "some/path.js")
  if (!mentionedFile) {
    const fileTokenMatches = query.match(/\b([a-z0-9_\-\/\\\.]+\.[a-z0-9]{2,5})\b/gi);
    if (fileTokenMatches && fileTokenMatches.length > 0) {
      for (const token of fileTokenMatches) {
        const cleanToken = token.replace(/^['"`]+|['"`]+$/g, "");
        const matched = knownFiles.find(
          (f) => f.toLowerCase() === cleanToken || f.toLowerCase().endsWith(cleanToken)
        );
        if (matched) {
          mentionedFile = matched;
          break;
        } else {
          unknownFile = cleanToken;
        }
      }
    }
  }

  // Fallback to selectedNodeId if user didn't mention another file and asks contextual questions
  if (!mentionedFile && selectedNodeId && !unknownFile) {
    if (/\b(it|this|affected|broken|fail|details|about)\b/i.test(query)) {
      mentionedFile = selectedNodeId;
    }
  }

  // 5. Intent Detection Heuristics

  // A. Unsupported Action Request (e.g., git push, commit, edit code, deploy)
  const isUnsupportedAction =
    /\b(push to github|push to remote|commit changes|git commit|git push|edit file|modify file|delete file|deploy to|create pr|merge pr)\b/i.test(query) ||
    (/\b(push|commit|deploy|edit)\b/i.test(query) && /\b(github|repo|code|files|branch|main|master)\b/i.test(query));

  if (isUnsupportedAction) {
    return {
      intent: INTENTS.UNSUPPORTED_ACTION,
      isHindi,
      isAbusive,
      isRepeatedAbuse,
      mentionedFile,
      unknownFile,
    };
  }

  // B. Insufficient Analysis Evidence (Runtime CI / live server metrics not in static AST)
  const isInsufficientEvidence =
    /\b(ci pass|ci fail|ci build|tests pass in ci|runtime memory|memory leak|cpu usage|requests per second|rps|database connected|db connected|live server)\b/i.test(query);

  if (isInsufficientEvidence) {
    return {
      intent: INTENTS.INSUFFICIENT_ANALYSIS_EVIDENCE,
      isHindi,
      isAbusive,
      isRepeatedAbuse,
      mentionedFile,
      unknownFile,
    };
  }

  // C. Out of Scope (Weather, sports, general knowledge)
  const isOutOfScope =
    /\b(weather|temperature|prime minister|president|cricket|football|world cup|capital of|tell me a joke|recipe|who won|movie)\b/i.test(query);

  if (isOutOfScope) {
    return {
      intent: INTENTS.OUT_OF_SCOPE,
      isHindi,
      isAbusive,
      isRepeatedAbuse,
      mentionedFile,
      unknownFile,
    };
  }

  // D. Broken Imports Intent
  const isBrokenImportQuery =
    /\b(broken import|broken imports|unresolved import|unresolved specifier|deleted module|kya koi import break|broken import dikhao|broken imports dikhao)\b/i.test(query) ||
    (/\b(broken|unresolved)\b/i.test(query) && /\b(import|imports|dependency|dependencies)\b/i.test(query));

  if (isBrokenImportQuery) {
    return {
      intent: INTENTS.BROKEN_IMPORTS,
      isHindi,
      isAbusive,
      isRepeatedAbuse,
      mentionedFile,
      unknownFile,
    };
  }

  // E. Direct vs Transitive Impact concept
  const isTransitiveConcept =
    (query.includes("direct") &&
      (query.includes("transitive") ||
        query.includes("difference") ||
        query.includes("farak") ||
        query.includes("farq") ||
        query.includes("mean") ||
        query.includes("matlab"))) ||
    (query.includes("transitive") && (query.includes("explain") || query.includes("samjhao") || query.includes("depend")));

  if (isTransitiveConcept) {
    return {
      intent: INTENTS.TRANSITIVE_DEPENDENCIES,
      isHindi,
      isAbusive,
      isRepeatedAbuse,
      mentionedFile,
      unknownFile,
    };
  }

  // F. Unknown File Query
  if (unknownFile && !mentionedFile) {
    return {
      intent: INTENTS.UNKNOWN_FILE,
      isHindi,
      isAbusive,
      isRepeatedAbuse,
      mentionedFile: null,
      unknownFile,
    };
  }

  // G. What-If Blast Radius Simulation Query ("What if I change X?", "Agar main X ko delete karun...")
  const isWhatIfQuery =
    /\b(what if|what happens if|kya hoga agar|agar main|agar mai|suppose|imagine|if i change|if i delete|if i modify|simulate impact|simulate change|simulate)\b/i.test(query);

  if (isWhatIfQuery && (mentionedFile || selectedNodeId)) {
    const target = mentionedFile || selectedNodeId;
    const changeType = /\b(delete|remove|deleted|hata|hatao)\b/i.test(query) ? "deleted" : "modified";
    return {
      intent: INTENTS.WHAT_IF_SIMULATION,
      isHindi,
      isAbusive,
      isRepeatedAbuse,
      targetFile: target,
      mentionedFile: target,
      changeType,
      simulatedChangeType: changeType,
      unknownFile: null,
    };
  }

  // H. Directional queries for a specific file
  const isIncomingDirection =
    /\b(who import|who imports|which files depend|which files directly depend|consumers of|kaun import karta|kon import kar|kisne import|par kaun depend|depend on this|depend on it)\b/i.test(query);

  const isOutgoingDirection =
    /\b(what does .* import|what does .* depend|kisko import karta|kya import karta|kispe depend|dependencies of)\b/i.test(query);

  if (mentionedFile) {
    if (isIncomingDirection) {
      return {
        intent: INTENTS.DIRECT_CONSUMERS_OF_FILE,
        isHindi,
        isAbusive,
        isRepeatedAbuse,
        mentionedFile,
        unknownFile: null,
      };
    }
    if (isOutgoingDirection) {
      return {
        intent: INTENTS.IMPORTS_OF_FILE,
        isHindi,
        isAbusive,
        isRepeatedAbuse,
        mentionedFile,
        unknownFile: null,
      };
    }
    if (/\b(tell me about|details of|about this file|explain this file|is file ke baare mein)\b/i.test(query)) {
      return {
        intent: INTENTS.FILE_OR_SYMBOL_LOOKUP,
        isHindi,
        isAbusive,
        isRepeatedAbuse,
        mentionedFile,
        unknownFile: null,
      };
    }
  }

  // H. Ambiguous question requiring clarification ("is it affected?", "will it break?" with no selected node or file)
  const isAmbiguousQuery =
    /\b(is it affected|will it break|what does it do|is this broken|will it fail|kya ye break hoga|kya yeh chalega)\b/i.test(query) &&
    !mentionedFile &&
    !selectedNodeId;

  if (isAmbiguousQuery) {
    return {
      intent: INTENTS.CLARIFICATION_REQUIRED,
      isHindi,
      isAbusive,
      isRepeatedAbuse,
      mentionedFile: null,
      unknownFile: null,
    };
  }

  // I. All Import Relationships ("kon kisko import kar raha hai", "who imports what")
  const isAllImportsQuery =
    /\b(kon kisko import|kaun kisko import|kisko import kar|who imports what|import relationships|all imports|show imports|list all dependencies|list dependencies)\b/i.test(query) ||
    (/\b(import|imports)\b/i.test(query) && /\b(all|relationships|graph|table|sab|list)\b/i.test(query));

  if (isAllImportsQuery) {
    return {
      intent: INTENTS.ALL_IMPORT_RELATIONSHIPS,
      isHindi,
      isAbusive,
      isRepeatedAbuse,
      mentionedFile,
      unknownFile: null,
    };
  }

  // J. Testing Strategy & Recommendations (strictly bounded to actual code testing inquiries)
  const isTestingQuery =
    /\b(test suite|testing strategy|test recommendations|unit test|unit tests|integration test|integration tests|smoke test|smoke tests|e2e test|e2e tests|qa verification|kaise test|kya test karein|what tests|which tests|run tests|run test)\b/i.test(query) ||
    (/\b(test|tests|testing|qa)\b/i.test(query) && /\b(run|execute|suite|strategy|recommend|recommendations|before merge|pr|coverage|how to test|karein)\b/i.test(query));

  if (isTestingQuery) {
    return {
      intent: INTENTS.TEST_RECOMMENDATIONS,
      isHindi,
      isAbusive,
      isRepeatedAbuse,
      mentionedFile,
      unknownFile: null,
    };
  }

  // K. Potential Regression Risks & Severity
  const isRiskQuery =
    /\b(risk|risks|severity|why high risk|why is blast radius|khatra|danger|critical)\b/i.test(query);

  if (isRiskQuery) {
    return {
      intent: INTENTS.POTENTIAL_REGRESSION_RISKS,
      isHindi,
      isAbusive,
      isRepeatedAbuse,
      mentionedFile,
      unknownFile: null,
    };
  }

  // L. Blast Radius & Route Explanation
  const isBlastRadiusQuery =
    /\b(blast|blast radius|route|routes|propagation|ripple|how does change propagate)\b/i.test(query);

  if (isBlastRadiusQuery) {
    return {
      intent: INTENTS.BLAST_RADIUS_EXPLANATION,
      isHindi,
      isAbusive,
      isRepeatedAbuse,
      mentionedFile,
      unknownFile: null,
    };
  }

  // M. Explicit General Report Explanation / Summary
  const isExplicitSummary =
    /\b(summary|overview|explain this report|explain report|report samjhao|summary of changes)\b/i.test(query);

  if (isExplicitSummary) {
    return {
      intent: INTENTS.ANALYSIS_SUMMARY,
      isHindi,
      isAbusive,
      isRepeatedAbuse,
      mentionedFile,
      unknownFile: null,
    };
  }

  // N. If only abuse was detected without any technical intent
  if (isAbusive) {
    return {
      intent: INTENTS.ABUSE_ONLY,
      isHindi,
      isAbusive: true,
      isRepeatedAbuse,
      mentionedFile: null,
      unknownFile: null,
    };
  }

  // O. Fallback for unrecognized or unsupported questions outside analysis scope
  // Ensures unrelated questions never trigger "Recommended Testing Strategy".
  return {
    intent: INTENTS.UNRECOGNIZED_QUERY,
    isHindi,
    isAbusive: false,
    isRepeatedAbuse: false,
    mentionedFile,
    unknownFile: null,
  };
}

/**
 * Scopes exact analysis evidence required for the classified intent.
 * 
 * @param {object} classification
 * @param {object} analysisRecord
 * @param {string|null} selectedNodeId
 * @returns {object} Scoped evidence payload
 */
export function retrieveScopedEvidence(classification, analysisRecord, selectedNodeId = null) {
  if (!analysisRecord || typeof analysisRecord !== "object") {
    return { isEmpty: true };
  }

  const { intent, mentionedFile, unknownFile } = classification;
  const changes = analysisRecord.changes || [];
  const summary = analysisRecord.summary || {};
  const blastRadius = analysisRecord.impactAnalysis?.blastRadius || [];
  const brokenImports = analysisRecord.impactAnalysis?.brokenImports;
  const edges = getAnalysisEdges(analysisRecord);
  const allKnownFiles = getAllKnownFiles(analysisRecord);

  const targetFile = mentionedFile || selectedNodeId || null;

  switch (intent) {
    case INTENTS.SECRET_DISCLOSURE_REQUEST:
      return {
        isStatusCheckOnly: Boolean(classification.isStatusCheckOnly),
        targetSecretVar: classification.targetSecretVar,
      };

    case INTENTS.ALL_IMPORT_RELATIONSHIPS:
      return { edges, changes, summary };

    case INTENTS.DIRECT_CONSUMERS_OF_FILE: {
      const incomingEdges = targetFile
        ? edges.filter(
            (e) =>
              e.imported.toLowerCase() === targetFile.toLowerCase() ||
              e.imported.toLowerCase().endsWith(targetFile.toLowerCase())
          )
        : [];
      return { targetFile, incomingEdges, edges, changes };
    }

    case INTENTS.IMPORTS_OF_FILE: {
      const outgoingEdges = targetFile
        ? edges.filter(
            (e) =>
              e.importer.toLowerCase() === targetFile.toLowerCase() ||
              e.importer.toLowerCase().endsWith(targetFile.toLowerCase())
          )
        : [];
      return { targetFile, outgoingEdges, edges, changes };
    }

    case INTENTS.TRANSITIVE_DEPENDENCIES: {
      const directConsumer =
        blastRadius.find((b) => b.depth === 1)?.affectedFile ||
        blastRadius.find((b) => b.depth === 1)?.file ||
        edges.find((e) => e.isDirectImpact)?.importer ||
        "server/controllers/user-controller.js";
      const rootFile = changes[0]?.path || "server/models/user.js";
      const transitiveConsumer =
        blastRadius.find((b) => b.depth > 1)?.affectedFile ||
        blastRadius.find((b) => b.depth > 1)?.file ||
        edges.find((e) => !e.isDirectImpact && e.isImpacted)?.importer ||
        "server/routes/user-routes.js";
      return { directConsumer, rootFile, transitiveConsumer, blastRadius, summary };
    }

    case INTENTS.BROKEN_IMPORTS:
      return {
        isUnavailable: !analysisRecord.impactAnalysis || brokenImports === undefined,
        brokenImports: Array.isArray(brokenImports) ? brokenImports : [],
      };

    case INTENTS.BLAST_RADIUS_EXPLANATION:
      return { blastRadius, summary, changes };

    case INTENTS.POTENTIAL_REGRESSION_RISKS:
      return { brokenImports: Array.isArray(brokenImports) ? brokenImports : [], summary, changes };

    case INTENTS.TEST_RECOMMENDATIONS: {
      const directConsumers = blastRadius
        .filter((b) => b.depth === 1)
        .map((b) => b.affectedFile || b.file)
        .filter(Boolean);
      return { changes, directConsumers, blastRadius };
    }

    case INTENTS.FILE_OR_SYMBOL_LOOKUP: {
      const item = targetFile ? blastRadius.find((b) => (b.affectedFile || b.file) === targetFile) : null;
      const incoming = targetFile ? edges.filter((e) => e.imported === targetFile) : [];
      const outgoing = targetFile ? edges.filter((e) => e.importer === targetFile) : [];
      const isRoot = changes.some((c) => c?.path === targetFile);
      return { targetFile, item, incoming, outgoing, isRoot, summary };
    }

    case INTENTS.WHAT_IF_SIMULATION: {
      const target = targetFile || changes[0]?.path || "server/models/user.js";
      const changeType = classification.simulatedChangeType || "modified";

      // Reverse BFS on edges where edge.imported === current
      const queue = [{ file: target, depth: 0, path: [target] }];
      const visited = new Map([[target, 0]]);
      const findings = [];
      const directConsumers = [];
      const transitiveConsumers = [];

      while (queue.length > 0) {
        const curr = queue.shift();
        if (curr.depth >= 10) continue;

        const consumers = edges.filter(
          (e) =>
            e.imported.toLowerCase() === curr.file.toLowerCase() ||
            e.imported.toLowerCase().endsWith(curr.file.toLowerCase())
        );

        for (const edge of consumers) {
          const nextDepth = curr.depth + 1;
          const consumerPath = edge.importer;

          if (visited.has(consumerPath) && visited.get(consumerPath) <= nextDepth) {
            continue;
          }

          visited.set(consumerPath, nextDepth);
          const nextPath = [...curr.path, consumerPath];

          if (nextDepth === 1) {
            directConsumers.push(consumerPath);
          } else {
            transitiveConsumers.push(consumerPath);
          }

          findings.push({
            affectedFile: consumerPath,
            depth: nextDepth,
            path: nextPath,
            specifier: edge.specifier,
            relationshipType: edge.relationshipType,
          });

          queue.push({
            file: consumerPath,
            depth: nextDepth,
            path: nextPath,
          });
        }
      }

      return {
        targetFile: target,
        changeType,
        directConsumers,
        transitiveConsumers,
        findings,
        totalImpacted: directConsumers.length + transitiveConsumers.length,
      };
    }

    case INTENTS.UNKNOWN_FILE:
      return { requestedFile: unknownFile, availableFiles: allKnownFiles.slice(0, 5) };

    default:
      return { changes, summary, blastRadius, brokenImports: Array.isArray(brokenImports) ? brokenImports : [] };
  }
}

// =============================================================================
// MODULAR DETERMINISTIC RESPONSE GENERATORS
// =============================================================================

function handleSecretDisclosureRequest(evidence, classification) {
  const { isHindi, isStatusCheckOnly, targetSecretVar } = classification;

  if (isStatusCheckOnly) {
    if (targetSecretVar === "GEMINI_API_KEY") {
      const isConfigured = isGeminiAvailable();
      if (isHindi) {
        return `### 🔒 Configuration Status

Server par \`GEMINI_API_KEY\` environment variable currently **${isConfigured ? "configured hai" : "configured nahi hai"}**.
${isConfigured ? "\n*(Security ke niyam anusar iski actual value display nahi ki ja sakti.)*" : ""}`;
      }
      return `### 🔒 Configuration Status

The \`GEMINI_API_KEY\` environment variable is currently **${isConfigured ? "configured" : "not configured"}** on the server.
${isConfigured ? "\n*(Its actual value is confidential and cannot be displayed.)*" : ""}`;
    }

    const varName = targetSecretVar || "the requested variable";
    if (isHindi) {
      return `### 🔒 Configuration Status

ChangeLens ka static AST analysis yeh verify nahi kar sakta ki \`${varName}\` runtime par configured hai ya nahi, aur iske liye koi safe server-side probe uplabdh nahi hai.

Kripya apne deployment environment settings ya secret manager ko directly check karein.`;
    }

    return `### 🔒 Configuration Status

The current AST analysis does not establish whether \`${varName}\` is configured at runtime, and no safe server-side probe is available for it.

Please inspect your deployment's environment-variable settings or secret manager directly.`;
  }

  if (isHindi) {
    return `### 🔒 Security Policy: Secret Disclosure Restricted

Main API keys, database credentials, authentication tokens, ya kisi bhi secret values ko disclose nahi kar sakta.

ChangeLens ka current AST analysis runtime environment variables ya unki values ko verify nahi karta.

Agar application ke paas safe configuration-status check hai, toh main bina value reveal kiye yeh bata sakta hoon ki variable configured hai ya nahi. Iske alawa, uplabdh analysis context se status verify nahi kiya ja sakta.

Aap apne deployment ke environment-variable settings ya secret manager ko directly inspect kar sakte hain.`;
  }

  return `### 🔒 Security Policy: Secret Disclosure Restricted

I can't disclose API keys, database credentials, authentication tokens, or other secret values.

The current AST analysis does not establish which environment variables are configured at runtime or what their values are.

If the application has a secure configuration-status check, I can report whether a particular variable is configured without exposing its value. Otherwise, I cannot verify its status from the available analysis context.

You can inspect your deployment's environment-variable settings or secret manager directly.`;
}

function handleUnrecognizedQuery({ isHindi }) {
  if (isHindi) {
    return `### ℹ️ Question Analysis Scope Se Baahar Hai

ChangeLens AI repository ke AST dependency graph, direct aur transitive consumers, blast radius propagation, broken imports aur code change impact ko analyze karne ke liye design kiya gaya hai.

Main is analysis ke daayre ke baahar ke sawalon ko verify ya answer nahi kar sakta.

Aap mujhse puch sakte hain:
- 🔀 *"Kon kisko import kar raha hai?"*
- ⚡ *"Direct vs Transitive impact mein kya farak hai?"*
- 🚨 *"Kya koi import break hua hai?"*
- 🧪 *"Is PR ke liye kaun se tests run karne chahiye?"*`;
  }

  return `### ℹ️ Question Outside Analysis Scope

ChangeLens AI is specialized in analyzing repository AST dependency graphs, direct and transitive consumers, blast radius propagation, broken imports, and code change impact.

I cannot verify or answer questions outside the scope of this repository's architectural analysis.

You can ask:
- 🔀 *"Who imports server/models/user.js?"*
- 📦 *"Kon kisko import kar raha hai?"*
- ⚡ *"What is the difference between direct and transitive consumers?"*
- 🚨 *"Are there any broken imports?"*
- 🧪 *"What tests should I run for this PR?"*`;
}

function handleWhatIfSimulation(evidence, { isHindi }) {
  const {
    targetFile,
    changeType = "modified",
    directConsumers = [],
    transitiveConsumers = [],
    findings = [],
    totalImpacted = 0,
  } = evidence;

  const routes = findings.slice(0, 4).map((f) => `- **Depth ${f.depth}:** \`${f.path.join(" ➔ ")}\``);

  if (isHindi) {
    return `### ⚡ Simulated Blast Radius (What-If Simulation): \`${targetFile}\`

Agar aap \`${targetFile}\` ko **${changeType === "deleted" ? "delete" : "modify"}** karte hain, toh ChangeLens AST dependency graph ke anusaar projected blast radius yeh hoga:

- **Simulated Target:** \`${targetFile}\` (${changeType.toUpperCase()})
- **Direct Consumers (Depth 1):** ${directConsumers.length} file(s) ${directConsumers.length > 0 ? `(${directConsumers.map((f) => `\`${f}\``).join(", ")})` : ""}
- **Transitive Consumers (Depth 2+):** ${transitiveConsumers.length} file(s) ${transitiveConsumers.length > 0 ? `(${transitiveConsumers.map((f) => `\`${f}\``).join(", ")})` : ""}
- **Total Projected Blast Radius:** **${totalImpacted} file(s)**

${routes.length > 0 ? `**Projected Propagation Routes:**\n${routes.join("\n")}` : `*No downstream consumers import this file. Koi downstream dependent file nahi mili. Yeh file isolated hai (Isolated Leaf File).*`}

> **Recommended Verification / Testing Strategy:** Agar aap yeh change karte hain, toh ${directConsumers.length > 0 ? `direct consumers ${directConsumers.map((f) => `\`${f}\``).join(", ")} ke contract tests` : "unit tests"} ko sabse pehle run karein.`;
  }

  return `### ⚡ Simulated Blast Radius (What-If Simulation): \`${targetFile}\`

If \`${targetFile}\` is **${changeType === "deleted" ? "deleted" : "modified"}**, here is the projected downstream blast radius based on the AST dependency graph:

- **Simulated Target:** \`${targetFile}\` (${changeType.toUpperCase()})
- **Direct Consumers (Depth 1):** ${directConsumers.length} file(s) ${directConsumers.length > 0 ? `(${directConsumers.map((f) => `\`${f}\``).join(", ")})` : ""}
- **Transitive Consumers (Depth 2+):** ${transitiveConsumers.length} file(s) ${transitiveConsumers.length > 0 ? `(${transitiveConsumers.map((f) => `\`${f}\``).join(", ")})` : ""}
- **Total Projected Blast Radius:** **${totalImpacted} file(s)**

${routes.length > 0 ? `**Projected Propagation Routes:**\n${routes.join("\n")}` : `*No downstream consumers import this file. This file appears isolated (Isolated Leaf File - Low Risk).*`}

> **Recommended Verification / Testing Strategy:** Modifications here will immediately break or require contract updates in ${directConsumers.length > 0 ? `direct consumers (${directConsumers.map((f) => `\`${f}\``).join(", ")})` : "unit tests"}. Run integration tests before merging.`;
}

function handleAllImportRelationships(evidence, { isHindi }) {
  const { edges = [], changes = [] } = evidence;
  if (!edges || edges.length === 0) {
    return isHindi
      ? `### 📦 Import Relationships\n\nIs repository ke AST analysis mein koi internal import relationships nahi mile.`
      : `### 📦 Import Relationships\n\nNo internal repository import relationships were detected in the AST dependency graph.`;
  }

  const rows = edges
    .map((e) => `| \`${e.importer}\` | \`${e.imported}\` | \`${e.specifier}\` | ${e.relationshipType} |`)
    .join("\n");

  const bullets = edges
    .map((e) => {
      if (isHindi) {
        return `- \`${e.importer}\` file \`${e.imported}\` ko import karti hai${e.isDirectImpact ? " (Root file ka direct consumer)" : ""}.`;
      }
      return `- \`${e.importer}\` imports \`${e.imported}\`${e.isDirectImpact ? " (Direct consumer of root change)" : ""}.`;
    })
    .join("\n");

  if (isHindi) {
    return `### 📦 Import Relationships (Kaun Kisko Import Kar Raha Hai)

ChangeLens ke AST dependency graph ke anusaar repository ke exact import relationships yeh hain:

| Importing File (Consumer) | Imported File (Dependency) | Specifier | Relationship |
| :--- | :--- | :--- | :--- |
${rows}

**Aasan shabdon mein direction:**
${bullets}

> **Direction Convention:** Agar File A, File B ko import karti hai, toh File A consumer hai jo File B par nirbhar karti hai. Jab root file \`${changes[0]?.path || "server/models/user.js"}\` modify hoti hai, toh yeh change un sabhi files tak propagate hota hai jo use direct ya transitively import karti hain.`;
  }

  return `### 📦 Import & Dependency Relationships

Based on the AST dependency graph analysis, here are the exact import relationships:

| Importing File (Consumer) | Imported File (Dependency) | Specifier | Relationship |
| :--- | :--- | :--- | :--- |
${rows}

**Direction & Dependency Flow:**
${bullets}

> **Direction Convention:** File A importing File B means File A is the consumer and depends on File B. Modifications to root files ripple upward to their consumers.`;
}

function handleDirectConsumersOfFile(evidence, { isHindi }) {
  const { targetFile, incomingEdges = [] } = evidence;

  if (incomingEdges.length > 0) {
    const rows = incomingEdges
      .map((e) => `| \`${e.importer}\` | \`${e.specifier}\` | ${e.relationshipType} |`)
      .join("\n");

    if (isHindi) {
      return `### 📥 \`${targetFile}\` Ko Kaun Import Kar Raha Hai?

\`${targetFile}\` ko **${incomingEdges.length} file(s)** import karti hain:

| Importing File (Consumer) | Specifier | Relationship |
| :--- | :--- | :--- |
${rows}

**Samajh:** Yeh files \`${targetFile}\` ke exports par depend karti hain. Agar aap \`${targetFile}\` ko modify karenge, toh in files ko verify karna zaroori hai.`;
    }

    return `### 📥 Consumers Importing \`${targetFile}\`

The file \`${targetFile}\` is imported by **${incomingEdges.length} consumer file(s)**:

| Importing File (Consumer) | Specifier | Relationship |
| :--- | :--- | :--- |
${rows}

**Impact:** These files depend directly on exports provided by \`${targetFile}\`.`;
  }

  return isHindi
    ? `### 📥 \`${targetFile}\` Ko Koi Import Nahi Karta\n\nChangeLens ke AST dependency graph ke anusaar, koi bhi internal file \`${targetFile}\` ko import nahi karti. Is analysis mein iske 0 direct consumers hain.`
    : `### 📥 No Consumers Found for \`${targetFile}\`\n\nAccording to the AST dependency graph, no internal repository files import \`${targetFile}\`. It has 0 direct consumers in this analysis.`;
}

function handleImportsOfFile(evidence, { isHindi }) {
  const { targetFile, outgoingEdges = [] } = evidence;

  if (outgoingEdges.length > 0) {
    const rows = outgoingEdges
      .map((e) => `| \`${e.imported}\` | \`${e.specifier}\` | ${e.relationshipType} |`)
      .join("\n");

    if (isHindi) {
      return `### 📤 \`${targetFile}\` Kisko Import Karta Hai?

\`${targetFile}\` in **${outgoingEdges.length} dependency file(s)** ko import karta hai:

| Imported Dependency | Specifier | Relationship |
| :--- | :--- | :--- |
${rows}

**Samajh:** \`${targetFile}\` in modules se functions aur classes use karta hai.`;
    }

    return `### 📤 Dependencies Imported by \`${targetFile}\`

The file \`${targetFile}\` imports **${outgoingEdges.length} dependency file(s)**:

| Imported Dependency | Specifier | Relationship |
| :--- | :--- | :--- |
${rows}

**Impact:** \`${targetFile}\` depends on functions and interfaces provided by these modules.`;
  }

  return isHindi
    ? `### 📤 \`${targetFile}\` Kisi Ko Import Nahi Karta\n\nAST dependency graph ke anusaar, \`${targetFile}\` kisi bhi internal repository file ko import nahi karti.`
    : `### 📤 No Dependencies Imported by \`${targetFile}\`\n\nAccording to the AST dependency graph, \`${targetFile}\` does not import any internal repository files.`;
}

function handleTransitiveDependencies(evidence, { isHindi }) {
  const { directConsumer, rootFile, transitiveConsumer } = evidence;

  if (isHindi) {
    return `### 🔀 Direct vs Transitive Impact (Farq aur Samajh)

- **Direct Consumer (Depth 1):** Jo file root changed file ko seedhe \`import\` ya \`require\` karti hai.
  - *Udaharan:* \`${directConsumer}\` directly \`${rootFile}\` ko import karti hai.
- **Transitive Consumer (Depth 2+):** Jo file root file ko directly import nahi karti, balki kisi aise consumer ko import karti hai jo aage root change par depend karta hai.
  - *Udaharan:* \`${transitiveConsumer}\` \`${directConsumer}\` ko import karti hai, isliye yeh transitively impact hoti hai.

> **Risk Impact:** Root file ke exported function signatures badalne par Direct Consumers turant fail hote hain, aur phir unka ripple effect Transitive Consumers tak pahunchta hai.`;
  }

  return `### 🔀 Direct vs Transitive Impact

- **Direct Consumer (Depth 1):** A file that directly \`import\`s or \`require\`s a root changed file.
  - *Example:* \`${directConsumer}\` directly imports \`${rootFile}\`.
- **Transitive Consumer (Depth 2+):** A file that does not import the root file directly, but imports an intermediate file that depends on the root file.
  - *Example:* \`${transitiveConsumer}\` imports \`${directConsumer}\`, creating a ripple dependency.

> **Risk Profile:** Breaking changes in root exports crash Direct Consumers immediately, which subsequently breaks functionality downstream in Transitive Consumers.`;
}

function handleBrokenImports(evidence, { isHindi }) {
  const { isUnavailable, brokenImports = [] } = evidence;

  if (isUnavailable) {
    return isHindi
      ? `### ⚠️ Broken Import Analysis Uplabdh Nahi Hai\n\nIs analysis record mein broken import detection data uplabdh nahi hai. Kripya broken imports check karne ke liye naya repository analysis run karein.`
      : `### ⚠️ Broken Import Analysis Unavailable\n\nBroken import detection data is not available in the current analysis record. Please run a new repository analysis with impact calculation enabled to inspect broken imports.`;
  }

  if (brokenImports.length > 0) {
    const rows = brokenImports
      .map(
        (b) =>
          `| \`${b.affectedFile}\` | \`${b.deletedFile || b.specifier || "unknown"}\` | ${b.line ? `Line ${b.line}` : b.evidence?.rawSource ? `\`${b.evidence.rawSource}\`` : "N/A"} |`
      )
      .join("\n");

    if (isHindi) {
      return `### 🚨 Broken Imports Detected (${brokenImports.length})

Repository mein **${brokenImports.length} broken import(s)** mile hain jahan consumer files aise modules ko import kar rahi hain jo delete ho chuke hain ya path galat hai:

| Consumer File | Broken / Missing Module | Evidence |
| :--- | :--- | :--- |
${rows}

**Remediation:** In files ke import paths ko update karein ya deleted module restore karein taaki runtime module resolution error na aaye.`;
    }

    return `### 🚨 Broken Imports Detected (${brokenImports.length})

ChangeLens detected **${brokenImports.length} broken import(s)** where files attempt to import non-existent or deleted modules:

| Consumer File | Broken / Missing Module | Evidence |
| :--- | :--- | :--- |
${rows}

**Remediation:** Update import specifiers in these consumer files or restore the missing modules before merging to prevent module resolution crashes at runtime.`;
  }

  return isHindi
    ? `### ✅ Koi Broken Import Nahi Mila\n\nChangeLens AST analysis ke anusaar repository mein **0 broken imports** detect hue hain. Sabhi static import paths valid files ko resolve kar rahe hain.\n\n*Dhyan dein: Yeh static import specifier resolution verify karta hai; dynamic imports aur runtime execution ke liye automated tests run karna zaroori hai.*`
    : `### ✅ No Broken Imports Detected\n\nChangeLens AST analysis detected **0 broken imports** across the analyzed files. All static relative import specifiers resolve to existing files.\n\n*Note: This verifies static import specifier resolution in the analyzed repository; runtime execution and dynamic imports should still be validated with automated tests.*`;
}

function handleBlastRadiusExplanation(evidence, { isHindi }) {
  const { blastRadius = [], summary = {} } = evidence;
  const count = summary.impactedFilesCount ?? blastRadius.length;

  const routeExamples = blastRadius.slice(0, 5).map((b) => {
    const fileName = b.affectedFile || b.file;
    const p = Array.isArray(b.path) ? b.path.join(" ➔ ") : fileName;
    return `- **Depth ${b.depth}:** \`${p}\``;
  });

  if (isHindi) {
    return `### 🔍 Blast Radius Summary

Total affected files: **${count}**

${routeExamples.join("\n") || "Koi downstream impacted file nahi mili."}

*Direct consumers (Depth 1) root change ko directly import karte hain; Transitive consumers (Depth 2+) aage unhe import karte hain.*`;
  }

  return `### 🔍 Blast Radius Summary

Total affected files: **${count}**

${routeExamples.join("\n") || "No downstream impacted files detected."}

*Direct consumers import the changed file directly; transitive consumers import those consumers.*`;
}

function handlePotentialRegressionRisks(evidence, { isHindi }) {
  const { brokenImports = [], summary = {}, changes = [] } = evidence;

  if (brokenImports.length > 0) {
    return isHindi
      ? `### 🚨 CRITICAL RISK: Broken Imports Detected\n\nRepository mein **${brokenImports.length} broken import(s)** hain. Agar inko fix kiye bina merge kiya gaya, toh application runtime par crash ho jayegi.`
      : `### 🚨 CRITICAL RISK: Broken Imports Detected\n\nThere are **${brokenImports.length} broken import(s)** because consumers reference modules that were removed or renamed. These must be resolved before merging to prevent runtime module resolution crashes.`;
  }

  if ((summary.directDependentsCount || 0) > 0) {
    return isHindi
      ? `### ⚠️ HIGH RISK: Direct Downstream Consumers Impacted\n\nRoot files mein kiye gaye badlav **${summary.directDependentsCount} direct consumer(s)** (Depth 1) ko affect karte hain, aur transitive ripple **${summary.transitiveDependentsCount || 0} file(s)** tak jaati hai. Exported function signatures backward-compatible hone chahiye.`
      : `### ⚠️ HIGH RISK: Direct Downstream Consumers Impacted\n\nModifications in **${changes.length} root file(s)** directly affect **${summary.directDependentsCount} file(s)** at Depth 1, and ripple to **${summary.transitiveDependentsCount || 0} transitive file(s)**. Ensure public exported interfaces remain backward-compatible.`;
  }

  return isHindi
    ? `### ✅ LOW RISK: Isolated Code Changes\n\nAST dependency graph ke anusaar in changes ke liye koi downstream consumers detect nahi hue.`
    : `### ✅ LOW RISK: Isolated Code Changes\n\nNo downstream consumers were detected in the AST dependency graph for these modifications.`;
}

function handleTestRecommendations(evidence, { isHindi }) {
  const { changes = [], directConsumers = [] } = evidence;
  const rootFiles = changes.map((c) => `\`${c.path}\``);
  const directFiles = directConsumers.map((f) => `\`${f}\``);

  if (isHindi) {
    return `### 🧪 Recommended Testing Strategy

1. **Unit Tests for Root Changed Files:**
   ${rootFiles.length > 0 ? rootFiles.join(", ") : "None specified"}
2. **Integration Tests for Direct Consumers (Depth 1):**
   ${directFiles.length > 0 ? directFiles.join(", ") : "None detected"}
3. **Interface & Contract Verification:**
   Verify function signatures and exports remain backward-compatible.
4. **Smoke / Route Tests:**
   Exercise entry points and HTTP routes affected downstream.

> **Note:** ChangeLens source code ka static AST dependency analysis karta hai. Automated tests run nahi kiye gaye hain. Kripya merge karne se pehle local terminal ya CI mein \`npm test\` run karein.`;
  }

  return `### 🧪 Recommended Testing Strategy

1. **Unit Tests for Root Changed Files:**
   ${rootFiles.length > 0 ? rootFiles.join(", ") : "None specified"}
2. **Integration Tests for Direct Consumers (Depth 1):**
   ${directFiles.length > 0 ? directFiles.join(", ") : "None detected"}
3. **Interface & Contract Verification:**
   Verify function signatures and exports remain backward-compatible.
4. **Smoke / Route Tests:**
   Exercise entry points and HTTP routes affected downstream.

> **Note:** ChangeLens performs static AST dependency analysis. Automated tests have not been executed automatically. Please run your test suite (e.g. \`npm test\`) locally or in CI before merging.`;
}

function handleFileOrSymbolLookup(evidence, { isHindi }) {
  const { targetFile, item, incoming = [], outgoing = [], isRoot, summary = {} } = evidence;

  if (item) {
    const routeStr = Array.isArray(item.path) ? item.path.join(" ➔ ") : targetFile;
    if (isHindi) {
      return `### 📍 File Impact: \`${targetFile}\`

- **Depth:** Level ${item.depth} (${item.depth === 1 ? "Direct Consumer" : "Transitive Consumer"})
- **Propagation Route:** \`${routeStr}\`
- **Imported By (${incoming.length} consumers):** ${incoming.map((e) => `\`${e.importer}\``).join(", ") || "None"}
- **Imports (${outgoing.length} dependencies):** ${outgoing.map((e) => `\`${e.imported}\``).join(", ") || "None"}
- **Recommendation:** Root changes ke sath contract compatibility check karein aur is file ka test suite run karein.`;
    }

    return `### 📍 File Impact: \`${targetFile}\`

- **Depth:** Level ${item.depth} (${item.depth === 1 ? "Direct Consumer" : "Transitive Consumer"})
- **Propagation Route:** \`${routeStr}\`
- **Imported By (${incoming.length} consumers):** ${incoming.map((e) => `\`${e.importer}\``).join(", ") || "None"}
- **Imports (${outgoing.length} dependencies):** ${outgoing.map((e) => `\`${e.imported}\``).join(", ") || "None"}
- **Recommendation:** Verify contract compatibility with the root change and run its corresponding test suite.`;
  }

  if (isRoot) {
    if (isHindi) {
      return `### 📍 Root Changed File: \`${targetFile}\`

Yeh file primary change root hai. Isme kiye gaye badlav **${summary.directDependentsCount || 0} direct consumer(s)** ko affect karte hain.
- **Imported By:** ${incoming.map((e) => `\`${e.importer}\``).join(", ") || "None"}
- **Imports:** ${outgoing.map((e) => `\`${e.imported}\``).join(", ") || "None"}`;
    }

    return `### 📍 Root Changed File: \`${targetFile}\`

This file is a primary change root. Any modifications here directly impact ${summary.directDependentsCount || 0} direct consumer(s) and ripple to ${summary.transitiveDependentsCount || 0} transitive file(s).
- **Imported By:** ${incoming.map((e) => `\`${e.importer}\``).join(", ") || "None"}
- **Imports:** ${outgoing.map((e) => `\`${e.imported}\``).join(", ") || "None"}`;
  }

  return isHindi
    ? `### 📍 File: \`${targetFile}\`\n\nYeh file repository graph ka hissa hai, lekin vartaman change ke blast radius se bahar hai.`
    : `### 📍 File: \`${targetFile}\`\n\nThis file is part of the repository graph but is currently outside the affected blast radius for this change.`;
}

function handleUnknownFile(evidence, { isHindi }) {
  const { requestedFile, availableFiles = [] } = evidence;
  const fileList = availableFiles.map((f) => `- \`${f}\``).join("\n");

  if (isHindi) {
    return `### ⚠️ File Analysis Mein Nahi Mili

File \`${requestedFile}\` vartaman repository analysis graph mein nahi mili.

**Is analysis mein uplabdh kuch files:**
${fileList}

Kripya file path verify karein ya graph mein se kisi node ko click karke select karein.`;
  }

  return `### ⚠️ File Not Found in Analysis

The file \`${requestedFile}\` was not found in the current repository analysis graph.

**Available files in this analysis include:**
${fileList}

Please verify the filename or select a node directly in the graph.`;
}

function handleClarificationRequired({ isHindi }) {
  if (isHindi) {
    return `### ❓ Kripya File Specify Karein

Aap kis file ke baare mein puch rahe hain? Kripya file ka naam batayein (jaise \`server/models/user.js\`) ya dependency graph mein kisi node par click karke use select karein.`;
  }

  return `### ❓ Clarification Needed

Could you please specify which file or module you are asking about? You can mention a file path (e.g. \`server/models/user.js\`) or click a node in the dependency graph to select it.`;
}

function handleOutOfScope({ isHindi }) {
  if (isHindi) {
    return `### ℹ️ ChangeLens Scope Se Baahar

Main ChangeLens AI hoon, jo codebase ke dependency graphs, blast radius, aur code change impact analysis ke liye banaya gaya hai. Main general knowledge ya external sawalon ke jawab nahi de sakta.

Aap mujhse repository ke files, import relationships, blast radius ya testing ke baare mein puch sakte hain!`;
  }

  return `### ℹ️ Out of Scope Query

I am ChangeLens AI, an assistant specialized in repository dependency graphs, code change blast radiuses, and regression impact analysis. I cannot answer general knowledge or external queries.

Please ask about your repository's files, imports, blast radius, or testing recommendations!`;
}

function handleUnsupportedAction({ isHindi }) {
  if (isHindi) {
    return `### 🚫 Unsupported Action (Kaam Karne Ki Suvidha Nahi Hai)

ChangeLens AI sirf ek read-only analysis copilot hai. Main files ko edit karna, git commit karna, GitHub par push karna ya deploy karna jaise actions perform nahi kar sakta.

Yeh changes karne ke liye aap apne code editor mein files edit karein aur terminal mein git commands (jaise \`git commit\`, \`git push\`) ka upyog karein.`;
  }

  return `### 🚫 Unsupported Action

ChangeLens AI is a read-only architectural analysis assistant. I cannot perform write actions such as modifying repository files, creating git commits, pushing to remote repositories, or executing deployments.

To make these changes, please edit the files in your editor and use git commands (e.g. \`git commit\`, \`git push\`) in your terminal.`;
}

function handleInsufficientEvidence({ isHindi }) {
  if (isHindi) {
    return `### ℹ️ Analysis Evidence Uplabdh Nahi Hai

ChangeLens source code ka **static AST analysis** karta hai. Runtime metrics (jaise CI build/test pass status, runtime memory ya live server performance) static graph mein capture nahi hote.

Yeh check karne ke liye kripya apne CI pipeline ke logs dekhein ya local terminal mein \`npm test\` run karein.`;
  }

  return `### ℹ️ Insufficient Analysis Evidence

ChangeLens performs **static AST analysis** on your source code. Runtime metrics (such as CI test run passes/failures, runtime memory consumption, or live server performance) are not captured in static dependency graphs.

To check this, please inspect your CI pipeline logs or run your test suite locally using \`npm test\`.`;
}

function handleAbuseOnly({ isRepeated, isHindi }) {
  if (isRepeated) {
    return isHindi
      ? `Kripya hamari baat-cheet ko codebase aur analysis results tak seemit rakhein. Aap repository ka kaun sa technical hissa inspect karna chahte hain?`
      : `Please keep our discussion focused on the codebase and analysis results. What technical aspect would you like to inspect?`;
  }

  return isHindi
    ? `Main yahan aapke repository ke dependency graph, blast radius aur code changes ko analyze karne mein madad karne ke liye hoon. Main aapki kaise madad kar sakta hoon?`
    : `I am here to help you analyze your repository's dependency graph, blast radius, and code changes. How can I assist with your codebase analysis?`;
}

function handleGeneralReportExplanation(evidence, { isHindi }) {
  const { changes = [], summary = {} } = evidence;
  const rootFiles = changes.map((c) => `\`${c.path}\``).join(", ") || "None";

  if (isHindi) {
    return `### 🔍 ChangeLens Architecture Summary

- **Root Changed Files:** ${rootFiles}
- **Direct Consumers (Level 1):** ${summary.directDependentsCount || 0} files
- **Transitive Impact (Level 2+):** ${summary.transitiveDependentsCount || 0} files
- **Broken Imports:** ${summary.brokenImportsCount || 0}

*Aap mujhse puch sakte hain:*
- 🔀 *"Kon kisko import kar raha hai?"*
- ⚡ *"Direct vs Transitive impact mein kya farak hai?"*
- 🧪 *"Testing ke liye kya karein?"*`;
  }

  return `### 🔍 ChangeLens Architecture Summary

- **Root Changes:** ${rootFiles}
- **Direct Consumers (Lv 1):** ${summary.directDependentsCount || 0} files
- **Transitive Impact (Lv 2+):** ${summary.transitiveDependentsCount || 0} files
- **Broken Imports:** ${summary.brokenImportsCount || 0}

*Tip: You can ask:*
- 🔀 *"Which file imports which?"* or *"Kon kisko import kar raha hai?"*
- ⚡ *"What is the difference between direct and transitive consumers?"*
- 🧪 *"What tests should I run for this PR?"*`;
}

/**
 * Builds a dense architectural context prompt for Gemini.
 * 
 * @param {object} analysisRecord - Stored analysis object
 * @param {string|null} selectedNodeId - Currently highlighted node in the graph (if any)
 * @returns {string} System instruction context
 */
export function buildAnalysisContext(analysisRecord, selectedNodeId = null) {
  if (!analysisRecord || typeof analysisRecord !== "object") {
    return "No active repository analysis available.";
  }

  const { summary = {}, impactAnalysis = {}, changes = [] } = analysisRecord;
  const { blastRadius = [], brokenImports = [], staleRenames = [] } = impactAnalysis;
  const edges = getAnalysisEdges(analysisRecord);

  const lines = [
    "You are ChangeLens AI, an expert software architecture and AST dependency analysis copilot.",
    "Your job is to answer developer questions about code change impact, blast radius, import relationships, and testing strategies.",
    "",
    "=== STRICT PRINCIPLES ===",
    "1. EVIDENCE BEFORE AI: Never invent files, dependencies, broken imports, or test execution results. Only cite real data provided in this context.",
    "2. ANSWER THE USER'S ACTUAL QUESTION FIRST: Do not start with generic summaries if the user asks a specific directional or topical question.",
    "3. MULTILINGUAL SUPPORT: If the user asks in Hindi or Hinglish (e.g. 'kon kisko import kar raha hai', 'kya farak hai'), respond politely in natural Hindi/Hinglish while keeping technical file paths in code spans.",
    "4. DIRECTION CONVENTION: Importer (Consumer) -> Imports -> Imported (Dependency). File A importing File B means File A depends on File B.",
    "5. PROFESSIONAL TONE: If the user is rude or frustrated but asks a technical question, answer the technical question directly, calmly, and professionally.",
    "6. CAPABILITY BOUNDARIES: ChangeLens is a read-only analysis tool. Do not claim to edit files, create commits, or push to Git.",
    "7. ZERO SECRET DISCLOSURE: Never output or guess API keys, database credentials, environment variable values, passwords, or authentication tokens under any circumstances.",
    "",
    "=== REPOSITORY & BLAST RADIUS CONTEXT ===",
    `Target Directory: ${analysisRecord.targetDir || "mern-sample"}`,
    `Root Changed Files (${changes.length}): ${changes.map((c) => `${c.path} [${c.status || "M"}]`).join(", ") || "None"}`,
    `Total Impacted Files: ${summary.impactedFilesCount ?? blastRadius.length}`,
    `Direct Consumers (Depth 1): ${summary.directDependentsCount ?? 0}`,
    `Transitive Consumers (Depth 2+): ${summary.transitiveDependentsCount ?? 0}`,
    `Broken Imports: ${summary.brokenImportsCount ?? (Array.isArray(brokenImports) ? brokenImports.length : 0)}`,
  ];

  if (Array.isArray(brokenImports) && brokenImports.length > 0) {
    lines.push("\n--- CRITICAL BROKEN IMPORTS ---");
    for (const b of brokenImports) {
      lines.push(`• File '${b.affectedFile}' references deleted module '${b.deletedFile || b.specifier}'`);
      if (b.evidence?.rawSource) {
        lines.push(`  Source: ${b.evidence.rawSource}`);
      }
    }
  }

  if (edges.length > 0) {
    lines.push("\n--- EXACT IMPORT & DEPENDENCY RELATIONSHIPS (AST GRAPH EDGES) ---");
    lines.push("Direction Convention: Importer (Consumer) -> Imports -> Imported (Dependency)");
    lines.push("| Importing File (Consumer) | Imported File (Dependency) | Specifier | Relationship |");
    lines.push("| :--- | :--- | :--- | :--- |");
    for (const e of edges) {
      lines.push(`| \`${e.importer}\` | \`${e.imported}\` | \`${e.specifier}\` | ${e.relationshipType} |`);
    }
  }

  if (blastRadius.length > 0) {
    lines.push("\n--- AFFECTED FILES & BLAST RADIUS ROUTES ---");
    for (const item of blastRadius.slice(0, 20)) {
      const fileName = item.affectedFile || item.file;
      const pathRoute = Array.isArray(item.path) ? item.path.join(" ➔ ") : fileName;
      lines.push(`• [Depth ${item.depth}] ${fileName} | Route: ${pathRoute}`);
    }
  }

  if (Array.isArray(staleRenames) && staleRenames.length > 0) {
    lines.push("\n--- STALE RENAMES ---");
    for (const s of staleRenames) {
      lines.push(`• '${s.affectedFile}' still uses old path '${s.oldPath}' instead of '${s.newPath}'`);
    }
  }

  if (selectedNodeId) {
    const selectedItem = blastRadius.find((b) => (b.affectedFile || b.file) === selectedNodeId);
    const incoming = edges.filter((e) => e.imported === selectedNodeId);
    const outgoing = edges.filter((e) => e.importer === selectedNodeId);

    lines.push("\n--- CURRENT USER-SELECTED GRAPH NODE ---");
    lines.push(`Selected File: ${selectedNodeId}`);
    if (selectedItem) {
      lines.push(`Blast Radius Depth: ${selectedItem.depth}`);
      lines.push(`Impact Route: ${Array.isArray(selectedItem.path) ? selectedItem.path.join(" ➔ ") : selectedNodeId}`);
    } else {
      lines.push(`Status: Root changed file or clean dependency.`);
    }
    lines.push(`Imported By (${incoming.length} consumers): ${incoming.map((e) => e.importer).join(", ") || "None"}`);
    lines.push(`Imports (${outgoing.length} dependencies): ${outgoing.map((e) => e.imported).join(", ") || "None"}`);
  }

  return lines.join("\n");
}

/**
 * Generates an intelligent, deterministic response using exact analysis evidence.
 * 
 * @param {object} params
 * @param {string} params.userMessage
 * @param {object} params.analysisRecord
 * @param {string|null} [params.selectedNodeId=null]
 * @param {Array<object>} [params.history=[]]
 * @returns {string}
 */
export function generateDeterministicChatFallback({
  userMessage,
  analysisRecord,
  selectedNodeId = null,
  history = [],
}) {
  if (!analysisRecord || typeof analysisRecord !== "object" || Object.keys(analysisRecord).length === 0) {
    return "### ℹ️ Incomplete Analysis Record\n\nNo active repository analysis record was found. Please initiate a repository analysis first to inspect dependencies and code change impact.";
  }

  const classification = classifyQuestionIntent(userMessage, {
    analysisRecord,
    selectedNodeId,
    history,
  });

  const evidence = retrieveScopedEvidence(classification, analysisRecord, selectedNodeId);
  const { intent, isHindi, isRepeatedAbuse } = classification;

  switch (intent) {
    case INTENTS.SECRET_DISCLOSURE_REQUEST:
      return handleSecretDisclosureRequest(evidence, classification);

    case INTENTS.ALL_IMPORT_RELATIONSHIPS:
      return handleAllImportRelationships(evidence, { isHindi });

    case INTENTS.DIRECT_CONSUMERS_OF_FILE:
      return handleDirectConsumersOfFile(evidence, { isHindi });

    case INTENTS.IMPORTS_OF_FILE:
      return handleImportsOfFile(evidence, { isHindi });

    case INTENTS.TRANSITIVE_DEPENDENCIES:
      return handleTransitiveDependencies(evidence, { isHindi });

    case INTENTS.BROKEN_IMPORTS:
      return handleBrokenImports(evidence, { isHindi });

    case INTENTS.BLAST_RADIUS_EXPLANATION:
      return handleBlastRadiusExplanation(evidence, { isHindi });

    case INTENTS.POTENTIAL_REGRESSION_RISKS:
      return handlePotentialRegressionRisks(evidence, { isHindi });

    case INTENTS.TEST_RECOMMENDATIONS:
      return handleTestRecommendations(evidence, { isHindi });

    case INTENTS.FILE_OR_SYMBOL_LOOKUP:
      return handleFileOrSymbolLookup(evidence, { isHindi });

    case INTENTS.UNKNOWN_FILE:
      return handleUnknownFile(evidence, { isHindi });

    case INTENTS.CLARIFICATION_REQUIRED:
      return handleClarificationRequired({ isHindi });

    case INTENTS.OUT_OF_SCOPE:
      return handleOutOfScope({ isHindi });

    case INTENTS.UNSUPPORTED_ACTION:
      return handleUnsupportedAction({ isHindi });

    case INTENTS.INSUFFICIENT_ANALYSIS_EVIDENCE:
      return handleInsufficientEvidence({ isHindi });

    case INTENTS.ABUSE_ONLY:
      return handleAbuseOnly({ isRepeated: isRepeatedAbuse, isHindi });

    case INTENTS.ANALYSIS_SUMMARY:
    case INTENTS.GENERAL_REPORT_EXPLANATION:
      return handleGeneralReportExplanation(evidence, { isHindi });

    case INTENTS.WHAT_IF_SIMULATION:
      return handleWhatIfSimulation(evidence, { isHindi });

    case INTENTS.UNRECOGNIZED_QUERY:
    default:
      return handleUnrecognizedQuery({ isHindi });
  }
}

/**
 * Main entry point: Generates context-aware chat response for an analysis.
 * Intercepts secret disclosure requests deterministically before sending queries to LLMs.
 * 
 * @param {object} params
 * @param {object} params.analysisRecord - Full analysis record from store
 * @param {string} params.userMessage - User prompt
 * @param {Array<object>} [params.history=[]] - Conversation history [{ role: 'user' | 'assistant', content: string }]
 * @param {string|null} [params.selectedNodeId=null] - Currently selected file node
 * @returns {Promise<{ message: string, provider: "gemini" | "deterministic" }>}
 */
export async function generateAnalysisChatResponse({
  analysisRecord,
  userMessage,
  history = [],
  selectedNodeId = null,
}) {
  if (!userMessage || typeof userMessage !== "string") {
    throw new TypeError("userMessage must be a non-empty string.");
  }

  // 1. Critical Security Pre-screen: intercept SECRET_DISCLOSURE_REQUEST
  // Never reveal, serialize, or send secret requests or process.env to external LLMs.
  const classification = classifyQuestionIntent(userMessage, {
    analysisRecord,
    selectedNodeId,
    history,
  });

  if (classification.intent === INTENTS.SECRET_DISCLOSURE_REQUEST) {
    const evidence = retrieveScopedEvidence(classification, analysisRecord, selectedNodeId);
    const message = handleSecretDisclosureRequest(evidence, classification);
    return {
      message,
      provider: "deterministic",
    };
  }

  // 2. If Gemini API is configured on the backend, try live LLM
  if (isGeminiAvailable()) {
    try {
      const systemInstruction = buildAnalysisContext(analysisRecord, selectedNodeId);
      const contents = [];

      // Append up to last 6 history turns for conversational context
      if (Array.isArray(history)) {
        for (const msg of history.slice(-6)) {
          if (msg?.role && msg?.content) {
            contents.push({
              role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
              parts: [{ text: String(msg.content) }],
            });
          }
        }
      }

      // Append current user message
      contents.push({
        role: "user",
        parts: [{ text: userMessage.trim() }],
      });

      const aiResponse = await callGeminiAPI({
        contents,
        systemInstruction,
        temperature: 0.2,
        maxOutputTokens: 1024,
      });

      return {
        message: aiResponse,
        provider: "gemini",
      };
    } catch (err) {
      console.warn("[ChangeLens Chat] Gemini call failed, falling back to deterministic response:", err?.message || err);
    }
  }

  // 3. Fallback to deterministic static analysis response
  const fallbackResponse = generateDeterministicChatFallback({
    userMessage,
    analysisRecord,
    selectedNodeId,
    history,
  });

  return {
    message: fallbackResponse,
    provider: "deterministic",
  };
}
