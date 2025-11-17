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

// src/modules/sync/sync.controllers.ts
import path from "path";
import fs2 from "fs-extra";
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
  await fs2.ensureDir(outputPath);
  await fs2.writeFile(fullPath, content, "utf-8");
  console.log(`\u{1F517} Fetched and saved contract: ${contract.name} as ${fileName} from ${source}`);
}
async function fetchExternalConfig(source) {
  const response = await fetch(`${source}/contract/config`);
  if (!response.ok) {
    throw new Error(`Failed to fetch external config from ${source}: ${response.status}`);
  }
  return await response.json();
}

// src/modules/sync/index.ts
async function synchronizeExternalContracts(externalSources) {
  await Promise.all(
    externalSources.map(async (source) => {
      console.log(`\u{1F517} Synchronizing external contracts from: ${source}`);
      const externalConfig = await fetchExternalConfig(source);
      for (const contract of externalConfig.contracts) {
        fetchAndSaveExternalContract(contract, source);
      }
    })
  ).then(() => {
    console.log("\u2705 All external contracts synchronized successfully.");
  });
}
async function runCommand() {
  const config = await readConfigFile();
  await synchronizeExternalContracts(config.externalSources);
}
export {
  runCommand
};
//# sourceMappingURL=index.js.map