import { type NextRequest, NextResponse } from "next/server"
import { jwtUtils } from "@/lib/jwt-utils"
import { securityMiddleware } from "@/lib/security-middleware"

export function middleware(request: NextRequest) {
  try {
    securityMiddleware.validateEnvironment()
  } catch (error) {
    console.error("[v0] Environment validation failed:", error)
    return new Response("Server configuration error", { status: 500 })
  }

  if (!securityMiddleware.checkRateLimit(request)) {
    return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Only protect API routes here. Let client-side auth handle pages to avoid localStorage SSR mismatch.
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/")
  const publicApiRoutes = ["/api/auth/login", "/api/auth/register", "/api/auth/refresh", "/api/auth/logout"]
  const isPublicApiRoute = publicApiRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

  if (!isApiRoute || isPublicApiRoute) {
    const response = NextResponse.next()
    return securityMiddleware.addSecurityHeaders(response)
  }

  // Check for authentication token for protected API routes
  const token =
    request.headers.get("authorization")?.replace("Bearer ", "") || request.cookies.get("accessToken")?.value

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Verify token
  const payload = jwtUtils.verifyToken(token)
  if (!payload) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (jwtUtils.isTokenExpiringSoon(token)) {
    console.log("[v0] Token expiring soon for user:", payload.email)
  }

  // Add user info to headers for API routes
  const response = NextResponse.next()
  response.headers.set("x-user-id", payload.userId.toString())
  response.headers.set("x-user-email", payload.email)
  response.headers.set("x-user-roles", JSON.stringify(payload.roles))
  if (payload.homeId) {
    response.headers.set("x-home-id", payload.homeId.toString())
  }

  if (jwtUtils.isTokenExpiringSoon(token)) {
    response.headers.set("x-token-expiring", "true")
  }

  return securityMiddleware.addSecurityHeaders(response)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)", "/api/(.*)"],
}
