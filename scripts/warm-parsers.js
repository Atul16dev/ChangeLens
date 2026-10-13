import { ParserManager } from "../analyzer/parser-manager.js";

const parserManager = new ParserManager();
parserManager.warm();
console.log(
  `Loaded ${parserManager.supportedLanguages.length} bundled language names.`,
);
