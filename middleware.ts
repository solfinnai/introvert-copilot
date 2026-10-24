import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.cookies.get("sid")?.value) return NextResponse.next();
  const response = NextResponse.next();
  try {
    const id =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    response.cookies.set("sid", id, {
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

export const config = {
  matcher: ["/", "/meet", "/speakers", "/story", "/saved", "/chat", "/agent", "/people/:path*", "/api/:path*"],
};
