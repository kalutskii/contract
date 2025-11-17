// src/config/config.controllers.ts
import fs from "fs-extra";
import prompts from "prompts";

// src/config/config.defaults.ts
var defaultConfig = {
  $schema: "https://raw.githubusercontent.com/kaluckii/contract/refs/heads/main/static/contract.schema.json",
  appName: "your-app",
  externalSources: [],
  contracts: []
};

// src/config/config.schemas.ts
import z from "zod";
var ContractSchema = z.object({
  name: z.string(),
  emit: z.boolean().optional()
});
var ConfigSchema = z.object({
  $schema: z.url(),
  appName: z.string(),
  externalSources: z.array(z.string()),
  contracts: z.array(ContractSchema)
});

// src/config/config.controllers.ts
var CONFIG_FILE = "contract.config.json";
var writeDefaultConfig = async () => fs.writeJson(CONFIG_FILE, defaultConfig, { spaces: 2 });
async function askForConfigRewrite() {
  const response = await prompts({
    type: "confirm",
    name: "rewrite",
    message: "The config file is invalid, do you want to rewrite it with default values?",
    initial: true
  });
  return response.rewrite;
}
async function readConfigFile() {
  if (!await fs.pathExists(CONFIG_FILE)) {
    await writeDefaultConfig();
  }
  const rawContent = await fs.readFile(CONFIG_FILE, "utf8");
  const parsedContent = ConfigSchema.safeParse(JSON.parse(rawContent));
  if (!parsedContent.success) {
    if (await askForConfigRewrite()) {
      await writeDefaultConfig();
      return defaultConfig;
    } else throw new Error(`Invalid config file: ${parsedContent.error.message}`);
  }
  return parsedContent.data;
}

// src/modules/init/init.controllers.ts
import path from "path";
import fs2 from "fs-extra";
import prompts2 from "prompts";
var CONTRACT_DIR = path.join(process.cwd(), "contract");
async function ensureMissingSourceFiles(contracts) {
  await Promise.all(
    contracts.map(async (contract) => {
      const filename = `contract.${contract.name}.source.ts`;
      const destination = path.join(CONTRACT_DIR, "source", filename);
      const comment = `// This file is pre-generated for contract: ${contract.name}
` + (contract.emit ? "// !! Never re-export from index.ts \u2014 use direct file exports.\n" : "");
      if (!await fs2.pathExists(destination)) {
        await fs2.writeFile(destination, comment);
        console.log(`\u2705 Created source file: ${filename}`);
      }
    })
  );
}
async function askForRewriteDirectory() {
  const response = await prompts2({
    type: "confirm",
    name: "rewrite",
    message: "The contract directory already exists. Do you want to rewrite it?",
    initial: true
  });
  return response.rewrite;
}
async function ensureContractDirectory() {
  if (await fs2.pathExists(CONTRACT_DIR)) {
    if (await askForRewriteDirectory()) {
      await fs2.remove(CONTRACT_DIR);
      await fs2.ensureDir(CONTRACT_DIR);
    } else return console.log("\u274C Contract directory already exists, aborting initialization.");
  }
  await fs2.ensureDir(CONTRACT_DIR);
  console.log("\u{1F4C2} Contract directory ensured.");
}
async function createContractFolders() {
  await fs2.ensureDir(path.join(CONTRACT_DIR, "source"));
  await fs2.ensureDir(path.join(CONTRACT_DIR, "export"));
  await fs2.ensureDir(path.join(CONTRACT_DIR, "synced"));
  console.log("\u{1F4C2} Contract folders created.");
}

// src/modules/init/index.ts
async function initContractStructure({ contracts }) {
  await ensureContractDirectory();
  await createContractFolders();
  await ensureMissingSourceFiles(contracts);
  console.log("\u2705 Contract structure initialized.");
}
async function runCommand({ ensureSources = false } = {}) {
  const config = await readConfigFile();
  if (ensureSources) {
    return await ensureMissingSourceFiles(config.contracts);
  }
  await initContractStructure({ contracts: config.contracts });
}
export {
  runCommand
};
//# sourceMappingURL=index.js.map