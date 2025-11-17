// src/modules/sync/sync.controllers.ts
import path from "path";
import fs from "fs-extra";
var CONTRACT_DIR = path.join(process.cwd(), "contract");
async function fetchAndSaveExternalContract(contract, source) {
  const response = await fetch(`${source}/contract?name=${contract.name}&emit=${contract.emit ?? false}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch contract ${contract.name} from ${source}: ${response.status}`);
  }
  const content = await response.text();
  const disposition = response.headers.get("Content-Disposition");
  const fileName = disposition?.match(/filename="(.+?)"/)?.[1];
  if (!fileName) {
    throw new Error(`Filename not found in Content-Disposition header from ${source}`);
  }
  const outputPath = path.join(CONTRACT_DIR, "synced");
  const fullPath = path.join(outputPath, fileName);
  await fs.ensureDir(outputPath);
  await fs.writeFile(fullPath, content, "utf-8");
  console.log(`\u{1F517} Fetched and saved contract: ${contract.name} as ${fileName} from ${source}`);
}
async function fetchExternalConfig(source) {
  const response = await fetch(`${source}/contract/config`);
  if (!response.ok) {
    throw new Error(`Failed to fetch external config from ${source}: ${response.status}`);
  }
  return await response.json();
}
export {
  fetchAndSaveExternalContract,
  fetchExternalConfig
};
//# sourceMappingURL=sync.controllers.js.map