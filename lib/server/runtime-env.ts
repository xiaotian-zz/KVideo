/**
 * Read a runtime environment value.
 *
 * KVideo is deployed as a Node/Docker application, so runtime configuration
 * comes from `process.env`. Cloudflare Pages is no longer supported by the
 * current Next.js proxy runtime, so the previous `@cloudflare/next-on-pages`
 * dependency is intentionally removed.
 */
export function getRuntimeEnvValue(name: string, fallback = ''): string {
  return typeof process !== 'undefined' ? process.env[name] || fallback : fallback;
}
