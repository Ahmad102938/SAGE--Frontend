"use client"

import { useEffect, useState, useCallback } from "react"
import { getWebSocketClient } from "@/lib/websocket-client"
import type { CommandRequest, CommandIntent, ExecutionStatus, DeviceState } from "@/lib/types"
import { useAuth } from "@/hooks/use-auth"

export function useWebSocket() {
  const [wsConnected, setWsConnected] = useState(false)
  const [lastStatus, setLastStatus] = useState<ExecutionStatus | null>(null)
  const [deviceStates, setDeviceStates] = useState<Map<string, DeviceState>>(new Map())
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setWsConnected(false)
      return
    }

    const wsClient = getWebSocketClient()

    wsClient.setAuthToken(localStorage.getItem("accessToken"))

    // Connection status
    wsClient.on("connected", setWsConnected)

    // Command execution status
    wsClient.on("status", (status: ExecutionStatus) => {
      setLastStatus(status)
    })

    // Device state updates
    wsClient.on("device_state", (state: DeviceState) => {
      setDeviceStates((prev) => new Map(prev.set(state.device, state)))
    })

    // Error handling
    wsClient.on("error", (error: { message: string }) => {
      console.error("[v0] WebSocket error:", error)
      setLastStatus({
        device: "system",
        status: "error",
        message: error.message,
        timestamp: Date.now(),
      })
    })

    return () => {
      // Cleanup listeners on unmount
      wsClient.off("connected", setWsConnected)
      wsClient.off("status", setLastStatus)
      wsClient.off("device_state", () => {})
      wsClient.off("error", () => {})
    }
  }, [isAuthenticated, user])

  const sendCommand = useCallback(
    async (intent: CommandIntent, context?: { homeId?: number }) => {
      if (!isAuthenticated || !user) {
        console.error("[v0] Cannot send command: User not authenticated")
        return
      }

      const wsClient = getWebSocketClient()
      const payload: CommandRequest = {
        userId: user.user_id.toString(),
        intent,
        context: { homeId: context?.homeId !== undefined ? String(context.homeId) : undefined },
        timestamp: Date.now(),
      }
      const result = await wsClient.sendCommand(payload)
      return result
    },
    [isAuthenticated, user],
  )

  return {
    isConnected: wsConnected && isAuthenticated,
    connectionMode: wsConnected ? "ws" : isAuthenticated ? "http" : "none" as const,
    isReady: isAuthenticated && (wsConnected || true),
    lastStatus,
    deviceStates,
    sendCommand,
  }
}
