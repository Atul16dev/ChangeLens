function normalizeKind(kind) {
  if (typeof kind === "string") {
    return kind;
  }

  if (kind && typeof kind.type === "string") {
    return kind.type;
  }

  if (kind && typeof kind === "object") {
    return Object.keys(kind)[0] ?? "Unknown";
  }

  return "Unknown";
}

function normalizeSpan(span) {
  if (!span) {
    return null;
  }

  try {
    return {
      startLine: span.startLine + 1,
      startColumn: span.startColumn + 1,
      endLine: span.endLine + 1,
      endColumn: span.endColumn + 1,
    };
  } finally {
    span.free();
  }
}

function mapAndFree(items, mapItem) {
  try {
    return items.map(mapItem);
  } finally {
    for (const item of items) {
      item.free();
    }
  }
}

function extractModuleSpecifier(source, language) {
  if (!source || typeof source !== "string") {
    return null;
  }

  // 1. JavaScript / TypeScript / TSX
  if (["javascript", "typescript", "tsx"].includes(language)) {
    const fromClause = source.match(/\bfrom\s*(['"])([^\\'"\r\n]+)\1/);
    if (fromClause) {
      return fromClause[2];
    }

    const sideEffectImport = source.match(
      /^\s*import\s*(['"])([^\\'"\r\n]+)\1/,
    );
    return sideEffectImport?.[2] ?? null;
  }

  // 2. Python
  if (language === "python") {
    const fromMatch = source.match(/^\s*from\s+([.\w]+)\s+import/);
    if (fromMatch) {
      return fromMatch[1];
    }
    const importMatch = source.match(/^\s*import\s+([.\w]+)/);
    if (importMatch) {
      return importMatch[1];
    }
    return null;
  }

  // 3. Go
  if (language === "go") {
    const quoteMatch = source.match(/["']([^"']+)["']/);
    if (quoteMatch) {
      return quoteMatch[1];
    }
    const trimmed = source.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.slice(1, -1);
    }
    return null;
  }

  return null;
}

function normalizeImport(item, language) {
  return {
    source: item.source,
    moduleSpecifier: extractModuleSpecifier(item.source, language),
    importedNames: [...item.items],
    alias: item.alias ?? null,
    isWildcard: item.isWildcard,
    location: normalizeSpan(item.span),
  };
}

function normalizeExport(item) {
  return {
    name: item.name,
    kind: item.kind,
    location: normalizeSpan(item.span),
  };
}

function normalizeStructure(item) {
  const children = mapAndFree(item.children, normalizeStructure);

  return {
    name: item.name ?? null,
    kind: normalizeKind(item.kind),
    visibility: item.visibility ?? null,
    signature: item.signature ?? null,
    location: normalizeSpan(item.span),
    children,
  };
}

function normalizeSymbol(item) {
  return {
    name: item.name,
    kind: normalizeKind(item.kind),
    typeAnnotation: item.typeAnnotation ?? null,
    location: normalizeSpan(item.span),
  };
}

function normalizeDiagnostic(item) {
  return {
    message: item.message,
    severity: item.severity,
    location: normalizeSpan(item.span),
  };
}

function normalizeMetrics(metrics) {
  if (!metrics) {
    return null;
  }

  try {
    return {
      totalLines: metrics.totalLines,
      codeLines: metrics.codeLines,
      commentLines: metrics.commentLines,
      blankLines: metrics.blankLines,
      totalBytes: metrics.totalBytes,
      nodeCount: metrics.nodeCount,
      errorCount: metrics.errorCount,
      maxDepth: metrics.maxDepth,
    };
  } finally {
    metrics.free();
  }
}

export function extractCode(filePath, language, result) {
  try {
    const imports = mapAndFree(result.imports, (item) =>
      normalizeImport(item, language),
    );
    const exports = mapAndFree(result.exports, normalizeExport);
    const declarations = mapAndFree(result.structure, normalizeStructure);
    const symbols = mapAndFree(result.symbols, normalizeSymbol);
    const diagnostics = mapAndFree(result.diagnostics, normalizeDiagnostic);
    const metrics = normalizeMetrics(result.metrics);
    const hasErrors =
      (metrics?.errorCount ?? 0) > 0 ||
      diagnostics.some((diagnostic) => diagnostic.severity === "Error");

    return {
      path: filePath,
      language: result.language ?? language,
      status: hasErrors ? "parsed_with_errors" : "parsed",
      metrics,
      imports,
      exports,
      declarations,
      symbols,
      diagnostics,
    };
  } finally {
    result.free();
  }
}
