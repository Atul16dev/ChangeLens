import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanRepository } from "../analyzer/repository-scanner.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const samplePath = path.resolve(
  scriptDirectory,
  "../tests/fixtures/mern-sample",
);

const report = await scanRepository(samplePath);
console.log(JSON.stringify(report, null, 2));
