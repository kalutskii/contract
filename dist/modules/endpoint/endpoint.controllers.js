// src/modules/endpoint/endpoint.controllers.ts
import prompts from "prompts";
async function askWhereToWriteEndpoint() {
  const response = await prompts({
    type: "text",
    name: "path",
    message: "Where do you want to write the endpoint files?",
    initial: "src/domain/contract"
  });
  return response.path;
}
export {
  askWhereToWriteEndpoint
};
//# sourceMappingURL=endpoint.controllers.js.map