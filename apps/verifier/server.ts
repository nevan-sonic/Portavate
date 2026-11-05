import { readServerConfig } from "@portavate/shared/config";
import { createVerifier } from "./app.ts";

try {
  const config = readServerConfig(process.env);
  const app = createVerifier();
  const address = await app.listen({ host: config.PORTAVATE_HOST, port: config.VERIFIER_PORT });
  console.info("Portavate verifier listening at " + address);
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void app.close().catch(() => { process.exitCode = 1; });
    });
  }
} catch {
  console.error("Could not start the Portavate verifier. Check the host, port and server configuration.");
  process.exitCode = 1;
}
