import { type NextRequest, NextResponse } from "next/server"
import { authService } from "@/lib/auth-service"

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refreshToken")?.value

    if (!refreshToken) {
      return NextResponse.json({ error: "Refresh token not found" }, { status: 401 })
    }

    const result = await authService.refreshAccessToken(refreshToken)

    if (result.success) {
      return NextResponse.json({
        user: result.user,
        accessToken: result.accessToken,
      })
    } else {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
