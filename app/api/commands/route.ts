import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import { authStorage } from "@/lib/auth-storage"
import { rbacService } from "@/lib/rbac"

export const POST = requireAuth(async (request) => {
  try {
    const { deviceId, command, params, homeId } = await request.json()
    const user = request.user!

    // Verify user has access to the home
    const userRole = authStorage.findOne(
      "user_home_roles",
      (role: any) => role.user_id === user.userId && role.home_id === homeId,
    )

    if (!userRole) {
      return NextResponse.json({ error: "Access denied to this home" }, { status: 403 })
    }

    // Check if user can control devices
    if (!rbacService.canControlDevice([userRole.role], "write")) {
      return NextResponse.json({ error: "Insufficient permissions to control devices" }, { status: 403 })
    }

    // Verify device belongs to the home
    const device = authStorage.findOne("devices", (d: any) => d.device_id === deviceId && d.home_id === homeId)

    if (!device) {
      return NextResponse.json({ error: "Device not found or access denied" }, { status: 404 })
    }

    // Create command record
    const commandRecord = authStorage.create("commands", {
      user_id: user.userId,
      device_id: deviceId,
      command,
      params: params || {},
      status: "pending",
    })

    // Simulate command execution (replace with actual device communication)
    setTimeout(() => {
      authStorage.update("commands", (cmd: any) => cmd.command_id === commandRecord.command_id, {
        status: "success",
        response: `Command ${command} executed successfully`,
        executed_at: new Date().toISOString(),
      })

      // Update device status
      const newStatus = { ...device.status }
      if (command === "turn_on") newStatus.power = "on"
      if (command === "turn_off") newStatus.power = "off"
      if (command === "set_brightness" && params?.brightness) {
        newStatus.brightness = params.brightness
      }

      authStorage.update("devices", (d: any) => d.device_id === deviceId, { status: newStatus })
    }, 1000)

    return NextResponse.json({
      success: true,
      commandId: commandRecord.command_id,
      message: "Command queued for execution",
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

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

    // Get commands for this home
    const commands = authStorage.findMany("commands", (cmd: any) => {
      const device = authStorage.findOne(
        "devices",
        (d: any) => d.device_id === cmd.device_id && d.home_id === Number.parseInt(homeId),
      )
      return !!device
    })

    return NextResponse.json({ commands })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
