// Centralized CORS helper for browser-facing edge functions.
// Webhooks called by external services (Stripe, Chatwoot, public client uploads)
// should keep '*' since they are not browser-originated.
//
// Usage:
//   import { buildCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
//   const cors = buildCorsHeaders(req);
//   const pre = handleCorsPreflight(req); if (pre) return pre;
//   return new Response(JSON.stringify(data), { headers: { ...cors, "Content-Type": "application/json" }});

const ALLOWED_ORIGINS: (string | RegExp)[] = [
  // Producción
  "https://market.asesor.legal",
  "https://asesor-legal-lexcore.lovable.app",
  // Lovable preview/staging
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
  // Local dev
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
];

const ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

function isAllowed(origin: string | null): string | null {
  if (!origin) return null;
  for (const rule of ALLOWED_ORIGINS) {
    if (typeof rule === "string" && rule === origin) return origin;
    if (rule instanceof RegExp && rule.test(origin)) return origin;
  }
  return null;
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = isAllowed(origin);
  return {
    // If the origin is not whitelisted we omit the header so the browser blocks it.
    "Access-Control-Allow-Origin": allowed ?? "https://market.asesor.legal",
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { headers: buildCorsHeaders(req) });
}
