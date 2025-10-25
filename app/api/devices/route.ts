import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import { authStorage } from "@/lib/auth-storage"
import { rbacService } from "@/lib/rbac"

export const GET = requireAuth(async (request) => {
  try {
    const user = request.user!
    const url = new URL(request.url)
    const homeId = url.searchParams.get("homeId")

    if (!homeId) {
      return NextResponse.json({ error: "Home ID is required" }, { status: 400 })
    }

    // Verify user has access to the home
    const userRole = authStorage.findOne(
      "user_home_roles",
      (role: any) => role.user_id === user.userId && role.home_id === Number.parseInt(homeId),
    )

    if (!userRole) {
      return NextResponse.json({ error: "Access denied to this home" }, { status: 403 })
    }

    // Check if user can read devices
    if (!rbacService.canControlDevice([userRole.role], "read")) {
      return NextResponse.json({ error: "Insufficient permissions to view devices" }, { status: 403 })
    }

    // Get devices for this home
    const devices = authStorage.findMany("devices", (device: any) => device.home_id === Number.parseInt(homeId))

    return NextResponse.json({ devices })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const POST = requireAuth(async (request) => {
  try {
    const user = request.user!
    const { name, type, homeId, initialStatus } = await request.json()

    // Verify user has access to the home
    const userRole = authStorage.findOne(
      "user_home_roles",
      (role: any) => role.user_id === user.userId && role.home_id === homeId,
    )

    if (!userRole) {
      return NextResponse.json({ error: "Access denied to this home" }, { status: 403 })
    }

    // Check if user can manage home (add devices)
    if (!rbacService.canManageHome([userRole.role])) {
      return NextResponse.json({ error: "Insufficient permissions to add devices" }, { status: 403 })
    }

    // Create device
    const device = authStorage.create("devices", {
      home_id: homeId,
      name,
      type,
      status: initialStatus || { power: "off" },
    })

    return NextResponse.json({ device })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
