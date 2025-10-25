// JWT utilities for token generation and validation
import type { User, UserHomeRole } from "./auth-storage"

export interface JWTPayload {
  userId: number
  email: string
  homeId?: number
  roles: string[]
  iat: number
  exp: number
}

// Simple JWT implementation for MVP (use proper library in production)
class JWTUtils {
  private secret: string

  constructor() {
    this.secret = process.env.JWT_SECRET

    if (!this.secret) {
      const errorMsg = "JWT_SECRET environment variable is required"
      console.error(`[v0] ${errorMsg}`)

      if (process.env.NODE_ENV === "production") {
        throw new Error(errorMsg)
      }

      // Fallback for development only
      console.warn("[v0] Using fallback JWT secret for development. Set JWT_SECRET in production!")
      this.secret = "development-fallback-secret-not-for-production"
    }

    if (this.secret.length < 32) {
      console.warn("[v0] JWT_SECRET should be at least 32 characters long for security")
    }
  }

  generateToken(user: User, roles: UserHomeRole[], homeId?: number): string {
    const header = {
      alg: "HS256",
      typ: "JWT",
    }

    const payload: JWTPayload = {
      userId: user.user_id,
      email: user.email,
      homeId,
      roles: roles.map((r) => r.role),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    }

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header))
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload))

    // WARNING: This is a simplified signature for MVP. Use proper HMAC-SHA256 in production
    const signature = this.base64UrlEncode(`${encodedHeader}.${encodedPayload}.${this.secret}`)

    return `${encodedHeader}.${encodedPayload}.${signature}`
  }

  verifyToken(token: string): JWTPayload | null {
    try {
      const [header, payload, signature] = token.split(".")

      if (!header || !payload || !signature) {
        console.error("[v0] Invalid token format")
        return null
      }

      // Verify signature (simplified for MVP)
      const expectedSignature = this.base64UrlEncode(`${header}.${payload}.${this.secret}`)
      if (signature !== expectedSignature) {
        console.error("[v0] Token signature verification failed")
        return null
      }

      const decodedPayload = JSON.parse(this.base64UrlDecode(payload))

      // Check expiration
      if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
        console.error("[v0] Token has expired")
        return null
      }

      return decodedPayload
    } catch (error) {
      console.error("[v0] Token verification error:", error)
      return null
    }
  }

  isTokenExpiringSoon(token: string, thresholdMinutes = 5): boolean {
    const payload = this.verifyToken(token)
    if (!payload) return true

    const expirationTime = payload.exp * 1000
    const thresholdTime = Date.now() + thresholdMinutes * 60 * 1000

    return expirationTime < thresholdTime
  }

  generateRefreshToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  private base64UrlEncode(str: string): string {
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
  }

  private base64UrlDecode(str: string): string {
    str += "=".repeat((4 - (str.length % 4)) % 4)
    return atob(str.replace(/-/g, "+").replace(/_/g, "/"))
  }
}

export const jwtUtils = new JWTUtils()
