import * as treeSitterPack from "@xberg-io/tree-sitter-language-pack-wasm";

const { detectLanguageFromPath, hasLanguage } = treeSitterPack;

const SUPPORTED_EXTENSION_ALIASES = new Map([[".hh", "cpp"]]);

export function detectLanguage(filePath) {
  const baseName = filePath.split(/[\\/]/).at(-1).toLowerCase();
  const extension = filePath.match(/\.[^.\\/]+$/)?.[0].toLowerCase();
  const language =
    baseName === "dockerfile" || baseName.startsWith("dockerfile.")
      ? "dockerfile"
      : detectLanguageFromPath(filePath) ??
        SUPPORTED_EXTENSION_ALIASES.get(extension);

  if (!language) {
    return {
      language: null,
      supported: false,
      reason: "unrecognized-file-type",
    };
  }

  if (!hasLanguage(language)) {
    return {
      language,
      supported: false,
      reason: "grammar-not-in-bundle",
    };
  }

  return { language, supported: true, reason: null };
}

export function getSupportedLanguages() {
  return [...treeSitterPack.availableLanguages()].sort();
}
