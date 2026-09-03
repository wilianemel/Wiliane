import { NextResponse, type NextRequest } from "next/server";

const NEW_ORIGIN = "https://www.borapraonde.app.br";
const OLD_HOSTS = new Set(["qualeaboabrasil.com.br", "www.qualeaboabrasil.com.br"]);

export function proxy(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (forwardedHost ?? request.nextUrl.host).split(",")[0].trim().split(":")[0].toLowerCase();

  if (!OLD_HOSTS.has(host)) return NextResponse.next();

  const destination = new URL(request.nextUrl.pathname + request.nextUrl.search, NEW_ORIGIN);
  return NextResponse.redirect(destination, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
