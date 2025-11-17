// src/config/config.controllers.ts
import fs from "fs-extra";
import prompts from "prompts";

// src/config/config.defaults.ts
var defaultConfig = {
  $schema: "https://raw.githubusercontent.com/kalutskii/contract/refs/heads/main/static/contract.schema.json",
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

// src/modules/build/build.controllers.ts
import path from "path";
import { build } from "esbuild";
import fs2 from "fs-extra";

// src/modules/build/build.utilities.ts
import { execa } from "execa";
async function executeCommand(command, args) {
  let stderr = "";
  const subprocess = execa(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true
  });
  subprocess.stderr?.on("data", (data) => stderr += data.toString());
  const { exitCode } = await subprocess;
  if (exitCode !== 0) {
    throw new Error(`\u274C Command ${command} ${args.join(" ")} failed:
${stderr}`);
  }
}

// src/modules/build/build.controllers.ts
var CONTRACT_DIR = path.join(process.cwd(), "contract");
async function bundleRuntimeContract(config, contract) {
  const input = path.join(CONTRACT_DIR, "source", `contract.${contract.name}.source.ts`);
  const output = path.join(CONTRACT_DIR, "export", `${config.appName}.contract.${contract.name}.ts`);
  const result = await build({
    entryPoints: [input],
    bundle: true,
    format: "esm",
    write: false,
    treeShaking: true,
    minifySyntax: true,
    platform: "node",
    target: "es2022"
  });
  const content = result.outputFiles[0].text;
  await fs2.writeFile(output, content);
  console.log(`\u2705 Runtime contract bundled to ${output}`);
}
async function bundleDeclarationContract(config, contract) {
  const input = path.join(CONTRACT_DIR, "source", `contract.${contract.name}.source.ts`);
  const output = path.join(CONTRACT_DIR, "export", `${config.appName}.contract.${contract.name}.d.ts`);
  await executeCommand("npx", ["dts-bundle-generator", "-o", output, input, "--no-check"]);
}

// src/modules/build/index.ts
async function buildContract(config, contract) {
  console.log("\u{1F517} Building contract:", contract.name);
  if (contract.emit) {
    await bundleRuntimeContract(config, contract);
  } else await bundleDeclarationContract(config, contract);
}
async function runCommand() {
  const config = await readConfigFile();
  await Promise.all(
    config.contracts.map(async (contract) => {
      await buildContract(config, contract);
    })
  );
}
export {
  runCommand
};
//# sourceMappingURL=index.js.map