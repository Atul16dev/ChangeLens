import { detectLanguage } from "./language-detector.js";
import { extractCode } from "./code-extractor.js";
import { ParserManager } from "./parser-manager.js";

const defaultParserManager = new ParserManager();

export function analyzeSourceFile(
  filePath,
  source,
  parserManager = defaultParserManager,
) {
  const detection = detectLanguage(filePath);

  if (!detection.supported) {
    return {
      path: filePath,
      language: detection.language,
      status: "unsupported",
      reason: detection.reason,
    };
  }

  try {
    const result = parserManager.parse(source, detection.language);
    return extractCode(filePath, detection.language, result);
  } catch (error) {
    return {
      path: filePath,
      language: detection.language,
      status: "failed",
      error: {
        code: "PARSER_ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
