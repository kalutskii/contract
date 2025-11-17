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
export {
  executeCommand
};
//# sourceMappingURL=build.utilities.js.map