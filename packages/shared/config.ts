import { z } from "zod";

const httpUrl = z.url({ protocol: /^https?$/ }).refine((value) => {
  const url = new URL(value);
  return !url.username && !url.password;
});
const port = z.coerce.number().int().min(1).max(65535);

const configSchema = z.object({
  PORTAVATE_HOST: z.string().min(1).default("127.0.0.1"),
  API_PORT: port.default(4000),
  VERIFIER_PORT: port.default(4001),
  API_URL: httpUrl.default("http://127.0.0.1:4000"),
  VERIFIER_URL: httpUrl.default("http://127.0.0.1:4001"),
  WEB_ORIGIN: httpUrl.refine((value) => value === new URL(value).origin).optional(),
});

export function readServerConfig(env: NodeJS.ProcessEnv) {
  const parsed = configSchema.safeParse({
    ...env,
    WEB_ORIGIN: env.WEB_ORIGIN ?? (env.NODE_ENV === "production" ? undefined : "http://localhost:3000"),
  });
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join("."));
    throw new Error("Invalid Portavate configuration: " + fields.join(", "));
  }
  return parsed.data;
}
