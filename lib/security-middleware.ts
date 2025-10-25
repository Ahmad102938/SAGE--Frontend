// Security middleware for CORS, rate limiting, and security headers
import type { NextRequest, NextResponse } from "next/server"

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

class SecurityMiddleware {
  private rateLimitStore: RateLimitStore = {}
  private readonly maxRequests = Number.parseInt(process.env.RATE_LIMIT_MAX || "100")
  private readonly windowMs = Number.parseInt(process.env.RATE_LIMIT_WINDOW || "900000") // 15 minutes

  // Rate limiting implementation
  checkRateLimit(request: NextRequest): boolean {
    const clientIp = this.getClientIp(request)
    const now = Date.now()
    const windowStart = now - this.windowMs

    // Clean up old entries
    Object.keys(this.rateLimitStore).forEach((ip) => {
      if (this.rateLimitStore[ip].resetTime < windowStart) {
        delete this.rateLimitStore[ip]
      }
    })

    // Check current client
    if (!this.rateLimitStore[clientIp]) {
      this.rateLimitStore[clientIp] = {
        count: 1,
        resetTime: now + this.windowMs,
      }
      return true
    }

    if (this.rateLimitStore[clientIp].resetTime < now) {
      this.rateLimitStore[clientIp] = {
        count: 1,
        resetTime: now + this.windowMs,
      }
      return true
    }

    if (this.rateLimitStore[clientIp].count >= this.maxRequests) {
      return false
    }

    this.rateLimitStore[clientIp].count++
    return true
  }

  private getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")

    if (forwarded) {
      return forwarded.split(",")[0].trim()
    }

    if (realIp) {
      return realIp
    }

    return request.ip || "unknown"
  }

  // Add security headers
  addSecurityHeaders(response: NextResponse): NextResponse {
    // CORS headers
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"]
    response.headers.set("Access-Control-Allow-Origin", allowedOrigins[0])
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Home-Id")
    response.headers.set("Access-Control-Allow-Credentials", "true")

    // Security headers
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-XSS-Protection", "1; mode=block")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

    // HSTS for production
    if (process.env.NODE_ENV === "production") {
      response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    }

    return response
  }

  // Validate environment variables
  validateEnvironment(): void {
    const requiredVars = ["JWT_SECRET"]
    const missingVars = requiredVars.filter((varName) => !process.env[varName])

    if (missingVars.length > 0) {
      console.error(`[v0] Missing required environment variables: ${missingVars.join(", ")}`)
      console.error("[v0] Please check your .env file and ensure all required variables are set")

      if (process.env.NODE_ENV === "production") {
        throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`)
      }
    }

    // Warn about default values in production
    if (process.env.NODE_ENV === "production") {
      if (process.env.JWT_SECRET?.includes("change-this") || process.env.JWT_SECRET?.includes("default")) {
        console.warn("[v0] WARNING: Using default JWT_SECRET in production! Please set a secure secret.")
      }
    }
  }
}

export const securityMiddleware = new SecurityMiddleware()
