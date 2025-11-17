// src/modules/routes/routes.controllers.ts
import prompts from "prompts";
async function askWhereToWriteRoutes() {
  const response = await prompts({
    type: "text",
    name: "path",
    message: "Where do you want to write the routes files?",
    initial: "src/domain/contract"
  });
  return response.path;
}
export {
  askWhereToWriteRoutes
};
//# sourceMappingURL=routes.controllers.js.map