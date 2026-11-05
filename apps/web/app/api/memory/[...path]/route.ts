import { readServerConfig } from "@portavate/shared/config";
import { importBodyLimit } from "@portavate/memory-core/import";

const localHosts = new Set(["localhost:3000", "127.0.0.1:3000"]);
const id = "[0-9a-f-]{36}";
const routes = {
  GET: new RegExp(`^(sources|drafts/${id}|sources/${id}/evidence/s[1-9][0-9]*)$`),
  POST: new RegExp(`^(sources|sources/${id}/extractions)$`),
  PATCH: new RegExp(`^drafts/${id}/items/${id}$`),
};
type Context = { params: Promise<{ path: string[] }> };
type Method = keyof typeof routes;

const headers = {
  "Cache-Control": "no-store", "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin",
};
const failure = (status: number, error: string, message?: string) => Response.json({ error, message }, { status, headers });

async function forward(method: Method, request: Request, context: Context) {
  const host = request.headers.get("host") ?? "";
  const site = request.headers.get("sec-fetch-site");
  if (!localHosts.has(host) || (site !== null && site !== "same-origin")
    || (method !== "GET" && request.headers.get("origin") !== "http://" + host)) {
    return failure(403, "local_origin_required");
  }
  const path = (await context.params).path.join("/");
  if (!routes[method].test(path)) return failure(404, "route_not_found");
  const token = process.env.PORTAVATE_ALPHA_TOKEN?.trim();
  if (!token) return failure(503, "alpha_disabled", "Set PORTAVATE_ALPHA_TOKEN in the root .env and restart.");
  try {
    const { API_URL } = readServerConfig(process.env);
    const target = new URL("/api/memory/" + path, API_URL);
    if (!["127.0.0.1", "localhost", "[::1]"].includes(target.hostname)) return failure(503, "local_api_required");

    let body: string | undefined;
    if (request.body) {
      const reader = request.body.getReader();
      const decoder = new TextDecoder("utf-8", { fatal: true });
      let bytes = 0;
      body = "";
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > importBodyLimit) {
          await reader.cancel();
          return failure(413, "source_too_large", "Source must be 16 KiB or smaller.");
        }
        body += decoder.decode(part.value, { stream: true });
      }
      body += decoder.decode();
      if (bytes === 0) body = undefined;
    }
    const upstream = await fetch(target, {
      method, body, cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(95_000),
      headers: {
        authorization: "Bearer " + token,
        ...(body === undefined ? {} : { "Content-Type": request.headers.get("content-type") ?? "" }),
      },
    });
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return failure(502, "api_unavailable", "The local Portavate API could not complete the request.");
  }
}

export const GET = (request: Request, context: Context) => forward("GET", request, context);
export const POST = (request: Request, context: Context) => forward("POST", request, context);
export const PATCH = (request: Request, context: Context) => forward("PATCH", request, context);
