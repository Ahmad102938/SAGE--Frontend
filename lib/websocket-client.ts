"use client"

import type { WebSocketMessage, CommandRequest, ExecutionStatus } from "./types"

export class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private baseReconnectDelayMs = 1000
  private maxReconnectDelayMs = 30000
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private authToken: string | null = null
  private isManuallyClosed = false
  private heartbeatIntervalId: any = null
  private lastPongAt = 0

  constructor(private url: string) {
    this.handleBrowserOnlineOffline()
    this.connect()
  }

  public setAuthToken(token: string | null) {
    this.authToken = token
    if (this.ws?.readyState === WebSocket.OPEN && token) {
      this.authenticate()
    }
  }

  private authenticate() {
    if (this.authToken && this.ws?.readyState === WebSocket.OPEN) {
      const authMessage: WebSocketMessage = { type: "auth", payload: { token: this.authToken } }
      this.ws.send(JSON.stringify(authMessage))
      console.log("[v0] Sent authentication token")
    }
  }

  private connect() {
    try {
      // If no WebSocket URL is configured, skip attempting a WS connection.
      if (!this.url || !this.url.startsWith("ws")) {
        console.log("[v0] No WebSocket URL configured; using HTTP fallback for commands")
        this.emit("connected", false)
        return
      }

      // Avoid duplicate connections
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        return
      }

      this.isManuallyClosed = false
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log("[v0] WebSocket connected")
        this.reconnectAttempts = 0
        this.authenticate()
        this.startHeartbeat()
        this.emit("connected", true)
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log("[v0] Received message:", message)

          if (message.type === "pong") {
            this.lastPongAt = Date.now()
            return
          }

          if (message.type === "auth_response") {
            if (message.payload.success) {
              console.log("[v0] WebSocket authentication successful")
            } else {
              console.error("[v0] WebSocket authentication failed:", message.payload.error)
              this.emit("error", { message: "Authentication failed" })
            }
            return
          }

          this.emit(message.type, message.payload)
        } catch (error) {
          console.error("[v0] Failed to parse WebSocket message:", error)
        }
      }

      this.ws.onclose = (event) => {
        console.log("[v0] WebSocket disconnected", { code: event.code, reason: event.reason })
        this.stopHeartbeat()
        this.emit("connected", false)
        if (!this.isManuallyClosed) {
          this.handleReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error("[v0] WebSocket error:", error)
        this.emit("error", { message: "Connection error" })
      }
    } catch (error) {
      console.error("[v0] Failed to create WebSocket connection:", error)
      this.handleReconnect()
    }
  }

  private handleReconnect() {
    if (this.isManuallyClosed) return

    // If browser is offline, wait until it's online
    if (typeof window !== "undefined" && "onLine" in navigator && !navigator.onLine) {
      console.log("[v0] Offline detected; waiting for online to reconnect")
      return
    }

    this.reconnectAttempts++
    const expBackoff = Math.min(
      this.maxReconnectDelayMs,
      this.baseReconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1),
    )
    const jitter = Math.floor(Math.random() * 500)
    const delay = expBackoff + jitter
    this.emit("reconnecting", { attempt: this.reconnectAttempts, delay })
    console.log(`[v0] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
    setTimeout(() => this.connect(), delay)
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.lastPongAt = Date.now()
    this.heartbeatIntervalId = setInterval(() => {
      // Send ping every 20s; if no pong within 60s, force reconnect
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          const ping: WebSocketMessage = { type: "ping", payload: { ts: Date.now() } }
          this.ws.send(JSON.stringify(ping))
        } catch {}
      }
      if (Date.now() - this.lastPongAt > 60000) {
        console.warn("[v0] Heartbeat timeout; closing socket to trigger reconnect")
        try {
          this.ws?.close(4000, "heartbeat-timeout")
        } catch {}
      }
    }, 20000)
  }

  private stopHeartbeat() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId)
      this.heartbeatIntervalId = null
    }
  }

  private handleBrowserOnlineOffline() {
    if (typeof window === "undefined") return
    window.addEventListener("online", () => {
      console.log("[v0] Browser online; attempting reconnect")
      this.handleReconnect()
    })
    window.addEventListener("offline", () => {
      console.log("[v0] Browser offline; closing socket")
      this.ws?.close(4001, "offline")
    })
  }

  public async sendCommand(command: CommandRequest): Promise<ExecutionStatus | void> {
    if (!this.authToken) {
      console.error("[v0] Cannot send command: Not authenticated")
      this.emit("error", { message: "Authentication required" })
      return
    }

    // If WS is open, use it.
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = { type: "command", payload: { ...command, timestamp: Date.now() } }
      this.ws.send(JSON.stringify(message))
      console.log("[v0] Sent command via WS:", message)
      return
    }

    // Fallback to HTTP POST endpoint when WS is unavailable
    try {
      const gatewayBase = (process.env.NEXT_PUBLIC_GATEWAY_HTTP_URL || "").trim()
      const httpUrl = gatewayBase
        ? `${gatewayBase.replace(/\/$/, "")}/commands`
        : "/api/websocket"

      const payload = { ...command, timestamp: Date.now() }
      console.log("[v0] Sending command via HTTP:", { url: httpUrl, payload })

      const res = await fetch(httpUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authToken}`,
          "X-Layer": "interface",
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Unknown error" }))
        this.emit("error", { message: error || "Command failed" })
        return
      }

      const data = (await res.json()) as ExecutionStatus
      // Emit a status update similar to WS behavior
      this.emit("status", data)
      console.log("[v0] Received HTTP response:", data)
      return data
    } catch (error) {
      console.error("[v0] HTTP fallback failed:", error)
      this.emit("error", { message: "Network error" })
    }
  }

  public on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  public off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback)
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((callback) => callback(data))
  }

  public disconnect() {
    this.ws?.close()
    this.listeners.clear()
    this.authToken = null
    this.isManuallyClosed = true
    this.stopHeartbeat()
  }
}

let wsClient: WebSocketClient | null = null

export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || ""
    wsClient = new WebSocketClient(wsUrl)
  }
  return wsClient
}
