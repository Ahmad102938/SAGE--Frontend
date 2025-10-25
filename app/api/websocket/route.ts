// WebSocket server implementation with authentication
import type { NextRequest } from "next/server"
import { jwtUtils } from "@/lib/jwt-utils"
import { rbacService } from "@/lib/rbac"

export async function GET(request: NextRequest) {
  const upgradeHeader = request.headers.get("upgrade")

  if (upgradeHeader !== "websocket") {
    return new Response(
      JSON.stringify({
        message: "WebSocket endpoint - upgrade to WebSocket protocol required",
        status: "ready",
        note: "Authentication required via JWT token in auth message",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }

  // This would typically use a WebSocket library like 'ws' or 'socket.io'
  return new Response("WebSocket upgrade not implemented in this demo", { status: 501 })
}

// Mock command processing with authentication
export async function POST(request: NextRequest) {
  try {
    const command = await request.json()

    const authToken = command.authToken || request.headers.get("authorization")?.replace("Bearer ", "")

    if (!authToken) {
      return new Response(JSON.stringify({ error: "Authentication token required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const user = jwtUtils.verifyToken(authToken)
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!rbacService.canControlDevice(user.roles as any[], "write")) {
      return new Response(JSON.stringify({ error: "Insufficient permissions to control devices" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Support both legacy and new payloads
    const isNew = command?.intent && command?.context
    const deviceName = isNew ? command.intent.structured?.deviceName || "system" : command.device || "system"
    const action = isNew ? command.intent.structured?.action || command.intent.text : command.command

    // Simulate command processing
    const response = {
      device: deviceName,
      status: "success",
      message: `Command '${action}' executed successfully by user ${user.email}`,
      timestamp: Date.now(),
      executedBy: user.email,
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to process command" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
