import { NextResponse, type NextRequest } from "next/server";

// Vercel's Edge middleware wrapper returns MIDDLEWARE_INVOCATION_FAILED
// for this app. The Node.js runtime is the supported 15.5 alternative.
export const runtime = "nodejs";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (request.cookies.get("sid")?.value) return response;
  try {
    response.cookies.set("sid", sessionId(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 18,
    });
  } catch {
    return NextResponse.next();
  }
  return response;
}

function sessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|henry.jpg|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
