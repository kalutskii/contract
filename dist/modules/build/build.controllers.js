// src/modules/build/build.controllers.ts
import path from "path";
import { build } from "esbuild";
import fs from "fs-extra";

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
  await fs.writeFile(output, content);
  console.log(`\u2705 Runtime contract bundled to ${output}`);
}
async function bundleDeclarationContract(config, contract) {
  const input = path.join(CONTRACT_DIR, "source", `contract.${contract.name}.source.ts`);
  const output = path.join(CONTRACT_DIR, "export", `${config.appName}.contract.${contract.name}.d.ts`);
  await executeCommand("npx", ["dts-bundle-generator", "-o", output, input, "--no-check"]);
}
export {
  bundleDeclarationContract,
  bundleRuntimeContract
};
//# sourceMappingURL=build.controllers.js.map