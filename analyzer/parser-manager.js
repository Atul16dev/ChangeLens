import * as treeSitterPack from "@xberg-io/tree-sitter-language-pack-wasm";

const { WasmProcessConfig, availableLanguages, hasLanguage, prefetch } =
  treeSitterPack;

const DEFAULT_MAX_SOURCE_BYTES = 1_000_000;

export class ParserManager {
  #supportedLanguages;
  #warmedLanguages = new Set();

  constructor({ maxSourceBytes = DEFAULT_MAX_SOURCE_BYTES } = {}) {
    if (!Number.isSafeInteger(maxSourceBytes) || maxSourceBytes <= 0) {
      throw new RangeError("maxSourceBytes must be a positive safe integer.");
    }

    this.maxSourceBytes = maxSourceBytes;
    this.#supportedLanguages = new Set(availableLanguages());
  }

  get supportedLanguages() {
    return [...this.#supportedLanguages].sort();
  }

  warm(languages = this.supportedLanguages) {
    const unknownLanguages = languages.filter(
      (language) => !this.#supportedLanguages.has(language),
    );

    if (unknownLanguages.length > 0) {
      throw new RangeError(
        `Languages are not included in the WASM bundle: ${unknownLanguages.join(", ")}`,
      );
    }

    const languagesToWarm = [...new Set(languages)].filter(
      (language) => !this.#warmedLanguages.has(language),
    );

    if (languagesToWarm.length === 0) {
      return;
    }

    prefetch(languagesToWarm);
    for (const language of languagesToWarm) {
      this.#warmedLanguages.add(language);
    }
  }

  parse(source, language) {
    if (typeof source !== "string") {
      throw new TypeError("Source content must be a string.");
    }

    if (!hasLanguage(language)) {
      throw new RangeError(`No parser is bundled for language "${language}".`);
    }

    const config = WasmProcessConfig.default();
    config.language = language;
    config.structure = true;
    config.imports = true;
    config.exports = true;
    config.symbols = true;
    config.diagnostics = true;
    config.maxSourceBytes = this.maxSourceBytes;

    // process() consumes the WASM config handle.
    return treeSitterPack.process(source, config);
  }
}
