// Core types for Layer 1 ↔ Layer 2 communication
export interface StructuredIntent {
  action: string
  deviceName?: string
  params?: Record<string, any>
}

export interface CommandIntent {
  text: string
  structured?: StructuredIntent
}

export interface CommandContext {
  homeId?: string
}

export interface CommandRequest {
  userId: string
  intent: CommandIntent
  context: CommandContext
  timestamp?: number
}

export interface DeviceState {
  device: string
  state: Record<string, any>
  lastUpdated: number
}

export interface ExecutionStatus {
  device: string
  status: "success" | "error" | "pending"
  message: string
  timestamp: number
}

export interface SessionContext {
  userId: string
  sessionId: string
  language?: string
  location?: string
}

export interface AuthRequest {
  token: string
}

export interface AuthResponsePayload {
  success: boolean
  error?: string
}

export interface PingPayload {
  ts: number
}

export type WebSocketMessage =
  | { type: "command"; payload: CommandRequest }
  | { type: "status"; payload: ExecutionStatus }
  | { type: "device_state"; payload: DeviceState }
  | { type: "error"; payload: { message: string } }
  | { type: "auth"; payload: AuthRequest }
  | { type: "auth_response"; payload: AuthResponsePayload }
  | { type: "ping"; payload: PingPayload }
  | { type: "pong"; payload: PingPayload }

export interface Device {
  id: string
  name: string
  type: "light" | "thermostat" | "lock" | "camera" | "sensor"
  room: string
  state: Record<string, any>
  isOnline: boolean
  lastSeen: number
}
