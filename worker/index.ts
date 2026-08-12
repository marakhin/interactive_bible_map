/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const MAP_UPSTREAM_ORIGIN = "https://tiles.openfreemap.org";
const MAP_PROXY_PREFIX = "/api/map/";

function mapUpstreamUrl(url: URL): URL | null {
  if (!url.pathname.startsWith(MAP_PROXY_PREFIX)) return null;

  const upstreamPath = url.pathname.slice(MAP_PROXY_PREFIX.length);
  if (!upstreamPath || upstreamPath.includes("..")) return null;

  const upstreamUrl = new URL(`/${upstreamPath}`, MAP_UPSTREAM_ORIGIN);
  upstreamUrl.search = url.search;
  return upstreamUrl;
}

async function proxyMapAsset(request: Request, upstreamUrl: URL): Promise<Response> {
  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        Accept: request.headers.get("Accept") || "*/*",
        "User-Agent": "BiblicalHistoryMap/1.0 (educational Scripture atlas)",
      },
      cf: { cacheEverything: true, cacheTtl: 604800 },
    } as RequestInit);

    const headers = new Headers(upstreamResponse.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800");
    // fetch() gives us a decoded stream, so the original compression metadata
    // must not be forwarded or the browser will try to decompress it twice.
    headers.delete("Content-Encoding");
    headers.delete("Content-Length");
    headers.delete("Set-Cookie");

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  } catch {
    return Response.json({ error: "Map asset is temporarily unavailable" }, { status: 502 });
  }
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const upstreamMapUrl = mapUpstreamUrl(url);
    if (upstreamMapUrl) return proxyMapAsset(request, upstreamMapUrl);

    // MapLibre resolves its module worker at runtime, so vinext cannot mark the
    // request as a static asset during compilation. Serve this known asset
    // directly from the Sites asset binding.
    if (url.pathname === "/assets/maplibre-gl-worker.mjs") {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
