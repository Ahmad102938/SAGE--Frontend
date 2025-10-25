import { type NextRequest, NextResponse } from "next/server"
import { authService } from "@/lib/auth-service"

export async function POST(request: NextRequest) {
  try {
    const { email, password, homeId } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const result = await authService.login({ email, password }, homeId)

    if (result.success) {
      const response = NextResponse.json({
        user: result.user,
        accessToken: result.accessToken,
      })

      // Set refresh token as httpOnly cookie
      response.cookies.set("refreshToken", result.refreshToken!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      })

      return response
    } else {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
