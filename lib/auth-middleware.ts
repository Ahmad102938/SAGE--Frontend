// Server-side authentication and authorization utilities
import type { NextRequest } from "next/server"
import { jwtUtils, type JWTPayload } from "@/lib/jwt-utils"
import { rbacService, type Permission } from "@/lib/rbac"

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload
}

export function getAuthenticatedUser(request: NextRequest): JWTPayload | null {
  const token =
    request.headers.get("authorization")?.replace("Bearer ", "") || request.cookies.get("accessToken")?.value

  if (!token) return null

  return jwtUtils.verifyToken(token)
}

export function requireAuth(handler: (req: AuthenticatedRequest) => Promise<Response>) {
  return async (request: NextRequest) => {
    const user = getAuthenticatedUser(request)

    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }
    ;(request as AuthenticatedRequest).user = user
    return handler(request as AuthenticatedRequest)
  }
}

export function requirePermission(permission: Permission) {
  return (handler: (req: AuthenticatedRequest) => Promise<Response>) => async (request: NextRequest) => {
    const user = getAuthenticatedUser(request)

    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!rbacService.hasPermission(user.roles as any[], permission)) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }
    ;(request as AuthenticatedRequest).user = user
    return handler(request as AuthenticatedRequest)
  }
}

export function requireHomeAccess(handler: (req: AuthenticatedRequest) => Promise<Response>) {
  return async (request: NextRequest) => {
    const user = getAuthenticatedUser(request)

    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Check if user has access to the requested home
    const homeId = request.nextUrl.searchParams.get("homeId") || request.headers.get("x-home-id")

    if (homeId && user.homeId && user.homeId.toString() !== homeId) {
      return new Response(JSON.stringify({ error: "Access denied to this home" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }
    ;(request as AuthenticatedRequest).user = user
    return handler(request as AuthenticatedRequest)
  }
}
