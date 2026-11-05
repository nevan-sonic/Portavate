import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath, URL } from "node:url";

const workspaceEnv = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(workspaceEnv)) loadEnvFile(workspaceEnv);

export default { agentRules: false };
