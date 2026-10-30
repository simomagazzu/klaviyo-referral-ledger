import { NextRequest, NextResponse } from "next/server";

// The ledger has no login: it is meant to run only on this computer.
// 1. Answer only requests addressed to localhost (blocks DNS-rebinding tricks).
// 2. Refuse writes to the API that come from another website open in the same
//    browser (a cross-site page could otherwise wipe or replace the ledger).
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const hostname = (host: string) => host.replace(/:\d+$/, "");

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (!LOCAL_HOSTS.has(hostname(host))) {
    return new NextResponse("This ledger only answers on localhost.", { status: 403 });
  }

  if (request.nextUrl.pathname.startsWith("/api/") && !SAFE_METHODS.has(request.method)) {
    const site = request.headers.get("sec-fetch-site");
    const origin = request.headers.get("origin");
    const crossSite = (site !== null && site !== "same-origin" && site !== "none") || (origin !== null && new URL(origin).host !== host);
    if (crossSite) {
      return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
