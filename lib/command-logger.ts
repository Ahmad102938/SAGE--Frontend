"use client"

export interface CommandLog {
  id: string
  command: string
  parsedCommand?: {
    command: string
    device: string
    params?: Record<string, any>
  }
  source: "text" | "voice"
  timestamp: number
  status: "pending" | "success" | "error"
  response?: string
  executionTime?: number
  userId?: string
  sessionId?: string
}

export interface SystemLog {
  id: string
  level: "info" | "warn" | "error" | "debug"
  message: string
  timestamp: number
  component?: string
  data?: Record<string, any>
}

class CommandLogger {
  private commandLogs: CommandLog[] = []
  private systemLogs: SystemLog[] = []
  private maxLogs = 1000
  private listeners: Set<(logs: CommandLog[]) => void> = new Set()
  private systemListeners: Set<(logs: SystemLog[]) => void> = new Set()

  constructor() {
    this.loadFromStorage()
  }

  // Command logging methods
  logCommand(command: CommandLog): string {
    const logEntry: CommandLog = {
      ...command,
      id: command.id || this.generateId(),
      timestamp: command.timestamp || Date.now(),
    }

    this.commandLogs.unshift(logEntry)
    this.commandLogs = this.commandLogs.slice(0, this.maxLogs)

    this.saveToStorage()
    this.notifyCommandListeners()

    console.log("[v0] Command logged:", logEntry)
    return logEntry.id
  }

  updateCommandStatus(id: string, status: CommandLog["status"], response?: string, executionTime?: number) {
    const logIndex = this.commandLogs.findIndex((log) => log.id === id)
    if (logIndex !== -1) {
      this.commandLogs[logIndex] = {
        ...this.commandLogs[logIndex],
        status,
        response,
        executionTime,
      }

      this.saveToStorage()
      this.notifyCommandListeners()

      console.log("[v0] Command status updated:", this.commandLogs[logIndex])
    }
  }

  // System logging methods
  logSystem(level: SystemLog["level"], message: string, component?: string, data?: Record<string, any>) {
    const logEntry: SystemLog = {
      id: this.generateId(),
      level,
      message,
      timestamp: Date.now(),
      component,
      data,
    }

    this.systemLogs.unshift(logEntry)
    this.systemLogs = this.systemLogs.slice(0, this.maxLogs)

    this.saveSystemLogsToStorage()
    this.notifySystemListeners()

    // Also log to console with appropriate level
    const consoleMethod = level === "error" ? "error" : level === "warn" ? "warn" : "log"
    console[consoleMethod](`[v0] ${component || "System"}:`, message, data || "")
  }

  // Convenience methods for system logging
  info(message: string, component?: string, data?: Record<string, any>) {
    this.logSystem("info", message, component, data)
  }

  warn(message: string, component?: string, data?: Record<string, any>) {
    this.logSystem("warn", message, component, data)
  }

  error(message: string, component?: string, data?: Record<string, any>) {
    this.logSystem("error", message, component, data)
  }

  debug(message: string, component?: string, data?: Record<string, any>) {
    this.logSystem("debug", message, component, data)
  }

  // Getters
  getCommandLogs(limit?: number): CommandLog[] {
    return limit ? this.commandLogs.slice(0, limit) : [...this.commandLogs]
  }

  getSystemLogs(limit?: number): SystemLog[] {
    return limit ? this.systemLogs.slice(0, limit) : [...this.systemLogs]
  }

  getCommandsByStatus(status: CommandLog["status"]): CommandLog[] {
    return this.commandLogs.filter((log) => log.status === status)
  }

  getCommandsByTimeRange(startTime: number, endTime: number): CommandLog[] {
    return this.commandLogs.filter((log) => log.timestamp >= startTime && log.timestamp <= endTime)
  }

  // Statistics
  getCommandStats() {
    const total = this.commandLogs.length
    const successful = this.commandLogs.filter((log) => log.status === "success").length
    const failed = this.commandLogs.filter((log) => log.status === "error").length
    const pending = this.commandLogs.filter((log) => log.status === "pending").length

    const avgExecutionTime =
      this.commandLogs.filter((log) => log.executionTime).reduce((sum, log) => sum + (log.executionTime || 0), 0) /
        this.commandLogs.filter((log) => log.executionTime).length || 0

    return {
      total,
      successful,
      failed,
      pending,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgExecutionTime: Math.round(avgExecutionTime),
    }
  }

  // Listeners
  onCommandLogsChange(callback: (logs: CommandLog[]) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  onSystemLogsChange(callback: (logs: SystemLog[]) => void) {
    this.systemListeners.add(callback)
    return () => this.systemListeners.delete(callback)
  }

  // Clear methods
  clearCommandLogs() {
    this.commandLogs = []
    this.saveToStorage()
    this.notifyCommandListeners()
  }

  clearSystemLogs() {
    this.systemLogs = []
    this.saveSystemLogsToStorage()
    this.notifySystemListeners()
  }

  clearAllLogs() {
    this.clearCommandLogs()
    this.clearSystemLogs()
  }

  // Export methods
  exportCommandLogs(): string {
    return JSON.stringify(this.commandLogs, null, 2)
  }

  exportSystemLogs(): string {
    return JSON.stringify(this.systemLogs, null, 2)
  }

  exportAllLogs(): string {
    return JSON.stringify(
      {
        commandLogs: this.commandLogs,
        systemLogs: this.systemLogs,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    )
  }

  // Private methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private notifyCommandListeners() {
    this.listeners.forEach((callback) => callback([...this.commandLogs]))
  }

  private notifySystemListeners() {
    this.systemListeners.forEach((callback) => callback([...this.systemLogs]))
  }

  private saveToStorage() {
    try {
      localStorage.setItem("iot-command-logs", JSON.stringify(this.commandLogs))
    } catch (error) {
      console.error("[v0] Failed to save command logs to storage:", error)
    }
  }

  private saveSystemLogsToStorage() {
    try {
      localStorage.setItem("iot-system-logs", JSON.stringify(this.systemLogs))
    } catch (error) {
      console.error("[v0] Failed to save system logs to storage:", error)
    }
  }

  private loadFromStorage() {
    try {
      const commandLogs = localStorage.getItem("iot-command-logs")
      if (commandLogs) {
        this.commandLogs = JSON.parse(commandLogs)
      }

      const systemLogs = localStorage.getItem("iot-system-logs")
      if (systemLogs) {
        this.systemLogs = JSON.parse(systemLogs)
      }
    } catch (error) {
      console.error("[v0] Failed to load logs from storage:", error)
    }
  }
}

// Singleton instance
export const commandLogger = new CommandLogger()

// Global access for debugging
if (typeof window !== "undefined") {
  ;(window as any).commandLogger = commandLogger
}
