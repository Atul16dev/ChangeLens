/**
 * AI Impact Explainer & PR Comment Generator for ChangeLens
 * 
 * Takes deterministic static analysis findings (broken imports, depth paths, line evidence)
 * and generates developer-friendly explanations, risk scoring, and GitHub PR comments.
 * 
 * Features:
 * - Deterministic Rule/Template Generator (works offline with zero API keys)
 * - LLM Integration (Google Gemini / OpenAI compatible via native fetch)
 * - GitHub PR Markdown formatting with alert callouts and collapsible details
 */

/**
 * Assesses overall risk tier based on deterministic findings.
 * @param {object} summary 
 * @returns {"CRITICAL" | "HIGH" | "MEDIUM" | "LOW"}
 */
export function calculateRiskLevel(summary = {}) {
  const { brokenImportsCount = 0, directDependentsCount = 0, transitiveDependentsCount = 0 } = summary;

  if (brokenImportsCount > 0) return "CRITICAL";
  if (directDependentsCount > 0) return "HIGH";
  if (transitiveDependentsCount > 0) return "MEDIUM";
  return "LOW";
}

/**
 * Builds a deterministic, structured markdown PR review comment.
 * 
 * @param {object} params
 * @param {object} params.impactAnalysis - Output from classifyImpactPolicies
 * @param {Array<object>} [params.changes=[]] - Parsed git changes
 * @param {string} [params.riskLevel] - Calculated risk level
 * @returns {string} GitHub-flavored markdown comment
 */
export function formatPRMarkdownComment({ impactAnalysis, changes = [], riskLevel }) {
  const summary = impactAnalysis?.summary || {};
  const brokenImports = impactAnalysis?.brokenImports || [];
  const staleRenames = impactAnalysis?.staleRenames || [];
  const blastRadius = impactAnalysis?.blastRadius || [];
  const allFindings = impactAnalysis?.allFindings || [];

  const riskBadge = {
    CRITICAL: "🚨 **CRITICAL RISK** — Broken Imports Detected",
    HIGH: "⚠️ **HIGH RISK** — Direct Downstream Dependents Impacted",
    MEDIUM: "🔶 **MEDIUM RISK** — Transitive Downstream Impact",
    LOW: "✅ **LOW RISK** — Isolated Changes with Minimal Blast Radius",
  }[riskLevel] || "ℹ️ **UNKNOWN RISK**";

  const lines = [];

  // Header & Risk Banner
  lines.push(`## 🔍 ChangeLens Impact Analysis Report`);
  lines.push(`> ${riskBadge}`);
  lines.push("");

  // Executive Overview Table
  lines.push(`### 📊 Blast Radius Overview`);
  lines.push(`| Metric | Count | Status |`);
  lines.push(`| :--- | :---: | :--- |`);
  lines.push(`| **Root Changed Files** | \`${changes.length || summary.totalChangedFiles || 0}\` | ${changes.length > 0 ? "Changes Inspected" : "Baseline"} |`);
  lines.push(`| **Broken Imports** | \`${summary.brokenImportsCount || brokenImports.length}\` | ${brokenImports.length > 0 ? "🚨 Immediate Fix Required" : "✅ Clean"} |`);
  lines.push(`| **Direct Dependents (Depth 1)** | \`${summary.directDependentsCount || 0}\` | ${summary.directDependentsCount > 0 ? "⚠️ Needs Testing" : "✅ None"} |`);
  lines.push(`| **Transitive Dependents (Depth 2+)** | \`${summary.transitiveDependentsCount || 0}\` | ${summary.transitiveDependentsCount > 0 ? "🔶 Downstream Flow" : "✅ None"} |`);
  lines.push(`| **Total Blast Radius** | \`${summary.impactedFilesCount || 0}\` | Total impacted files |`);
  lines.push("");

  // Critical Alerts (if any)
  if (brokenImports.length > 0) {
    lines.push(`> [!CAUTION]`);
    lines.push(`> **CRITICAL BROKEN IMPORTS DETECTED (${brokenImports.length})**`);
    lines.push(`> The following files import files that were deleted in this branch. Merging will cause compile failures or runtime crashes:`);
    for (const b of brokenImports) {
      lines.push(`> - In \`${b.affectedFile}\`: imports deleted \`${b.deletedFile}\` at line ${b.evidence?.location?.startLine || 1}`);
      if (b.evidence?.rawSource) {
        lines.push(`>   \`\`\`javascript\n>   ${b.evidence.rawSource}\n>   \`\`\``);
      }
    }
    lines.push("");
  }

  // Stale Renames (if any)
  if (staleRenames.length > 0) {
    lines.push(`> [!WARNING]`);
    lines.push(`> **STALE IMPORT PATHS DETECTED (${staleRenames.length})**`);
    for (const s of staleRenames) {
      lines.push(`> - \`${s.affectedFile}\` still references old path \`${s.oldPath}\` (new path: \`${s.newPath}\`)`);
    }
    lines.push("");
  }

  // Blast Radius Details (Collapsible)
  if (blastRadius.length > 0) {
    lines.push(`<details>`);
    lines.push(`<summary><strong>🔎 Detailed Dependency Blast Radius (${blastRadius.length} files)</strong></summary>`);
    lines.push("");
    lines.push(`| Impacted File | Depth | Path Route |`);
    lines.push(`| :--- | :---: | :--- |`);

    for (const entry of blastRadius) {
      const depthBadge = entry.depth === 1 ? "**Depth 1 (Direct)**" : `Depth ${entry.depth} (Transitive)`;
      const routeStr = entry.path ? entry.path.map((p) => `\`${p.split("/").pop()}\``).join(" ➔ ") : "-";
      lines.push(`| \`${entry.file}\` | ${depthBadge} | ${routeStr} |`);
    }

    lines.push("");
    lines.push(`</details>`);
    lines.push("");
  }

  // Actionable Mitigation Checklist
  lines.push(`### 📋 Reviewer & Author Checklist`);
  if (brokenImports.length > 0) {
    lines.push(`- [ ] 🚨 **Fix broken imports** in consumers referencing deleted modules before merging.`);
  }
  if (summary.directDependentsCount > 0) {
    lines.push(`- [ ] ⚠️ **Run integration tests** for all ${summary.directDependentsCount} direct consumer(s).`);
    lines.push(`- [ ] ⚠️ **Verify function signature/export changes** to ensure backward compatibility.`);
  }
  if (summary.transitiveDependentsCount > 0) {
    lines.push(`- [ ] 🔶 **Smoke test downstream features** to prevent silent regression bugs.`);
  }
  if (brokenImports.length === 0 && summary.impactedFilesCount === 0) {
    lines.push(`- [ ] ✅ No downstream dependents found. Safe to merge from a dependency blast-radius perspective.`);
  }
  lines.push("");
  lines.push(`---`);
  lines.push(`*Generated deterministically by [ChangeLens AST Engine](https://github.com).*`);

  return lines.join("\n");
}

/**
 * Builds the natural language summary and bulleted narrative.
 */
export function buildDeterministicNarrative({ impactAnalysis, changes = [], riskLevel }) {
  const summary = impactAnalysis?.summary || {};
  const brokenImports = impactAnalysis?.brokenImports || [];
  const blastRadius = impactAnalysis?.blastRadius || [];

  let executiveSummary = "";
  if (brokenImports.length > 0) {
    executiveSummary = `This change introduces ${brokenImports.length} broken import(s). It poses a CRITICAL risk of runtime failures and broken builds.`;
  } else if (summary.directDependentsCount > 0) {
    executiveSummary = `Modifications in ${changes.length || 1} file(s) propagate to ${summary.impactedFilesCount} downstream files (${summary.directDependentsCount} direct, ${summary.transitiveDependentsCount} transitive). HIGH impact requires targeted test verification.`;
  } else {
    executiveSummary = `Changes are well-isolated. No downstream dependents were impacted across the repository.`;
  }

  const actionItems = [];
  if (brokenImports.length > 0) {
    actionItems.push(`Immediately update or delete dangling import references in ${brokenImports.map(b => b.affectedFile).join(", ")}.`);
  }
  if (summary.directDependentsCount > 0) {
    const directFiles = blastRadius.filter(b => b.depth === 1).map(b => b.file);
    actionItems.push(`Verify public API contracts for direct dependents: ${directFiles.slice(0, 3).join(", ")}${directFiles.length > 3 ? "..." : ""}.`);
  }
  if (summary.transitiveDependentsCount > 0) {
    actionItems.push(`Run regression tests across downstream route handlers and entry points.`);
  }
  if (actionItems.length === 0) {
    actionItems.push(`Verify standalone unit tests for modified file.`);
  }

  return {
    executiveSummary,
    actionItems,
  };
}

/**
 * Calls Google Gemini REST API to enrich the technical explanation using an LLM.
 * 
 * @param {object} params
 * @param {string} params.apiKey - Google Gemini API Key
 * @param {string} params.prompt - Structured prompt
 * @param {string} [params.model="gemini-1.5-flash"] - Model name
 * @returns {Promise<string>} LLM text output
 */
export async function callGeminiAPI({ apiKey, prompt, model = "gemini-1.5-flash" }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error [${response.status}]: ${errText}`);
  }

  const data = await response.json();
  const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error("No response text returned from Gemini API.");
  }

  return textOutput;
}

/**
 * Main entry point: Generates a complete impact explanation and PR comment.
 * 
 * @param {object} params
 * @param {object} params.impactAnalysis - Output from classifyImpactPolicies
 * @param {Array<object>} [params.changes=[]] - Parsed git changes
 * @param {object} [params.options={}] - Options (apiKey, provider, model)
 * @returns {Promise<object>} Complete explanation result
 */
export async function generateImpactExplanation({ impactAnalysis, changes = [], options = {} }) {
  if (!impactAnalysis || !impactAnalysis.summary) {
    throw new TypeError("Valid impactAnalysis object is required.");
  }

  const riskLevel = calculateRiskLevel(impactAnalysis.summary);
  const prCommentMarkdown = formatPRMarkdownComment({ impactAnalysis, changes, riskLevel });
  const deterministicNarrative = buildDeterministicNarrative({ impactAnalysis, changes, riskLevel });

  let aiEnhanced = false;
  let aiNarrative = null;

  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;

  // If an API key is available and provider is not forced to 'mock', call LLM
  if (apiKey && options.provider !== "mock") {
    try {
      const prompt = `You are a Senior Software Architect reviewing a Pull Request.
You are given the deterministic blast radius data computed by the ChangeLens AST analyzer:

Risk Level: ${riskLevel}
Summary: ${JSON.stringify(impactAnalysis.summary)}
Broken Imports: ${JSON.stringify(impactAnalysis.brokenImports)}
Blast Radius Files: ${JSON.stringify(impactAnalysis.blastRadius)}

In 2 short paragraphs:
1. Explain the technical root cause of this risk to the PR reviewer.
2. Outline the exact testing strategy and potential regression bugs downstream.
Keep your response concise, professional, and code-centric.`;

      aiNarrative = await callGeminiAPI({
        apiKey,
        prompt,
        model: options.model || "gemini-1.5-flash",
      });
      aiEnhanced = true;
    } catch (err) {
      console.warn("[ChangeLens AI Explainer] Gemini API call skipped or failed, using deterministic narrative:", err.message);
    }
  }

  return {
    riskLevel,
    executiveSummary: deterministicNarrative.executiveSummary,
    aiNarrative: aiNarrative || deterministicNarrative.executiveSummary,
    aiEnhanced,
    actionItems: deterministicNarrative.actionItems,
    prCommentMarkdown,
    metrics: impactAnalysis.summary,
  };
}
