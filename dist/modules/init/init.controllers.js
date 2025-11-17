// src/modules/init/init.controllers.ts
import path from "path";
import fs from "fs-extra";
import prompts from "prompts";
var CONTRACT_DIR = path.join(process.cwd(), "contract");
async function ensureMissingSourceFiles(contracts) {
  await Promise.all(
    contracts.map(async (contract) => {
      const filename = `contract.${contract.name}.source.ts`;
      const destination = path.join(CONTRACT_DIR, "source", filename);
      const comment = `// This file is pre-generated for contract: ${contract.name}
` + (contract.emit ? "// !! Never re-export from index.ts \u2014 use direct file exports.\n" : "");
      if (!await fs.pathExists(destination)) {
        await fs.writeFile(destination, comment);
        console.log(`\u2705 Created source file: ${filename}`);
      }
    })
  );
}
async function askForRewriteDirectory() {
  const response = await prompts({
    type: "confirm",
    name: "rewrite",
    message: "The contract directory already exists. Do you want to rewrite it?",
    initial: true
  });
  return response.rewrite;
}
async function ensureContractDirectory() {
  if (await fs.pathExists(CONTRACT_DIR)) {
    if (await askForRewriteDirectory()) {
      await fs.remove(CONTRACT_DIR);
      await fs.ensureDir(CONTRACT_DIR);
    } else return console.log("\u274C Contract directory already exists, aborting initialization.");
  }
  await fs.ensureDir(CONTRACT_DIR);
  console.log("\u{1F4C2} Contract directory ensured.");
}
async function createContractFolders() {
  await fs.ensureDir(path.join(CONTRACT_DIR, "source"));
  await fs.ensureDir(path.join(CONTRACT_DIR, "export"));
  await fs.ensureDir(path.join(CONTRACT_DIR, "synced"));
  console.log("\u{1F4C2} Contract folders created.");
}
export {
  createContractFolders,
  ensureContractDirectory,
  ensureMissingSourceFiles
};
//# sourceMappingURL=init.controllers.js.map