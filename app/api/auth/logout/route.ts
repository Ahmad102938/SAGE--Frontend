import { type NextRequest, NextResponse } from "next/server"
import { authService } from "@/lib/auth-service"

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refreshToken")?.value

    if (refreshToken) {
      authService.logout(refreshToken)
    }

    const response = NextResponse.json({ success: true })

    // Clear refresh token cookie
    response.cookies.set("refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
    })

    return response
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
